import type { Platform } from './types';

/**
 * Адаптер Capacitor 7 (Android).
 *
 * CapacitorHttp включается нативно (см. `capacitor.config.ts`) и перехватывает
 * `window.fetch`/XHR: запросы уходят из Java, поэтому CORS не мешает.
 * `Browser.open` открывает внешние ссылки в Chrome, а не внутри приложения.
 */
export function createCapacitorPlatform(): Platform {
  let version = '0.1.0';

  void (async () => {
    try {
      const { App } = await import('@capacitor/app');
      const info = await App.getInfo();
      version = info.version ? `${info.version} (${info.build})` : '0.1.0';
    } catch {
      /* не Android-сборка */
    }
  })();

  return {
    kind: 'capacitor',
      isAndroid: true,

    fetch: (input, init) => window.fetch(input, init),

    proxyUrl: (rawUrl) => rawUrl,

    resolveAssetUrl: (rawUrl) => rawUrl,

    unwrapProxy: () => null,

    dataUrl: (path) => path,


    openExternal: async (url) => {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    },

    getVersion: () => version,
  };
}
