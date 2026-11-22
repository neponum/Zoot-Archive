import { platform } from '../platform';

/**
 * Домены третьего уровня → разделы сайта.
 *
 * `operators.rhodes.monster` открывает архив оперативников,
 * `terminal` — терминал, `terra` — Терру, `translation` — браузер переводов.
 * Адрес раздела остаётся на поддомене: `operators.rhodes.monster/char_002_amiya`
 * превращается в `/operators/char_002_amiya`, а не редиректит на основной домен.
 */
export const SUBDOMAIN_ROUTES: Record<string, string> = {
  'operators.rhodes.monster': '/operators',
  'terminal.rhodes.monster': '/terminal',
  'terra.rhodes.monster': '/terra',
  'translation.rhodes.monster': '/translate',
};

/**
 * Верхнеуровневые разделы сайта. Если такой путь уже открыт на поддомене,
 * не добавляем к нему префикс: `terminal.rhodes.monster/story/...` должен
 * вести в читалку, а не в `/terminal/story/...`.
 */
const GLOBAL_ROOTS = new Set([
  'operators',
  'story',
  'terminal',
  'terra',
  'reclamation-algorithm',
  'integrated-strategies',
  'translate',
  'storage',
  'disclaimer',
  'privacy',
  'takedown',
  'legal',
  'maps',
  'grid',
  'chapters',
  'export',
  'music',
  'vote',
  'api',
  'assets',
  'data',
]);

/**
 * Куда перейти для текущего хоста и пути. `null` — редирект не нужен.
 *
 * Чистая функция без DOM: её удобно проверять отдельно от браузера.
 */
export function resolveSubdomainRedirect(
  hostname: string,
  pathname: string
): string | null {
  const base = SUBDOMAIN_ROUTES[(hostname || '').toLowerCase()];
  if (!base) return null;

  const path = pathname || '/';
  if (path === '/' || path === '') return base;
  if (path === base || path.startsWith(`${base}/`)) return null;

  const first = path.split('/')[1]?.toLowerCase() ?? '';
  if (GLOBAL_ROOTS.has(first)) return null;

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Редирект до первого рендера, чтобы не показывать главную страницу
 * основного сайта на `operators.rhodes.monster`.
 */
export function applySubdomainRedirect(): void {
  if (typeof window === 'undefined') return;
  if (platform.kind !== 'web') return;

  const target = resolveSubdomainRedirect(
    window.location.hostname,
    window.location.pathname
  );
  if (!target || target === window.location.pathname) return;

  window.location.replace(
    `${target}${window.location.search}${window.location.hash}`
  );
}
