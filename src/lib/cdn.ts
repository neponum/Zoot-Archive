/**
 * jsDelivr перестаёт отдавать файлы из репозиториев больше 50 МБ:
 * `neponum/zoot-data` давно перерос лимит (один `avgfx` — ~45 МБ), поэтому
 * новые файлы (например, баннеры недавних глав) отвечают 403
 * «Package size exceeded the configured limit of 50 MB», а старые живут
 * только в кэше CDN. Для этого репозитория переключаемся на raw GitHub —
 * он отдаёт всё и не тратит трафик Vercel.
 */

const JSDELIVR_GH = /^https:\/\/fastly\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/;

/** jsDelivr-ссылка на `neponum/zoot-data` → raw.githubusercontent. */
export function preferGitHubRaw(url: string): string {
  if (!url) return url;
  const match = url.match(JSDELIVR_GH);
  if (!match) return url;
  const [, user, repo, branch, path] = match;
  if (repo !== 'zoot-data') return url;
  return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
}
