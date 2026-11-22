import type { Platform } from './types';

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Браузерный адаптер: сохраняет текущее поведение сайта, включая серверный
 * `/api/proxy` для хостов без CORS.
 */
export const webPlatform: Platform = {
  kind: 'web',
  isAndroid: false,

  fetch: (input, init) => window.fetch(input, init),

  proxyUrl: (rawUrl) =>
    isRemoteUrl(rawUrl)
      ? `/api/proxy?url=${encodeURIComponent(rawUrl)}`
      : rawUrl,

  resolveAssetUrl: (rawUrl) => rawUrl,

  unwrapProxy: (url) => {
    if (!url) return null;
    const marker = '/api/proxy?url=';
    const index = url.indexOf(marker);
    if (index === -1) return null;
    try {
      const raw = url.slice(index + marker.length).split('&')[0];
      return decodeURIComponent(raw);
    } catch {
      return null;
    }
  },

  dataUrl: (path) => path,


  openExternal: async (url) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  },

  getVersion: () => 'web',
};
