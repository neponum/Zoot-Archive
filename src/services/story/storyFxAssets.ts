import AVG_EFFECT_MAP from '../../data/avgEffectMap.json';

/**
 * Эффекты сценария `[bgeffect(name="$eb_snow")]`.
 *
 * `$eb_*` — переменная из gamedata, а не имя файла: `eb_snow` → `avg_snow_01`,
 * и уже этот префаб лежит в бандле `avg/effects/background/avg_snow_01.ab`.
 * Данные выгружены скриптом `scripts/avgfx/export.py`: `index.json` с
 * деревом префаба, системами частиц и материалами плюс WebP-текстуры.
 */

const BASES = [
  'https://raw.githubusercontent.com/neponum/zoot-data/main/avgfx',
  'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/avgfx',
];

const REQUEST_TIMEOUT = 12000;

export interface FxCurve {
  state: number;
  scalar: number;
  min: number;
  keys?: number[][];
  minKeys?: number[][];
}

export interface FxGradient {
  state: number;
  color?: number[];
  colors?: number[][];
  alphas?: number[][];
}

export interface FxShape {
  type: number;
  radius?: number | null;
  angle?: number;
  scale?: number[] | null;
  pos?: number[] | null;
  rot?: number[] | null;
}

export interface FxRenderer {
  mode: number;
  maxSize?: number;
  minSize?: number;
  /** Stretched billboard: растяжение вдоль скорости. */
  lengthScale?: number;
  velocityScale?: number;
  alignment?: number;
  /** Имя меша у mesh-частиц (`mode === 4`). */
  mesh?: string | null;
  /**
   * Полный размах меша по X/Y: в режиме `Mesh` `startSize` масштабирует
   * вершины, поэтому размер частицы = `startSize × meshSize`.
   */
  meshSize?: [number, number] | null;
  texture: string | null;
  blend: 'add' | 'alpha';
  tint?: number[];
  materials?: string[];
}

export interface FxUv {
  tilesX: number;
  tilesY: number;
  animationType: number;
  rowMode: number;
  cycles: number;
  frameOverTime?: FxCurve | null;
}

export interface FxBurst {
  time: number;
  count?: FxCurve | null;
  cycles: number;
  interval: number;
}

export interface FxVelocity {
  enabled: boolean;
  space?: number;
  x?: FxCurve | null;
  y?: FxCurve | null;
  z?: FxCurve | null;
}

/** Модуль Trail: полоса, тянущаяся за частицей. */
export interface FxTrail {
  ratio: number;
  lifetime?: FxCurve | null;
  minVertexDistance: number;
  widthOverTrail?: FxCurve | null;
  colorOverTrail?: FxGradient | null;
  dieWithParticles: boolean;
}

export interface FxSubEmitter {
  type: number;
  probability: number;
  /** PathID системы-получателя. */
  emitter: number;
}

export interface FxSystem {
  node: string;
  /** PathID компонента — по нему суб-эмиттеры находят получателя. */
  id?: number;
  duration: number;
  loop: boolean;
  prewarm: boolean;
  delay?: FxCurve | null;
  speed?: number;
  max?: number;
  life: FxCurve;
  startSpeed: FxCurve;
  startSize: FxCurve;
  /** Второй размер у вытянутых частиц (`size3D`). */
  startSizeY?: FxCurve | null;
  startRotation?: FxCurve | null;
  gravity?: FxCurve | null;
  startColor?: FxGradient | null;
  rate?: FxCurve | null;
  /**
   * Эмиссия по пройденному пути. У части префабов (снег, искры слэшей)
   * `rateOverTime` = 0, а всё излучение задано здесь: эмиттер в игре
   * двигается анимацией, которой в выгрузке нет.
   */
  rateOverDistance?: FxCurve | null;
  bursts?: FxBurst[];
  velocity?: FxVelocity | null;
  /** Unity ParticleSystemScalingMode: 0 — Hierarchy, 1 — Local, 2 — Shape. */
  scalingMode?: number;
  shape?: FxShape | null;
  sizeOverLife?: FxCurve | null;
  rotationOverLife?: FxCurve | null;
  colorOverLife?: FxGradient | null;
  uv?: FxUv | null;
  /** Trail-модуль (полосы за искрами и слэшами). */
  trail?: FxTrail | null;
  /** Суб-эмиттеры: при рождении частицы запускают другую систему. */
  subEmitters?: FxSubEmitter[];
  renderer?: FxRenderer | null;
}

/** Компонент узла префаба: квады `MeshRenderer` тоже рисуются. */
export interface FxComponent {
  type: string;
  materials?: FxMaterial[] | null;
  /** У `MeshFilter` — имя меша в `FxIndex.meshes`. */
  mesh?: string | null;
}

/**
 * Геометрия меша квада.
 *
 * `v` — позиции в локальных координатах меша, `uv` — текстурные координаты,
 * `idx` — индексы треугольников. Без неё квад рисовался прямоугольником:
 * лучи `avg_sunshine_01` — лента `AVG_plane_06`, а не экранный лист.
 */
export interface FxMesh {
  v: number[][];
  uv: number[][];
  idx: number[];
}

export interface FxNode {
  name: string;
  path: string;
  active?: boolean;
  pos?: number[];
  rot?: number[];
  scale?: number[];
  components?: FxComponent[];
  kids?: FxNode[];
}

export interface FxMaterial {
  name?: string;
  shader?: string | null;
  floats?: Record<string, number>;
  colors?: Record<string, number[]>;
  textures?: Record<string, { file: string; scale?: number[]; offset?: number[] }>;
}

/** Кривая анимации клипа: путь узла (CRC), атрибут и ключи [время, значение]. */
export interface FxAnimationCurve {
  path: number;
  attribute: number;
  typeId: number;
  customType: number;
  index: number;
  keys: Array<[number, number]>;
}

export interface FxAnimation {
  name: string;
  stop: number;
  sampleRate: number;
  curves: FxAnimationCurve[];
}

export interface FxIndex {
  stem: string;
  duration: number;
  loop: boolean;
  /** Клипы Animator: растворение квадов и трансформы. */
  animations?: FxAnimation[];
  /** Меши квадов по имени (`MeshFilter`). */
  meshes?: Record<string, FxMesh>;
  /** Контроллеры эффекта: длительность и тип затухания. */
  effects?: Array<{ duration: number; fadeType: number; loop: number }>;
  prefabs: FxNode[];
  systems: FxSystem[];
  images: Record<string, string>;
  materials?: Record<string, FxMaterial>;
}

export interface StoryFxBundle {
  stem: string;
  base: string;
  index: FxIndex;
  images: Map<string, HTMLImageElement>;
}

/** Имя из скрипта (`eb_snow` или `$eb_snow`) → stem префаба (`avg_snow_01`). */
export function storyFxStem(name: string): string | null {
  const key = name.trim().replace(/^\$/, '').toLowerCase();
  // В сценарии встречается и переменная (`$eb_snow`), и уже развёрнутое имя
  // префаба (`AVG_firefly_01`) — второе само по себе является stem'ом.
  if (key.startsWith('avg_')) return key;
  const stem = (AVG_EFFECT_MAP as Record<string, string>)[key];
  return stem ? stem.toLowerCase() : null;
}

function withTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function fetchJson(url: string): Promise<FxIndex | null> {
  try {
    // Не `force-cache`: иначе 404, полученный до выкладки эффекта, залипает
    // в кэше браузера и сцена до конца сессии остаётся на CSS-заглушке.
    const response = await withTimeout(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    return (await response.json()) as FxIndex;
  } catch {
    return null;
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    // CORS: иначе canvas «отравлен» и с него нельзя прочитать пиксели
    // (диагностика/скриншоты), да и кэш ведёт себя предсказуемее.
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

const cache = new Map<string, Promise<StoryFxBundle | null>>();

/**
 * Загрузка эффекта: сначала `index.json`, затем текстуры — строго по одной,
 * без параллельных пачек. При недоступности первого зеркала пробуем второе.
 */
export function loadStoryFx(name: string): Promise<StoryFxBundle | null> {
  const stem = storyFxStem(name);
  if (!stem) return Promise.resolve(null);

  const cached = cache.get(stem);
  if (cached) return cached;

  const task = (async (): Promise<StoryFxBundle | null> => {
    for (const base of BASES) {
      const index = await fetchJson(`${base}/${stem}/index.json`);
      if (!index || !Array.isArray(index.systems)) continue;

      const images = new Map<string, HTMLImageElement>();
      // по одной: при старте главы сеть не должна захлёбываться
      for (const file of Object.keys(index.images || {})) {
        const image = await loadImage(`${base}/${stem}/${file}`);
        if (image) images.set(file, image);
      }
      return { stem, base, index, images };
    }
    return null;
  })();

  cache.set(stem, task);
  // ошибку не кэшируем навсегда: следующий показ сцены попробует снова
  void task.then((bundle) => {
    if (!bundle) cache.delete(stem);
  });
  return task;
}

const prefetchQueue: string[] = [];
let prefetching = false;

async function drainPrefetch(): Promise<void> {
  if (prefetching) return;
  prefetching = true;
  try {
    while (prefetchQueue.length) {
      const stem = prefetchQueue.shift();
      if (!stem) continue;
      try {
        await loadStoryFx(stem);
      } catch {
        // Эффект необязателен: сцена просто останется без него.
      }
    }
  } finally {
    prefetching = false;
  }
}

/**
 * Заранее тянет эффекты сценария (`[bgeffect]`, `[effect]`).
 *
 * Без этого первый кадр сцены идёт без эффекта: `index.json` и текстуры
 * качаются уже после того, как картинка появилась, и вспышка «догоняет»
 * кадр через несколько секунд. Загрузка идёт по одному файлу в фоне.
 */
/** Загружает эффекты и резолвится, когда они готовы (или не загрузились). */
export async function ensureStoryFx(names: string[]): Promise<void> {
  const stems = Array.from(
    new Set(
      names
        .map((name) => storyFxStem(name))
        .filter((stem): stem is string => Boolean(stem))
    )
  );
  await Promise.all(stems.map((stem) => loadStoryFx(stem).catch(() => null)));
}

export function prefetchStoryFx(names: string[]): void {
  for (const name of names) {
    const stem = storyFxStem(name);
    if (!stem || cache.has(stem) || prefetchQueue.includes(stem)) continue;
    prefetchQueue.push(stem);
  }
  void drainPrefetch();
}
