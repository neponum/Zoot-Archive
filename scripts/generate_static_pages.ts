#!/usr/bin/env node
/**
 * Пост-сборка: статические HTML для разделов + версия сборки.
 *
 * Зачем:
 * 1. SPA отдаёт один и тот же `<title>` на все адреса, пока не выполнится JS.
 *    Google это переживёт, но Яндекс, Bing и соцсети — не всегда. Поэтому для
 *    основных разделов печём `dist/operators.html`, `dist/story/map.html` и т.д.
 *    с готовыми title/description/canonical и текстовой оболочкой.
 * 2. `version.json` и `meta[name="app-build"]` позволяют странице заметить,
 *    что на сервере уже новая сборка, и сбросить старый кэш/service worker.
 *
 * Запускается после `vite build` (см. package.json → build).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  PRERENDER_PATHS,
  STATIC_ROUTE_SEO,
  seoDescription,
  seoTitle,
} from '../src/config/seo.ts';

const DIST = path.resolve('dist');
const ORIGIN = 'https://rhodes.monster';

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'nogit';
  }
}

const BUILD_ID = `${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${gitShortSha()}`;
const BUILT_AT = new Date().toISOString();

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceMeta(html, attribute, key, value) {
  const escaped = escapeHtml(value);
  const pattern = new RegExp(
    `<meta\\s+${attribute}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+content="[^"]*"\\s*\\/?>`,
    'i'
  );
  const tag = `<meta ${attribute}="${key}" content="${escaped}" />`;
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `  ${tag}\n  </head>`);
}

function buildPage(baseHtml, routePath, seo) {
  const title = seoTitle(seo, true);
  const description = seoDescription(seo, true);
  const canonical = `${ORIGIN}${routePath}`;

  let html = baseHtml;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, 'name', 'title', title);
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'name', 'robots', seo.noindex
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'name', 'twitter:title', title);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`
  );

  // Видимая текстовая оболочка: заголовок и подзаголовок конкретного раздела.
  const shortTitle = title.replace(/\s+—\s+rhodes\.monster$/, '');
  html = html.replace(
    /<h1 class="seo-shell__title" id="seo-title">[\s\S]*?<\/h1>/i,
    `<h1 class="seo-shell__title" id="seo-title">${escapeHtml(shortTitle)}</h1>`
  );
  html = html.replace(
    /<p class="seo-shell__lead" id="seo-lead">[\s\S]*?<\/p>/i,
    `<p class="seo-shell__lead" id="seo-lead">${escapeHtml(description)}</p>`
  );

  return html;
}

function writeFile(relativePath, contents) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = Object.entries(STATIC_ROUTE_SEO)
    .filter(([, seo]) => !seo.noindex)
    .map(([routePath, seo]) => {
      const loc = `${ORIGIN}${routePath === '/' ? '/' : routePath}`;
      const alternates =
        routePath === '/'
          ? `\n    <xhtml:link rel="alternate" hreflang="ru" href="${ORIGIN}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/"/>`
          : '';
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${seo.changefreq ?? 'weekly'}</changefreq>
    <priority>${(seo.priority ?? 0.5).toFixed(2)}</priority>${alternates}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows}
</urlset>
`;
}

function main() {
  const indexPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('[seo] dist/index.html не найден — пропускаю генерацию статических страниц.');
    return;
  }

  let baseHtml = fs.readFileSync(indexPath, 'utf8').replaceAll('__BUILD_ID__', BUILD_ID);

  // Коды подтверждения поисковых систем можно передать переменными окружения
  // (Vercel → Settings → Environment Variables), чтобы не править index.html.
  const verifications: Array<[string, string | undefined]> = [
    ['google-site-verification', process.env.GOOGLE_SITE_VERIFICATION],
    ['yandex-verification', process.env.YANDEX_VERIFICATION],
    ['msvalidate.01', process.env.BING_SITE_VERIFICATION],
  ];
  for (const [name, value] of verifications) {
    if (!value) continue;
    baseHtml = baseHtml.replace(
      '</head>',
      `  <meta name="${name}" content="${escapeHtml(value)}" />\n  </head>`
    );
  }

  const escapedIndex = buildPage(baseHtml, '/', STATIC_ROUTE_SEO['/']);
  fs.writeFileSync(indexPath, escapedIndex);

  for (const routePath of PRERENDER_PATHS) {
    const seo = STATIC_ROUTE_SEO[routePath];
    if (!seo) continue;
    writeFile(`${routePath.replace(/^\//, '')}.html`, buildPage(baseHtml, routePath, seo));
  }

  writeFile(
    'version.json',
    `${JSON.stringify({ build: BUILD_ID, builtAt: BUILT_AT }, null, 2)}\n`
  );
  writeFile('sitemap.xml', buildSitemap());

  console.log(
    `[seo] страниц: ${PRERENDER_PATHS.length + 1}, sitemap: ${Object.keys(STATIC_ROUTE_SEO).length}, build: ${BUILD_ID}`
  );
}

main();
