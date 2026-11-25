/**
 * Обновление сайта у пользователей со старым кэшем.
 *
 * Проблема: service worker (PWA) и HTTP-кэш могут отдавать старый `index.html`
 * и старые чанки. Пользователь видит прошлую версию и не знает, что вышла новая.
 *
 * Решение:
 * 1. при сборке в `index.html` попадает `meta[name="app-build"]`, а в
 *    `/version.json` — тот же идентификатор;
 * 2. страница периодически (и при возврате во вкладку) спрашивает
 *    `/version.json` с `cache: 'no-store'`;
 * 3. если идентификаторы разошлись — снимаем service worker, чистим Cache
 *    Storage и один раз перезагружаем страницу с cache-bust-параметром.
 *
 * Защита от циклов: для каждой версии перезагрузка выполняется не больше
 * одного раза за сессию.
 */
import { platform } from '../platform';

const BUILD_META = 'meta[name="app-build"]';
const APPLIED_KEY = 'rhodes-applied-build';
const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const MIN_CHECK_GAP_MS = 60 * 1000;

let lastCheck = 0;
let checking: Promise<boolean> | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

/** Регистрация service worker появляется позже старта — подключаем её отдельно. */
export function attachServiceWorker(registration: ServiceWorkerRegistration | null) {
  if (registration) swRegistration = registration;
}

function currentBuildId(): string | null {
  if (typeof document === 'undefined') return null;
  const value = document.querySelector<HTMLMetaElement>(BUILD_META)?.content?.trim();
  if (!value || value.includes('__BUILD_ID__') || value === 'dev') return null;
  return value;
}

function alreadyApplied(build: string): boolean {
  try {
    return sessionStorage.getItem(APPLIED_KEY) === build;
  } catch {
    return false;
  }
}

function markApplied(build: string) {
  try {
    sessionStorage.setItem(APPLIED_KEY, build);
  } catch {
    /* приватный режим — обойдёмся без защиты от цикла */
  }
}

async function clearAllCaches() {
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }
  } catch {
    /* Cache Storage может быть недоступен */
  }
}

async function applyNewBuild(build: string) {
  markApplied(build);

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
  } catch {
    /* service worker мог быть уже снят */
  }

  await clearAllCaches();

  // Параметр `_v` обходит HTTP-кэш документа; сервер отдаёт index.html
  // с no-cache, но старые CDN-провайдеры могут игнорировать заголовок.
  const url = new URL(window.location.href);
  url.searchParams.set('_v', build);
  window.location.replace(url.toString());
}

/**
 * Сверяет сборку в документе с `/version.json`.
 * Возвращает `true`, если найдено обновление (страница уже перезагружается).
 */
export function checkForNewVersion(force = false): Promise<boolean> {
  if (platform.kind !== 'web' || typeof window === 'undefined') return Promise.resolve(false);
  if (checking) return checking;

  const now = Date.now();
  if (!force && now - lastCheck < MIN_CHECK_GAP_MS) return Promise.resolve(false);
  lastCheck = now;

  const current = currentBuildId();
  if (!current) return Promise.resolve(false);

  checking = (async () => {
    try {
      const response = await fetch(`/version.json?_=${now}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { build?: string };
      const serverBuild = data.build?.trim();
      if (!serverBuild || serverBuild === current) return false;
      if (alreadyApplied(serverBuild)) return false;

      await applyNewBuild(serverBuild);
      return true;
    } catch {
      return false;
    } finally {
      checking = null;
    }
  })();

  return checking;
}

/**
 * Следит за обновлениями: при возврате во вкладку, при фокусе и раз в 10 минут.
 * Дополнительно дёргает проверку service worker — браузер сам делает это
 * не чаще раза в сутки.
 */
export function startUpdateWatcher() {
  if (platform.kind !== 'web' || typeof window === 'undefined') return;

  let lastSwUpdate = 0;
  const checkSw = () => {
    const now = Date.now();
    if (now - lastSwUpdate < MIN_CHECK_GAP_MS) return;
    lastSwUpdate = now;
    swRegistration?.update().catch(() => {});
  };

  const check = (force = false) => {
    void checkForNewVersion(force);
    checkSw();
  };

  // Первая проверка — после того, как страница отрисовалась.
  window.setTimeout(() => check(true), 2500);
  window.setInterval(() => check(false), CHECK_INTERVAL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check(false);
  });
  window.addEventListener('focus', () => check(false));
  window.addEventListener('online', () => check(true));
}
