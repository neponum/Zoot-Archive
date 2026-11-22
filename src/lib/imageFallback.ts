import { platform } from '../platform';

/**
 * Утилиты для загрузки изображений с нескольких источников.
 *
 * Одна и та же картинка может быть доступна напрямую с PRTS, через
 * GitHub-зеркало (jsDelivr/raw) или через серверный `/api/proxy`.
 * Если основной URL не ответил, `<img>` последовательно переключается
 * на следующий вариант из цепочки — пользователь не видит «битую» картинку.
 */

/** Достаёт исходный URL из `/api/proxy?url=...`. */
export function stripImageProxy(url: string): string {
  if (!url) return url;
  const marker = '/api/proxy?url=';
  const index = url.indexOf(marker);
  if (index === -1) return url;
  try {
    const raw = url.slice(index + marker.length).split('&')[0];
    return decodeURIComponent(raw);
  } catch {
    return url;
  }
}

function rawToJsdelivr(url: string): string | null {
  const match = url.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
  );
  if (!match) return null;
  const [, user, repo, branch, path] = match;
  return `https://fastly.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
}

function jsdelivrToRaw(url: string): string | null {
  const match = url.match(
    /^https:\/\/fastly\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/
  );
  if (!match) return null;
  const [, user, repo, branch, path] = match;
  return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
}

/**
 * Возвращает цепочку URL для одной картинки: сначала исходный, затем
 * зеркала и в конце — серверный прокси.
 */
export function getImageFallbackChain(src: string): string[] {
  if (!src) return [src];
  if (src.startsWith('blob:') || src.startsWith('data:')) return [src];

  const chain: string[] = [src];
  let raw = stripImageProxy(src);
  const proxied = src !== raw;

  // `images.weserv.nl/?url=...` / `wsrv.nl/?url=...`: если зеркало не отдало
  // конкретный файл (бывает, хост зеркала упирается в таймаут PRTS),
  // переключаемся на прямой адрес и остальные источники.
  const weservMatch = raw.match(/(?:images\.weserv\.nl|wsrv\.nl)\/\?url=([^&]+)/i);
  if (weservMatch && weservMatch[1]) {
    try {
      raw = decodeURIComponent(weservMatch[1]);
    } catch {
      /* оставляем исходный адрес */
    }
  }

  if (raw.startsWith('http')) {
    // Прямой источник (или развёрнутое зеркало) и его альтернативы.
    chain.push(raw);
    const jsdelivr = rawToJsdelivr(raw);
    if (jsdelivr) chain.push(jsdelivr);
    const rawMirror = jsdelivrToRaw(raw);
    if (rawMirror) chain.push(rawMirror);
    chain.push(platform.proxyUrl(raw));
  }

  return Array.from(new Set(chain.filter(Boolean)));
}


type ImageFailureListener = (src: string) => void;
const imageFailureListeners = new Set<ImageFailureListener>();
const reportedImageFailures = new Set<string>();

/** Подписка на картинки, у которых не сработал ни один источник. */
export function onImageFailure(listener: ImageFailureListener): () => void {
  imageFailureListeners.add(listener);
  return () => imageFailureListeners.delete(listener);
}

function reportImageFailure(src: string): void {
  if (!src || reportedImageFailures.has(src)) return;
  reportedImageFailures.add(src);
  imageFailureListeners.forEach((listener) => {
    try {
      listener(src);
    } catch {
      /* слушатель не должен ломать рендер */
    }
  });
}

interface AttemptState {
  original: string;
  index: number;
}

const attempts = new WeakMap<HTMLImageElement, AttemptState>();

/**
 * Переключает `<img>` на следующий источник из цепочки.
 * Возвращает `true`, если источник был заменён.
 */
export function handleImageFallback(
  event: { currentTarget: HTMLImageElement },
  originalSrc: string
): boolean {
  const img = event.currentTarget;
  const state = attempts.get(img);
  const index = state && state.original === originalSrc ? state.index + 1 : 1;
  const chain = getImageFallbackChain(originalSrc);

  if (index >= chain.length) {
    attempts.delete(img);
    // Все зеркала и прокси не отдали файл: сообщаем читалке, иначе картинка
    // просто исчезает без единой ошибки в интерфейсе.
    reportImageFailure(originalSrc);
    return false;
  }

  attempts.set(img, { original: originalSrc, index });
  img.src = chain[index];
  return true;
}

/** Сбрасывает состояние fallback (например, при смене src). */
export function resetImageFallback(img: HTMLImageElement): void {
  attempts.delete(img);
}
