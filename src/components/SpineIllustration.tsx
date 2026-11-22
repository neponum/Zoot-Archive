import React, { useEffect, useRef, useState } from 'react';
import { getDynIllustAlign, type DynIllustAssets } from '../services/dynIllustAlign';
import { unpremultiplyTexture } from '../lib/spineTexture';

/**
 * Анимированный образ оперативника (динамическая иллюстрация).
 *
 * Игра хранит такие образы как Spine-модели: в `skin_table.spDynSkins` у скина
 * есть `spDynIllustId` (`sp_dyn_illust_char_003_kalts_sale#14`), а сами файлы
 * лежат в открытом репозитории `isHarryh/Ark-Models` (`models_illust`).
 * Runtime тот же, что у чибиков (`/vendor/spine-canvas-3.8.js`), поэтому
 * анимация проигрывается в canvas без единого байта трафика Vercel.
 *
 * Если модели нет или она не загрузилась, компонент сообщает об ошибке —
 * вызывающая сторона показывает статичный арт.
 */

const RUNTIME_SRC = '/vendor/spine-canvas-3.8.js';
const MODEL_BASE =
  'https://raw.githubusercontent.com/isHarryh/Ark-Models/main/models_illust';
const CACHE_NAME = 'zoot-dyn-skins-v1';

/** Порядок выбора анимации: у иллюстраций покой обычно называется Idle. */
const IDLE_ANIMATIONS = ['Idle', 'Relax', 'Default', 'Loop'];

type SpineRuntime = {
  TextureAtlas: new (atlas: string, loader: (path: string) => unknown) => unknown;
  AtlasAttachmentLoader: new (atlas: unknown) => unknown;
  SkeletonBinary: new (loader: unknown) => {
    readSkeletonData: (data: Uint8Array) => SkeletonData;
  };
  SkeletonJson: new (loader: unknown) => {
    readSkeletonData: (data: unknown) => SkeletonData;
  };
  Skeleton: new (data: SkeletonData) => Skeleton;
  AnimationState: new (data: unknown) => AnimationState;
  AnimationStateData: new (data: SkeletonData) => unknown;
  Vector2: new () => { x: number; y: number };
  canvas: { CanvasTexture: new (image: HTMLImageElement | HTMLCanvasElement) => unknown };
};

type SkeletonData = {
  animations: { name: string; duration: number }[];
};

type Skeleton = {
  updateWorldTransform: () => void;
  setToSetupPose: () => void;
  getBounds: (offset: { x: number; y: number }, size: { x: number; y: number }, temp: number[]) => void;
};

type AnimationState = {
  setAnimation: (track: number, name: string, loop: boolean) => void;
  update: (delta: number) => void;
  apply: (skeleton: Skeleton) => void;
};

let runtimePromise: Promise<SpineRuntime> | null = null;

function loadSpineRuntime(): Promise<SpineRuntime> {
  const existing = (window as unknown as { spine?: SpineRuntime }).spine;
  if (existing?.SkeletonBinary) return Promise.resolve(existing);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<SpineRuntime>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RUNTIME_SRC;
    script.async = true;
    script.onload = () => {
      const spine = (window as unknown as { spine?: SpineRuntime }).spine;
      if (spine?.SkeletonBinary) resolve(spine);
      else reject(new Error('spine runtime is missing'));
    };
    script.onerror = () => reject(new Error('spine runtime failed to load'));
    document.head.appendChild(script);
  }).catch((error) => {
    runtimePromise = null;
    throw error;
  });

  return runtimePromise;
}

async function fetchCached(url: string): Promise<Response> {
  if (!('caches' in window)) return fetch(url);
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (hit) return hit;
  const response = await fetch(url);
  if (response.ok) await cache.put(url, response.clone());
  return response;
}

interface SpineAssets {
  atlasText: string;
  skeletonBinary: Uint8Array;
  /** Все страницы атласа: у больших иллюстраций их две и больше. */
  pages: Array<{ name: string; texture: Blob }>;
}

/** Имена страниц-текстур из атласа (`...png` в начале строки). */
function atlasPages(atlasText: string): string[] {
  return atlasText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.png'));
}

const assetCache = new Map<string, Promise<SpineAssets>>();

/**
 * Пути в `Ark-Models` отличаются от игрового id: файл — это `spDynIllustId`
 * без префикса `sp_`, папка — тот же файл без `char_`
 * (`dyn_illust_char_003_kalts_sale#14` → `dyn_illust_003_kalts_sale#14`).
 */
function modelPaths(dynIllust: string): { folder: string; file: string } {
  const file = dynIllust.replace(/^sp_/, '');
  const folder = file.replace(/^dyn_illust_char_/, 'dyn_illust_');
  return { folder, file };
}

/**
 * Варианты имён в репозитории: у Elite 2 отбрасывается суффикс `_2`
 * (`dyn_illust_char_113_cqbw_2` → `dyn_illust_113_cqbw`), а коллекции вроде
 * Ambience Synesthesia записаны в нижнем регистре. Пробуем по очереди.
 */
function modelCandidates(dynIllust: string): Array<{ folder: string; file: string }> {
  const { folder, file } = modelPaths(dynIllust);
  const list = [
    { folder, file },
    { folder: folder.toLowerCase(), file: file.toLowerCase() },
  ];
  if (folder.endsWith('_2')) {
    list.push({ folder: folder.slice(0, -2), file: file.slice(0, -2) });
    list.push({
      folder: folder.toLowerCase().slice(0, -2),
      file: file.toLowerCase().slice(0, -2),
    });
  }
  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.folder)) return false;
    seen.add(item.folder);
    return true;
  });
}

function loadIllustAssets(dynIllust: string, assets?: DynIllustAssets): Promise<SpineAssets> {
  const cached = assetCache.get(dynIllust);
  if (cached) return cached;

  const request = (async (): Promise<SpineAssets> => {
    // Точные имена из калибровки идут первыми: у части моделей `.skel`
    // лежит без расширения или называется иначе, и по шаблону не находится.
    const tries: DynIllustAssets[] = [];
    if (assets) tries.push(assets);
    for (const { folder, file } of modelCandidates(dynIllust)) {
      tries.push({ folder, atlas: `${file}.atlas`, skel: `${file}.skel`, png: `${file}.png` });
    }
    const seen = new Set<string>();
    for (const item of tries) {
      const key = `${item.folder}/${item.atlas}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const baseUrl = `${MODEL_BASE}/${encodeURIComponent(item.folder)}`;
      const [atlasResponse, skelResponse, imageResponse] = await Promise.all([
        fetchCached(`${baseUrl}/${encodeURIComponent(item.atlas)}`),
        fetchCached(`${baseUrl}/${encodeURIComponent(item.skel)}`),
        fetchCached(`${baseUrl}/${encodeURIComponent(item.png)}`),
      ]);
      if (!atlasResponse.ok || !skelResponse.ok || !imageResponse.ok) continue;
      const [atlasText, skeletonBuffer] = await Promise.all([
        atlasResponse.text(),
        skelResponse.arrayBuffer(),
      ]);
      // Атлас может ссылаться на несколько PNG: качаем каждую страницу.
      const pages = await Promise.all(
        atlasPages(atlasText).map(async (name) => {
          const response = await fetchCached(`${baseUrl}/${encodeURIComponent(name)}`);
          if (!response.ok) throw new Error(`missing atlas page ${name}`);
          return { name, texture: await response.blob() };
        })
      );
      if (!pages.length) throw new Error(`empty atlas for ${dynIllust}`);
      return {
        atlasText,
        skeletonBinary: new Uint8Array(skeletonBuffer),
        pages,
      };
    }
    throw new Error(`no dynamic model for ${dynIllust}`);
  })().catch((error) => {
    assetCache.delete(dynIllust);
    throw error;
  });

  assetCache.set(dynIllust, request);
  return request;
}

function pickIdleAnimation(animations: { name: string }[]): string | null {
  for (const wanted of IDLE_ANIMATIONS) {
    const found = animations.find((animation) => animation.name === wanted);
    if (found) return found.name;
  }
  return animations[0]?.name ?? null;
}

export interface SpineIllustrationProps {
  /** `spDynIllustId` скина: `sp_dyn_illust_char_003_kalts_sale#14`. */
  dynIllust: string;
  /** Модель отрисована и анимация пошла. */
  onReady?: () => void;
  /** Модели нет или она не загрузилась — нужен статичный арт. */
  onError?: () => void;
  /** Во сколько раз плотнее рисовать канвас (для увеличенного просмотра). */
  renderScale?: number;
  className?: string;
}

export const SpineIllustration: React.FC<SpineIllustrationProps> = ({
  dynIllust,
  onReady,
  onError,
  renderScale = 1,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  // Плотность рендера меняется при зуме: держим её в ref, чтобы цикл кадров
  // не перезапускался и анимация не дёргалась.
  const renderScaleRef = useRef(renderScale);
  renderScaleRef.current = renderScale;

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    const objectUrls: string[] = [];
    const canvas = canvasRef.current;
    if (!canvas) return;

    setFailed(false);

    const run = async () => {
      const spine = await loadSpineRuntime();
      const align = await getDynIllustAlign(dynIllust);
      const { atlasText, skeletonBinary, pages } = await loadIllustAssets(dynIllust, align?.assets);

      // Каждую страницу атласа грузим отдельной картинкой: у больших
      // иллюстраций персонаж может лежать на второй текстуре.
      const pageTextures = await Promise.all(
        pages.map(async (page) => {
          const objectUrl = URL.createObjectURL(page.texture);
          objectUrls.push(objectUrl);
          const image = new Image();
          image.decoding = 'async';
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('illust texture failed'));
            image.src = objectUrl;
          });
          return { name: page.name, texture: new spine.canvas.CanvasTexture(unpremultiplyTexture(image)) };
        })
      );
      if (disposed) return;

      const textureByName = new Map(pageTextures.map((page) => [page.name, page.texture]));
      const firstTexture = pageTextures[0]?.texture;
      const atlas = new spine.TextureAtlas(
        atlasText,
        (path: string) =>
          textureByName.get(path) ??
          textureByName.get(path.split('/').pop() ?? '') ??
          firstTexture
      );
      // Часть моделей в репозитории — не бинарный `.skel`, а JSON.
      const loader = new spine.AtlasAttachmentLoader(atlas);
      const head = new TextDecoder().decode(skeletonBinary.slice(0, 64)).trimStart();
      const skeletonData = head.startsWith('{')
        ? new spine.SkeletonJson(loader).readSkeletonData(
            JSON.parse(new TextDecoder().decode(skeletonBinary))
          )
        : new spine.SkeletonBinary(loader).readSkeletonData(skeletonBinary);

      const skeleton = new spine.Skeleton(skeletonData);
      const state = new spine.AnimationState(
        new spine.AnimationStateData(skeletonData)
      );
      const idleName = pickIdleAnimation(skeletonData.animations);
      if (idleName) state.setAnimation(0, idleName, true);

      // Границы берём по setup-позе. Она совпадает с рамкой статичного арта,
      // поэтому Spine-слой ложится поверх него без сдвига и масштаба. Кадры
      // анимации могут выйти за рамку на пару процентов — это не страшно:
      // под Spine уже нарисован статичный арт с тем же персонажем.
      const boundsOffset = new spine.Vector2();
      const boundsSize = new spine.Vector2();
      skeleton.setToSetupPose();
      skeleton.updateWorldTransform();
      skeleton.getBounds(boundsOffset, boundsSize, []);

      let minX = boundsOffset.x;
      let minY = boundsOffset.y;
      let maxX = boundsOffset.x + boundsSize.x;
      let maxY = boundsOffset.y + boundsSize.y;
      if (!Number.isFinite(minX) || maxX - minX <= 1 || maxY - minY <= 1) {
        minX = 0;
        minY = 0;
        maxX = 100;
        maxY = 100;
      }

      // Возвращаем анимацию в начало.
      if (idleName) state.setAnimation(0, idleName, true);
      state.update(0);
      state.apply(skeleton);
      skeleton.updateWorldTransform();

      const renderer = new (
        spine as unknown as {
          canvas: {
            SkeletonRenderer: new (ctx: CanvasRenderingContext2D) => {
              draw: (s: Skeleton) => void;
              triangleRendering: boolean;
            };
          };
        }
      ).canvas.SkeletonRenderer(canvas.getContext('2d') as CanvasRenderingContext2D);
      renderer.triangleRendering = true;

      let lastTime = performance.now();
      const renderFrame = (now: number) => {
        if (disposed) return;
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        state.update(delta);
        state.apply(skeleton);
        skeleton.updateWorldTransform();

        // 1.5× сверхвыборка: модель 2212×2212 при вписывании в экран
        // даунсемплится браузером, и без запаса канвас выглядел мыльным.
        const dpr = Math.min((window.devicePixelRatio || 1) * renderScaleRef.current * 1.5, 4);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) {
          frameId = requestAnimationFrame(renderFrame);
          return;
        }
        const pixelWidth = Math.round(width * dpr);
        const pixelHeight = Math.round(height * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const modelWidth = Math.max(1, maxX - minX);
        const modelHeight = Math.max(1, maxY - minY);
        // Статичный арт квадратный и прижат к низу (`object-contain object-bottom`).
        const box = Math.min(pixelWidth, pixelHeight);
        const boxLeft = (pixelWidth - box) / 2;
        const boxTop = pixelHeight - box;
        if (align) {
          // Калибровка из `dyn-illust-align.json`: Spine рисуется в тех же
          // координатах, что и статичный арт, поэтому персонаж ложится
          // ровно на нарисованного.
          ctx.setTransform(
            align.a * box,
            align.c * box,
            -align.b * box,
            -align.d * box,
            boxLeft + align.x * box,
            boxTop + align.y * box
          );
        } else {
          // Без калибровки вписываем модель в квадрат арта. Слой может
          // съехать на несколько процентов, но это лучше пустого поля.
          const scale = (box * 0.98) / Math.max(modelWidth, modelHeight);
          const centerX = (minX + maxX) / 2;
          ctx.setTransform(
            scale,
            0,
            0,
            -scale,
            boxLeft + box / 2 - centerX * scale,
            boxTop + box + minY * scale
          );
        }
        renderer.draw(skeleton);

        frameId = requestAnimationFrame(renderFrame);
      };

      onReady?.();
      frameId = requestAnimationFrame(renderFrame);
    };

    run().catch(() => {
      if (disposed) return;
      setFailed(true);
      onError?.();
    });

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [dynIllust]);

  if (failed) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`w-full h-full ${className}`}
    />
  );
};

export default SpineIllustration;
