import { Language, OperatorVoiceLine, OperatorCvInfo, OperatorVoiceData } from '../types';
import { DbService } from './dbService';

export type { OperatorVoiceLine, OperatorCvInfo, OperatorVoiceData };

// Canonical Russian translations for all Arknights voice titles
export const VOICE_TITLE_RU_MAP: Record<string, string> = {
  'appointed as assistant': 'Назначение ассистентом',
  'talk 1': 'Разговор 1',
  'talk 2': 'Разговор 2',
  'talk 3': 'Разговор 3',
  'talk after promotion 1': 'Разговор после повышения 1',
  'talk after promotion 2': 'Разговор после повышения 2',
  'talk after trust increase 1': 'Разговор при доверии 1',
  'talk after trust increase 2': 'Разговор при доверии 2',
  'talk after trust increase 3': 'Разговор при доверии 3',
  'idle': 'Бездействие',
  'onboard': 'Прибытие оперативника',
  'watching battle record': 'Просмотр боевых записей',
  'promotion 1': 'Повышение (Элита 1)',
  'promotion 2': 'Повышение (Элита 2)',
  'added to squad': 'Включение в отряд',
  'appointed as squad leader': 'Назначение командиром отряда',
  'depart': 'Выход на операцию',
  'begin operation': 'Начало операции',
  'selecting operator 1': 'Выбор оперативника 1',
  'selecting operator 2': 'Выбор оперативника 2',
  'deployment 1': 'Развертывание 1',
  'deployment 2': 'Развертывание 2',
  'in battle 1': 'В бою 1',
  'in battle 2': 'В бою 2',
  'in battle 3': 'В бою 3',
  'in battle 4': 'В бою 4',
  '4-star result': 'Завершение сложной операции (4★)',
  '3-star result': 'Безупречная победа (3★)',
  'sub 3-star result': 'Завершение операции (<3★)',
  'operation failure': 'Провал операции',
  'assigned to facility': 'Назначение на базу',
  'tap': 'Касание',
  'trust tap': 'Касание (Доверие)',
  'title': 'Экран входа / Название',
  'greeting': 'Приветствие',
  'new year\'s blessing': 'Новогоднее поздравление',
  'anniversary celebration': 'Годовщина',
  'birthday': 'День рождения',
  // Chinese title fallbacks
  '任命助理': 'Назначение ассистентом',
  '交谈1': 'Разговор 1',
  '交谈2': 'Разговор 2',
  '交谈3': 'Разговор 3',
  '晋升后交谈1': 'Разговор после повышения 1',
  '晋升后交谈2': 'Разговор после повышения 2',
  '信赖提升后交谈1': 'Разговор при доверии 1',
  '信赖提升后交谈2': 'Разговор при доверии 2',
  '信赖提升后交谈3': 'Разговор при доверии 3',
  '闲置': 'Бездействие',
  '干员报到': 'Прибытие оперативника',
  '观看作战记录': 'Просмотр боевых записей',
  '精英化晋升1': 'Повышение (Элита 1)',
  '精英化晋升2': 'Повышение (Элита 2)',
  '编入队伍': 'Включение в отряд',
  '任命队长': 'Назначение командиром отряда',
  '行动出发': 'Выход на операцию',
  '行动开始': 'Начало операции',
  '选中干员1': 'Выбор оперативника 1',
  '选中干员2': 'Выбор оперативника 2',
  '部署1': 'Развертывание 1',
  '部署2': 'Развертывание 2',
  '作战中1': 'В бою 1',
  '作战中2': 'В бою 2',
  '作战中3': 'В бою 3',
  '作战中4': 'В бою 4',
  '作战中': 'В бою',
  '完成高难行动': 'Завершение сложной операции (4★)',
  '3星结束行动': 'Безупречная победа (3★)',
  '非3星结束行动': 'Завершение операции (<3★)',
  '行动失败': 'Провал операции',
  '进驻设施': 'Назначение на базу',
  '戳一下': 'Касание',
  '信赖触摸': 'Касание (Доверие)',
  '标题': 'Экран входа / Название',
  '问候': 'Приветствие',
  '新年祝福': 'Новогоднее поздравление',
  '周年庆典': 'Годовщина',
  '生日': 'День рождения',
  // Japanese title fallbacks
  '秘書任命': 'Назначение ассистентом',
  '会話1': 'Разговор 1',
  '会話2': 'Разговор 2',
  '会話3': 'Разговор 3',
  '昇進後会話1': 'Разговор после повышения 1',
  '昇進後会話2': 'Разговор после повышения 2',
  '信頼度アップ会話1': 'Разговор при доверии 1',
  '信頼度アップ会話2': 'Разговор при доверии 2',
  '信頼度アップ会話3': 'Разговор при доверии 3',
  '放置': 'Бездействие',
  '着任': 'Прибытие оперативника',
  '経験値強化': 'Просмотр боевых записей',
  '昇進1': 'Повышение (Элита 1)',
  '昇進2': 'Повышение (Элита 2)',
  '編成': 'Включение в отряд',
  '隊長任命': 'Назначение командиром отряда',
  '作戦出発': 'Выход на операцию',
  '作戦開始': 'Начало операции',
  'オペレーター選択1': 'Выбор оперативника 1',
  'オペレーター選択2': 'Выбор оперативника 2',
  '配置1': 'Развертывание 1',
  '配置2': 'Развертывание 2',
  '作戦中1': 'В бою 1',
  '作戦中2': 'В бою 2',
  '作戦中3': 'В бою 3',
  '作戦中4': 'В бою 4',
  '星4終了': 'Завершение сложной операции (4★)',
  '星3終了': 'Безупречная победа (3★)',
  '星2以下終了': 'Завершение операции (<3★)',
  '作戦失敗': 'Провал операции',
  '施設配置': 'Назначение на базу',
  'タッチ': 'Касание',
  '信頼度タッチ': 'Касание (Доверие)'
};

export const CV_LANG_LABELS: Record<string, { ru: string; en: string; flag: string }> = {
  JP: { ru: 'Японский', en: 'Japanese', flag: '🇯🇵' },
  CN_MANDARIN: { ru: 'Китайский', en: 'Chinese', flag: '🇨🇳' },
  EN: { ru: 'Английский', en: 'English', flag: '🇬🇧' },
  KR: { ru: 'Корейский', en: 'Korean', flag: '🇰🇷' },
  RUS: { ru: 'Русский', en: 'Russian', flag: '🇷🇺' },
  ITA: { ru: 'Итальянский', en: 'Italian', flag: '🇮🇹' },
  GER: { ru: 'Немецкий', en: 'German', flag: '🇩🇪' },
  FRE: { ru: 'Французский', en: 'French', flag: '🇫🇷' },
  SPA: { ru: 'Испанский', en: 'Spanish', flag: '🇪🇸' },
  LAT: { ru: 'Латынь', en: 'Latin', flag: '🏛️' },
  CN_TOPOLECT: { ru: 'Диалект', en: 'Regional Dialect', flag: '🏮' },
  LINKAGE: { ru: 'Коллаборация', en: 'Collab Special', flag: '⭐' }
};

function getVoiceCategory(titleEn: string, titleZh: string): 'talk' | 'combat' | 'management' | 'other' {
  const en = (titleEn || '').toLowerCase();
  const zh = titleZh || '';

  if (
    en.includes('talk') || 
    en.includes('idle') || 
    en.includes('greeting') || 
    en.includes('trust') || 
    en.includes('tap') ||
    en.includes('blessing') ||
    en.includes('celebration') ||
    en.includes('birthday') ||
    zh.includes('交谈') ||
    zh.includes('闲置') ||
    zh.includes('问候') ||
    zh.includes('触摸') ||
    zh.includes('祝福') ||
    zh.includes('庆典')
  ) {
    return 'talk';
  }

  if (
    en.includes('battle') || 
    en.includes('operation') || 
    en.includes('deploy') || 
    en.includes('result') || 
    en.includes('failure') || 
    en.includes('depart') ||
    en.includes('selecting') ||
    zh.includes('作战') ||
    zh.includes('行动') ||
    zh.includes('部署') ||
    zh.includes('选中')
  ) {
    return 'combat';
  }

  if (
    en.includes('assistant') || 
    en.includes('promotion') || 
    en.includes('squad') || 
    en.includes('facility') || 
    en.includes('onboard') ||
    en.includes('watching') ||
    zh.includes('助理') ||
    zh.includes('晋升') ||
    zh.includes('队长') ||
    zh.includes('队伍') ||
    zh.includes('设施') ||
    zh.includes('报到') ||
    zh.includes('记录')
  ) {
    return 'management';
  }

  return 'other';
}

export function getCanonicalVoiceTitle(rawTitle: string | undefined, lang: Language = 'ru_RU'): string {
  if (!rawTitle) return '';
  const isRu = lang === 'ru_RU' || lang === 'ru_RU_CN';
  if (!isRu) return rawTitle;

  const lower = rawTitle.toLowerCase().trim();
  if (VOICE_TITLE_RU_MAP[lower]) {
    return VOICE_TITLE_RU_MAP[lower];
  }
  if (VOICE_TITLE_RU_MAP[rawTitle.trim()]) {
    return VOICE_TITLE_RU_MAP[rawTitle.trim()];
  }

  return rawTitle;
}

export type VoiceTableLang = 'zh' | 'en' | 'ja';

export interface OperatorVoiceOptions {
  /** Overrides automatic table resolution; `'all'` loads zh + en + ja. */
  langs?: readonly VoiceTableLang[] | 'all';
}

const VOICE_TABLE_LANGS: readonly VoiceTableLang[] = ['zh', 'en', 'ja'];

const CHARWORD_TABLE_URLS: Record<VoiceTableLang, string> = {
  zh: 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/charword_table.json',
  en: 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/charword_table.json',
  ja: 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/ja_JP/gamedata/excel/charword_table.json'
};

// Bump to re-key the persisted tables: payloads written under an older version
// are ignored on read and pruned on write.
const CHARWORD_TABLE_VERSION = 2;
const CHARWORD_TABLE_KEY_PREFIX = `ak_charword_table_v${CHARWORD_TABLE_VERSION}`;
const CHARWORD_LEGACY_PRUNE_DEPTH = 3;

const voiceTableCacheKey = (lang: VoiceTableLang): string => `${CHARWORD_TABLE_KEY_PREFIX}_${lang}`;

type CharWordItem = {
  charWordId?: string;
  charId?: string;
  wordKey?: string;
  voiceId?: string;
  voiceTitle?: string;
  voiceText?: string;
  voiceAsset?: string;
  unlockType?: string;
  lockDescription?: string | null;
};

type VoiceLangDictEntry = {
  charId?: string;
  wordkeys?: string[];
  dict?: Record<string, { cvName?: string | string[]; wordkey?: string; voicePath?: string | null }>;
};

type RawVoiceTable = {
  charWords?: Record<string, CharWordItem>;
  voiceLangDict?: Record<string, VoiceLangDictEntry>;
};

type CharWordEntry = {
  key: string;
  item: CharWordItem;
  charId: string;
  wordKey: string;
  voiceId: string;
};

/**
 * Precomputed lookup indexes for a table, built once per download (or per
 * IndexedDB read) instead of once per operator.
 */
type CharWordIndex = {
  /** Primary table only: pre-lowered identities for the single matching pass. */
  entries: CharWordEntry[];
  /** `charId\0voiceId` -> item (first occurrence wins, as `Array.find` did). */
  byCharIdVoice: Map<string, CharWordItem>;
  /** `wordKey\0voiceId` -> item. */
  byWordKeyVoice: Map<string, CharWordItem>;
  /** Raw `voiceLangDict` keys (lowercased). */
  dictByKey: Map<string, VoiceLangDictEntry>;
  dictByCharId: Map<string, VoiceLangDictEntry>;
  dictByWordKey: Map<string, VoiceLangDictEntry>;
};

type LoadedVoiceTable = {
  lang: VoiceTableLang;
  raw: RawVoiceTable;
  index: CharWordIndex;
  source: 'idb' | 'network' | 'empty';
};

const IDENTITY_SEP = '\u0000';

function buildVoiceTableIndex(raw: RawVoiceTable, withEntries: boolean): CharWordIndex {
  const index: CharWordIndex = {
    entries: [],
    byCharIdVoice: new Map(),
    byWordKeyVoice: new Map(),
    dictByKey: new Map(),
    dictByCharId: new Map(),
    dictByWordKey: new Map()
  };

  const charWords = raw.charWords;
  if (charWords) {
    for (const key of Object.keys(charWords)) {
      const item = charWords[key];
      if (!item) continue;

      const charId = typeof item.charId === 'string' ? item.charId.toLowerCase() : '';
      const wordKey = typeof item.wordKey === 'string' ? item.wordKey.toLowerCase() : '';
      const voiceId = typeof item.voiceId === 'string' ? item.voiceId : '';

      if (withEntries) {
        index.entries.push({ key, item, charId, wordKey, voiceId });
      }

      if (charId) {
        const identity = charId + IDENTITY_SEP + voiceId;
        if (!index.byCharIdVoice.has(identity)) index.byCharIdVoice.set(identity, item);
      }
      if (wordKey) {
        const identity = wordKey + IDENTITY_SEP + voiceId;
        if (!index.byWordKeyVoice.has(identity)) index.byWordKeyVoice.set(identity, item);
      }
    }
  }

  const voiceLangDict = raw.voiceLangDict;
  if (voiceLangDict) {
    for (const key of Object.keys(voiceLangDict)) {
      const dictEntry = voiceLangDict[key];
      if (!dictEntry) continue;

      const lowerKey = key.toLowerCase();
      if (!index.dictByKey.has(lowerKey)) index.dictByKey.set(lowerKey, dictEntry);

      if (typeof dictEntry.charId === 'string' && dictEntry.charId) {
        const lower = dictEntry.charId.toLowerCase();
        if (!index.dictByCharId.has(lower)) index.dictByCharId.set(lower, dictEntry);
      }
      if (Array.isArray(dictEntry.wordkeys)) {
        for (const wordKey of dictEntry.wordkeys) {
          if (typeof wordKey !== 'string' || !wordKey) continue;
          const lower = wordKey.toLowerCase();
          if (!index.dictByWordKey.has(lower)) index.dictByWordKey.set(lower, dictEntry);
        }
      }
    }
  }

  return index;
}

function findVoiceLangDictEntry(index: CharWordIndex, keys: Iterable<string>): VoiceLangDictEntry | undefined {
  for (const key of keys) {
    const byCharId = index.dictByCharId.get(key);
    if (byCharId) return byCharId;
    const byWordKey = index.dictByWordKey.get(key);
    if (byWordKey) return byWordKey;
  }
  return undefined;
}

function findOverlayItem(
  index: CharWordIndex | null,
  charId: string,
  wordKey: string,
  voiceId: string
): CharWordItem | undefined {
  if (!index) return undefined;
  const byCharId = index.byCharIdVoice.get(charId + IDENTITY_SEP + voiceId);
  if (byCharId) return byCharId;
  return index.byWordKeyVoice.get(wordKey + IDENTITY_SEP + voiceId);
}

const VOICE_DUB_PREF_KEY = 'ak-voice-lang-preference';

/** Best-effort read of the dub language the voice player persists. */
function readActiveVoiceDubLang(): string {
  try {
    return localStorage.getItem(VOICE_DUB_PREF_KEY) || 'JP';
  } catch {
    return 'JP';
  }
}

/**
 * Resolves which tables a single request needs.
 *
 * `zh` is the canonical spine (`voiceLangDict` lives only there) and is always
 * required. `en` is only required when the UI locale renders English
 * titles/text, and `ja` only when the Japanese dub is active, because it is the
 * sole source of `voiceTextJa`.
 */
export function resolveVoiceTableLangs(uiLang: Language, options?: OperatorVoiceOptions): VoiceTableLang[] {
  if (options?.langs === 'all') return ['zh', 'en', 'ja'];

  const langs: VoiceTableLang[] = ['zh'];

  const addLang = (lang: VoiceTableLang) => {
    if (!langs.includes(lang)) langs.push(lang);
  };

  if (options?.langs) {
    for (const lang of options.langs) addLang(lang);
    return langs;
  }

  if (uiLang !== 'zh_CN') addLang('en');
  if (readActiveVoiceDubLang() === 'JP') addLang('ja');

  return langs;
}

const loadedVoiceTables = new Map<VoiceTableLang, LoadedVoiceTable>();
const inflightVoiceTables = new Map<VoiceTableLang, Promise<LoadedVoiceTable>>();
let voiceTableWritesDisabled = false;
let voiceTableLegacyPruned = false;

function createEmptyVoiceTable(lang: VoiceTableLang): LoadedVoiceTable {
  const raw: RawVoiceTable = { charWords: {}, voiceLangDict: {} };
  return { lang, raw, index: buildVoiceTableIndex(raw, false), source: 'empty' };
}

function isValidVoiceTable(raw: unknown): raw is RawVoiceTable {
  if (!raw || typeof raw !== 'object') return false;
  const table = raw as RawVoiceTable;
  return !!table.charWords && typeof table.charWords === 'object' && Object.keys(table.charWords).length > 0;
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

/** Sandboxed iframes expose no `indexedDB`; there we stay in memory only. */
function isVoiceTableStorageAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function';
  } catch {
    return false;
  }
}

async function readPersistedVoiceTable(lang: VoiceTableLang): Promise<RawVoiceTable | null> {
  if (!isVoiceTableStorageAvailable()) return null;
  try {
    const payload = await DbService.get(voiceTableCacheKey(lang));
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as { v?: unknown; table?: unknown };
    if (record.v !== CHARWORD_TABLE_VERSION) return null;
    return isValidVoiceTable(record.table) ? record.table : null;
  } catch (err) {
    console.warn(`Failed to read persisted charword table (${lang}):`, err);
    return null;
  }
}

async function pruneLegacyVoiceTables(): Promise<void> {
  if (!isVoiceTableStorageAvailable()) return;
  for (let version = CHARWORD_TABLE_VERSION - CHARWORD_LEGACY_PRUNE_DEPTH; version < CHARWORD_TABLE_VERSION; version++) {
    if (version < 1) continue;
    for (const lang of VOICE_TABLE_LANGS) {
      const legacyKey = `ak_charword_table_v${version}_${lang}`;
      try {
        await DbService.delete(legacyKey);
      } catch (err) {
        console.warn(`Failed to prune legacy charword table (${legacyKey}):`, err);
      }
    }
  }
}

async function persistVoiceTable(lang: VoiceTableLang, raw: RawVoiceTable): Promise<void> {
  if (voiceTableWritesDisabled || !isVoiceTableStorageAvailable()) return;
  const payload = { v: CHARWORD_TABLE_VERSION, lang, table: raw };
  let firstError: unknown = null;

  try {
    await DbService.set(voiceTableCacheKey(lang), payload);
    if (!voiceTableLegacyPruned) {
      voiceTableLegacyPruned = true;
      void pruneLegacyVoiceTables();
    }
    return;
  } catch (err) {
    console.warn(`Failed to persist charword table (${lang}):`, err);
    firstError = err;
  }

  if (!isQuotaExceededError(firstError)) {
    voiceTableWritesDisabled = true;
    return;
  }

  await pruneLegacyVoiceTables();
  try {
    await DbService.set(voiceTableCacheKey(lang), payload);
  } catch (retryErr) {
    console.warn(`Retry to persist charword table (${lang}) failed:`, retryErr);
    voiceTableWritesDisabled = true;
  }
}

/** Keeps the ~10 MB structured clone of a table off the interaction-critical path. */
function scheduleVoiceTablePersist(lang: VoiceTableLang, table: RawVoiceTable): void {
  const persist = () => void persistVoiceTable(lang, table);
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(persist, { timeout: 5000 });
  } else {
    setTimeout(persist, 0);
  }
}

async function fetchVoiceTable(lang: VoiceTableLang): Promise<RawVoiceTable | null> {
  const url = CHARWORD_TABLE_URLS[lang];
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

  try {
    const proxied = await fetch(proxiedUrl);
    if (!proxied.ok) throw new Error(`HTTP ${proxied.status}`);
    return (await proxied.json()) as RawVoiceTable;
  } catch (proxyErr) {
    const direct = await fetch(url);
    if (!direct.ok) throw new Error(`HTTP ${direct.status}`);
    return (await direct.json()) as RawVoiceTable;
  }
}

async function loadVoiceTable(lang: VoiceTableLang): Promise<LoadedVoiceTable> {
  const memo = loadedVoiceTables.get(lang);
  if (memo) return memo;

  const inflight = inflightVoiceTables.get(lang);
  if (inflight) return inflight;

  const task = (async (): Promise<LoadedVoiceTable> => {
    const persisted = await readPersistedVoiceTable(lang);
    if (persisted) {
      const loaded: LoadedVoiceTable = {
        lang,
        raw: persisted,
        index: buildVoiceTableIndex(persisted, lang === 'zh'),
        source: 'idb'
      };
      loadedVoiceTables.set(lang, loaded);
      return loaded;
    }

    let raw: RawVoiceTable | null = null;
    try {
      raw = await fetchVoiceTable(lang);
    } catch (err) {
      console.warn(`Failed to download charword table (${lang}):`, err);
    }

    if (isValidVoiceTable(raw)) {
      const table = raw as RawVoiceTable;
      const loaded: LoadedVoiceTable = {
        lang,
        raw: table,
        index: buildVoiceTableIndex(table, lang === 'zh'),
        source: 'network'
      };
      loadedVoiceTables.set(lang, loaded);
      scheduleVoiceTablePersist(lang, table);
      return loaded;
    }

    // Deliberately not memoised: a failed download is retried on the next open
    // instead of being pinned for the rest of the session.
    return createEmptyVoiceTable(lang);
  })();

  inflightVoiceTables.set(lang, task);
  try {
    return await task;
  } finally {
    inflightVoiceTables.delete(lang);
  }
}

/**
 * Builds the Torappu PRTS audio URL for any voice language package.
 */
export function buildAudioUrlForLang(
  charId: string, 
  voiceId: string, 
  voiceLangType: string = 'JP',
  dictEntry?: { wordkey?: string; voicePath?: string | null }
): string {
  const vId = voiceId.toLowerCase();
  const cId = charId.toLowerCase();
  const customFolder = (dictEntry?.wordkey || charId).toLowerCase();

  let targetUrl = '';

  switch (voiceLangType) {
    case 'JP':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice/${cId}/${vId}.mp3`;
      break;
    case 'CN_MANDARIN':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_cn/${cId}/${vId}.mp3`;
      break;
    case 'EN':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_en/${cId}/${vId}.mp3`;
      break;
    case 'KR':
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_kr/${cId}/${vId}.mp3`;
      break;
    case 'LINKAGE':
      if (dictEntry?.voicePath && dictEntry.voicePath.includes('Voice_CN')) {
        targetUrl = `https://torappu.prts.wiki/assets/audio/voice_cn/${cId}/${vId}.mp3`;
      } else {
        targetUrl = `https://torappu.prts.wiki/assets/audio/voice/${cId}/${vId}.mp3`;
      }
      break;
    case 'RUS':
    case 'ITA':
    case 'GER':
    case 'FRE':
    case 'SPA':
    case 'LAT':
    case 'CN_TOPOLECT':
    default:
      targetUrl = `https://torappu.prts.wiki/assets/audio/voice_custom/${customFolder}/${vId}.mp3`;
      break;
  }

  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Helper to get the correct audio URL for a voice line given a voice language selection.
 */
export function getLineAudioUrl(line: OperatorVoiceLine, voiceLangType: string): string {
  if (line.audioUrls && line.audioUrls[voiceLangType]) {
    return line.audioUrls[voiceLangType];
  }
  if (line.audioUrls && line.audioUrls.JP) {
    return line.audioUrls.JP;
  }
  return line.audioUrl;
}

/**
 * Fetch and extract voice lines for a specific operator with full multi-language audio support.
 */
export async function getOperatorVoiceData(
  rawCharId: string,
  uiLang: Language = 'ru_RU',
  options?: OperatorVoiceOptions
): Promise<OperatorVoiceData | null> {
  if (!rawCharId) return null;

  try {
    const tableLangs = resolveVoiceTableLangs(uiLang, options);
    const [zhTable, enTable, jaTable] = await Promise.all([
      loadVoiceTable('zh'),
      tableLangs.includes('en') ? loadVoiceTable('en') : null,
      tableLangs.includes('ja') ? loadVoiceTable('ja') : null
    ]);

    const zh = zhTable.raw;
    if (!zh || !zh.charWords) return null;

    const cleanId = rawCharId.toLowerCase().trim();
    const idWithoutPrefix = cleanId.replace(/^char_/, '');
    const idWithPrefix = cleanId.startsWith('char_') ? cleanId : `char_${cleanId}`;

    const zhIndex = zhTable.index;
    const enWords = enTable?.raw.charWords || {};
    const jaWords = jaTable?.raw.charWords || {};
    const enIndex = enTable?.index || null;
    const jaIndex = jaTable?.index || null;

    // Build target keys set for matching all aliases, variants, and wordKeys
    const targetKeys = new Set<string>([cleanId, idWithoutPrefix, idWithPrefix]);

    // Extract CVs / Voice Actors & Available Dub Languages
    const cvList: OperatorCvInfo[] = [];
    const availableLangs: string[] = [];

    const cvData =
      zhIndex.dictByKey.get(cleanId) ||
      zhIndex.dictByKey.get(idWithPrefix) ||
      zhIndex.dictByKey.get(idWithoutPrefix) ||
      findVoiceLangDictEntry(zhIndex, targetKeys);

    if (cvData) {
      if (cvData.charId) targetKeys.add(cvData.charId.toLowerCase());
      if (cvData.wordkeys && Array.isArray(cvData.wordkeys)) {
        cvData.wordkeys.forEach((wk: string) => targetKeys.add(wk.toLowerCase()));
      }

      if (cvData.dict) {
        for (const [langKey, langInfo] of Object.entries<any>(cvData.dict)) {
          if (langInfo.cvName && langInfo.cvName.length > 0) {
            const names = Array.isArray(langInfo.cvName) ? langInfo.cvName : [langInfo.cvName];
            const labelObj = CV_LANG_LABELS[langKey] || { ru: langKey, en: langKey, flag: '🎙️' };

            cvList.push({
              langType: langKey,
              langLabel: uiLang === 'ru_RU' || uiLang === 'ru_RU_CN' ? labelObj.ru : labelObj.en,
              cvNames: names.filter(Boolean),
              wordkey: langInfo.wordkey,
              voicePath: langInfo.voicePath
            });

            if (!availableLangs.includes(langKey)) {
              availableLangs.push(langKey);
            }
          }
        }
      }
    }

    // Default to at least JP if no dict found
    if (availableLangs.length === 0) {
      availableLangs.push('JP');
    }

    const cvByLang = new Map<string, OperatorCvInfo>();
    for (const cvInfo of cvList) {
      cvByLang.set(cvInfo.langType, cvInfo);
    }

    // Find all matching voice entries by charId or wordKey.
    // One pass over the pre-lowered primary entries plus O(1) overlay lookups.
    const matchingEntries: OperatorVoiceLine[] = [];
    const wordKeySet = new Set<string>();
    const zhEntries = zhIndex.entries;

    for (let i = 0; i < zhEntries.length; i++) {
      const entry = zhEntries[i];
      const itemZh = entry.item;
      const itemCharId = entry.charId;
      const itemWordKey = entry.wordKey;

      const isMatch =
        targetKeys.has(itemCharId) ||
        targetKeys.has(itemWordKey) ||
        cleanId === itemCharId ||
        cleanId === itemWordKey ||
        itemCharId.endsWith(cleanId) ||
        cleanId.endsWith(itemCharId);

      if (!isMatch) continue;

      const wordKey = itemZh.wordKey || itemZh.charId;
      if (wordKey) wordKeySet.add(wordKey);

      const itemEn = enWords[entry.key] || findOverlayItem(enIndex, itemCharId, itemWordKey, entry.voiceId);
      const itemJa = jaWords[entry.key] || findOverlayItem(jaIndex, itemCharId, itemWordKey, entry.voiceId);

      const titleZh = itemZh.voiceTitle || '';
      const titleEn = itemEn?.voiceTitle || itemZh.voiceTitle || '';
      const titleJa = itemJa?.voiceTitle || '';
      const titleRu = VOICE_TITLE_RU_MAP[titleEn.toLowerCase()] ||
                      VOICE_TITLE_RU_MAP[titleZh] ||
                      VOICE_TITLE_RU_MAP[titleJa] ||
                      titleEn ||
                      titleZh;

      const textZh = itemZh.voiceText || '';
      const textEn = itemEn?.voiceText || textZh;
      const textJa = itemJa?.voiceText || '';

      let localizedText = textEn;
      if (uiLang === 'zh_CN') {
        localizedText = textZh;
      } else if (uiLang === 'ru_RU' || uiLang === 'ru_RU_CN') {
        // Display EN or RU translation
        localizedText = textEn || textZh;
      }

      let localizedTitle = titleEn;
      if (uiLang === 'zh_CN') {
        localizedTitle = titleZh;
      } else if (uiLang === 'ru_RU' || uiLang === 'ru_RU_CN') {
        localizedTitle = titleRu;
      }

      const category = getVoiceCategory(titleEn, titleZh);

      // Pre-build audio URLs for all available language dubs for this operator
      const audioUrls: Record<string, string> = {};
      for (const lType of availableLangs) {
        audioUrls[lType] = buildAudioUrlForLang(itemZh.charId || cleanId, itemZh.voiceId, lType, cvByLang.get(lType));
      }

      const primaryAudioUrl = audioUrls.JP || audioUrls[availableLangs[0]] || buildAudioUrlForLang(itemZh.charId || cleanId, itemZh.voiceId, 'JP');

      matchingEntries.push({
        charWordId: entry.key,
        charId: itemZh.charId || cleanId,
        wordKey: itemZh.wordKey || itemZh.charId || cleanId,
        voiceId: itemZh.voiceId,
        voiceTitle: localizedTitle,
        voiceTitleEn: titleEn,
        voiceTitleZh: titleZh,
        voiceTitleRu: titleRu,
        voiceText: localizedText,
        voiceTextJa: textJa,
        voiceTextEn: textEn,
        voiceTextZh: textZh,
        voiceAsset: itemZh.voiceAsset,
        category,
        audioUrls,
        audioUrl: primaryAudioUrl,
        unlockType: itemZh.unlockType,
        lockDescription: itemZh.lockDescription
      });
    }

    return {
      charId: cleanId,
      lines: matchingEntries,
      cvList,
      availableLangs,
      wordKeys: Array.from(wordKeySet)
    };
  } catch (err) {
    console.error('Failed to get operator voice data:', err);
    return null;
  }
}
