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

/**
 * Префикс кода операции для папки события.
 *
 * У старых событий id стейджа не совпадает с папкой истории:
 * `a003_01` → `Activities/ACT3D0/level_act3d0_01`, а код операции — `OF-1`.
 * Поэтому строим карту `act3d0 → OF` из поля `levelId`.
 */
function buildFolderPrefixes(stageTable) {
  const votes = new Map();
  for (const stage of Object.values(stageTable.stages ?? {})) {
    const levelId = stage.levelId;
    const code = stage.code;
    if (!levelId || !code) continue;
    const parts = levelId.split('/');
    const folder = (parts[1] || '').toLowerCase();
    const prefix = String(code).split('-')[0];
    if (!folder || !prefix || !/^[a-z0-9]+$/.test(folder)) continue;
    const forFolder = votes.get(folder) ?? new Map();
    forFolder.set(prefix, (forFolder.get(prefix) ?? 0) + 1);
    votes.set(folder, forFolder);
  }

  const best = new Map();
  for (const [folder, counts] of votes) {
    const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (winner) best.set(folder, winner[0]);
  }
  return best;
}

/**
 * Возможные коды для суффикса файла. В игре сосуществуют `OF-ST1` и
 * `SV-ST-1`, `OF-EX1` и `GO-EX-1`, поэтому выбираем тот вариант, который
 * реально есть в `stage_table`.
 */
function codeCandidates(rest) {
  let match = rest.match(/^st(\d+)$/i);
  if (match) {
    const n = Number(match[1]);
    return [`ST${n}`, `ST-${n}`];
  }
  match = rest.match(/^ex(\d+)$/i);
  if (match) {
    const n = Number(match[1]);
    return [`EX${n}`, `EX-${n}`];
  }
  match = rest.match(/^f(\d+)$/i);
  if (match) {
    const n = Number(match[1]);
    return [`F${n}`, `F-${n}`];
  }
  match = rest.match(/^tr(\d+)$/i);
  if (match) {
    const n = Number(match[1]);
    return [`TR-${n}`, `TR${n}`];
  }
  match = rest.match(/^(\d+)$/);
  if (match) {
    const n = Number(match[1]);
    return [String(n), String(n).padStart(2, '0')];
  }
  return [];
}

/** Путь сцены события → код операции (`OF-1`, `OF-ST1`, …). */
function storyCodeFromPath(storyPath, folderPrefixes, knownCodes) {
  const parts = storyPath.split('/');
  if (parts[0] !== 'activities' || !parts[1]) return null;
  const folder = parts[1].toLowerCase();
  const prefix = folderPrefixes.get(folder);
  if (!prefix) return null;

  const file = parts[parts.length - 1] ?? '';
  const marker = `level_${folder}_`;
  if (!file.startsWith(marker)) return null;

  let rest = file.slice(marker.length);
  let phase = 'full';
  if (rest.endsWith('_beg')) {
    phase = 'beg';
    rest = rest.slice(0, -'_beg'.length);
  } else if (rest.endsWith('_end')) {
    phase = 'end';
    rest = rest.slice(0, -'_end'.length);
  }

  const suffixes = codeCandidates(rest);
  const suffix = suffixes.find((item) => knownCodes.has(`${prefix}-${item}`));
  if (!suffix) return null;
  return { code: `${prefix}-${suffix}`, phase };
}

/** stage id → { beg?, end?, full? } из путей сцен. */
function mapStoryFiles(storyTable, folderPrefixes, knownCodes) {
  const byStage = new Map();
  const byCode = new Map();

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

    // Второй индекс — по коду операции. Нужен для событий, где id стейджа
    // и папка истории расходятся (`a003_01` и `level_act3d0_01`).
    const mapped = storyCodeFromPath(storyPath, folderPrefixes, knownCodes);
    if (mapped) {
      const codeEntry = byCode.get(mapped.code) ?? {
        scenes: {},
        folders: new Set(),
      };
      codeEntry.scenes[mapped.phase] = storyPath;
      codeEntry.folders.add(storyPath.split('/')[1].toLowerCase());
      byCode.set(mapped.code, codeEntry);
    }
  }

  // Код берём из общего индекса, только если он не встречается в разных
  // событиях (иначе можно открыть сцену чужого мини-ивента).
  const uniqueByCode = new Map();
  for (const [code, entry] of byCode) {
    if (entry.folders.size === 1) uniqueByCode.set(code, entry.scenes);
  }
  return { byStage, byCode: uniqueByCode };
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

  const folderPrefixes = buildFolderPrefixes(stageTable);
  const knownCodes = new Set(
    Object.values(stageTable.stages ?? {})
      .map((stage) => String(stage.code ?? ''))
      .filter(Boolean)
  );
  const { byStage, byCode } = mapStoryFiles(
    storyTable,
    folderPrefixes,
    knownCodes
  );
  const codeByStage = new Map();
  const operations = {};
  // Сцены, привязанные к конкретной главе. Проверяются раньше глобальных:
  // один и тот же код (`ST-1`, `SV-1`) может встречаться в разных событиях.
  const chapterOperations = {};
  const storyless = new Set();
  let withBeg = 0;
  let withEnd = 0;

  for (const [stageId, stage] of Object.entries(stageTable.stages ?? {})) {
    const code = stage.code;
    if (!code) continue;
    codeByStage.set(stageId.toLowerCase(), String(code));

    const scenes =
      byStage.get(stageId.toLowerCase()) ?? byCode.get(String(code));
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
    const chapter = chapterOf(beg ?? end ?? '');
    if (chapter) {
      chapterOperations[`${chapter}|${code}`] = { beg, end };
    }
    if (beg) withBeg += 1;
    if (end) withEnd += 1;
  }

  // Один и тот же код встречается у easy/hard-вариантов: если сцена есть
  // хотя бы у одного стейджа, код не считается «без сюжета».
  for (const code of Object.keys(operations)) storyless.delete(code);

  Object.assign(chapterOperations, mapChapterStoryFiles(byStage, codeByStage));

  // ENTRY — не операция, а входная сцена события (`ui_*`). У неё нет кода
  // в stage_table, поэтому берём `startStoryTxt` из локального индекса глав.
  const indexFile = path.join(
    projectRoot,
    'public/data/archive/story/index.json'
  );
  if (fs.existsSync(indexFile)) {
    const storyIndex = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    for (const category of storyIndex.categories ?? []) {
      for (const chapter of category.chapters ?? []) {
        if (!chapter?.id || !chapter?.startStoryTxt) continue;
        const key = `${chapter.id}|ENTRY`;
        if (chapterOperations[key]) continue;
        chapterOperations[key] = { beg: chapter.startStoryTxt, end: null };
      }
    }
  }

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
