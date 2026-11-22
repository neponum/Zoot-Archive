import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Собирает `src/data/operator_birthdays.json` — компактный индекс дней
 * рождения (`char_id` → `MM-DD`) для фильтра «день рождения сегодня».
 *
 * Данные берутся из официальных таблиц игры `handbook_info_table`
 * (раздел «Basic Info» / «基础档案») через jsDelivr, те же таблицы, что
 * архив грузит в браузер при открытии досье.
 *
 * Run via: npm run sync:birthdays
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'src/data/operator_birthdays.json');

const EXCEL_CDN =
  'https://cdn.jsdelivr.net/gh/ArknightsAssets/ArknightsGamedata@master';

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

async function fetchHandbook(branch) {
  const url = `${EXCEL_CDN}/${branch}/gamedata/excel/handbook_info_table.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const json = await response.json();
  return json.handbookDict ?? {};
}

function basicInfoText(entry, titlePrefix) {
  for (const section of entry.storyTextAudio ?? []) {
    const title = (section.storyTitle ?? '').toLowerCase();
    if (!title.startsWith(titlePrefix)) continue;
    return section.stories?.[0]?.storyText ?? '';
  }
  return '';
}

/** `【生日】8月30日` → [8, 30]; `[Date of Birth] Aug. 30` → [8, 30]. */
function parseBirthday(zhText, enText) {
  const zh = zhText.match(/【生日】\s*(\d{1,2})月(\d{1,2})日/);
  if (zh) return [Number(zh[1]), Number(zh[2])];

  const en = enText.match(/\[Date of Birth\]\s*([A-Za-z]{3,})\.?\s*(\d{1,2})/);
  if (en) {
    const month = MONTHS[en[1].slice(0, 3).toLowerCase()];
    if (month) return [month, Number(en[2])];
  }
  return null;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

const [cn, en] = await Promise.all([fetchHandbook('cn'), fetchHandbook('en')]);

const birthdays = {};
let parsed = 0;
let skipped = 0;

for (const [charId, entry] of Object.entries(cn)) {
  if (!charId.startsWith('char_')) {
    skipped += 1;
    continue;
  }
  const zhText = basicInfoText(entry, '基础档案');
  const enEntry = en[charId];
  const enText = enEntry ? basicInfoText(enEntry, 'basic') : '';
  const date = parseBirthday(zhText, enText);
  if (!date) {
    skipped += 1;
    continue;
  }
  const [month, day] = date;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    skipped += 1;
    continue;
  }
  birthdays[charId] = `${pad(month)}-${pad(day)}`;
  parsed += 1;
}

const sorted = Object.fromEntries(
  Object.keys(birthdays)
    .sort()
    .map((key) => [key, birthdays[key]])
);

fs.writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
console.log(
  `🎂 operator_birthdays.json: ${parsed} birthdays, ${skipped} without a date`
);
console.log(`   → ${path.relative(projectRoot, outputPath)}`);
