import React, { useEffect, useRef, useState } from 'react';
import { ArchiveImage } from './ArchiveImage';
import { unpremultiplyTexture } from '../lib/spineTexture';

/**
 * Игровой SD-чибик оперативника в виде Spine-модели (runtime 3.8, canvas 2D).
 *
 * Модели лежат в открытом репозитории `isHarryh/Ark-Models` (те же файлы, что
 * игра грузит для базы): `<models>/<charId>/build_char_<charId>.{atlas,skel,png}`.
 * Загрузка идёт по требованию, прямо с GitHub raw, поэтому трафик Vercel не
 * расходуется. Скачанные файлы кладём в Cache Storage: модель неизменяемая,
 * повторно из сети не тянем.
 *
 * Если для оперативника модели нет (404) — показываем обычную картинку.
 * Runtime подключается лениво: 300 КБ скрипта нужны только на экране досье.
 */

const RUNTIME_SRC = '/vendor/spine-canvas-3.8.js';
const MODEL_BASE =
  'https://raw.githubusercontent.com/isHarryh/Ark-Models/main/models';
const CACHE_NAME = 'zoot-chibi-models-v1';

/** Порядок выбора idle-анимации: у моделей базы «Default» — статичная поза. */
const IDLE_ANIMATIONS = ['Relax', 'Default', 'Idle'];

type SpineRuntime = {
  TextureAtlas: new (atlas: string, loader: (path: string) => unknown) => unknown;
  AtlasAttachmentLoader: new (atlas: unknown) => unknown;
  SkeletonBinary: new (loader: unknown) => {
    readSkeletonData: (data: Uint8Array) => SkeletonData;
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

/** Достаём файл из Cache Storage, иначе качаем и кладём в кэш. */
async function fetchCached(url: string): Promise<Response> {
  if (!('caches' in window)) return fetch(url);
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (hit) return hit;
  const response = await fetch(url);
  if (response.ok) await cache.put(url, response.clone());
  return response;
}

/** Один и тот же файл в двух копиях компонента (StrictMode) качаем один раз. */
export interface ChibiAssets {
  atlasText: string;
  skeletonBinary: Uint8Array;
  texture: Blob;
}

const assetCache = new Map<string, Promise<ChibiAssets>>();

/**
 * Ключ модели в `Ark-Models`: база — `<charId без char_>`, скин — тот же id
 * плюс суффикс после `@` (`char_291_aglina@boc#1` → `291_aglina_boc#1`).
 * `#1`/`#2` (Elite 1/2) используют базовую модель.
 */
function chibiModelKey(operatorId: string, skinId?: string): string {
  const shortId = operatorId.replace(/^char_/, '');
  const at = skinId?.indexOf('@') ?? -1;
  if (at < 0) return shortId;
  return `${shortId}_${skinId!.slice(at + 1)}`;
}

function loadChibiAssets(modelKey: string): Promise<ChibiAssets> {
  const cached = assetCache.get(modelKey);
  if (cached) return cached;

  const fileName = `build_char_${modelKey}`;
  const baseUrl = `${MODEL_BASE}/${encodeURIComponent(modelKey)}`;
  const fileUrl = `${baseUrl}/${encodeURIComponent(fileName)}`;

  const request = (async (): Promise<ChibiAssets> => {
    const [atlasResponse, skelResponse, imageResponse] = await Promise.all([
      fetchCached(`${fileUrl}.atlas`),
      fetchCached(`${fileUrl}.skel`),
      fetchCached(`${fileUrl}.png`),
    ]);
    if (!atlasResponse.ok || !skelResponse.ok || !imageResponse.ok) {
      throw new Error(`no chibi model for ${modelKey}`);
    }
    const [atlasText, skeletonBuffer, texture] = await Promise.all([
      atlasResponse.text(),
      skelResponse.arrayBuffer(),
      imageResponse.blob(),
    ]);
    return { atlasText, skeletonBinary: new Uint8Array(skeletonBuffer), texture };
  })().catch((error) => {
    assetCache.delete(modelKey);
    throw error;
  });

  assetCache.set(modelKey, request);
  return request;
}

function pickIdleAnimation(animations: { name: string }[]): string | null {
  for (const wanted of IDLE_ANIMATIONS) {
    const found = animations.find((animation) => animation.name === wanted);
    if (found) return found.name;
  }
  return animations[0]?.name ?? null;
}

export interface ChibiSpineProps {
  /** id оперативника игры: `char_1043_leizi2`. */
  operatorId: string;
  /** id образа (`char_291_aglina@boc#1`): у скинов своя SD-модель. */
  skinId?: string;
  /** Картинка-заглушка, пока модель грузится или её нет в репозитории. */
  fallbackSrc: string;
  alt?: string;
  className?: string;
}

export const ChibiSpine: React.FC<ChibiSpineProps> = ({
  operatorId,
  skinId,
  fallbackSrc,
  alt = '',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let frameId = 0;
    let objectUrl: string | null = null;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setFailed(false);
    setReady(false);

    const run = async () => {
      const spine = await loadSpineRuntime();
      const baseKey = chibiModelKey(operatorId);
      const wantedKey = chibiModelKey(operatorId, skinId);
      // У образа может не быть отдельной SD-модели — тогда показываем базового чибика.
      const { atlasText, skeletonBinary, texture } = await loadChibiAssets(
        wantedKey
      ).catch(() =>
        wantedKey === baseKey
          ? Promise.reject(new Error(`no chibi model for ${operatorId}`))
          : loadChibiAssets(baseKey)
      );

      objectUrl = URL.createObjectURL(texture);
      const image = new Image();
      image.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('chibi texture failed'));
        image.src = objectUrl as string;
      });
      if (disposed) return;

      const atlas = new spine.TextureAtlas(atlasText, () =>
        new spine.canvas.CanvasTexture(unpremultiplyTexture(image))
      );
      const skeletonData = new spine.SkeletonBinary(
        new spine.AtlasAttachmentLoader(atlas)
      ).readSkeletonData(skeletonBinary);

      const skeleton = new spine.Skeleton(skeletonData);
      const state = new spine.AnimationState(
        new spine.AnimationStateData(skeletonData)
      );
      const idleName = pickIdleAnimation(skeletonData.animations);
      if (idleName) state.setAnimation(0, idleName, true);

      state.update(0);
      state.apply(skeleton);
      skeleton.updateWorldTransform();

      const boundsOffset = new spine.Vector2();
      const boundsSize = new spine.Vector2();
      skeleton.getBounds(boundsOffset, boundsSize, []);

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
      // У чибиков из игры тело/одежда — mesh-аттачменты, без треугольников
      // рисуются только отдельные region-части.
      renderer.triangleRendering = true;

      let lastTime = performance.now();
      const renderFrame = (now: number) => {
        if (disposed) return;
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        state.update(delta);
        state.apply(skeleton);
        skeleton.updateWorldTransform();

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

        // Модель в Spine-координатах (y вверх), вписываем её в квадрат.
        const modelWidth = boundsSize.x || 1;
        const modelHeight = boundsSize.y || 1;
        const scale = Math.min(
          (pixelWidth * 0.96) / modelWidth,
          (pixelHeight * 0.98) / modelHeight
        );
        const centerX = boundsOffset.x + modelWidth / 2;
        ctx.setTransform(
          scale,
          0,
          0,
          -scale,
          pixelWidth / 2 - centerX * scale,
          pixelHeight + boundsOffset.y * scale
        );
        renderer.draw(skeleton);

        frameId = requestAnimationFrame(renderFrame);
      };

      setReady(true);
      frameId = requestAnimationFrame(renderFrame);
    };

    run().catch(() => {
      if (!disposed) setFailed(true);
    });

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [operatorId, skinId]);

  if (failed) {
    return (
      <ArchiveImage
        src={fallbackSrc}
        alt={alt}
        draggable={false}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <span className={`relative z-10 block ${className}`}>
      <ArchiveImage
        src={fallbackSrc}
        alt={alt}
        draggable={false}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
  );
};

export default ChibiSpine;
