import operatorsDatabase from '../data/operators_database.json';
import { FACTION_NAMES, PROFESSION_NAMES, getOperatorRussianName } from '../utils/operatorUtils';
import { isRussianDossierMissing, loadRussianDossier } from './operatorService';
import { getCanonicalVoiceTitle } from './operatorVoiceService';
import { findVoiceTranslation, loadVoiceOverlay } from './ruCsvOverlayService';
import type {
  OperatorClassType,
  OperatorRecord,
  OperatorSkin,
  OperatorVoiceLine,
} from '../components/OperatorArchiveView';

const CDN = 'https://torappu.prts.wiki/assets';

/** Логотипы коллекций одежды из общего репозитория (`zoot-data/brands`). */
const BRAND_LOGO_BASE =
  'https://raw.githubusercontent.com/neponum/zoot-data/main/brands';

/**
 * Коллекции, для которых выгружен логотип (`scripts/brands/export.py`).
 * У служебных групп (`ILLUST_0`, `ILLUST_2`) логотипа нет — рисуем название.
 */
const BRAND_LOGO_IDS = new Set([
  'sale',
  'epoque',
  'nian',
  'whirlwind',
  'yun',
  'summer',
  'marthe',
  'witch',
  'winter',
  'xmas',
  'wild',
  'sweep',
  'boc',
  'kitchen',
  'ghost',
  'race',
  'striker',
  'ambiencesynesthesia',
  'crossover',
  'shining',
  'game',
  'iteration',
  'unveiling',
  'sightseer',
  'breaker',
  'kfc',
  'wwf',
]);

function brandLogoUrl(brandId: string): string {
  return BRAND_LOGO_IDS.has(brandId) ? `${BRAND_LOGO_BASE}/brand_${brandId}.png` : '';
}

function assetUrl(bucket: string, id: string): string {
  return `${CDN}/${bucket}/${encodeURIComponent(id)}.png`;
}

interface RawOperator {
  id: string;
  nameEn?: string;
  nameZh?: string;
  rarity?: number;
  profession?: string;
  subProfessionId?: string;
  nationId?: string;
  groupId?: string;
  teamId?: string;
  position?: string;
  displayNumber?: string;
}

interface OpPack {
  handbook: Array<{ title: string; text: string }>;
  voices: Array<{ id: string; voiceId?: string; title: string; text: string }>;
  cv?: Record<string, string>;
  voiceLangs?: string[];
  skins: Array<{
    id: string;
    groupId: string;
    /** Коллекция без года: `2023#boc` → `boc`. */
    brandId: string;
    /** `spDynIllustId`, если у образа есть Spine-анимация. */
    dynIllust: string;
    groupName: string;
    name: string | null;
    content: string;
    drawer: string;
    colors: string[];
    portrait: string;
    avatar: string;
    buy: boolean;
    isDefault: boolean;
  }>;
}

const CLASS_MAP: Record<string, OperatorClassType> = {
  PIONEER: 'VANGUARD',
  WARRIOR: 'GUARD',
  TANK: 'DEFENDER',
  SNIPER: 'SNIPER',
  CASTER: 'CASTER',
  MEDIC: 'MEDIC',
  SUPPORT: 'SUPPORTER',
  SPECIAL: 'SPECIALIST',
};

const CLASS_ACCENT: Record<OperatorClassType, string> = {
  VANGUARD: '#0e7490',
  GUARD: '#9f1239',
  DEFENDER: '#92400e',
  SNIPER: '#1e40af',
  CASTER: '#3730a3',
  MEDIC: '#0f766e',
  SUPPORTER: '#5b21b6',
  SPECIALIST: '#831843',
};

const CAMP_LOGO_RULES: Array<[RegExp, string]> = [
  [/rhine/, 'rhine'],
  [/karlan/, 'karlan'],
  [/elite/, 'elite'],
  [/abyssal/, 'abyssal'],
  [/penguin/, 'penguin'],
  [/lgd|lungmen-guard/, 'lgd'],
  [/babel/, 'babel'],
  [/sweep/, 'sweep'],
  [/siracusa/, 'siracusa'],
  [/kazimierz/, 'kazimierz'],
  [/laterano/, 'laterano'],
  [/egir|aegir/, 'egir'],
  [/rhodes/, 'rhodes'],
];

function getCampLogo(raw: RawOperator): string {
  const key = [raw.groupId, raw.teamId, raw.nationId].filter(Boolean).join('|').toLowerCase();
  for (const [pattern, logo] of CAMP_LOGO_RULES) {
    if (pattern.test(key)) return `/assets/operators/camps/logo_${logo}.png`;
  }
  return '/assets/operators/camps/logo_rhodes.png';
}

function factionLabel(raw: RawOperator): string {
  const keys = [raw.groupId, raw.teamId, raw.nationId].filter(Boolean) as string[];
  for (const key of keys) {
    const entry = FACTION_NAMES[key];
    if (entry) return entry.en;
  }
  if (raw.nationId) return raw.nationId.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return 'Rhodes Island';
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const DEFAULT_SKIN_CONTENT =
  'The outfit this Operator wears most often. While not as practical as a uniform, it is what they find most comfortable.';

const ELITE_SKIN_CONTENT =
  'An outfit improved after the Operator’s Promotion. Custom-made to suit their experience and needs, it provides maximum flexibility on any battlefield.';

function buildDefaultSkins(raw: RawOperator, accent: string): OperatorSkin[] {
  const avatar = (variant: 1 | 2) => assetUrl('char_avatar', `${raw.id}${variant === 2 ? '_2' : ''}`);
  return [
    {
      id: `${raw.id}#1`,
      tabType: 'default_1',
      topBadgeSmall: 'DEFAULT OUTFIT',
      topBadgeMain: 'I',
      brandName: 'DEFAULT OUTFIT',
      skinTitle: 'Standard Attire I',
      illustrator: '',
      description: DEFAULT_SKIN_CONTENT,
      fullArtSrc: assetUrl('char_arts', `${raw.id}_1`),
      portraitSrc: assetUrl('char_portrait', `${raw.id}_1`),
      avatarSrc: avatar(1),
      accentColor: accent,
      secondaryBracketColor: accent,
      artScaleClass: 'h-[94%] sm:h-[98%]',
    },
    {
      id: `${raw.id}#2`,
      tabType: 'default_2',
      topBadgeSmall: 'DEFAULT OUTFIT',
      topBadgeMain: 'II',
      brandName: 'DEFAULT OUTFIT',
      skinTitle: 'Elite II Promotion Attire',
      illustrator: '',
      description: ELITE_SKIN_CONTENT,
      fullArtSrc: assetUrl('char_arts', `${raw.id}_2`),
      portraitSrc: assetUrl('char_portrait', `${raw.id}_2`),
      avatarSrc: avatar(2),
      accentColor: accent,
      secondaryBracketColor: accent,
      artScaleClass: 'h-[115%] sm:h-[124%]',
    },
  ];
}

/**
 * Compact index used by the directory grid: no handbook / voices yet,
 * only identity plus CDN-backed default skins.
 */
export function buildOperatorIndex(): OperatorRecord[] {
  const list = (operatorsDatabase as unknown as RawOperator[]) || [];
  return list.map((raw) => {
    const classLabel = CLASS_MAP[raw.profession || ''] || 'SPECIALIST';
    const accent = CLASS_ACCENT[classLabel];
    const name = raw.nameEn || raw.nameZh || raw.id;
    return {
      id: raw.id,
      dataNo: raw.displayNumber || '',
      name: name.toUpperCase(),
      codename: name,
      faction: factionLabel(raw),
      campLogoSrc: getCampLogo(raw),
      classLabel,
      subClassLabel: titleCase(raw.subProfessionId || ''),
      illustrator: '',
      voiceActor: '',
      defaultSkinIndex: 0,
      accentColor: accent,
      localizedName: {
        en: name,
        ru: getOperatorRussianName(raw.id, name),
        ...(raw.nameZh ? { zh: raw.nameZh } : {}),
      },
      basicFile: {
        gender: '',
        combatExp: '',
        birthplace: '',
        birthday: '',
        race: '',
        height: '',
        oripathyStatus: '',
      },
      physicalExam: {
        strength: '',
        mobility: '',
        endurance: '',
        tactical: '',
        combatSkill: '',
        originiumArts: '',
      },
      operatorRecordTitle: 'PROFILE',
      operatorRecordSynopsis: '',
      operatorRecordFullStory: [],
      voiceLines: [],
      skins: buildDefaultSkins(raw, accent),
    } satisfies OperatorRecord;
  });
}

const BASIC_EN: Array<[string, keyof OperatorRecord['basicFile']]> = [
  ['code name', 'gender'],
  ['gender', 'gender'],
  ['combat experience', 'combatExp'],
  ['place of birth', 'birthplace'],
  ['date of birth', 'birthday'],
  ['race', 'race'],
  ['height', 'height'],
  ['infection status', 'oripathyStatus'],
];

const BASIC_RU: Array<[string, keyof OperatorRecord['basicFile']]> = [
  ['позывной', 'gender'],
  ['пол', 'gender'],
  ['боевой опыт', 'combatExp'],
  ['место рождения', 'birthplace'],
  ['дата рождения', 'birthday'],
  ['раса', 'race'],
  ['рост', 'height'],
  ['статус заражения', 'oripathyStatus'],
];

const EXAM_EN: Array<[string, keyof OperatorRecord['physicalExam']]> = [
  ['physical strength', 'strength'],
  ['mobility', 'mobility'],
  ['physical resilience', 'endurance'],
  ['physical endurance', 'endurance'],
  ['tactical acumen', 'tactical'],
  ['combat skill', 'combatSkill'],
  ['originium arts assimilation', 'originiumArts'],
];

const EXAM_RU: Array<[string, keyof OperatorRecord['physicalExam']]> = [
  ['физическая сила', 'strength'],
  ['мобильность', 'mobility'],
  ['физическая выносливость', 'endurance'],
  ['тактическая грамотность', 'tactical'],
  ['боевые навыки', 'combatSkill'],
  ['адаптация', 'originiumArts'],
];

const BASIC_ZH: Array<[string, keyof OperatorRecord['basicFile']]> = [
  ['代号', 'gender'],
  ['性别', 'gender'],
  ['战斗经验', 'combatExp'],
  ['出身地', 'birthplace'],
  ['生日', 'birthday'],
  ['种族', 'race'],
  ['身高', 'height'],
  ['矿石病感染情况', 'oripathyStatus'],
];

const EXAM_ZH: Array<[string, keyof OperatorRecord['physicalExam']]> = [
  ['物理强度', 'strength'],
  ['战场机动', 'mobility'],
  ['生理耐受', 'endurance'],
  ['战术规划', 'tactical'],
  ['战斗技巧', 'combatSkill'],
  ['源石技艺适应性', 'originiumArts'],
];

const BASIC_JA: Array<[string, keyof OperatorRecord['basicFile']]> = [
  ['コードネーム', 'gender'],
  ['性別', 'gender'],
  ['戦闘経験', 'combatExp'],
  ['出身地', 'birthplace'],
  ['誕生日', 'birthday'],
  ['種族', 'race'],
  ['身長', 'height'],
  ['鉱石病感染状況', 'oripathyStatus'],
];

const EXAM_JA: Array<[string, keyof OperatorRecord['physicalExam']]> = [
  ['物理強度', 'strength'],
  ['戦場機動', 'mobility'],
  ['生理的耐性', 'endurance'],
  ['戦術立案', 'tactical'],
  ['戦闘技術', 'combatSkill'],
  ['アーツ適性', 'originiumArts'],
];

const BASIC_KO: Array<[string, keyof OperatorRecord['basicFile']]> = [
  ['코드네임', 'gender'],
  ['성별', 'gender'],
  ['전투 경험', 'combatExp'],
  ['출신지', 'birthplace'],
  ['생일', 'birthday'],
  ['종족', 'race'],
  ['신장', 'height'],
  ['광석병 감염 상황', 'oripathyStatus'],
];

const EXAM_KO: Array<[string, keyof OperatorRecord['physicalExam']]> = [
  ['물리적 강도', 'strength'],
  ['전장 기동력', 'mobility'],
  ['생체 인내도', 'endurance'],
  ['전술 계획력', 'tactical'],
  ['전투 기술력', 'combatSkill'],
  ['오리지늄 아츠 적응성', 'originiumArts'],
];

const BASIC_BY_LANG = {
  en: BASIC_EN,
  zh: BASIC_ZH,
  ja: BASIC_JA,
  ko: BASIC_KO,
} as const;

const EXAM_BY_LANG = {
  en: EXAM_EN,
  zh: EXAM_ZH,
  ja: EXAM_JA,
  ko: EXAM_KO,
} as const;

/** Названия разделов досье в каждой официальной локализации. */
const SECTION_TITLES = {
  en: { basic: 'Basic Info', exam: 'Physical Exam', profile: 'Profile' },
  zh: { basic: '基础档案', exam: '综合体检测试', profile: '客观履历' },
  ja: { basic: '基礎情報', exam: '能力測定', profile: '個人履歴' },
  ko: { basic: '기본정보', exam: '종합검진', profile: '프로필' },
} as const;

const PROFILE_TITLES = {
  ru: 'ЛИЧНОЕ ДЕЛО',
  en: 'PROFILE',
  zh: '档案资料',
  ja: 'プロフィール',
  ko: '프로필',
} as const;

/** Убирает разметку `<@...>` из текстов таблиц игры. */
function cleanGameText(text: string): string {
  return (text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .trim();
}

/** Китайские и японские таблицы используют 【…】 вместо […]. */
function normalizeBrackets(text: string): string {
  return text.replace(/【/g, '[').replace(/】/g, ']');
}

function parseBracketBlock(
  text: string
): Array<{ label: string; value: string }> {
  const rows = normalizeBrackets(text).split('\n');
  const out: Array<{ label: string; value: string }> = [];
  let current: { label: string; value: string } | null = null;
  for (const line of rows) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      if (current) out.push(current);
      current = { label: match[1].toLowerCase(), value: match[2] };
    } else if (current) {
      current.value = `${current.value}\n${trimmed}`.trim();
    }
  }
  if (current) out.push(current);
  return out;
}

function applyBasic(
  text: string,
  map: Array<[string, keyof OperatorRecord['basicFile']]>,
  target: OperatorRecord['basicFile']
) {
  for (const { label, value } of parseBracketBlock(text)) {
    const entry = map.find(([key]) => label.startsWith(key));
    if (entry && value) target[entry[1]] = value.replace(/\s+/g, ' ').trim();
  }
}

function applyExam(
  text: string,
  map: Array<[string, keyof OperatorRecord['physicalExam']]>,
  target: OperatorRecord['physicalExam']
) {
  for (const { label, value } of parseBracketBlock(text)) {
    const entry = map.find(([key]) => label.startsWith(key));
    if (entry && value) target[entry[1]] = value.replace(/\s+/g, ' ').trim();
  }
}

function toParagraphs(text: string): string[] {
  return text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export interface RussianDossierSection {
  index: number;
  titleEn: string;
  titleRu: string;
  textRu: string;
}

/**
 * Каталог дубляжей игры. Базовые языки лежат в собственных папках CDN,
 * дополнительные (диалект, итальянский, русский, немецкий, французский,
 * иберийский, коллаб) — в `voice_custom`.
 */
export const VOICE_DUBS: Array<{ id: string; label: string; title: string }> = [
  { id: 'JP', label: 'JP', title: '日本語' },
  { id: 'CN_MANDARIN', label: 'CN', title: '中文' },
  { id: 'EN', label: 'EN', title: 'English' },
  { id: 'KR', label: 'KR', title: '한국어' },
  { id: 'CN_TOPOLECT', label: '中·方', title: '中文方言' },
  { id: 'ITA', label: 'IT', title: 'Italiano' },
  { id: 'RUS', label: 'RU', title: 'Русский' },
  { id: 'GER', label: 'DE', title: 'Deutsch' },
  { id: 'FRE', label: 'FR', title: 'Français' },
  { id: '11', label: 'ES', title: 'Español (Iberia)' },
  { id: 'LINKAGE', label: 'LINK', title: 'Collab voice' },
];

const VOICE_DUB_ORDER = new Map(VOICE_DUBS.map((dub, index) => [dub.id, index]));

/** Языки дубляжа в каноническом порядке (сначала базовые четыре). */
export function sortVoiceLangs(langs: string[]): string[] {
  return [...new Set(langs)].sort(
    (a, b) =>
      (VOICE_DUB_ORDER.get(a) ?? 99) - (VOICE_DUB_ORDER.get(b) ?? 99)
  );
}

/** Папка CDN с mp3 конкретного дубляжа. */
function voiceFolder(operatorId: string, dub: string): string | null {
  switch (dub) {
    case 'JP':
    case 'LINKAGE':
      return `${CDN}/audio/voice/${operatorId}`;
    case 'CN_MANDARIN':
      return `${CDN}/audio/voice_cn/${operatorId}`;
    case 'EN':
      return `${CDN}/audio/voice_en/${operatorId}`;
    case 'KR':
      return `${CDN}/audio/voice_kr/${operatorId}`;
    case 'CN_TOPOLECT':
      return `${CDN}/audio/voice_custom/${operatorId}_cn_topolect`;
    case 'ITA':
      return `${CDN}/audio/voice_custom/${operatorId}_ita`;
    case 'RUS':
    case 'GER':
    case 'FRE':
    case '11':
      return `${CDN}/audio/voice_custom/${operatorId}`;
    default:
      return null;
  }
}

/**
 * Прямая ссылка на mp3-реплику конкретного дубляжа.
 * Имя файла всегда строится по CN-идентификатору (`cn_001.mp3`) — папка задаёт язык.
 */
export function getVoiceAudioUrl(
  operatorId: string,
  voiceId: string | undefined,
  dub: string
): string | null {
  if (!voiceId) return null;
  const folder = voiceFolder(operatorId, dub);
  if (!folder) return null;
  return `${folder}/${voiceId.toLowerCase()}.mp3`;
}

export interface OperatorDetailResult {
  operator: OperatorRecord;
  contentLanguage: DossierLang;
}

/** Язык досье: официальные языки игры + русская community-локализация. */
export type DossierLang = 'ru' | 'en' | 'zh' | 'ja' | 'ko';

export const DOSSIER_LANGS: Array<{ id: DossierLang; label: string; title: string }> = [
  { id: 'ru', label: 'RU', title: 'Русский' },
  { id: 'en', label: 'EN', title: 'English' },
  { id: 'zh', label: '中', title: '中文' },
  { id: 'ja', label: '日', title: '日本語' },
  { id: 'ko', label: '한', title: '한국어' },
];

/** Ветки `ArknightsAssets/ArknightsGamedata` с официальной локализацией. */
const BRANCH_BY_LANG: Record<Exclude<DossierLang, 'ru'>, string> = {
  en: 'en',
  zh: 'cn',
  ja: 'jp',
  ko: 'kr',
};

// jsDelivr отдаёт сжатый JSON (~1,3–1,6 МБ на таблицу). Таблицы скачиваются
// только когда пользователь открывает досье, и живут в Cache Storage браузера.
const EXCEL_CDN =
  'https://cdn.jsdelivr.net/gh/ArknightsAssets/ArknightsGamedata@master';
const TABLE_CACHE_NAME = 'zoot-dossier-tables-v1';
const TABLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface RawHandbookSection {
  storyTitle?: string;
  stories?: Array<{ storyText?: string }>;
}

interface RawHandbookEntry {
  storyTextAudio?: RawHandbookSection[];
}

interface RawCharword {
  charId?: string;
  charWordId?: string;
  voiceId?: string;
  voiceTitle?: string;
  voiceText?: string;
  voiceIndex?: number;
}

interface RawCharwordTable {
  charWords?: Record<string, RawCharword>;
  voiceLangDict?: Record<string, { dict?: Record<string, { cvName?: string[] }> }>;
}

interface RawSkin {
  skinId?: string;
  charId?: string;
  portraitId?: string;
  avatarId?: string;
  isBuySkin?: boolean;
  /** Анимированная иллюстрация образа (`dyn_illust_char_…`). */
  dynIllustId?: string;
  /** Особый вариант с интерактивом (`sp_dyn_illust_…`). */
  spDynIllustId?: string;
  displaySkin?: {
    skinGroupId?: string;
    skinGroupName?: string;
    skinName?: string;
    content?: string;
    drawerList?: string[];
    colorList?: string[];
  };
}

interface RawSkinTable {
  charSkins?: Record<string, RawSkin>;
  /** Динамические (анимированные) образы: `spDynIllustId` по `skinId`. */
  spDynSkins?: Record<string, { spDynIllustId?: string }>;
}

interface RawHandbookTable {
  handbookDict?: Record<string, RawHandbookEntry>;
}

interface RawStoryReviewInfo {
  storyTxt?: string;
  storyName?: string;
  storySort?: number;
}

interface RawStoryReviewEntry {
  name?: string;
  infoUnlockDatas?: RawStoryReviewInfo[];
}

/** `story_review_table.json` — карта `story_<shortId>_set_<n>` → записи оперативника. */
type RawStoryReviewTable = Record<string, RawStoryReviewEntry>;

/** Запись «密录» оперативника: путь сценария для читалки (`/story/<storyTxt>`). */
export interface OperatorMemoryStory {
  title: string;
  storyTxt: string;
}

const tableMemory = new Map<string, unknown>();
const tableInflight = new Map<string, Promise<unknown>>();

/**
 * Какие оперативники реально имеют текст досье в каждой языковой ветке игры.
 * Заполняется при первой загрузке `handbook_info_table` для языка, дальше
 * проверка мгновенная — кнопка языка, для которого досье нет, блокируется.
 */
const dossierIndex = new Map<string, Set<string>>();

function indexHandbookDossiers(lang: string, table: RawHandbookTable) {
  const ids = new Set<string>();
  for (const [opId, entry] of Object.entries(table.handbookDict || {})) {
    const hasText = (entry.storyTextAudio || []).some((section) =>
      (section.stories || []).some((story) => (story.storyText || '').trim())
    );
    if (hasText) ids.add(opId);
  }
  dossierIndex.set(lang, ids);
}

function readCacheTimestamp(response: Response): number {
  return Number(response.headers.get('x-zoot-cached-at') || 0);
}

async function loadTable<T>(
  lang: Exclude<DossierLang, 'ru'>,
  name:
    | 'handbook_info_table'
    | 'charword_table'
    | 'skin_table'
    | 'story_review_table'
): Promise<T> {
  const key = `${lang}:${name}`;
  if (tableMemory.has(key)) return tableMemory.get(key) as T;
  const inflight = tableInflight.get(key);
  if (inflight) return inflight as Promise<T>;

  const url = `${EXCEL_CDN}/${BRANCH_BY_LANG[lang]}/gamedata/excel/${name}.json`;

  const task = (async () => {
    // 1. Браузерный кэш: досье открывается без повторной загрузки таблиц.
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(TABLE_CACHE_NAME);
        const hit = await cache.match(url);
        if (hit) {
          const cachedAt = readCacheTimestamp(hit);
          if (cachedAt && Date.now() - cachedAt < TABLE_TTL_MS) {
            return JSON.parse(await hit.text()) as T;
          }
          await cache.delete(url);
        }
      } catch {
        /* приватный режим / квота — работаем без кэша */
      }
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new ArchiveNetworkError(`${name} (${lang}): HTTP ${response.status}`);
    }
    const text = await response.text();

    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(TABLE_CACHE_NAME);
        await cache.put(
          url,
          new Response(text, {
            headers: {
              'content-type': 'application/json',
              'x-zoot-cached-at': String(Date.now()),
            },
          })
        );
      } catch {
        /* квота исчерпана — просто не кэшируем */
      }
    }

    return JSON.parse(text) as T;
  })();

  tableInflight.set(key, task);
  try {
    const value = await task;
    tableMemory.set(key, value);
    return value;
  } finally {
    tableInflight.delete(key);
  }
}

const memoryStoryCache = new Map<string, OperatorMemoryStory[]>();

/** Короткий id оперативника в `story_review_table`: `char_1043_leizi2` → `leizi2`. */
function memoryShortIds(opId: string): string[] {
  const suffix = opId.replace(/^char_\d+_/, '');
  const withoutAlterNumber = suffix.replace(/\d+$/, '');
  return Array.from(new Set([suffix, withoutAlterNumber]));
}

/**
 * Истории оперативника (密录) из `story_review_table.json`.
 * Пути сцен одинаковы во всех языковых ветках, поэтому берём CN-таблицу:
 * она доступна на jsDelivr целиком, в отличие от EN.
 */
export async function loadOperatorMemoryStories(
  opId: string
): Promise<OperatorMemoryStory[]> {
  const cached = memoryStoryCache.get(opId);
  if (cached) return cached;

  const table = await loadTable<RawStoryReviewTable>('zh', 'story_review_table');
  const shortIds = new Set(memoryShortIds(opId));

  const sets: Array<{ set: number; items: OperatorMemoryStory[] }> = [];
  for (const [groupId, entry] of Object.entries(table)) {
    const match = /^story_(.+)_set_(\d+)$/.exec(groupId);
    if (!match || !shortIds.has(match[1])) continue;

    const items = (entry.infoUnlockDatas || [])
      .slice()
      .sort((a, b) => (a.storySort ?? 0) - (b.storySort ?? 0))
      .filter((info) => (info.storyTxt || '').startsWith('obt/memory/'))
      .map((info) => ({
        title: info.storyName || entry.name || groupId,
        storyTxt: info.storyTxt as string,
      }));
    if (items.length) sets.push({ set: Number(match[2]), items });
  }

  sets.sort((a, b) => a.set - b.set);
  const stories = sets.flatMap((set) => set.items);
  memoryStoryCache.set(opId, stories);
  return stories;
}

/** Собирает пак оперативника из скачанных таблиц (формат прежних JSON-паков). */
function extractPack(
  opId: string,
  handbookTable: RawHandbookTable,
  charwordTable: RawCharwordTable,
  skinTable: RawSkinTable
): OpPack | null {
  const handbook: OpPack['handbook'] = [];
  for (const section of handbookTable.handbookDict?.[opId]?.storyTextAudio || []) {
    const text = (section.stories || [])
      .map((story) => cleanGameText(story.storyText || ''))
      .filter(Boolean)
      .join('\n');
    if (text) handbook.push({ title: section.storyTitle || '', text });
  }

  const words = Object.values(charwordTable.charWords || {})
    .filter((word) => word.charId === opId)
    .sort((a, b) => (a.voiceIndex ?? 0) - (b.voiceIndex ?? 0));

  const voices: OpPack['voices'] = words
    .filter((word) => word.voiceText)
    .map((word) => ({
      id: word.charWordId || word.voiceId || '',
      voiceId: word.voiceId || '',
      title: word.voiceTitle || word.voiceId || '',
      text: cleanGameText(word.voiceText || ''),
    }));

  const cv: Record<string, string> = {};
  for (const [langType, entry] of Object.entries(
    charwordTable.voiceLangDict?.[opId]?.dict || {}
  )) {
    const names = (entry?.cvName || []).filter(Boolean);
    if (names.length) cv[langType] = names.join(', ');
  }

  // Список языков берём из самой игры, а не из имён CV: бывает, что дубль
  // записан, а актёр в таблице не указан.
  const voiceLangs = sortVoiceLangs(
    Object.keys(charwordTable.voiceLangDict?.[opId]?.dict || {})
  );

  const skins: OpPack['skins'] = [];
  for (const skin of Object.values(skinTable.charSkins || {})) {
    if (skin.charId !== opId) continue;
    const display = skin.displaySkin || {};
    // `skinGroupId` вида `2023#boc` или `2019#sale#2`: год отбрасываем,
    // остаётся `brandId`, по которому находится официальный логотип.
    const brandId = (display.skinGroupId || '')
      .replace(/^\d{4}#/, '')
      .split('#')[0]
      .toLowerCase();
    // Анимированных образов в игре 92, а не 4: `spDynSkins` — только особые
    // интерактивные варианты, остальные помечены `dynIllustId` у самого скина.
    const dynIllust =
      skin.dynIllustId ||
      skin.spDynIllustId ||
      skinTable.spDynSkins?.[skin.skinId || '']?.spDynIllustId ||
      '';
    skins.push({
      id: skin.skinId || '',
      groupId: display.skinGroupId || '',
      brandId,
      dynIllust,
      groupName: display.skinGroupName || '',
      name: display.skinName || null,
      content: cleanGameText(display.content || ''),
      drawer: (display.drawerList || []).filter(Boolean).join(', '),
      colors: (display.colorList || []).filter((color) => /^#/.test(color || '')),
      portrait: skin.portraitId || '',
      avatar: skin.avatarId || '',
      buy: !!skin.isBuySkin,
      isDefault: (display.skinGroupId || '').startsWith('ILLUST_'),
    });
  }

  if (!handbook.length && !voices.length && !skins.length) return null;
  return { handbook, voices, cv, voiceLangs, skins };
}

const packCache = new Map<string, OpPack | null>();

/**
 * Русские описания образов: `translation/ru_RU/skins.json` в zoot-data,
 * ключ — `skinId`. Тексты в игре есть только на EN/CN, поэтому перевод живёт
 * отдельным оверлеем; пустое значение = показываем английский оригинал.
 */
const SKIN_OVERLAY_URL =
  'https://raw.githubusercontent.com/neponum/zoot-data/main/translation/ru_RU/skins.json';
let skinOverlayPromise: Promise<Record<string, string>> | null = null;

function loadSkinOverlay(): Promise<Record<string, string>> {
  if (!skinOverlayPromise) {
    skinOverlayPromise = fetch(SKIN_OVERLAY_URL, { cache: 'no-cache' })
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
      .then((data: unknown) => (data && typeof data === 'object' ? (data as Record<string, string>) : {}));
  }
  return skinOverlayPromise;
}

class ArchiveNetworkError extends Error {}

async function fetchPack(opId: string, lang: DossierLang): Promise<OpPack | null> {
  const sourceLang: Exclude<DossierLang, 'ru'> = lang === 'ru' ? 'en' : lang;
  const key = `${sourceLang}:${opId}`;
  if (packCache.has(key)) return packCache.get(key) ?? null;

  // Три таблицы качаются параллельно и кэшируются в браузере целиком:
  // следующий оперативник на этом языке открывается уже без сети.
  const [handbookTable, charwordTable, skinTable] = await Promise.all([
    loadTable<RawHandbookTable>(sourceLang, 'handbook_info_table'),
    loadTable<RawCharwordTable>(sourceLang, 'charword_table'),
    loadTable<RawSkinTable>(sourceLang, 'skin_table'),
  ]);

  if (!dossierIndex.has(sourceLang)) {
    indexHandbookDossiers(sourceLang, handbookTable);
  }

  const pack = extractPack(opId, handbookTable, charwordTable, skinTable);
  packCache.set(key, pack);
  return pack;
}

function findSection(
  sections: Array<{ titleEn: string; textRu: string }>,
  title: string
): string {
  return sections.find((s) => s.titleEn === title)?.textRu || '';
}

const voiceLinesCache = new Map<string, OperatorVoiceLine[]>();

/**
 * Только реплики оперативника: одна таблица `charword_table` вместо трёх.
 * Быстрее и надёжнее, чем `loadOperatorDetail`, когда нужны лишь голосовые
 * строки для переводчика.
 */
export async function loadOperatorVoices(opId: string): Promise<OperatorVoiceLine[]> {
  const cached = voiceLinesCache.get(opId);
  if (cached) return cached;

  const charwordTable = await loadTable<RawCharwordTable>('en', 'charword_table');
  const seen = new Set<string>();
  const lines = Object.values(charwordTable.charWords || {})
    .filter((word) => word.charId === opId && !!word.voiceText)
    .sort((a, b) => (a.voiceIndex ?? 0) - (b.voiceIndex ?? 0))
    .map<OperatorVoiceLine>((word, index) => ({
      id: word.charWordId || word.voiceId || `v-${index}`,
      voiceId: word.voiceId || '',
      title: getCanonicalVoiceTitle(word.voiceTitle || word.voiceId || '', 'ru_RU'),
      transcript: cleanGameText(word.voiceText || ''),
    }))
    .filter((line) => {
      const key = `${line.title}||${line.transcript}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  voiceLinesCache.set(opId, lines);
  return lines;
}

export async function loadOperatorDetail(
  base: OperatorRecord,
  lang: DossierLang
): Promise<OperatorDetailResult> {
  // Русское досье грузим всегда, а не только при `lang === 'ru'`: по нему
  // вычисляется доступность вкладки RU. Иначе получался замкнутый круг —
  // вкладка выключена, пока досье не загружено, а загрузка не начинается,
  // пока не выбран русский язык.
  const [pack, ruDossier, skinOverlay] = await Promise.all([
    fetchPack(base.id, lang),
    loadRussianDossier(base.id),
    lang === 'ru' ? loadSkinOverlay() : Promise.resolve<Record<string, string>>({}),
  ]);

  const operator: OperatorRecord = {
    ...base,
    basicFile: { ...base.basicFile },
    physicalExam: { ...base.physicalExam },
    skins: base.skins,
    voiceLines: [],
  };

  const sourceLang = lang === 'ru' ? 'en' : lang;
  const sections = pack?.handbook ?? [];
  const ruSections = (ruDossier?.sections ?? []) as RussianDossierSection[];
  const ruAvailable = ruSections.some((s) => !!s.textRu);
  const hasRu = lang === 'ru' && ruAvailable;
  const contentLanguage: DossierLang = hasRu ? 'ru' : sourceLang;
  const titles = SECTION_TITLES[sourceLang];

  const basicText = hasRu
    ? ruSections.find((s) => s.titleEn === 'Basic Info')?.textRu || ''
    : sections.find((s) => s.title === titles.basic)?.text || '';
  const examText = hasRu
    ? ruSections.find((s) => s.titleEn === 'Physical Exam')?.textRu || ''
    : sections.find((s) => s.title === titles.exam)?.text || '';

  applyBasic(
    basicText,
    hasRu ? BASIC_RU : BASIC_BY_LANG[sourceLang],
    operator.basicFile
  );
  applyExam(
    examText,
    hasRu ? EXAM_RU : EXAM_BY_LANG[sourceLang],
    operator.physicalExam
  );

  // В charword_table одна и та же реплика лежит в нескольких голосовых наборах
  // (обычный, TOPOLECT, LINKAGE). Для архива важен сам текст — оставляем первый.
  const seenVoices = new Set<string>();
  operator.voiceLines = (pack?.voices ?? [])
    .map<OperatorVoiceLine>((v, index) => ({
      id: v.id || `v-${index}`,
      voiceId: v.voiceId,
      // На русской версии сайта подписи реплик переводим по канону
      // (`VOICE_TITLE_RU_MAP`), тексты приходят из игры как есть.
      title:
        lang === 'ru' ? getCanonicalVoiceTitle(v.title, 'ru_RU') : v.title,
      transcript: v.text,
    }))
    .filter((line) => {
      const key = `${line.title}||${line.transcript}`;
      if (seenVoices.has(key)) return false;
      seenVoices.add(key);
      return true;
    });

  if (lang === 'ru' && operator.voiceLines.length > 0) {
    const overlay = await loadVoiceOverlay(base.id);
    if (overlay.size > 0) {
      operator.voiceLines = operator.voiceLines.map((line) => {
        const translated = findVoiceTranslation(overlay, line.id, line.title, line.transcript);
        return translated ? { ...line, transcript: translated } : line;
      });
    }
  }

  if (pack?.skins?.length) {
    const skins: OperatorSkin[] = pack.skins.map((s) => {
      const tabType: OperatorSkin['tabType'] = s.groupId === 'ILLUST_2'
        ? 'default_2'
        : s.isDefault
          ? 'default_1'
          : 'skin';
      const accent = s.colors[0] || base.accentColor;
      return {
        id: s.id,
        tabType,
        topBadgeSmall: s.isDefault ? 'DEFAULT OUTFIT' : '#OUTFIT OF THE DAY',
        topBadgeMain:
          tabType === 'default_1' ? 'I' : tabType === 'default_2' ? 'II' : s.groupName || 'OUTFIT',
        brandName: s.groupName || 'DEFAULT OUTFIT',
        brandId: s.brandId,
        brandLogo: brandLogoUrl(s.brandId),
        dynIllust: s.dynIllust || undefined,
        skinTitle: s.name || (tabType === 'default_1' ? 'Standard Attire I' : 'Elite II Promotion Attire'),
        illustrator: s.drawer,
        description:
          skinOverlay[s.id] ||
          s.content ||
          (tabType === 'default_2' ? ELITE_SKIN_CONTENT : DEFAULT_SKIN_CONTENT),
        // Идентификаторы скинов содержат `#` (char_010_chen_nian#2) — его нужно
        // экранировать, иначе браузер считает остаток пути якорем и получает 404.
        fullArtSrc: assetUrl('char_arts', s.portrait || s.avatar || base.id),
        portraitSrc: assetUrl('char_portrait', s.portrait || base.id),
        avatarSrc: assetUrl('char_avatar', s.avatar || base.id),
        accentColor: accent,
        secondaryBracketColor: s.colors[1] || base.accentColor,
        artScaleClass:
          tabType === 'default_2' ? 'h-[115%] sm:h-[124%]' : 'h-[94%] sm:h-[98%]',
      };
    });

    // Keep default outfits first, then purchasable skins in release order.
    skins.sort((a, b) => {
      const rank = (s: OperatorSkin) =>
        s.tabType === 'default_1' ? 0 : s.tabType === 'default_2' ? 1 : 2;
      return rank(a) - rank(b);
    });

    operator.skins = skins;
    // По умолчанию показываем Elite 1 (default_1), а не Elite 2.
    operator.defaultSkinIndex = Math.max(
      0,
      skins.findIndex((s) => s.tabType === 'default_1')
    );
    operator.illustrator = skins[0]?.illustrator || '';
  }

  // Языки, в которых досье реально есть: RU — из community-перевода,
  // остальные — из уже загруженных таблиц игры.
  // `false` ставим только когда перевода точно нет (404). При сетевом сбое
  // оставляем язык неизвестным: вкладка остаётся доступной и следующий клик
  // повторит загрузку, вместо того чтобы навсегда писать «перевода нет».
  const dossierLangs: Partial<Record<DossierLang, boolean>> = {};
  if (ruAvailable) dossierLangs.ru = true;
  else if (ruDossier || isRussianDossierMissing(base.id)) dossierLangs.ru = false;
  for (const candidate of ['en', 'zh', 'ja', 'ko'] as const) {
    const ids = dossierIndex.get(candidate);
    if (ids) dossierLangs[candidate] = ids.has(base.id);
  }
  dossierLangs[sourceLang] = sections.length > 0;
  operator.dossierLangs = dossierLangs;
  operator.dossierContentLang = contentLanguage;

  operator.voiceActors = pack?.cv ?? {};
  operator.voiceLangs = pack?.voiceLangs ?? [];
  operator.voiceActor =
    pack?.cv?.JP || (pack?.cv ? Object.values(pack.cv)[0] : '') || '';
  operator.detailLoaded = true;

  const profile = hasRu
    ? findSection(ruSections, 'Profile')
    : sections.find((s) => s.title === titles.profile)?.text || '';
  const paragraphs = toParagraphs(profile);
  operator.operatorRecordTitle =
    PROFILE_TITLES[hasRu ? 'ru' : sourceLang];
  operator.operatorRecordSynopsis = paragraphs[0] || '';
  operator.operatorRecordFullStory = paragraphs;

  // Полный список разделов досье для вкладки PERSONNEL FILE. Базовые данные и
  // медосмотр уже разобраны в структурные поля — их из списка убираем.
  const basicKey = hasRu ? 'Basic Info' : titles.basic;
  const examKey = hasRu ? 'Physical Exam' : titles.exam;
  operator.dossierSections = (
    hasRu
      ? ruSections.map((s) => ({
          title: s.titleRu || s.titleEn,
          text: s.textRu,
          key: s.titleEn,
        }))
      : sections.map((s) => ({ title: s.title, text: s.text, key: s.title }))
  )
    .filter((s) => s.text.trim() && s.key !== basicKey && s.key !== examKey)
    .map(({ title, text }) => ({ title, text }));

  return { operator, contentLanguage };
}

export { PROFESSION_NAMES };
