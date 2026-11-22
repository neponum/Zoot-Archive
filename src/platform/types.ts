/**
 * Платформенный слой.
 *
 * Один и тот же UI работает на сайте и в Android-приложении (Capacitor).
 * Отличия — прокси, внешние ссылки и версия — спрятаны за этим интерфейсом.
 */

export type PlatformKind = 'web' | 'capacitor';

export interface Platform {
  kind: PlatformKind;
  /** Нативная Android-оболочка (Capacitor), а не браузер. */
  isAndroid: boolean;

  /** Сетевой запрос с учётом платформы (нативная обёртка обходит CORS). */
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;

  /**
   * URL для запроса через серверный прокси (только веб). В приложениях
   * возвращает исходный URL: CORS не нужен, запросы идут напрямую/нативно.
   */
  proxyUrl(rawUrl: string): string;

  /** URL, который можно подставить в `<img>`/`<audio>`/`<video>`. */
  resolveAssetUrl(rawUrl: string): string;

  /** Достаёт исходный URL из `/api/proxy?url=...`; `null`, если это не прокси. */
  unwrapProxy(url: string): string | null;

  /** Путь к встроенным данным (`/data/...`) в терминах текущей платформы. */
  dataUrl(path: string): string;


  /** Открыть ссылку в системном браузере. */
  openExternal(url: string): Promise<void>;

  /** Версия приложения для настроек/диагностики. */
  getVersion(): string;
}
