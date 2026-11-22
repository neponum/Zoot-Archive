import React, { useEffect, useRef } from 'react';
import {
  FxCurve,
  FxGradient,
  FxMaterial,
  FxMesh,
  FxNode,
  FxSystem,
  StoryFxBundle,
  loadStoryFx,
} from '../../services/story/storyFxAssets';

/**
 * Рисует игровые фоновые эффекты (`[bgeffect]`) по данным, выгруженным
 * `scripts/avgfx/export.py`.
 *
 * Координаты префаба — пиксели сцены 1280×720 с центром посередине и Y вверх,
 * а размеры/скорости частиц — в мировых юнитах: 1 юнит = 100 px (ортокамера
 * эффектов игры, 7.2 юнита в высоту).
 */

const DESIGN_W = 1280;
const DESIGN_H = 720;
const UNIT = 100;
const MAX_PARTICLES = 1400;

type Vec3 = [number, number, number];

interface Transform {
  pos: Vec3;
  rot: number[];
  scale: Vec3;
}

interface RuntimeSystem {
  system: FxSystem;
  transform: Transform;
  texture: HTMLImageElement | HTMLCanvasElement | null;
  blend: 'add' | 'alpha';
  /** Базовое направление в экранных координатах (y вверх). */
  direction: [number, number];
  spread: number;
  /** Постоянная скорость эмиссии — для предпрогрева и грубой оценки. */
  rate: number;
  /** `rateOverDistance`: у анимированных эмиттеров это единственный источник. */
  rateDistance: number;
  accumulator: number;
  elapsed: number;
  particles: Particle[];
  max: number;
  tintAlpha: number;
  /** Сколько раз уже сработал каждый burst. */
  burstFired: number[];
  /** Размах меша у mesh-частиц (`startSize` масштабирует его вершины). */
  meshX: number;
  meshY: number;
  /**
   * `lengthScale` у stretched billboard (`renderer.mode === 1`): частица
   * растягивается вдоль скорости на `|lengthScale| × скорость`.
   */
  stretch: number;
  /** Масштаб эмиттера при `scalingMode = 1` (Local). */
  sizeScaleX: number;
  sizeScaleY: number;
  /** `delay` модуля эмиссии: до него система молчит. */
  delay: number;
  /** Суб-эмиттеры: рождённая частица запускает частицы другой системы. */
  subEmitters: Array<{ target: RuntimeSystem; probability: number }>;
  /** Скролл текстуры (`_MainUSpeed`/`_MainVSpeed`), UV/сек. */
  scroll: [number, number];
  pattern: CanvasPattern | null;
  /** Trail-модуль: полоса за частицей. */
  trail: {
    lifetime: number;
    minDistance: number;
    width?: FxCurve | null;
    color?: FxGradient | null;
  } | null;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

/** CRC32 пути узла — так Unity адресует кривые клипа. */
function crc32(text: string): number {
  let crc = 0xffffffff;
  for (let index = 0; index < text.length; index += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ text.charCodeAt(index)) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function sampleKeys(keys: Array<[number, number]>, time: number, fallback: number): number {
  if (!keys.length) return fallback;
  if (time <= keys[0][0]) return keys[0][1];
  for (let index = 1; index < keys.length; index += 1) {
    if (time > keys[index][0]) continue;
    const [t0, v0] = keys[index - 1];
    const [t1, v1] = keys[index];
    const span = Math.max(1e-6, t1 - t0);
    return v0 + ((v1 - v0) * (time - t0)) / span;
  }
  return keys[keys.length - 1][1];
}

/**
 * Статичный квад `MeshRenderer` — вторая половина AVG-эффектов.
 *
 * Часть префабов (слэши, линии, вспышки, «блики» камеры) состоит не из
 * частиц, а из квадов с материалом: у них в данных нет ни одной живой
 * системы частиц, поэтому без квадов эффект был полностью пустым.
 */
interface RuntimeQuad {
  texture: HTMLImageElement | HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  alpha: number;
  blend: 'add' | 'alpha';
  /** Кривая `_Amount` из клипа: растворение, которое в игре анимируется. */
  amountKeys: Array<[number, number]> | null;
  /** Длительность клипа: после неё значение держится последним ключом. */
  stop: number;
  /** Скролл текстуры материала (`_MainUSpeed`/`_MainVSpeed`), UV/сек. */
  scroll: [number, number];
  /** Смещение центра спрайта от узла: у мешей пивот не в центре. */
  offset: [number, number];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  /** Размер в пикселях сцены: у искр он вытянутый (startSize ≠ startSizeY). */
  sizeX: number;
  sizeY: number;
  /** Поворот в радианах (Unity: против часовой стрелки в Y-вверх). */
  rotation: number;
  alpha: number;
  /** Строка атласа, если у системы несколько кадров по вертикали. */
  uvRow: number;
  /** История позиций для trail-полосы. */
  history: Array<{ x: number; y: number; age: number }>;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const random = (min: number, max: number) => min + Math.random() * (max - min);

function qmul(a: number[], b: number[]): number[] {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function qrot(q: number[], v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}

function buildTransforms(prefabs: FxNode[]): Map<string, Transform> {
  const map = new Map<string, Transform>();
  const walk = (node: FxNode, parent: Transform) => {
    const localPos = (node.pos ?? [0, 0, 0]) as Vec3;
    const localRot = node.rot ?? [0, 0, 0, 1];
    const localScale = (node.scale ?? [1, 1, 1]) as Vec3;
    const scaled: Vec3 = [
      localPos[0] * parent.scale[0],
      localPos[1] * parent.scale[1],
      localPos[2] * parent.scale[2],
    ];
    const rotated = qrot(parent.rot, scaled);
    const transform: Transform = {
      pos: [
        parent.pos[0] + rotated[0],
        parent.pos[1] + rotated[1],
        parent.pos[2] + rotated[2],
      ],
      rot: qmul(parent.rot, localRot),
      scale: [
        parent.scale[0] * localScale[0],
        parent.scale[1] * localScale[1],
        parent.scale[2] * localScale[2],
      ],
    };
    map.set(node.path, transform);
    for (const kid of node.kids ?? []) walk(kid, transform);
  };
  const root: Transform = { pos: [0, 0, 0], rot: [0, 0, 0, 1], scale: [1, 1, 1] };
  for (const node of prefabs) walk(node, root);
  return map;
}

/** Локальный масштаб узла: `scalingMode = Local` умножает на него размер. */
function buildLocalScales(prefabs: FxNode[]): Map<string, Vec3> {
  const map = new Map<string, Vec3>();
  const walk = (node: FxNode) => {
    map.set(node.path, (node.scale ?? [1, 1, 1]) as Vec3);
    for (const kid of node.kids ?? []) walk(kid);
  };
  for (const node of prefabs) walk(node);
  return map;
}

/** Видимость узла с учётом выключенных родителей (`m_IsActive`). */
function buildActivity(prefabs: FxNode[]): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const walk = (node: FxNode, parentActive: boolean) => {
    const active = parentActive && node.active !== false;
    map.set(node.path, active);
    for (const kid of node.kids ?? []) walk(kid, active);
  };
  for (const node of prefabs) walk(node, true);
  return map;
}

function walkNodes(prefabs: FxNode[]): FxNode[] {
  const list: FxNode[] = [];
  const walk = (node: FxNode) => {
    list.push(node);
    for (const kid of node.kids ?? []) walk(kid);
  };
  for (const node of prefabs) walk(node);
  return list;
}

function hermite(keys: number[][], t: number, fallback: number): number {
  if (!keys.length) return fallback;
  if (t <= keys[0][0]) return keys[0][1];
  for (let index = 1; index < keys.length; index += 1) {
    if (t > keys[index][0]) continue;
    const [t0, v0, , outSlope] = keys[index - 1];
    const [t1, v1, inSlope] = keys[index];
    const span = Math.max(1e-6, t1 - t0);
    const u = (t - t0) / span;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * v0 +
      (u3 - 2 * u2 + u) * span * (outSlope ?? 0) +
      (-2 * u3 + 3 * u2) * v1 +
      (u3 - u2) * span * (inSlope ?? 0)
    );
  }
  return keys[keys.length - 1][1];
}

/** Значение кривой в момент `t` (0..1 внутри жизни частицы). */
function sampleCurve(curve: FxCurve | null | undefined, t: number, fallback = 0): number {
  if (!curve) return fallback;
  if (curve.state >= 2) return hermite(curve.keys ?? [], t, curve.scalar);
  return curve.scalar;
}

/** Значение на старте частицы: диапазоны (state 1/3) разыгрываются случайно. */
function spawnValue(curve: FxCurve | null | undefined, fallback = 0): number {
  if (!curve) return fallback;
  if (curve.state === 1) return random(curve.min, curve.scalar);
  if (curve.state === 3) {
    const max = hermite(curve.keys ?? [], Math.random(), curve.scalar);
    const min = hermite(curve.minKeys ?? [], Math.random(), curve.min);
    return random(Math.min(min, max), Math.max(min, max));
  }
  if (curve.state === 2) return hermite(curve.keys ?? [], Math.random(), curve.scalar);
  return curve.scalar;
}

function sampleStops(stops: number[][], t: number, fallback: number[]): number[] {
  if (!stops.length) return fallback;
  if (t <= stops[0][0]) return stops[0];
  for (let index = 1; index < stops.length; index += 1) {
    if (t > stops[index][0]) continue;
    const a = stops[index - 1];
    const b = stops[index];
    const span = Math.max(1e-6, b[0] - a[0]);
    const u = (t - a[0]) / span;
    const out = [...b];
    for (let channel = 1; channel < out.length; channel += 1) {
      out[channel] = (a[channel] ?? out[channel]) + ((b[channel] ?? 0) - (a[channel] ?? 0)) * u;
    }
    return out;
  }
  return stops[stops.length - 1];
}

function sampleGradient(
  gradient: FxGradient | null | undefined,
  t: number
): [number, number, number, number] {
  if (!gradient) return [1, 1, 1, 1];
  const constant = (gradient.color ?? [1, 1, 1, 1]) as number[];
  if (gradient.state <= 0 || !gradient.colors?.length) {
    return [constant[0], constant[1], constant[2], constant[3]];
  }
  const color = sampleStops(gradient.colors, t, [0, 1, 1, 1, 1]);
  let alpha = color[4] ?? constant[3];
  if (gradient.alphas?.length) {
    const stop = sampleStops(
      gradient.alphas.map((entry) => [entry[0], entry[1]]),
      t,
      [0, alpha]
    );
    alpha = stop[1] ?? alpha;
  }
  return [color[1] ?? 1, color[2] ?? 1, color[3] ?? 1, alpha];
}

function textureHint(bundle: StoryFxBundle, texture: string): string {
  return `${bundle.index.stem} ${texture}`.toLowerCase();
}

/** Направление в плоскости экрана: поворот мировой оси +Z эмиттера. */
function resolveDirection(
  transform: Transform,
  shapeAngle: number,
  hint: string,
  speed: number
): { direction: [number, number]; spread: number } {
  const axis = qrot(transform.rot, [0, 0, 1]);
  const length = Math.hypot(axis[0], axis[1]);
  const spread = clamp((shapeAngle * Math.PI) / 180, 0, Math.PI);

  if (length > 0.15) {
    const direction: [number, number] = [axis[0] / length, axis[1] / length];
    return { direction: rotated(direction, random(-spread, spread)), spread };
  }

  const falls =
    /snow|xue|rain|storm|blizzard|avalanche|ash|dust|sand|fengsha|spark/.test(hint);
  const rises = /smoke|yanwu|steam|glow|light|flame|smog|fire_|firec|firework/.test(hint);

  if (falls || speed > 2) {
    return { direction: rotated([0, -1], random(-spread, spread)), spread };
  }
  if (rises) {
    return { direction: rotated([0, 1], random(-spread, spread)), spread };
  }
  const angle = random(0, Math.PI * 2);
  return { direction: [Math.cos(angle), Math.sin(angle)], spread };
}

function rotated(direction: [number, number], angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    direction[0] * cos - direction[1] * sin,
    direction[0] * sin + direction[1] * cos,
  ];
}

/** Точка внутри формы эмиттера (типы Unity ParticleSystemShapeType). */
function shapeOffset(system: FxSystem, transform: Transform): Vec3 {
  const shape = system.shape;
  if (!shape) return [0, 0, 0];
  const type = shape.type ?? 5;
  const radius = Math.max(0, (shape.radius ?? 0) * UNIT);
  let local: Vec3 = [0, 0, 0];

  if (type === 5 || type === 15 || type === 16) {
    // Box / BoxShell / BoxEdge.
    if (!shape.scale) return [0, 0, 0];
    const half: Vec3 = [
      (Math.abs(shape.scale[0]) * UNIT) / 2,
      (Math.abs(shape.scale[1]) * UNIT) / 2,
      (Math.abs(shape.scale[2]) * UNIT) / 2,
    ];
    if (half.every((size) => size < 1)) return [0, 0, 0];
    local = [
      random(-half[0], half[0]),
      random(-half[1], half[1]),
      random(-half[2], half[2]),
    ];
    if (type === 15 || type === 16) {
      const axes = [0, 1, 2].filter((axis) => half[axis] > 1);
      if (axes.length) {
        const axis = axes[Math.floor(Math.random() * axes.length)];
        local[axis] = Math.random() < 0.5 ? -half[axis] : half[axis];
      }
    }
  } else if (type === 10 || type === 11) {
    // Circle / CircleEdge.
    const angle = random(0, Math.PI * 2);
    const r = type === 11 ? radius : radius * Math.sqrt(Math.random());
    local = [Math.cos(angle) * r, Math.sin(angle) * r, 0];
  } else if (type === 0 || type === 1 || type === 2 || type === 3) {
    // Sphere / Shell / Hemisphere / HemisphereShell.
    const angle = random(0, Math.PI * 2);
    const phi =
      type === 2 || type === 3 ? random(0, Math.PI / 2) : random(0, Math.PI);
    const r = type === 1 || type === 3 ? radius : radius * Math.cbrt(Math.random());
    local = [
      r * Math.sin(phi) * Math.cos(angle),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(angle),
    ];
  } else if (type === 4 || type === 7 || type === 8 || type === 9) {
    // Cone / ConeShell / ConeVolume / ConeVolumeShell: основание у z = 0.
    const angle = random(0, Math.PI * 2);
    const r =
      type === 4 || type === 7 ? radius : radius * Math.sqrt(Math.random());
    local = [Math.cos(angle) * r, Math.sin(angle) * r, 0];
  } else {
    return [0, 0, 0];
  }
  return qrot(transform.rot, local);
}

const tintedCache = new Map<string, HTMLCanvasElement>();

/** Маска растворения материала (`_DissolveTex` + `_Amount`/`_BorderWidth`). */
interface DissolveMask {
  image: HTMLImageElement;
  amount: number;
  border: number;
}

/**
 * Тонирует текстуру цветом материала и применяет маску растворения.
 *
 * Шейдер AVG считает альфу как `saturate((dissolve.r - _Amount) / _BorderWidth)`:
 * у `avg_062_black_01` dissolve-текстура — радиальный градиент (в центре 0,
 * по краям 1) при `_Amount = 0.451`, то есть это виньетка «темнота по краям»,
 * а не сплошная пелена. Без маски чёрный квад закрывал весь кадр.
 */
function prepareTexture(
  image: HTMLImageElement,
  color: [number, number, number],
  dissolve?: DissolveMask | null
): HTMLCanvasElement | HTMLImageElement {
  const near = color.map((value) => Math.round(clamp(value, 0, 1) * 255)) as [
    number,
    number,
    number,
  ];
  const plain = near.every((value) => value > 245);
  if (plain && !dissolve) return image;
  const key = `${image.src}|${near.join(',')}|${
    dissolve ? `${dissolve.image.src}|${dissolve.amount}|${dissolve.border}` : ''
  }`;
  const cached = tintedCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return image;
  context.drawImage(image, 0, 0);

  if (!plain) {
    context.globalCompositeOperation = 'multiply';
    context.fillStyle = `rgb(${near[0]}, ${near[1]}, ${near[2]})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'source-over';
  }

  if (dissolve) {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (maskContext) {
      maskContext.drawImage(dissolve.image, 0, 0, canvas.width, canvas.height);
      const mask = maskContext.getImageData(0, 0, canvas.width, canvas.height).data;
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = data.data;
      const border = Math.max(0.0001, dissolve.border);
      for (let index = 0; index < pixels.length; index += 4) {
        const value = (mask[index] / 255 - dissolve.amount) / border;
        pixels[index + 3] = Math.round(
          pixels[index + 3] * clamp(value, 0, 1)
        );
      }
      context.putImageData(data, 0, 0);
    }
  }

  tintedCache.set(key, canvas);
  return canvas;
}

/** Материал системы с растворением, если оно включено (`_Amount > 0`). */
function dissolveMask(
  bundle: StoryFxBundle,
  materialNames: string[] | undefined
): DissolveMask | null {
  const materials = bundle.index.materials;
  if (!materials || !materialNames?.length) return null;
  for (const name of materialNames) {
    const material = materials[name];
    const file = material?.textures?._DissolveTex?.file;
    const amount = material?.floats?._Amount;
    if (!file || typeof amount !== 'number' || amount <= 0.001) continue;
    const image = bundle.images.get(file);
    if (!image) continue;
    const border = material?.floats?._BorderWidth;
    return {
      image,
      amount,
      border: typeof border === 'number' && border > 0 ? border : 1,
    };
  }
  return null;
}

/** Маска растворения конкретного материала квада. */
function dissolveMaskForMaterial(
  bundle: StoryFxBundle,
  material: FxMaterial | null | undefined
): DissolveMask | null {
  const file = material?.textures?._DissolveTex?.file;
  const amount = material?.floats?._Amount;
  if (!file || typeof amount !== 'number' || amount <= 0.001) return null;
  const image = bundle.images.get(file);
  if (!image) return null;
  const border = material?.floats?._BorderWidth;
  return {
    image,
    amount,
    border: typeof border === 'number' && border > 0 ? border : 1,
  };
}

/**
 * Средняя альфа и яркость готовой текстуры (по сетке 24×24).
 *
 * Нужна, чтобы не рисовать слой, который всё равно невидим (`_Amount`
 * растворил его целиком), и чтобы не накрыть кадр сплошной заливкой:
 * у `avg_073_blink_01` есть чёрный квад на весь экран.
 */
function textureStats(texture: HTMLImageElement | HTMLCanvasElement): {
  alpha: number;
  luminance: number;
  /** Средняя альфа по краю: у «листов» на весь экран края непрозрачные. */
  edge: number;
} {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return { alpha: 1, luminance: 0.5, edge: 1 };
  context.drawImage(texture, 0, 0, size, size);
  const data = context.getImageData(0, 0, size, size).data;
  let alpha = 0;
  let luminance = 0;
  let edge = 0;
  let edgeCount = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const a = data[index + 3] / 255;
      alpha += a;
      luminance += ((0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]) / 255) * a;
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
        edge += a;
        edgeCount += 1;
      }
    }
  }
  const total = Math.max(1, data.length / 4);
  return {
    alpha: alpha / total,
    luminance: luminance / Math.max(1e-6, alpha),
    edge: edge / Math.max(1, edgeCount),
  };
}

const seamlessCache = new WeakMap<
  HTMLImageElement | HTMLCanvasElement,
  { h: boolean; v: boolean }
>();

/**
 * Периодичность текстуры по краям.
 *
 * Скролл UV заворачивает текстуру, поэтому «ехать» могут только бесшовные
 * тайлы (лучи `AVG_flow_19`, полосы `mask_102`). У остальных на стыке был бы
 * видимый шов, а у текстур с прозрачной рамкой — скачущий по кадру блик.
 */
function seamlessAxes(texture: HTMLImageElement | HTMLCanvasElement): {
  h: boolean;
  v: boolean;
} {
  const cached = seamlessCache.get(texture);
  if (cached) return cached;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const result = { h: false, v: false };
  if (context) {
    context.drawImage(texture, 0, 0, size, size);
    const data = context.getImageData(0, 0, size, size).data;
    let horizontal = 0;
    let vertical = 0;
    let borderAlpha = 0;
    for (let index = 0; index < size; index += 1) {
      const left = index * size * 4;
      const right = (index * size + size - 1) * 4;
      const top = index * 4;
      const bottom = ((size - 1) * size + index) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        horizontal += Math.abs(data[left + channel] - data[right + channel]) / 255;
        vertical += Math.abs(data[top + channel] - data[bottom + channel]) / 255;
      }
      borderAlpha += data[left + 3] / 255 + data[right + 3] / 255;
      borderAlpha += data[top + 3] / 255 + data[bottom + 3] / 255;
    }
    const norm = size * 4;
    // Прозрачная рамка даёт «бесшовность» обманом: такой блик нельзя гонять.
    const solid = borderAlpha / (size * 4) > 0.05;
    result.h = solid && horizontal / norm < 0.06;
    result.v = solid && vertical / norm < 0.06;
  }
  seamlessCache.set(texture, result);
  return result;
}

interface MeshSprite {
  canvas: HTMLCanvasElement;
  /** Размер в дизайн-пикселях (до масштаба окна). */
  width: number;
  height: number;
  /** Центр спрайта относительно узла. */
  offset: [number, number];
}

const meshSpriteCache = new Map<string, MeshSprite | null>();

/**
 * Запекает квад по настоящей геометрии меша.
 *
 * Меш квада — не единичный прямоугольник: лучи солнца (`AVG_plane_06`) это
 * лента из 108 треугольников, кольца и конусы тоже имеют свою форму. Каждый
 * треугольник рисуется аффинным отображением UV → экран и обрезается по
 * контуру, поэтому силуэт совпадает с игрой. Результат кешируется: спрайт
 * статичен, пересобирается только при смене материала.
 */
function bakeMeshSprite(
  mesh: FxMesh,
  texture: HTMLImageElement | HTMLCanvasElement,
  scale: [number, number],
  key: string
): MeshSprite | null {
  const cached = meshSpriteCache.get(key);
  if (cached !== undefined) return cached;
  const verts = mesh.v ?? [];
  const uvs = mesh.uv ?? [];
  const indices = mesh.idx ?? [];
  if (verts.length < 3 || uvs.length < verts.length || indices.length < 3) {
    meshSpriteCache.set(key, null);
    return null;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of verts) {
    minX = Math.min(minX, point[0]);
    maxX = Math.max(maxX, point[0]);
    minY = Math.min(minY, point[1]);
    maxY = Math.max(maxY, point[1]);
  }
  const spanX = Math.abs(scale[0]) || 1;
  const spanY = Math.abs(scale[1]) || 1;
  const width = Math.max(1, (maxX - minX) * spanX);
  const height = Math.max(1, (maxY - minY) * spanY);

  // Плотность спрайта: 2× дизайна, но не больше 1200 px по длинной стороне.
  const density = Math.min(2, 1200 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * density));
  canvas.height = Math.max(1, Math.round(height * density));
  const context = canvas.getContext('2d');
  if (!context) {
    meshSpriteCache.set(key, null);
    return null;
  }

  const textureWidth = texture.width || 1;
  const textureHeight = texture.height || 1;
  const project = (index: number): [number, number] => [
    (verts[index][0] - minX) * spanX * density,
    (maxY - verts[index][1]) * spanY * density,
  ];

  for (let index = 0; index + 2 < indices.length; index += 3) {
    const [x0, y0] = project(indices[index]);
    const [x1, y1] = project(indices[index + 1]);
    const [x2, y2] = project(indices[index + 2]);
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-6) continue;

    const t0x = uvs[indices[index]][0] * textureWidth;
    const t0y = (1 - uvs[indices[index]][1]) * textureHeight;
    const t1x = uvs[indices[index + 1]][0] * textureWidth;
    const t1y = (1 - uvs[indices[index + 1]][1]) * textureHeight;
    const t2x = uvs[indices[index + 2]][0] * textureWidth;
    const t2y = (1 - uvs[indices[index + 2]][1]) * textureHeight;

    const f1x = t1x - t0x;
    const f1y = t1y - t0y;
    const f2x = t2x - t0x;
    const f2y = t2y - t0y;
    const det = f1x * f2y - f2x * f1y;
    if (Math.abs(det) < 1e-6) continue;

    const e1x = x1 - x0;
    const e1y = y1 - y0;
    const e2x = x2 - x0;
    const e2y = y2 - y0;
    const a = (e1x * f2y - e2x * f1y) / det;
    const c = (e2x * f1x - e1x * f2x) / det;
    const b = (e1y * f2y - e2y * f1y) / det;
    const d = (e2y * f1x - e1y * f2x) / det;
    const e = x0 - (a * t0x + c * t0y);
    const f = y0 - (b * t0x + d * t0y);

    // Треугольник расширяем на полпикселя: иначе между соседними
    // треугольниками проступают просветы-швы.
    const cx = (x0 + x1 + x2) / 3;
    const cy = (y0 + y1 + y2) / 3;
    const push = (x: number, y: number): [number, number] => {
      const dx = x - cx;
      const dy = y - cy;
      const length = Math.hypot(dx, dy) || 1;
      return [x + (dx / length) * 0.5, y + (dy / length) * 0.5];
    };
    const [px0, py0] = push(x0, y0);
    const [px1, py1] = push(x1, y1);
    const [px2, py2] = push(x2, y2);

    context.save();
    context.beginPath();
    context.moveTo(px0, py0);
    context.lineTo(px1, py1);
    context.lineTo(px2, py2);
    context.closePath();
    context.clip();
    context.setTransform(a, b, c, d, e, f);
    context.drawImage(texture, 0, 0);
    context.restore();
  }

  const sprite: MeshSprite = {
    canvas,
    width,
    height,
    offset: [((minX + maxX) / 2) * scale[0], ((minY + maxY) / 2) * scale[1]],
  };
  meshSpriteCache.set(key, sprite);
  return sprite;
}

/**
 * Квады `MeshRenderer`: слэши, линии, вспышки, блики.
 *
 * Размер — геометрия меша, умноженная на масштаб узла (`sunshine_01` —
 * лента `AVG_plane_06`, а не экранный прямоугольник), поворот — из мирового
 * кватерниона. Если меша в выгрузке нет, рисуем прямоугольником по масштабу.
 */
function compileQuads(bundle: StoryFxBundle): RuntimeQuad[] {
  const transforms = buildTransforms(bundle.index.prefabs ?? []);
  const activity = buildActivity(bundle.index.prefabs ?? []);
  const quads: RuntimeQuad[] = [];

  // Кривые `_Amount` из клипов: путь узла — CRC от пути относительно корня.
  const amountCurves = new Map<number, Array<[number, number]>>();
  let clipStop = 0;
  for (const animation of bundle.index.animations ?? []) {
    clipStop = Math.max(clipStop, animation.stop || 0);
    for (const curve of animation.curves) {
      if (curve.typeId !== 23 && curve.typeId !== 199) continue;
      if (!curve.keys?.length) continue;
      amountCurves.set(curve.path, curve.keys);
    }
  }

  const meshLibrary = bundle.index.meshes ?? {};

  for (const node of walkNodes(bundle.index.prefabs ?? [])) {
    if (activity.get(node.path) === false) continue;
    const transform = transforms.get(node.path);
    if (!transform) continue;

    const meshName = (node.components ?? []).find(
      (component) => component.type === 'MeshFilter'
    )?.mesh;
    const mesh = meshName ? meshLibrary[meshName] : undefined;

    for (const component of node.components ?? []) {
      if (component.type !== 'MeshRenderer') continue;
      for (const material of component.materials ?? []) {
        const file = material?.textures?._MainTex?.file;
        if (!file) continue;
        const image = bundle.images.get(file);
        if (!image) continue;

        // Кривая растворения именно этого узла (если клип её содержит).
        const relative = node.path.split('/').slice(1).join('/');
        const amountKeys = amountCurves.get(crc32(relative)) ?? null;

        // Тинт и прозрачность квада живут в `_MainColor` (`_Color` почти
        // всегда белый): у `avg_sunshine_01` это тёплый `[.53,.50,.44]` с
        // альфой 0.116, без него луч заливал кадр белым.
        const colors = material?.colors ?? {};
        const color = (colors._MainColor ?? colors._Color ?? [1, 1, 1, 1]) as number[];
        const dissolve = amountKeys ? null : dissolveMaskForMaterial(bundle, material);
        // Если растворение анимируется клипом, текстуру берём целиком,
        // а видимость считаем по кривой в каждом кадре.
        const prepared = prepareTexture(
          image,
          [color[0] ?? 1, color[1] ?? 1, color[2] ?? 1],
          dissolve
        );
        const axis = qrot(transform.rot, [1, 0, 0]);
        const rotation = Math.atan2(axis[1], axis[0]);

        // Меш: силуэт и UV берём из геометрии, спрайт печём один раз.
        const sprite = mesh
          ? bakeMeshSprite(
              mesh,
              prepared,
              [transform.scale[0], transform.scale[1]],
              `${meshName}|${material?.name ?? ''}|${image.src}|${
                dissolve ? `${dissolve.image.src}|${dissolve.amount}|${dissolve.border}` : ''
              }|${color.slice(0, 3).join(',')}|${transform.scale[0]},${transform.scale[1]}`
            )
          : null;

        // `_DstBlend`: 10 = OneMinusSrcAlpha (обычная альфа), 0/1 = Zero/One —
        // аддитивные материалы (лучи, вспышки, блики). Если аддитивную текстуру
        // смешать как обычную, её чёрный фон накрывает кадр прямоугольником.
        const floats = material?.floats;
        const dstBlend = floats?._DstBlend;
        const additive = dstBlend === 0 || dstBlend === 1;

        // Оценка видимости — по готовому спрайту: у меша край текстуры
        // обрезан геометрией, и «непрозрачный край» ничего не значит.
        const stats = textureStats(sprite?.canvas ?? prepared);
        // Растворённый слой или сплошная заливка кадра — не рисуем.
        if (stats.alpha < 0.02) continue;
        if (
          !sprite &&
          !additive &&
          stats.alpha > 0.9 &&
          (stats.luminance < 0.12 || stats.luminance > 0.94)
        ) {
          continue;
        }
        // Непрозрачные края — «лист» на весь кадр (снег, дым): в игре он
        // маскируется другими слоями, статично даёт видимый прямоугольник.
        // У аддитивных материалов чёрный край ничего не накрывает.
        if (!sprite && !additive && stats.edge > 0.15) continue;

        // Скролл `_MainUSpeed/_MainVSpeed`: в игре лучи, дым и блики камеры
        // едут по UV. Маску растворения не двигаем — если она своя, текстура
        // остаётся статичной, иначе застывшая виньетка уехала бы с кадра.
        const dissolveFile = material?.textures?._DissolveTex?.file;
        const scrollable = !dissolveFile || dissolveFile === file;
        const scroll: [number, number] = scrollable
          ? [
              typeof floats?._MainUSpeed === 'number' ? floats._MainUSpeed : 0,
              typeof floats?._MainVSpeed === 'number' ? floats._MainVSpeed : 0,
            ]
          : [0, 0];

        quads.push({
          texture: sprite?.canvas ?? prepared,
          x: transform.pos[0],
          y: transform.pos[1],
          width: sprite?.width ?? (Math.abs(transform.scale[0]) || 1),
          height: sprite?.height ?? (Math.abs(transform.scale[1]) || 1),
          rotation,
          alpha: clamp(color[3] ?? 1, 0, 1),
          blend: additive ? 'add' : 'alpha',
          amountKeys,
          stop: clipStop,
          // Запечённый спрайт статичен: UV внутри него уже не подвинуть.
          scroll: sprite ? [0, 0] : scroll,
          offset: sprite?.offset ?? [0, 0],
        });
      }
    }
  }

  return quads;
}

function compileSystems(bundle: StoryFxBundle): RuntimeSystem[] {
  const transforms = buildTransforms(bundle.index.prefabs ?? []);
  const localScales = buildLocalScales(bundle.index.prefabs ?? []);
  const activity = buildActivity(bundle.index.prefabs ?? []);
  const systems: RuntimeSystem[] = [];

  for (const system of bundle.index.systems ?? []) {
    const renderer = system.renderer;
    // Выключенный узел не рисуется: у части префабов системы остаются в
    // дереве, но `m_IsActive = false`.
    if (activity.get(system.node) === false) continue;
    // `mode = 5` (None) — невидимые системы-эмиттеры, которые в игре
    // кормят trails/суб-эмиттеры. Рисовать их квадами нельзя.
    if (renderer?.mode === 5) continue;
    const textureName = renderer?.texture ?? null;
    const source = textureName ? bundle.images.get(textureName) ?? null : null;
    // Default-Particle — заглушка материала, а не картинка эффекта.
    if (!source || !textureName || /default-particle/i.test(textureName)) continue;

    const baseColor = sampleGradient(system.startColor, 0);
    const texture = prepareTexture(
      source,
      [baseColor[0], baseColor[1], baseColor[2]],
      dissolveMask(bundle, renderer?.materials)
    );

    const transform = transforms.get(system.node) ?? {
      pos: [0, 0, 0] as Vec3,
      rot: [0, 0, 0, 1],
      scale: [1, 1, 1] as Vec3,
    };
    const hint = textureHint(bundle, textureName ?? '');
    const speed = spawnValue(system.startSpeed, 0);
    const { direction, spread } = resolveDirection(
      transform,
      system.shape?.angle ?? 0,
      hint,
      speed
    );
    const tint = renderer?.tint ?? [1, 1, 1, 1];
    const rate = Math.max(
      0,
      sampleCurve(system.rate, 0, spawnValue(system.rate, 0))
    );
    // У снега/слэшей `rateOverTime` = 0, а весь поток задан `rateOverDistance`.
    // Анимации эмиттера в выгрузке нет, поэтому считаем его как поток во
    // времени: иначе такие эффекты молчат.
    const rateDistance = Math.max(
      0,
      sampleCurve(system.rateOverDistance, 0, spawnValue(system.rateOverDistance, 0))
    );
    // В режиме Mesh `startSize` — множитель вершин меша, а не размер в
    // юнитах. У маски `avg_062_black_01` меш — единичный квад, у дыма
    // `avg_071_smock_01` — вытянутая плоскость: без размаха частицы
    // выходили квадратами неверного размера.
    const span = renderer?.mode === 4 ? renderer?.meshSize : null;
    const meshX = span && span[0] > 0 ? span[0] : 1;
    const meshY = span && span[1] > 0 ? span[1] : meshX;
    // `ParticleSystemScalingMode.Local` умножает размер на масштаб самого
    // эмиттера. Маска `avg_062_black_01` увеличена на 1.17/0.85 и без этого
    // не закрывала экран — по краям оставались полосы фона. Иерархический
    // режим (0) не применяем: у AVG-контейнеров масштаб в сотни раз больше
    // экрана, и размеры выходят в миллионы пикселей.
    const local = localScales.get(system.node) ?? ([1, 1, 1] as Vec3);
    const useLocal = system.scalingMode === 1;
    const sizeScaleX = useLocal ? Math.abs(local[0]) || 1 : 1;
    const sizeScaleY = useLocal ? Math.abs(local[1]) || 1 : 1;

    // `_Opacity` материала гасит частицу целиком (у части эффектов 0.5).
    const materialOpacity = (renderer?.materials ?? []).reduce((value, name) => {
      const opacity = bundle.index.materials?.[name]?.floats?._Opacity;
      return typeof opacity === 'number' && opacity >= 0 && opacity < value ? opacity : value;
    }, 1);

    // Скролл текстуры: дым и вода в игре «ползут», а не стоят на месте.
    let scrollX = 0;
    let scrollY = 0;
    for (const name of renderer?.materials ?? []) {
      const floats = bundle.index.materials?.[name]?.floats;
      const u = floats?._MainUSpeed;
      const v = floats?._MainVSpeed;
      if (typeof u === 'number' && Math.abs(u) > 0.0001) scrollX = u;
      if (typeof v === 'number' && Math.abs(v) > 0.0001) scrollY = v;
      if (scrollX || scrollY) break;
    }

    const trailModule = system.trail;
    const trail = trailModule
      ? {
          lifetime: Math.max(0.05, sampleCurve(trailModule.lifetime, 0, 0.5)),
          minDistance: Math.max(1, (trailModule.minVertexDistance || 0.1) * UNIT),
          width: trailModule.widthOverTrail,
          color: trailModule.colorOverTrail,
        }
      : null;

    systems.push({
      system,
      transform,
      texture,
      blend: renderer?.blend === 'alpha' ? 'alpha' : 'add',
      direction,
      spread,
      rate: Number.isFinite(rate) ? rate : 0,
      rateDistance: Number.isFinite(rateDistance) ? rateDistance : 0,
      accumulator: 0,
      elapsed: 0,
      particles: [],
      max: Math.min(system.max || 600, 600),
      tintAlpha: clamp((tint[3] ?? 1) * materialOpacity, 0, 1),
      burstFired: [],
      meshX,
      meshY,
      stretch:
        renderer?.mode === 1 && Number.isFinite(renderer?.lengthScale)
          ? Math.abs(renderer?.lengthScale ?? 0)
          : 0,
      sizeScaleX,
      sizeScaleY,
      delay: Math.max(0, sampleCurve(system.delay, 0, 0)),
      scroll: [scrollX, scrollY],
      pattern: null,
      trail,
      subEmitters: [],
    });
  }

  // Второй проход: суб-эмиттеры ссылаются на системы по PathID.
  const byId = new Map<number, RuntimeSystem>();
  for (const runtime of systems) {
    const id = runtime.system.id ?? 0;
    if (id) byId.set(id, runtime);
  }
  for (const runtime of systems) {
    for (const emitter of runtime.system.subEmitters ?? []) {
      // 0 — Birth; столкновения и смерть в статичной сцене не воспроизвести.
      if (emitter.type !== 0) continue;
      const target = byId.get(emitter.emitter);
      if (!target || target === runtime) continue;
      runtime.subEmitters.push({
        target,
        probability: clamp(emitter.probability ?? 1, 0, 1),
      });
    }
  }

  return systems;
}

function spawnParticle(runtime: RuntimeSystem, age = 0): Particle | null {
  const { system, transform } = runtime;
  const life = Math.max(0.2, spawnValue(system.life, 1));
  if (age >= life) return null;

  const speed = Math.max(0, spawnValue(system.startSpeed, 0)) * UNIT;
  // Размер — в юнитах префаба (1 юнит = 100 px); у mesh-частиц он ещё
  // умножается на размах меша. `startSizeY` задан у вытянутых частиц
  // (искры, слэши): рисовать их квадратом — заметная ошибка.
  // Масштаб узлов префаба здесь намеренно не применяется: у AVG-эффектов
  // контейнеры (`scale`, `ab`, `cross_star_01`) увеличены в сотни раз под
  // меши, и умножение размера частицы на такой масштаб даёт миллионы
  // пикселей. Размер задан в `startSize` уже в мировых юнитах камеры.
  const size = Math.max(0.01, spawnValue(system.startSize, 1));
  const sizeY = system.startSizeY
    ? Math.max(0.01, spawnValue(system.startSizeY, 1))
    : size;
  let baseX = Math.max(0.1, size * UNIT) * runtime.meshX * runtime.sizeScaleX;
  let baseY = Math.max(0.1, sizeY * UNIT) * runtime.meshY * runtime.sizeScaleY;
  const start = sampleGradient(system.startColor, 0);

  const vx = runtime.direction[0] * speed;
  const vy = runtime.direction[1] * speed;
  // Stretched Billboard: ширина — `startSize`, длина — скорость × lengthScale.
  // Без растяжения искры и слэши выглядят квадратами вместо полос.
  let rotation = spawnValue(system.startRotation, 0);
  if (runtime.stretch > 0) {
    const speedPx = Math.hypot(vx, vy);
    const length = runtime.stretch * speedPx;
    if (length > baseY) {
      baseY = length;
      // Квад растягивается по локальной оси Y — разворачиваем её по скорости.
      rotation = Math.atan2(vy, vx) - Math.PI / 2;
    }
  }
  const offset = shapeOffset(system, transform);

  const uv = system.uv;
  const uvRow =
    uv && uv.rowMode === 1 ? Math.floor(Math.random() * Math.max(1, uv.tilesY)) : 0;

  return {
    x: transform.pos[0] + offset[0],
    y: transform.pos[1] + offset[1],
    vx,
    vy,
    age,
    life,
    sizeX: baseX,
    sizeY: baseY,
    rotation,
    alpha: clamp(start[3] * runtime.tintAlpha, 0, 1),
    uvRow,
    history: [],
  };
}

export const StoryFxCanvas: React.FC<{ name: string }> = ({ name }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let started = false;
    let last = 0;
    let runtime: RuntimeSystem[] = [];
    let quads: RuntimeQuad[] = [];
    let clock = 0;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    const ctx: CanvasRenderingContext2D = context;

    void loadStoryFx(name).then((loaded) => {
      if (cancelled || !loaded) return;
      const systems = compileSystems(loaded);
      // Квады `MeshRenderer` — не только «эффекты без частиц»: у слэшей и
      // линий это основной слой, а частицы лишь добавляют искры.
      quads = compileQuads(loaded);
      if (!systems.length && !quads.length) return;
      runtime = systems;
      start();
    });

    const step = (now: number) => {
      if (cancelled) return;
      frame = requestAnimationFrame(step);
      if (document.hidden) {
        last = now;
        return;
      }
      const delta = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      update(runtime, delta);
      clock += delta;
      draw(runtime, quads, clock);
    };

    const start = () => {
      if (started) return;
      started = true;
      prewarm(runtime);
      frame = requestAnimationFrame(step);
    };

    function prewarm(systems: RuntimeSystem[]) {
      for (const system of systems) {
        if (!system.system.prewarm) continue;
        const life = spawnValue(system.system.life, 1);
        const count = Math.min(system.max, Math.round(system.rate * life));
        for (let index = 0; index < count; index += 1) {
          const particle = spawnParticle(system, Math.random() * life);
          if (particle) system.particles.push(particle);
        }
      }
    }

    function emit(system: RuntimeSystem, count: number, total: number): number {
      let guard = 0;
      while (
        count >= 1 &&
        system.particles.length < system.max &&
        total < MAX_PARTICLES &&
        guard < 60
      ) {
        count -= 1;
        const particle = spawnParticle(system);
        if (particle) {
          system.particles.push(particle);
          total += 1;
          for (const sub of system.subEmitters) {
            if (Math.random() > sub.probability) continue;
            if (sub.target.particles.length >= sub.target.max) continue;
            const child = spawnParticle(sub.target);
            if (!child) continue;
            child.x = particle.x;
            child.y = particle.y;
            sub.target.particles.push(child);
            total += 1;
          }
        }
        guard += 1;
      }
      return total;
    }

    function update(systems: RuntimeSystem[], delta: number) {
      let total = systems.reduce((count, system) => count + system.particles.length, 0);
      for (const system of systems) {
        const duration = Math.max(0.1, system.system.duration || 0.1);
        system.elapsed += delta;

        // `rateOverTime` — кривая по времени системы, а не константа: у части
        // эффектов она стартует с нуля и растёт. Раньше значение бралось
        // один раз в t=0, и такие системы не выпускали ни одной частицы.
        const phase = (system.elapsed % duration) / duration;
        const oneShotDone =
          !system.system.loop && system.elapsed > duration;
        const rate = oneShotDone || system.elapsed < system.delay
          ? 0
          : Math.max(
              Math.max(0, sampleCurve(system.system.rate, phase, system.rate)),
              Math.max(
                0,
                sampleCurve(system.system.rateOverDistance, phase, system.rateDistance)
              )
            );
        if (rate > 0) {
          system.accumulator += rate * delta;
          const count = Math.floor(system.accumulator);
          system.accumulator -= count;
          total = emit(system, count, total);
          if (system.accumulator > 4) system.accumulator = 4;
        }

        // Bursts: `[time, count, cycles, interval]` — вспышки и взрывы.
        const bursts = system.system.bursts ?? [];
        if (!system.burstFired) system.burstFired = [];
        for (let index = 0; index < bursts.length; index += 1) {
          const burst = bursts[index];
          if (oneShotDone || system.elapsed < system.delay) continue;
          const cycles = Math.max(1, burst.cycles ?? 1);
          const interval = Math.max(0.0001, burst.interval ?? 0);
          let fired = system.burstFired[index] ?? 0;
          while (fired < cycles) {
            const time = burst.time + fired * interval;
            if (system.elapsed < time) break;
            fired += 1;
            const count = Math.max(
              0,
              sampleCurve(burst.count, phase, 0)
            );
            total = emit(system, count, total);
          }
          system.burstFired[index] = fired;
        }

        const alive: Particle[] = [];
        const velocity = system.system.velocity;
        for (const particle of system.particles) {
          particle.age += delta;
          if (particle.age >= particle.life) continue;
          const progress = particle.age / particle.life;

          // Unity: gravityModifier умножает гравитацию мира (9.81 м/с²),
          // а не «единицу» — без коэффициента падение было в 9.81 раза слабее.
          const gravity = sampleCurve(system.system.gravity, progress, 0);
          particle.vy -= gravity * 9.81 * UNIT * delta;

          if (velocity?.enabled) {
            particle.x += sampleCurve(velocity.x, progress, 0) * UNIT * delta;
            particle.y += sampleCurve(velocity.y, progress, 0) * UNIT * delta;
          }

          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;

          // Trail: запоминаем точки, пока частица не ушла дальше
          // `minVertexDistance`; старые отваливаются по времени жизни полосы.
          if (system.trail) {
            const last = particle.history[particle.history.length - 1];
            const moved = last
              ? Math.hypot(particle.x - last.x, particle.y - last.y)
              : Infinity;
            if (moved >= system.trail.minDistance) {
              particle.history.push({ x: particle.x, y: particle.y, age: particle.age });
            }
            const cutoff = particle.age - system.trail.lifetime;
            while (particle.history.length && particle.history[0].age < cutoff) {
              particle.history.shift();
            }
            if (particle.history.length > 64) particle.history.shift();
          }

          alive.push(particle);
        }
        system.particles = alive;
      }
    }

    function draw(systems: RuntimeSystem[], layers: RuntimeQuad[], elapsed: number) {
      const cssWidth = canvas?.clientWidth ?? 0;
      const cssHeight = canvas?.clientHeight ?? 0;
      if (!canvas || !cssWidth || !cssHeight) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(cssWidth * ratio);
      const pixelHeight = Math.round(cssHeight * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Фон сцены растягивается как `object-cover`, поэтому эффект
      // масштабируется по большей стороне: иначе на широком/высоком окне
      // частицы выглядят мельче фона и смещаются к центру.
      const factor = Math.max(cssWidth / DESIGN_W, cssHeight / DESIGN_H);
      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;

      for (const quad of layers) {
        const width = quad.width * factor;
        const height = quad.height * factor;
        if (width < 1 || height < 1) continue;

        let alpha = quad.alpha;
        if (quad.amountKeys) {
          // Клип играет один раз: после `stop` держим последний ключ.
          const time = quad.stop > 0 ? Math.min(elapsed, quad.stop) : elapsed;
          const amount = sampleKeys(quad.amountKeys, time, 0);
          alpha *= clamp(1 - amount, 0, 1);
        }
        if (alpha < 0.01) continue;

        ctx.globalCompositeOperation = quad.blend === 'add' ? 'lighter' : 'source-over';
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(centerX + quad.x * factor, centerY - quad.y * factor);
        if (quad.rotation) ctx.rotate(-quad.rotation);

        // Пивот меша не в центре: спрайт смещаем в повёрнутой системе.
        const cos = Math.cos(quad.rotation);
        const sin = Math.sin(quad.rotation);
        const left = (quad.offset[0] * cos - quad.offset[1] * sin) * factor - width / 2;
        const top = -(quad.offset[0] * sin + quad.offset[1] * cos) * factor - height / 2;

        const texture = quad.texture;
        const axes = quad.scroll[0] || quad.scroll[1] ? seamlessAxes(texture) : { h: false, v: false };
        const dx = axes.h ? -(((quad.scroll[0] * elapsed) % 1) * width) : 0;
        const dy = axes.v ? -(((quad.scroll[1] * elapsed) % 1) * height) : 0;

        if (dx || dy) {
          // Скролл UV: тайл сдвигается и заворачивается по краям.
          ctx.beginPath();
          ctx.rect(left, top, width, height);
          ctx.clip();
          for (let kx = dx ? -1 : 0; kx <= (dx ? 1 : 0); kx += 1) {
            for (let ky = dy ? -1 : 0; ky <= (dy ? 1 : 0); ky += 1) {
              ctx.drawImage(
                texture,
                left + dx + kx * width,
                top + dy + ky * height,
                width,
                height
              );
            }
          }
          ctx.restore();
          continue;
        }

        ctx.drawImage(texture, left, top, width, height);
        ctx.restore();
      }

      // Скролл текстуры задаётся один раз на кадр: смещение в пикселях
      // текстуры, а не в пикселях частицы.
      for (const system of systems) {
        if (!system.scroll[0] && !system.scroll[1]) continue;
        const uv = system.system.uv;
        if (uv && uv.tilesX * uv.tilesY > 1) continue;
        if (!system.texture) continue;
        if (!system.pattern) system.pattern = ctx.createPattern(system.texture, 'repeat');
        if (!system.pattern) continue;
        const texture = system.texture as HTMLImageElement | HTMLCanvasElement;
        system.pattern.setTransform(
          new DOMMatrix().translate(
            system.scroll[0] * system.elapsed * texture.width,
            -system.scroll[1] * system.elapsed * texture.height
          )
        );
      }

      // Trail-полосы рисуем до частиц: голова должна быть поверх хвоста.
      for (const system of systems) {
        if (!system.trail || !system.texture || !system.particles.length) continue;
        ctx.globalCompositeOperation = system.blend === 'add' ? 'lighter' : 'source-over';
        for (const particle of system.particles) {
          if (particle.history.length < 2) continue;
          const points = [
            ...particle.history,
            { x: particle.x, y: particle.y, age: particle.age },
          ];
          for (let index = 1; index < points.length; index += 1) {
            const from = points[index - 1];
            const to = points[index];
            const progress = index / (points.length - 1);
            // Ширина полосы задана в юнитах сцены, а не в размере частицы:
            // у искр и линий `startSize` может быть нулевым, и полоса — это
            // единственное, что видно.
            const width = Math.max(
              1,
              sampleCurve(system.trail.width, progress, 1) * UNIT * factor
            );
            const color = sampleGradient(system.trail.color, progress);
            const alpha = clamp(particle.alpha * color[3] * progress, 0, 1);
            if (alpha < 0.01) continue;
            const dx = (to.x - from.x) * factor;
            const dy = -(to.y - from.y) * factor;
            const length = Math.hypot(dx, dy) + width;
            if (length < 1) continue;
            ctx.globalAlpha = alpha;
            ctx.save();
            ctx.translate(centerX + to.x * factor, centerY - to.y * factor);
            ctx.rotate(Math.atan2(dy, dx));
            ctx.drawImage(system.texture, -length, -width / 2, length, width);
            ctx.restore();
          }
        }
      }

      for (const system of systems) {
        if (!system.particles.length || !system.texture) continue;
        ctx.globalCompositeOperation = system.blend === 'add' ? 'lighter' : 'source-over';
        for (const particle of system.particles) {
          const progress = particle.age / particle.life;
          const color = sampleGradient(system.system.colorOverLife, progress);
          const alpha = clamp(particle.alpha * color[3], 0, 1);
          if (alpha < 0.01) continue;

          // Размер меняется по Size over Lifetime, а не фиксируется при
          // рождении; иначе дым/искры не растут и не угасают, как в игре.
          const sizeOver = system.system.sizeOverLife
            ? sampleCurve(system.system.sizeOverLife, progress, 1)
            : 1;
          const width = Math.max(1, particle.sizeX * factor * sizeOver);
          const height = Math.max(1, particle.sizeY * factor * sizeOver);
          const rotation =
            particle.rotation +
            (system.system.rotationOverLife
              ? sampleCurve(system.system.rotationOverLife, progress, 0)
              : 0);

          ctx.globalAlpha = alpha;
          ctx.save();
          ctx.translate(
            centerX + particle.x * factor,
            centerY - particle.y * factor
          );
          // Unity вращает против часовой стрелки в системе с Y вверх,
          // у canvas Y направлен вниз — знак поворота инвертируется.
          if (rotation) ctx.rotate(-rotation);

          const uv = system.system.uv;
          const texture = system.texture;
          if (system.pattern && !(uv && uv.tilesX * uv.tilesY > 1)) {
            // Ползущая текстура: заливка повторяющимся узором со сдвигом UV.
            ctx.fillStyle = system.pattern;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            ctx.restore();
            continue;
          }
          if (uv && uv.tilesX * uv.tilesY > 1) {
            // Атлас: у светлячков 2×2, каждый кадр — один светлячок.
            const frame = sampleCurve(uv.frameOverTime, progress, 0);
            let column: number;
            let row: number;
            if (uv.animationType === 0) {
              const total = uv.tilesX * uv.tilesY;
              const index = Math.floor(frame * total) % total;
              column = index % uv.tilesX;
              row = Math.floor(index / uv.tilesX);
            } else {
              column = Math.floor(frame * uv.tilesX) % uv.tilesX;
              row = particle.uvRow % uv.tilesY;
            }
            const tileW = texture.width / uv.tilesX;
            const tileH = texture.height / uv.tilesY;
            ctx.drawImage(
              texture,
              column * tileW,
              row * tileH,
              tileW,
              tileH,
              -width / 2,
              -height / 2,
              width,
              height
            );
          } else {
            ctx.drawImage(texture, -width / 2, -height / 2, width, height);
          }
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [name]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      data-story-effect="particles"
    />
  );
};
