#!/usr/bin/env node
/**
 * Собирает карту «операция → её сюжетные сцены».
 *
 * В игре у операции бывает сцена до боя (`_beg`) и/или после боя (`_end`);
 * у стори-онли узлов (интерлюдии) — одна сцена без суффикса. Карта нужна,
 * чтобы на панели главы показывать только операции со сценой и открывать
 * читалку именно на нужной сцене.
 *
 * Источники: `stage_table.json` (код операции, например `9-2` → stage id
 * `main_09-02`) и `story_table.json` (ключи — пути сцен вида
 * `obt/main/level_main_09-02_beg`).
 *
 * Результат — `public/data/archive/story/operations.json`, который карта
 * подгружает лениво при открытии главы.
 *
 * Запуск: npm run sync:story-operations
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outFile = path.join(
  projectRoot,
  'public/data/archive/story/operations.json'
);

const GAMEDATA =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master';
const cacheDir = path.join(os.tmpdir(), 'zoot-gamedata');

async function fetchText(url, cache) {
  const file = path.join(cacheDir, cache);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}

const load = async (branch, name) =>
  JSON.parse(
    await fetchText(
      `${GAMEDATA}/${branch}/gamedata/excel/${name}`,
      `${name.replace(/\.json$/, '')}_${branch}.json`
    )
  );

/** stage id → { beg?, end?, full? } из путей сцен. */
function mapStoryFiles(storyTable) {
  const byStage = new Map();
  for (const storyPath of Object.keys(storyTable)) {
    const file = storyPath.split('/').pop();
    if (!file || !file.startsWith('level_')) continue;

    let stageId = file.slice('level_'.length);
    let phase = 'full';
    if (stageId.endsWith('_beg')) {
      phase = 'beg';
      stageId = stageId.slice(0, -'_beg'.length);
    } else if (stageId.endsWith('_end')) {
      phase = 'end';
      stageId = stageId.slice(0, -'_end'.length);
    }

    const key = stageId.toLowerCase();
    const entry = byStage.get(key) ?? {};
    entry[phase] = storyPath;
    byStage.set(key, entry);
  }
  return byStage;
}

/**
 * Глава, к которой относится файл сцены.
 *
 *   activities/<act>/level_<act>_…  → <act>
 *   obt/main/level_main_XX-YY_…     → main_<XX без ведущего нуля>
 *   obt/main/level_st_XX-YY         → main_<XX без ведущего нуля>
 *
 * Остальное (гайды, туториалы) сюжетными главами не считаем.
 */
function chapterOf(storyPath) {
  const parts = storyPath.split('/');
  const file = parts[parts.length - 1] ?? '';
  if (parts[0] === 'activities' && parts[1]) return parts[1];
  if (parts[0] === 'obt' && parts[1] === 'main') {
    const match = file.match(/^level_(?:main|st)_(\d+)-/i);
    if (match) return `main_${Number(match[1])}`;
  }
  return null;
}

/**
 * Стори-онли узлы (интерлюдии) без стейджа в `stage_table`: у мини-событий
 * это единственный сюжет, но кода операции у них нет. Файлы называются
 * `level_<act>_stNN`, а в панели главы они показываются как `ST-N`.
 * Код `ST-N` не уникален между событиями, поэтому храним их с ключом
 * `<chapter>|<code>`.
 */
function mapChapterStoryFiles(byStage, codeByStage) {
  const chapterOperations = {};
  for (const [stageId, scenes] of byStage) {
    if (codeByStage.has(stageId)) continue;
    const storyPath =
      scenes.beg ?? scenes.full ?? scenes.end ?? '';
    const chapter = chapterOf(storyPath);
    if (!chapter) continue;
    const file = storyPath.split('/').pop() ?? '';
    const match = file.match(/_st(\d+)$/i);
    if (!match) continue;

    const code = `ST-${Number(match[1])}`;
    chapterOperations[`${chapter}|${code}`] = {
      beg: scenes.beg ?? scenes.full ?? null,
      end: scenes.end ?? null,
    };
  }
  return chapterOperations;
}

async function main() {
  const [stageTable, storyTable] = await Promise.all([
    load('cn', 'stage_table.json'),
    load('cn', 'story_table.json'),
  ]);

  const byStage = mapStoryFiles(storyTable);
  const codeByStage = new Map();
  const operations = {};
  const storyless = new Set();
  let withBeg = 0;
  let withEnd = 0;

  for (const [stageId, stage] of Object.entries(stageTable.stages ?? {})) {
    const code = stage.code;
    if (!code) continue;
    codeByStage.set(stageId.toLowerCase(), String(code));

    const scenes = byStage.get(stageId.toLowerCase());
    if (!scenes) {
      // Известная операция без сцен — её и скрываем в панели главы.
      storyless.add(String(code));
      continue;
    }

    // У интерлюдий сцена одна и лежит без суффикса — считаем её «до боя».
    const beg = scenes.beg ?? scenes.full ?? null;
    const end = scenes.end ?? null;
    if (!beg && !end) continue;

    operations[code] = { beg, end };
    if (beg) withBeg += 1;
    if (end) withEnd += 1;
  }

  // Один и тот же код встречается у easy/hard-вариантов: если сцена есть
  // хотя бы у одного стейджа, код не считается «без сюжета».
  for (const code of Object.keys(operations)) storyless.delete(code);

  const chapterOperations = mapChapterStoryFiles(byStage, codeByStage);

  const payload = {
    generatedAt: new Date().toISOString(),
    operations,
    // Сцены операций с не уникальным кодом (интерлюдии мини-событий).
    chapterOperations,
    // Коды операций, у которых точно нет сюжетных сцен.
    storyless: [...storyless].sort(),
  };

  fs.writeFileSync(outFile, `${JSON.stringify(payload)}\n`, 'utf8');
  process.stdout.write(
    `✨ Операции со сценой: ${Object.keys(operations).length} (beg ${withBeg}, end ${withEnd}), сцен по главам: ${Object.keys(chapterOperations).length}, без сцен: ${storyless.size} → ${path.relative(
      projectRoot,
      outFile
    )}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
