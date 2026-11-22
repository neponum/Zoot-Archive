#!/usr/bin/env node
/**
 * Собирает таймлайн историй из таблиц игры.
 *
 * Источники:
 *   - excel/story_review_table.json (EN + CN) — главы/активности и их сцены
 *   - excel/chapter_table.json                — названия актов основной сюжетки
 *   - story/[uc]info/{storyInfo}.txt          — краткие синопсисы сцен
 *   - 关卡一览/曲谱 (PRTS)                     — принадлежность активности к Story Line
 *
 * Story Line (RL/UR/LA/KJ/SI/KA/SU/RH/Æ/LE/TA/ST/TS) в таблицах игры не
 * размечены: группировка взята с wiki-страницы `关卡一览/曲谱`. Иконки линий —
 * реальные файлы игры с `media.prts.wiki` (`图标_曲谱_{код}.png`), уже
 * сохранённые в `public/assets/storyline/`.
 *
 * Обложки — из зеркала проекта `neponum/zoot-data`:
 *   - main_XX.png для основной сюжетной линии
 *   - 情报处理室_{китайское название}.png для активностей
 *
 * Результат — один компактный файл:
 *   public/data/archive/story/index.json
 *
 * Запуск: npm run sync:story
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outFile = path.join(projectRoot, 'public/data/archive/story/index.json');

const TABLES_EN =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/en/gamedata/excel';
const TABLES_CN =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/cn/gamedata/excel';
const STORY_INFO =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/en/gamedata/story/%5Buc%5Dinfo';
const BANNERS = 'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/banners';

const FALLBACK_BANNER = '/assets/terminal/story_mainline_1.png';

async function loadJson(url, label) {
  process.stdout.write(`   ↓ ${label}\n`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response.json();
}

const cleanText = (text) =>
  (text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim();

const STORY_INFO_CN =
  'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/cn/gamedata/story/%5Buc%5Dinfo';

/** Синопсис сцены: сначала EN, для CN-only глав — китайский оригинал. */
async function loadStoryInfo(storyInfo) {
  for (const base of [STORY_INFO, STORY_INFO_CN]) {
    try {
      const response = await fetch(`${base}/${storyInfo}.txt`);
      if (response.ok) {
        const text = cleanText(await response.text());
        if (text) return text;
      }
    } catch {
      /* try the next locale */
    }
  }
  return '';
}

/** Имена файлов баннеров: `ChapterSelector` чистит запрещённые символы. */
const sanitizeBannerPart = (value) =>
  (value || '').replace(/[:：\s<>"/\\|?*]/g, '').trim();

const PRTS_API = 'https://prts.wiki/api.php';
const MIXSTORY = 'https://torappu.prts.wiki/assets/mixstory';

/**
 * CN-события, у которых арт уже лежит в `mixstory`, но которых пока нет в
 * EN-таблицах: id события → слаг (`kv_<slug>`, `title_<slug>`).
 */
const CN_ART_SLUGS = {
  act55side: 'time_set_forth',
};

/**
 * Официальная иконка главы с PRTS (`文件:图标 <название>.png`).
 * Нужна для CN-only событий: у них ещё нет баннера в наших зеркалах.
 */
async function fetchPrtsChapterIcon(cnName) {
  if (!cnName) return '';
  try {
    const title = encodeURIComponent(`文件:图标 ${cnName}.png`);
    const response = await fetch(
      `${PRTS_API}?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json`
    );
    if (!response.ok) return '';
    const data = await response.json();
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const info = page?.imageinfo?.[0];
      if (info?.url) return info.url;
    }
  } catch {
    /* иконки может не быть — не критично */
  }
  return '';
}

/**
 * Арт главы для CN-only событий: официальная «大厅差分 1» с PRTS.
 * Используется как изображение эпизода на странице главы.
 */
async function fetchPrtsChapterArt(cnName) {
  if (!cnName) return '';
  try {
    const title = encodeURIComponent(`文件:${cnName} 大厅差分 1.png`);
    const response = await fetch(
      `${PRTS_API}?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json`
    );
    if (!response.ok) return '';
    const data = await response.json();
    for (const page of Object.values(data?.query?.pages ?? {})) {
      const info = page?.imageinfo?.[0];
      if (info?.url) return info.url;
    }
  } catch {
    /* арта может не быть */
  }
  return '';
}

async function bannerExists(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) return true;
      if (response.status !== 403 && response.status !== 429) return false;
    } catch {
      /* retry once */
    }
  }
  return false;
}

/** Разбивает синопсис на короткие строки-предложения, как в макете. */
function toSynopsisLines(texts) {
  const lines = [];
  for (const text of texts) {
    for (const raw of text.split('\n')) {
      const sentence = raw.trim();
      if (sentence.length < 24) continue;
      if (lines.includes(sentence)) continue;
      lines.push(sentence);
      if (lines.length >= 6) return lines;
    }
  }
  return lines;
}

const yearOf = (entry) => {
  const ts = entry.startTime ?? entry.remakeStartTime ?? entry.startShowTime;
  if (!ts || ts < 0) return '';
  return String(new Date(ts * 1000).getUTCFullYear());
};

/**
 * Story Line из `关卡一览/曲谱` (PRTS): код, официальное китайское название и
 * активности в порядке, в котором они идут в игре.
 * Английские заголовки — перевод названия линии для латинской типографики
 * макета; китайское название выводится рядом как «nativeTitle».
 */
/** Имена файлов иконок линий в `public/assets/storyline/`. */
const ICON_BY_CODE = {
  MS: 'Ms',
  RL: 'Rl',
  UR: 'UR',
  LA: 'La',
  KJ: 'Kj',
  SI: 'Si',
  KA: 'Ka',
  SU: 'Su',
  RH: 'Rh',
  'Æ': 'Ae',
  LE: 'Le',
  TA: 'Ta',
  ST: 'St',
  TS: 'Ts',
};

const STORY_LINES = [
  {
    code: 'MS',
    id: 'ms',
    nativeTitle: '为了明日',
    mainTitle: 'FOR TOMORROW',
    bannerStyle: 'square',
    events: null, // основная сюжетная линия собирается из main_*
  },
  {
    code: 'RL',
    id: 'rl',
    nativeTitle: '方舟',
    mainTitle: 'ARK',
    bannerStyle: 'oval',
    events: [
      '生于黑夜',
      '遗尘漫步',
      '如我所见',
      '巴别塔',
      '追迹日落以西',
      '我们明日见',
    ],
  },
  {
    code: 'UR',
    id: 'ur',
    nativeTitle: '燎原',
    mainTitle: 'PRAIRIE FIRE',
    bannerStyle: 'oval',
    events: ['乌萨斯的孩子们', '人们，我们', '时间啊，向前！'],
  },
  {
    code: 'LA',
    id: 'la',
    nativeTitle: '那被祝福的',
    mainTitle: 'THE BLESSED',
    bannerStyle: 'oval',
    events: ['吾导先路', '空想花庭', '众生行记'],
  },
  {
    code: 'KJ',
    id: 'kj',
    nativeTitle: '山雪与银铁',
    mainTitle: 'SNOW AND IRON',
    bannerStyle: 'oval',
    events: ['风雪过境', '银心湖列车', '雪山降临1101'],
  },
  {
    code: 'SI',
    id: 'si',
    nativeTitle: '七丘的新芽',
    mainTitle: 'SEVEN HILLS',
    bannerStyle: 'oval',
    events: ['叙拉古人', '揭幕者们', '十字路口'],
  },
  {
    code: 'KA',
    id: 'ka',
    nativeTitle: '霓虹之下',
    mainTitle: 'BENEATH THE NEON',
    bannerStyle: 'oval',
    events: ['玛莉娅·临光', '红松林', '长夜临光', '日暮寻路'],
  },
  {
    code: 'SU',
    id: 'su',
    nativeTitle: '岁岁今朝',
    mainTitle: 'YEAR AFTER YEAR',
    bannerStyle: 'oval',
    events: [
      '洪炉示岁',
      '画中人',
      '将进酒',
      '登临意',
      '春分',
      '怀黍离',
      '相见欢',
      '镜中集',
      '辞岁行',
    ],
  },
  {
    code: 'RH',
    id: 'rh',
    nativeTitle: '摘取未来之人',
    mainTitle: 'REAPERS OF THE FUTURE',
    bannerStyle: 'oval',
    events: ['孤岛风云', '绿野幻梦', '孤星', '未许之地'],
  },
  {
    code: 'Æ',
    id: 'ae',
    nativeTitle: '自海渊的一瞥',
    mainTitle: 'FROM THE ABYSS',
    bannerStyle: 'oval',
    events: ['骑兵与猎人', '覆潮之下', '愚人号', '生路', '出苍白海', '昨日海'],
  },
  {
    code: 'LE',
    id: 'le',
    nativeTitle: '高塔迷影',
    mainTitle: 'PHANTOM OF THE TOWER',
    bannerStyle: 'oval',
    events: ['沃伦姆德的薄暮', '尘影余音', '崔林特尔梅之金'],
  },
  {
    code: 'TA',
    id: 'ta',
    nativeTitle: '薪火重燃',
    mainTitle: 'EMBERS REKINDLED',
    bannerStyle: 'oval',
    events: ['照我以火', '挽歌燃烧殆尽'],
  },
  {
    code: 'ST',
    id: 'st',
    nativeTitle: '夏日律动',
    mainTitle: 'SUMMER RHYTHM',
    bannerStyle: 'oval',
    events: [
      '火蓝之心',
      '密林悍将归来',
      '多索雷斯假日',
      '理想城：长夏狂欢季',
      '火山旅梦',
      '太阳甩在身后',
      '墟',
      '直到大地变成一颗酸橙',
    ],
  },
  {
    code: 'TS',
    id: 'ts',
    nativeTitle: '泰拉奇谈',
    mainTitle: 'TERRA TALES',
    bannerStyle: 'oval',
    events: [
      '战地秘闻',
      '午间逸话',
      '踏寻往昔之风',
      '此地之外',
      '喧闹法则',
      '灯火序曲',
      '阴云火花',
      '未尽篇章',
      '去咧嘴谷',
      '熔炉“还魂”记',
      '不义之财',
      '红丝绒',
      '眠于树影之中',
      '雅赛努斯复仇记',
      '丛林症结',
    ],
  },
];

async function build() {
  process.stdout.write('📦 Building story timeline data\n');

  const [reviewEn, reviewCn, chapterTable, stageTable] = await Promise.all([
    loadJson(`${TABLES_EN}/story_review_table.json`, 'story_review_table.en.json'),
    loadJson(`${TABLES_CN}/story_review_table.json`, 'story_review_table.cn.json'),
    loadJson(`${TABLES_EN}/chapter_table.json`, 'chapter_table.json'),
    // Нужна только для CN-only глав: коды и названия их операций.
    loadJson(`${TABLES_CN}/stage_table.json`, 'stage_table.cn.json'),
  ]);

  const stages = stageTable.stages ?? {};
  const stagesById = new Map(
    Object.entries(stages).map(([id, stage]) => [id.toLowerCase(), stage])
  );

  const chapters = Object.values(chapterTable).sort(
    (a, b) => (a.chapterIndex ?? 0) - (b.chapterIndex ?? 0)
  );

  /** Китайское название активности → ключ `story_review_table`. */
  const idByCnName = new Map();
  for (const [id, entry] of Object.entries(reviewCn)) {
    const name = (entry.name || '').trim();
    if (name && !idByCnName.has(name)) idByCnName.set(name, id);
  }

  const buildChapter = async (id, index, line) => {
    // Новые события выходят в CN раньше, чем появляются в EN-таблицах.
    const entry = reviewEn[id] || reviewCn[id];
    if (!entry) return null;

    const nodes = (entry.infoUnlockDatas || [])
      .filter(
        (node) =>
          node.storyInfo &&
          (node.storyCanEnter === 1 || node.storyCanShow === 1)
      )
      .sort((a, b) => (a.storySort ?? 0) - (b.storySort ?? 0));
    if (!nodes.length) return null;

    const cnEntry = reviewCn[id] || {};
    const enEntry = reviewEn[id];
    const book = (cnEntry.name || entry.name || '').trim();
    const isMain = id.startsWith('main_');

    const banner = isMain
      ? `${BANNERS}/main_${String(Number(id.replace('main_', ''))).padStart(2, '0')}.png`
      : `${BANNERS}/${encodeURIComponent(`情报处理室_${sanitizeBannerPart(book)}`)}.png`;

    const sampleNodes = [];
    const seenInfo = new Set();
    for (const node of nodes) {
      if (seenInfo.has(node.storyInfo)) continue;
      seenInfo.add(node.storyInfo);
      sampleNodes.push(node);
      if (sampleNodes.length >= 3) break;
    }

    const synopsisTexts = [];
    for (const node of sampleNodes) {
      const text = await loadStoryInfo(node.storyInfo.replace(/^info\//, ''));
      if (text) synopsisTexts.push(text);
    }

    // CN-only: арт из mixstory (если знаем слаг) либо с PRTS.
    const cnSlug = enEntry ? '' : CN_ART_SLUGS[id] || '';
    const prtsArt = enEntry
      ? ''
      : cnSlug
        ? `${MIXSTORY}/kv/kv_${cnSlug}.png`
        : await fetchPrtsChapterArt(book);
    const bannerUrl =
      prtsArt || ((await bannerExists(banner)) ? banner : FALLBACK_BANNER);

    const calendarYear = Number(yearOf(entry));

    /**
     * Стори-онли узлы (файл не `level_…`): прологи и вставные сцены, которые
     * в игре открываются отдельной кнопкой, а не плиткой операции.
     */
    const prologueStories = nodes
      .filter((node) => {
        const file = String(node.storyTxt || '').split('/').pop() || '';
        return Boolean(file) && !/^level_/i.test(file);
      })
      .map((node) => ({
        title: node.storyName || 'Prologue',
        storyTxt: node.storyTxt,
      }));

    // Для CN-only глав операции берём из CN stage_table: сцены уже известны
    // (nodes), остаётся сопоставить их со стейджами по имени файла.
    const episodes = [];
    if (!enEntry) {
      const seen = new Set();
      for (const node of nodes) {
        const file = String(node.storyTxt || '').split('/').pop() || '';
        let stageId = file.replace(/^level_/i, '');
        let phase = '';
        if (stageId.toLowerCase().endsWith('_beg')) {
          phase = 'beg';
          stageId = stageId.slice(0, -4);
        } else if (stageId.toLowerCase().endsWith('_end')) {
          phase = 'end';
          stageId = stageId.slice(0, -4);
        }
        const stage = stagesById.get(stageId.toLowerCase());
        if (!stage?.code) continue;

        const code = String(stage.code);
        const tag =
          phase === 'beg'
            ? 'Before Operation'
            : phase === 'end'
              ? 'After Operation'
              : 'Interlude';
        const key = `${code}|${tag}`;
        if (seen.has(key)) continue;
        seen.add(key);
        episodes.push({ code, name: stage.name || code, tag });
      }
    }

    return {
      id,
      // Год сюжетной линии (Year-1 = 2019) — для сеточного вида.
      year: calendarYear ? calendarYear - 2018 : 0,
      epNumber: isMain
        ? String(index).padStart(2, '0')
        : `${line.code} ${String(index + 1).padStart(2, '0')}`,
      titleMain: (entry.name || book).toUpperCase(),
      subtitle: entry.name || book,
      locationLabel: isMain
        ? chapters.find((ch) => ch.chapterIndex === Math.min(2, Math.floor(index / 5)))
            ?.chapterName2 || ''
        : `${line.code} · ${yearOf(entry)}`.trim(),
      actHeader:
        isMain && index === 0
          ? { actTitle: 'Act initium', actSubtitle: chapters[0]?.chapterName2 || '' }
          : undefined,
      bannerStyle: line.bannerStyle,
      imageSrc: bannerUrl,
      // Для CN-only глав: официальный title-арт из mixstory либо иконка PRTS.
      logoUrl: enEntry
        ? ''
        : cnSlug
          ? `${MIXSTORY}/title/title_${cnSlug}.png`
          : await fetchPrtsChapterIcon(book),
      synopsisLines: toSynopsisLines(synopsisTexts).length
        ? toSynopsisLines(synopsisTexts)
        : [entry.name || book],
      startStoryTxt: nodes[0].storyTxt || '',
      // Стори-онли узлы без `level_` (например, «序章·上/下» у main_0):
      // их нельзя открыть через плитки операций, поэтому отдаём отдельным
      // списком для кнопок «Пролог» на панели главы.
      ...(prologueStories.length ? { prologueStories } : {}),
      ...(episodes.length ? { episodes } : {}),
    };
  };

  const categories = [];

  // Основная сюжетная линия: main_00 … main_NN по порядку.
  const mainIds = Object.keys(reviewEn)
    .filter((id) => id.startsWith('main_'))
    .sort(
      (a, b) =>
        Number(a.replace('main_', '')) - Number(b.replace('main_', ''))
    );
  const msLine = STORY_LINES[0];
  const mainChapters = [];
  for (const id of mainIds) {
    const chapter = await buildChapter(id, mainChapters.length, msLine);
    if (chapter) mainChapters.push(chapter);
  }
  if (mainChapters.length) {
    categories.push({
      id: msLine.id,
      code: msLine.code,
      topLabel: `Main Story · ${msLine.code}`,
      mainTitle: msLine.mainTitle,
      nativeTitle: msLine.nativeTitle,
      icon: `/assets/storyline/${ICON_BY_CODE[msLine.code]}.png`,
      chapters: mainChapters,
    });
  }

  for (const line of STORY_LINES.slice(1)) {
    const list = [];
    for (const cnName of line.events) {
      const id = idByCnName.get(cnName);
      if (!id) {
        process.stdout.write(`   ⚠ ${line.code}: не найдено событие «${cnName}»\n`);
        continue;
      }
      list.push({ id, entry: reviewEn[id] });
    }
    list.sort((a, b) => (a.entry?.startTime ?? 0) - (b.entry?.startTime ?? 0));

    const lineChapters = [];
    for (const item of list) {
      const chapter = await buildChapter(item.id, lineChapters.length, line);
      if (chapter) lineChapters.push(chapter);
    }
    if (!lineChapters.length) continue;

    categories.push({
      id: line.id,
      code: line.code,
      topLabel: `Story Line · ${line.code}`,
      mainTitle: line.mainTitle,
      nativeTitle: line.nativeTitle,
      icon: `/assets/storyline/${ICON_BY_CODE[line.code]}.png`,
      chapters: lineChapters,
    });
    process.stdout.write(
      `   ✓ ${line.code} ${line.nativeTitle}: ${lineChapters.length}\n`
    );
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), categories }, null, 0)
  );
  const size = (fs.statSync(outFile).size / 1024).toFixed(0);
  const total = categories.reduce((sum, c) => sum + c.chapters.length, 0);
  process.stdout.write(
    `✅ ${outFile} (${categories.length} линий, ${total} событий, ${size} KB)\n`
  );
}

build().catch((error) => {
  console.error('❌', error);
  process.exit(1);
});
