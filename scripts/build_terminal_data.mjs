#!/usr/bin/env node
/**
 * Собирает данные терминала: Integrated Strategies и Reclamation Algorithm.
 *
 * Источники (зеркало ArknightsAssets, EN-ветка):
 *   - excel/roguelike_topic_table.json — темы IS (name, lineText, startTime, milestones)
 *   - excel/sandbox_perm_table.json    — темы RA (topicName, topicStartTime)
 *
 * Обложки — из зеркала проекта `neponum/zoot-data` (`banners/IS_n.png`,
 * `banners/RA_n.png`), те же, что использует `ChapterSelector`.
 *
 * Результат: public/data/archive/terminal.json
 *
 * Запуск: npm run sync:terminal
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outFile = path.join(projectRoot, 'public/data/archive/terminal.json');

const TABLES =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/en/gamedata/excel';
const BANNERS = 'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/banners';
const TABLES_CN =
  'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel';

/**
 * rogue_6 есть только в CN-ветке (EN-таблица отстаёт на один сезон).
 * Название и описание — официальный английский текст события.
 */
/**
 * IS #01 (Ceobe's Fungimist) отсутствует в актуальной `roguelike_topic_table`:
 * таблица начинается с rogue_1 = Phantom. Баннеры в zoot-data нумеруются
 * с учётом Ceobe (IS_1), поэтому добавляем тему вручную.
 */
const ROGUE_0 = {
  name: "Ceobe's Fungimist",
  lineText: '',
  startTime: 1641369600,
};

const ROGUE_6 = {
  name: 'The Black Flow of the Drowning Seekers',
  lineText:
    'Beneath the black flow, within the sea of trees, more than one secret lies buried.\n' +
    'Conspirators and explorers enter and leave at will, disturbing this place and sinking into it.\n' +
    'Stay awake, or you too will forever become one of them.',
  startTime: 1790000000,
};

/** Сколько файлов `level_rogueN_ending_*.txt` реально существует в story/obt. */
const ENDING_COUNTS = {
  rogue_1: 4,
  rogue_2: 4,
  rogue_3: 4,
  rogue_4: 5,
  rogue_5: 5,
  rogue_6: 4,
};

/** Русские описания тем IS (официальные EN-строки переведены вручную). */
const LINES_RU = {
  rogue_0: [
    'Сеоба находит в лесу странные грибы — и проваливается в сон, где грибной лес живёт своей жизнью.',
    'Чтобы проснуться, ей придётся пройти через видения, сражения и собрать всё необходимое.',
    'Грибная похлёбка ждёт в конце пути.',
  ],
  rogue_1: [
    'Небо темнеет, а ты теряешься в лесу, окутанном туманом.',
    'Нужно найти безопасное укрытие на ночь,',
    'и единственный выбор — мрачный замок впереди.',
  ],
  rogue_2: [
    'Морской бриз проносится мимо и уходит к другому краю океана.',
    'Там твоя цель, но путь ещё не начат.',
    'Собери вещи и приготовься: море ждёт.',
  ],
  rogue_3: [
    'Припасы собраны, подготовка завершена, отряд в сборе.',
    'Вместе с исследователями ты покидаешь южный город Сами и идёшь на север.',
    'Пройди Сами и ледяные поля — и завеса неизвестности падёт.',
  ],
  rogue_4: [
    'Голоса павших уводят тебя прочь от реальности.',
    'Ритуал. Сопричастие.',
    'Иномирное переживание вот-вот начнётся.',
  ],
  rogue_5: [
    'У Байцзао, меж гор и рек, гуляют путники.',
    'Сад очищен от посторонних — приготовься к битве.',
    'Распахни врата и взгляни с вершин. Умиротворение начинается.',
  ],
  rogue_6: [
    'Под чёрным потоком, в море деревьев, скрыто немало тайн.',
    'Заговорщики и исследователи входят и выходят когда вздумается, тревожа это место и утопая в нём.',
    'Не спи, иначе и ты навсегда станешь одним из них.',
  ],
};

const MOTIFS = {
  rogue_0: 'frost',
  rogue_1: 'sarkaz',
  rogue_2: 'seekers',
  rogue_3: 'frost',
  rogue_4: 'sarkaz',
  rogue_5: 'garden',
  rogue_6: 'seekers',
};

const ACCENTS = {
  rogue_0: '#7dd3fc',
  rogue_1: '#f87171',
  rogue_2: '#38bdf8',
  rogue_3: '#7dd3fc',
  rogue_4: '#f87171',
  rogue_5: '#f472b6',
  rogue_6: '#2dd4bf',
};

async function loadTable(name) {
  process.stdout.write(`   ↓ ${name}.json\n`);
  const response = await fetch(`${TABLES}/${name}.json`);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.json();
}

/** Делит официальное название на крупную строку и курсивную вторую. */
function splitTitle(name) {
  const ofIndex = name.lastIndexOf(' of ');
  if (ofIndex > 0) {
    return {
      titleTop: name.slice(0, ofIndex).trim().toUpperCase(),
      titleCursive: name.slice(ofIndex + 1).trim(),
    };
  }
  const words = name.split(' ');
  if (words.length === 1) return { titleTop: name.toUpperCase(), titleCursive: '' };
  const last = words.pop();
  return { titleTop: words.join(' ').toUpperCase(), titleCursive: last };
}

const count = (value) =>
  Array.isArray(value) ? value.length : Object.keys(value || {}).length;

const yearOf = (ts) =>
  ts && ts > 0 ? String(new Date(ts * 1000).getUTCFullYear()) : '';

async function main() {
  process.stdout.write('📦 Building terminal data\n');

  const [roguelike, sandbox, cnRoguelike] = await Promise.all([
    loadTable('roguelike_topic_table'),
    loadTable('sandbox_perm_table'),
    fetch(`${TABLES_CN}/roguelike_topic_table.json`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null),
  ]);

  const details = roguelike.details || {};
  const cnDetails = cnRoguelike?.details || {};
  const topics = { ...(roguelike.topics || {}) };
  topics.rogue_0 = { id: 'rogue_0', ...ROGUE_0 };
  topics.rogue_6 = {
    id: 'rogue_6',
    ...ROGUE_6,
    startTime: cnRoguelike?.topics?.rogue_6?.startTime ?? ROGUE_6.startTime,
  };
  // rogue_6 уже есть в CN-таблице: берём оттуда milestones/rewards/challenges.
  details.rogue_6 = cnDetails.rogue_6 || details.rogue_6 || {};

  const integratedStrategies = Object.entries(topics)
    .sort(([a], [b]) => {
      const na = Number(a.replace('rogue_', ''));
      const nb = Number(b.replace('rogue_', ''));
      return na - nb;
    })
    .map(([id, topic]) => {
      const detail = details[id] || {};
      const { titleTop, titleCursive } = splitTitle(topic.name || id);
      // Баннеры zoot-data нумеруются с Ceobe: rogue_0 → IS_1, rogue_6 → IS_7.
      const rogueNumber = Number(id.replace('rogue_', ''));
      const ordinal = rogueNumber + 1;
      // Ceobe's Fungimist (IS #01) лежит не в obt/roguelike, а в act12d6.
      const ceobeStory = id === 'rogue_0' ? 'activities/act12d6' : '';
      const storyFolder = ceobeStory || (rogueNumber > 0 ? `obt/roguelike/ro${rogueNumber}` : '');
      const endingCount = id === 'rogue_0' ? 3 : (ENDING_COUNTS[id] || 0);
      const storyPrefix = id === 'rogue_0' ? 'act12d6' : `rogue${rogueNumber}`;
      const storyScenes = storyFolder
        ? [
            {
              code: 'START',
              label: 'Начало',
              path: `${storyFolder}/level_${storyPrefix}_entry`,
            },
            ...Array.from({ length: endingCount }, (_, endingIndex) => ({
              code: `END ${endingIndex + 1}`,
              label: `Финал ${endingIndex + 1}`,
              path: `${storyFolder}/level_${storyPrefix}_ending_${endingIndex + 1}`,
            })),
          ]
        : [];
      return {
        id,
        code: `IS #${String(ordinal).padStart(2, '0')}`,
        entryStory: storyFolder ? `${storyFolder}/level_${storyPrefix}_entry` : undefined,
        endingStory:
          storyFolder && endingCount > 0
            ? `${storyFolder}/level_${storyPrefix}_ending_${endingCount}`
            : undefined,
        storyScenes,
        name: topic.name || id,
        titleTop,
        titleCursive,
        banner: `${BANNERS}/IS_${ordinal}.png`,
        year: yearOf(topic.startTime),
        lines: (topic.lineText || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        linesRu: LINES_RU[id] || [],
        milestones: count(detail.milestones),
        rewards: count(detail.grandPrizes),
        challenges: count(detail.challenges),
        updates: count(detail.updates),
        accentColor: ACCENTS[id] || '#7dd3fc',
        motifType: MOTIFS[id] || 'frost',
      };
    });

  const reclamation = Object.values(sandbox.basicInfo || {})
    .sort((a, b) => (a.sortId ?? 0) - (b.sortId ?? 0))
    .map((topic, index) => ({
      id: topic.topicId,
      name: topic.topicName,
      banner: `${BANNERS}/RA_${index + 1}_vertical.png`,
      year: yearOf(topic.topicStartTime),
    }));

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), integratedStrategies, reclamation },
      null,
      0
    )
  );
  process.stdout.write(
    `✅ ${outFile} — IS: ${integratedStrategies.length}, RA: ${reclamation.length}\n`
  );
}

main().catch((error) => {
  console.error('❌', error);
  process.exit(1);
});
