#!/usr/bin/env node
/**
 * Сверка обложек глав и галереи CG с тем, что реально есть на PRTS.
 *
 * Источник правды — `torappu.prts.wiki`:
 *   GET /api/v1/story-resources?type=image&limit=200&cursor=…  — все картинки сцен;
 *   GET /api/v1/story-resource-usages?type=image&id=…          — какие сценарии их используют.
 *
 * Проверяем:
 *   1. `imageSrc` / `logoUrl` каждой главы отвечают 200 (битая обложка = заглушка в UI);
 *   2. каждый `id` из `gallery.json` есть в списке картинок PRTS;
 *   3. если у записи галереи указана сцена (`s`), она действительно использует эту картинку;
 *   4. картинка вообще кем-нибудь используется (иначе запись мертвая).
 *
 * Запуск:
 *   npm run check:story-assets            — отчёт
 *   npm run check:story-assets -- --strict — код 1, если есть расхождения
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://torappu.prts.wiki/api/v1';
const CACHE_DIR = path.join(os.tmpdir(), 'zoot-prts-cache');
const STORY_DIR = path.resolve('public/data/archive/story');
const CONCURRENCY = 6;
const RETRIES = 3;

const strict = process.argv.includes('--strict');

/**
 * jsDelivr не отдаёт файлы из репозиториев больше 50 МБ (`zoot-data`),
 * поэтому проверяем тот же адрес, который увидит браузер после
 * `preferGitHubRaw()`.
 */
function preferRaw(url) {
  const match = url.match(
    /^https:\/\/fastly\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/
  );
  if (!match) return url;
  const [, user, repo, branch, rest] = match;
  return repo === 'zoot-data'
    ? `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${rest}`
    : url;
}

fs.mkdirSync(CACHE_DIR, { recursive: true });

const cacheFile = (key) =>
  path.join(CACHE_DIR, `${key.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 180)}.json`);

function readCache(key) {
  const file = cacheFile(key);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  fs.writeFileSync(cacheFile(key), JSON.stringify(value));
}

async function getJson(url, cacheKey, { retries = RETRIES } = {}) {
  const cached = readCache(cacheKey);
  if (cached) return cached;
  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(30000),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
        continue;
      }
      if (!response.ok) return null;
      const payload = await response.json();
      writeCache(cacheKey, payload);
      return payload;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }
  if (lastError) process.stderr.write(`! ${url}: ${lastError.message}\n`);
  return null;
}

/** Пул: не больше `limit` одновременных задач. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function loadAllResources(type) {
  const all = [];
  let cursor = null;
  for (let page = 0; page < 40; page += 1) {
    const query = new URLSearchParams({ type, limit: '200' });
    if (cursor) query.set('cursor', cursor);
    const payload = await getJson(
      `${API}/story-resources?${query}`,
      `${type}s-${cursor ?? 'first'}`
    );
    if (!payload?.resources?.length) break;
    all.push(...payload.resources);
    cursor = payload.nextCursor ?? null;
    if (!cursor) break;
  }
  return new Map(all.map((item) => [item.id, item.scriptCount ?? 0]));
}

async function loadUsages(type, id) {
  const all = [];
  let cursor = null;
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ type, id, limit: '200' });
    if (cursor) query.set('cursor', cursor);
    const payload = await getJson(
      `${API}/story-resource-usages?${query}`,
      `usage-${type}-${id}-${cursor ?? 'first'}`
    );
    if (!payload?.usages?.length) break;
    all.push(...payload.usages.map((usage) => usage.scriptPath));
    cursor = payload.nextCursor ?? null;
    if (!cursor) break;
  }
  return all;
}

async function checkUrl(rawUrl) {
  if (!rawUrl) return null;
  if (!/^https?:/i.test(rawUrl)) return 'not-http';
  const url = preferRaw(rawUrl);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(20000),
    });
    return response.ok ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error.message;
  }
}

function chapterCovers() {
  const file = path.join(STORY_DIR, 'index.json');
  if (!fs.existsSync(file)) return [];
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const covers = [];
  for (const category of payload.categories ?? []) {
    for (const chapter of category.chapters ?? []) {
      covers.push({
        id: chapter.id,
        imageSrc: chapter.imageSrc ?? '',
        logoUrl: chapter.logoUrl ?? '',
      });
    }
  }
  return covers;
}

async function main() {
  const galleryFile = path.join(STORY_DIR, 'gallery.json');
  if (!fs.existsSync(galleryFile)) {
    console.error(`Нет ${galleryFile}`);
    process.exit(1);
  }
  const gallery = JSON.parse(fs.readFileSync(galleryFile, 'utf8')).sets ?? {};

  process.stdout.write('· загружаю списки ресурсов PRTS…\n');
  const [images, backgrounds] = await Promise.all([
    loadAllResources('image'),
    loadAllResources('background'),
  ]);
  process.stdout.write(
    `· картинок: ${images.size}, фонов: ${backgrounds.size}\n`
  );

  const entries = [];
  for (const [setId, items] of Object.entries(gallery)) {
    for (const item of items ?? []) {
      entries.push({ setId, item });
    }
  }

  const unique = new Map();
  for (const { item } of entries) {
    const type = item.src === 'background' ? 'background' : 'image';
    for (const img of item.imgs ?? []) unique.set(`${type}|${img.id}`, { type, id: img.id });
  }
  const uniqueKeys = [...unique.values()];
  process.stdout.write(
    `· уникальных ресурсов в галерее: ${uniqueKeys.length}, запрашиваю сцены…\n`
  );
  const usageByKey = new Map();
  let done = 0;
  await mapLimit(uniqueKeys, CONCURRENCY, async ({ type, id }) => {
    usageByKey.set(`${type}|${id}`, await loadUsages(type, id));
    done += 1;
    if (done % 100 === 0) {
      process.stdout.write(`  ${done}/${uniqueKeys.length}\n`);
    }
  });

  const problems = {
    covers: [],
    missingScene: [],
    brokenImage: [],
    unknownImage: [],
    sceneMismatch: [],
    unusedImage: [],
  };

  const manifestFile = path.join(STORY_DIR, 'scripts.json');
  const scripts = new Set(
    fs.existsSync(manifestFile)
      ? (JSON.parse(fs.readFileSync(manifestFile, 'utf8')).files ?? []).filter(
          (file) => !file.startsWith('[uc]')
        )
      : []
  );

  for (const { setId, item } of entries) {
    const scene = item.s ? String(item.s).replace(/\.txt$/, '') : '';
    if (scene && scripts.size && !scripts.has(scene)) {
      problems.missingScene.push({ setId, name: item.n, scene });
    }
    const type = item.src === 'background' ? 'background' : 'image';
    const known = type === 'background' ? backgrounds : images;
    for (const img of item.imgs ?? []) {
      const id = img.id;
      if (!known.has(id)) {
        // CG может не индексироваться как ресурс сценария, но сам файл на
        // месте — тогда это нормально. Проверяем адрес, который открывает
        // галерея.
        const folder = type === 'background' ? 'background' : 'images';
        const error = await checkUrl(
          `https://torappu.prts.wiki/assets/avg/${folder}/${id}.png`
        );
        if (error) {
          problems.brokenImage.push({ setId, id, type, name: item.n, error });
        } else {
          problems.unknownImage.push({ setId, id, type, name: item.n });
        }
        continue;
      }
      const usages = usageByKey.get(`${type}|${id}`) ?? [];
      if (usages.length === 0) {
        problems.unusedImage.push({ setId, id, name: item.n });
      } else if (scene && !usages.includes(scene)) {
        problems.sceneMismatch.push({
          setId,
          id,
          name: item.n,
          scene,
          usedIn: usages.slice(0, 3),
        });
      }
    }
  }

  process.stdout.write('· проверяю обложки глав…\n');
  const covers = chapterCovers();
  await mapLimit(covers, CONCURRENCY, async (cover) => {
    for (const field of ['imageSrc', 'logoUrl']) {
      const error = await checkUrl(cover[field]);
      if (error) problems.covers.push({ id: cover.id, field, error });
    }
  });

  const report = [
    ['Битые обложки', problems.covers],
    ['Сценарии из галереи отсутствуют в манифесте', problems.missingScene],
    ['Битые картинки галереи', problems.brokenImage],
    ['Картинки нет в индексе сценариев (файл на месте)', problems.unknownImage],
    ['Сцена-ссылка не показывает эту CG', problems.sceneMismatch],
    ['Картинка нигде не используется', problems.unusedImage],
  ];
  const blocking =
    problems.covers.length +
    problems.missingScene.length +
    problems.brokenImage.length;

  process.stdout.write('\n');
  for (const [title, list] of report) {
    process.stdout.write(`${title}: ${list.length}\n`);
    for (const entry of list.slice(0, 20)) {
      process.stdout.write(`  ${JSON.stringify(entry)}\n`);
    }
    if (list.length > 20) process.stdout.write(`  … ещё ${list.length - 20}\n`);
  }

  const total = report.reduce((sum, [, list]) => sum + list.length, 0);
  process.stdout.write(
    `\nВсего замечаний: ${total} (блокирующих: ${blocking})\n`
  );
  if (strict && blocking > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
