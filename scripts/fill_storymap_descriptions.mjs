#!/usr/bin/env node
/**
 * Дозаполняет описания глав и эпизодов в `src/data/storymapData.ts`.
 *
 * Источники (EN-таблицы игры):
 *   - excel/stage_table.json     — брифинг операции по коду стейджа (`16-1`, `TR-1`, ...);
 *   - excel/story_review_table.json — карта код сцены → файл синопсиса;
 *   - story/[uc]info/{storyInfo}.txt — краткий синопсис сцены (для интерлюдий,
 *     у которых нет брифинга операции);
 *   - public/data/archive/story/index.json — синопсис главы, если у сета пустой `desc`.
 *
 * Скрипт идемпотентный: уже заполненные `desc` не трогаются, поэтому его можно
 * запускать повторно после появления новых глав.
 *
 * Запуск: npm run sync:storymap-desc
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const storymapFile = path.join(projectRoot, 'src/data/storymapData.ts');
const storyIndexFile = path.join(
  projectRoot,
  'public/data/archive/story/index.json'
);

const GAMEDATA =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/en/gamedata';
const STORY_INFO = `${GAMEDATA}/story/%5Buc%5Dinfo`;

const cacheDir = path.join(os.tmpdir(), 'zoot-gamedata');

async function fetchText(url, { cache } = {}) {
  if (cache) {
    const file = path.join(cacheDir, cache);
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  if (cache) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, cache), text);
  }
  return text;
}

const fetchJson = async (url, cache) =>
  JSON.parse(await fetchText(url, { cache }));

/** Убирает разметку и служебные подсказки по механикам стейджа. */
function cleanDesc(text) {
  return (text || '')
    .split(/\n\s*<@/)[0]
    .replace(/<[^>]*>/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Простейший пул параллельных запросов. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function loadStorymap() {
  const text = fs.readFileSync(storymapFile, 'utf8');
  const exportIdx = text.indexOf('export const STORYMAP_DATA');
  // У объявления есть аннотация типа, поэтому ищем именно `= {` объекта данных.
  const assignIdx = text.indexOf('= {', exportIdx);
  const start = assignIdx === -1 ? -1 : assignIdx + 2;
  const end = text.lastIndexOf('};');
  if (exportIdx === -1 || start === -1 || end === -1) {
    throw new Error('Не найден объект STORYMAP_DATA в storymapData.ts');
  }
  return {
    header: text.slice(0, start),
    footer: text.slice(end + 1),
    data: JSON.parse(text.slice(start, end + 1)),
  };
}

async function main() {
  const { header, footer, data } = loadStorymap();
  const sets = data.sets;

  const [stageTable, reviewTable] = await Promise.all([
    fetchJson(`${GAMEDATA}/excel/stage_table.json`, 'stage_table_en.json'),
    fetchJson(
      `${GAMEDATA}/excel/story_review_table.json`,
      'story_review_table_en.json'
    ),
  ]);

  /** code стейджа → брифинг операции (первое непустое совпадение). */
  const stageDesc = new Map();
  for (const stage of Object.values(stageTable.stages ?? {})) {
    const code = (stage.code ?? '').trim();
    const desc = cleanDesc(stage.description);
    if (code && desc && !stageDesc.has(code)) stageDesc.set(code, desc);
  }

  // Собираем сцены, для которых нужен синопсис из story/[uc]info.
  const wanted = [];
  const sceneInfoBySet = new Map();
  for (const [setId, set] of Object.entries(sets)) {
    const chapter = reviewTable[set.group];
    const scenes = chapter?.infoUnlockDatas ?? [];
    if (scenes.length) sceneInfoBySet.set(setId, scenes);

    for (const ep of set.episodes ?? []) {
      if (ep.desc && ep.desc.trim()) continue;
      if (stageDesc.has(ep.code)) continue;
      const info = pickSceneInfo(scenes, ep);
      if (info && !wanted.includes(info)) wanted.push(info);
    }
  }

  process.stdout.write(
    `   ↓ синопсисы сцен: ${wanted.length} файлов\n`
  );
  const summaries = new Map();
  await mapLimit(wanted, 8, async (storyInfo) => {
    const file = storyInfo.replace(/^info\//, '');
    try {
      const text = cleanDesc(
        await fetchText(`${STORY_INFO}/${file}.txt`)
      );
      if (text) summaries.set(storyInfo, text);
    } catch {
      /* у части сцен синопсиса нет — останется фолбэк на текст главы */
    }
  });

  let filledEpisodes = 0;
  let filledSets = 0;

  for (const [setId, set] of Object.entries(sets)) {
    const scenes = sceneInfoBySet.get(setId) ?? [];
    for (const ep of set.episodes ?? []) {
      if (ep.desc && ep.desc.trim()) continue;
      let desc = stageDesc.get(ep.code) ?? '';
      if (!desc) {
        const info = pickSceneInfo(scenes, ep);
        desc = info ? summaries.get(info) ?? '' : '';
      }
      if (desc) {
        ep.desc = desc;
        filledEpisodes += 1;
      }
    }
  }

  const storyIndex = fs.existsSync(storyIndexFile)
    ? JSON.parse(fs.readFileSync(storyIndexFile, 'utf8'))
    : { categories: [] };
  const chapterSynopsis = new Map();
  for (const category of storyIndex.categories ?? []) {
    for (const chapter of category.chapters ?? []) {
      const lines = Array.isArray(chapter.synopsisLines)
        ? chapter.synopsisLines
        : [];
      const text = lines.map((line) => String(line).trim()).filter(Boolean).join('\n');
      if (chapter.id && text) chapterSynopsis.set(chapter.id, text);
    }
  }

  for (const set of Object.values(sets)) {
    if (set.desc && set.desc.trim()) continue;
    const text = chapterSynopsis.get(set.group);
    if (text) {
      set.desc = text;
      filledSets += 1;
    }
  }

  fs.writeFileSync(
    storymapFile,
    `${header}${JSON.stringify(data, null, 2)}${footer}`,
    'utf8'
  );

  process.stdout.write(
    `✨ Описания эпизодов: +${filledEpisodes}, глав: +${filledSets}\n`
  );
}

/** Сопоставляет эпизод со сценой таблицы: код + тег, затем код, затем имя. */
function pickSceneInfo(scenes, episode) {
  if (!scenes.length) return null;
  const byCodeTag = scenes.find(
    (scene) =>
      scene.storyCode === episode.code && scene.avgTag === episode.tag
  );
  if (byCodeTag?.storyInfo) return byCodeTag.storyInfo;
  const byCode = scenes.find((scene) => scene.storyCode === episode.code);
  if (byCode?.storyInfo) return byCode.storyInfo;
  const byName = scenes.find((scene) => scene.storyName === episode.name);
  return byName?.storyInfo ?? null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
