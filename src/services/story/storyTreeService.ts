import Papa from 'papaparse';
import { StoryChapter, StoryEpisode, Language } from '../../types';
import { CacheService } from '../cacheService';
import { UI_STRINGS } from '../../translations';
import { platform } from '../../platform';
import { TranslationRow } from './storyTypes';
import { EXTRA_STORIES } from '../../data/extraStories';
import { extractOperatorKey, getOperatorDetails, isOperatorEpisode } from '../../utils/operatorUtils';
import {
  getEpisodeFolderForStory,
  getExactTranslationCsvCandidates,
  getTranslationIndexKey,
  getTranslatorSuffix,
} from '../../utils/translationPaths';

export function detectInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem('arknights_story_lang') as Language;
    const validLanguages: Language[] = ['zh_CN', 'en_US', 'ja_JP', 'ru_RU'];
    if (saved && validLanguages.includes(saved)) {
      return saved;
    }

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('zh-cn') || browserLang.includes('zh-hans') || browserLang.includes('zh')) return 'zh_CN';
    if (browserLang.startsWith('ru')) return 'ru_RU';
    if (browserLang.startsWith('ja')) return 'ja_JP';
    if (browserLang.startsWith('en')) return 'en_US';
  } catch (e) {
    console.warn('Failed to detect language:', e);
  }

  return 'en_US';
}

export let currentLanguage: Language = detectInitialLanguage();
export const BASE_DATA_URL = 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master';

export function getLangSubfolder(lang: Language): string {
  if (lang === 'zh_CN') return 'cn';
  if (lang === 'en_US') return 'en';
  if (lang === 'ja_JP') return 'jp';
  return 'cn';
}

export function getBaseUrl(lang: Language): string {
  if (lang === 'ko_KR') return 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/ko_KR';
  if (lang === 'ja_JP') return 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/jp';
  if (lang === 'en_US') return 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/en';
  return 'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/cn';
}

export function getDataLanguage(lang: Language): Language {
  const officialLanguages: Language[] = ['zh_CN', 'en_US', 'ja_JP', 'ko_KR'];
  if (officialLanguages.includes(lang)) return lang;
  return 'zh_CN';
}

export interface RawReviewTableEntry {
  id?: string;
  name?: string;
  entryType?: string;
  storyEntryPicId?: string;
  startTime?: string | number;
  infoUnlockDatas?: Array<{
    storyId?: string;
    storyCode?: string;
    storyName?: string;
    storyTxt?: string;
    storyIconId?: string;
    storyPic?: string;
  }>;
}

const cachedEpisodes: Record<string, StoryEpisode[] | null> = {};
let enReferenceData: Record<string, RawReviewTableEntry> | null = null;
let zhReferenceData: Record<string, RawReviewTableEntry> | null = null;
let characterMappingCache: Record<string, string> | null = null;
const parsedJsonCache: Record<string, unknown> = {};

function convertToJsDelivr(url: string): string | null {
  const match = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
  if (match) {
    const [, user, repo, branch, path] = match;
    return `https://fastly.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
  }
  return null;
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
  const proxyPrefixes = [
    'https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/',
    'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/',
    'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/master/',
    'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/',
    'https://raw.githubusercontent.com/neponum/zoot-data/main/',
    'https://raw.githubusercontent.com/fexli/ArknightsResource/main/',
    'https://torappu.prts.wiki/',
    'https://prts.wiki/'
  ];
  const isEligibleForProxy = proxyPrefixes.some(prefix => url.startsWith(prefix));

  // If it's a raw.githubusercontent.com URL, prefer jsDelivr CDN first (prevents 429 rate limits & fast delivery)
  if (url.startsWith('https://raw.githubusercontent.com/')) {
    const jsDelivrUrl = convertToJsDelivr(url);
    if (jsDelivrUrl) {
      try {
        const jsDelivrController = new AbortController();
        const jsDelivrId = setTimeout(() => jsDelivrController.abort(), Math.min(timeout, 10000));
        const jsDelivrResponse = await platform.fetch(jsDelivrUrl, {
          ...options,
          signal: jsDelivrController.signal
        });
        clearTimeout(jsDelivrId);
        if (jsDelivrResponse.ok) {
          return jsDelivrResponse;
        }
      } catch (e) {
        // Continue to direct fetch / proxy fallback if jsDelivr fails
      }
    }
  }

  // Direct fetch fallback
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  let useProxy = false;
  try {
    const response = await platform.fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (response.ok) {
      return response;
    }
    
    if (isEligibleForProxy) {
      useProxy = true;
    } else {
      return response;
    }
  } catch (error) {
    clearTimeout(id);
    if (isEligibleForProxy) {
      useProxy = true;
    } else {
      throw error;
    }
  }

  // If direct fetch fails and it's a raw.githubusercontent.com URL, try jsDelivr mirror (fast, unblocked in RF/RB)
  if (useProxy && url.startsWith('https://raw.githubusercontent.com/')) {
    const jsDelivrUrl = convertToJsDelivr(url);
    if (jsDelivrUrl) {
      try {
        const jsDelivrController = new AbortController();
        const jsDelivrId = setTimeout(() => jsDelivrController.abort(), Math.min(timeout, 10000));
        const jsDelivrResponse = await platform.fetch(jsDelivrUrl, {
          ...options,
          signal: jsDelivrController.signal
        });
        clearTimeout(jsDelivrId);
        if (jsDelivrResponse.ok) {
          return jsDelivrResponse;
        }
      } catch (e) {
        // ignore and continue to fallback proxy
      }
    }
  }

  if (useProxy) {
    const proxyUrl = platform.proxyUrl(url);
    const proxyController = new AbortController();
    const proxyId = setTimeout(() => proxyController.abort(), timeout);
    try {
      const response = await platform.fetch(proxyUrl, {
        ...options,
        signal: proxyController.signal
      });
      clearTimeout(proxyId);
      return response;
    } catch (proxyError) {
      clearTimeout(proxyId);
      throw proxyError;
    }
  }

  throw new Error('Fetch failed');
}

export async function fetchCharacterMapping(): Promise<Record<string, string>> {
  if (characterMappingCache) return characterMappingCache;

  try {
    const url = `${BASE_DATA_URL}/en/gamedata/excel/character_table.json`;
    
    let data = await CacheService.getCachedJson<Record<string, unknown>>(url);
    if (!data) {
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error('Failed to fetch character table');
      data = (await response.json()) as Record<string, unknown>;
      await CacheService.cacheJson(url, data);
    }
    
    const mapping: Record<string, string> = {};
    for (const charId in data) {
      const parts = charId.split('_');
      if (parts.length >= 3) {
        const name = parts.slice(2).join('_').toLowerCase();
        mapping[name] = charId;
      }
    }
    characterMappingCache = mapping;
    return mapping;
  } catch (err) {
    console.error('Failed to fetch character mapping:', err);
    return {};
  }
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  try {
    localStorage.setItem('arknights_story_lang', lang);
  } catch (e) {
    console.warn('Failed to save language to localStorage:', e);
  }
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function getArknightsYear(timestamp: number): number {
  if (timestamp <= 0) return 1;
  const date = new Date(timestamp * 1000);
  const releaseDate = new Date(2019, 4, 1);
  
  let years = date.getFullYear() - releaseDate.getFullYear();
  const m = date.getMonth() - releaseDate.getMonth();
  if (m < 0 || (m === 0 && date.getDate() < releaseDate.getDate())) {
    years--;
  }
  return years + 1;
}

/** UI-язык без импорта uiLanguage (там уже есть зависимость от этого сервиса). */
function isRussianUiLang(): boolean {
  try {
    const saved = localStorage.getItem('arknights_ui_lang');
    if (saved) return saved.startsWith('ru');
  } catch {
    /* приватный режим */
  }
  return true;
}

/** Английское имя вставной сцены: «Финал I: … (Ending 1)» → «Ending 1». */
function englishExtraChapterName(name: string): string {
  const tail = name.match(/\(([^)]+)\)\s*$/);
  if (tail && tail[1]) return tail[1].trim();
  return name.replace(/^[^:]+:\s*/, '').trim() || name;
}

function localizeExtraStory(story: StoryEpisode): StoryEpisode {
  return {
    ...story,
    name: story.englishName || story.name,
    chapters: (story.chapters || []).map((chapter) => ({
      ...chapter,
      name: englishExtraChapterName(chapter.name || chapter.code || ''),
    })),
  };
}

export async function fetchChapterList(): Promise<StoryEpisode[]> {
  const dataLang = getDataLanguage(currentLanguage);
  const uiRu = isRussianUiLang();
  const cacheKey = `${dataLang}_${currentLanguage}_${uiRu ? 'ru' : 'en'}`;
  if (cachedEpisodes[cacheKey]) {
    return cachedEpisodes[cacheKey]!;
  }

  const fetchList = async (lang: Language): Promise<Record<string, RawReviewTableEntry>> => {
    const baseUrl = getBaseUrl(lang);
    const url = `${baseUrl}/gamedata/excel/story_review_table.json`;
    
    if (parsedJsonCache[url]) {
      return parsedJsonCache[url] as Record<string, RawReviewTableEntry>;
    }
    
    let data = await CacheService.getCachedJson<Record<string, RawReviewTableEntry>>(url);
    
    if (data) {
      setTimeout(() => {
        fetchWithTimeout(url)
          .then(async (res) => {
            if (res.ok) {
              const freshData = (await res.json()) as Record<string, RawReviewTableEntry>;
              await CacheService.cacheJson(url, freshData);
              parsedJsonCache[url] = freshData;
            }
          })
          .catch(() => {});
      }, 1000);
    }
    
    if (!data) {
      try {
        const response = await fetchWithTimeout(url);
        if (response.ok) {
          data = (await response.json()) as Record<string, RawReviewTableEntry>;
          await CacheService.cacheJson(url, data);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (err) {
        console.warn(`Failed to fetch ${lang} list:`, err);
      }
    }
    
    if (!data) {
      throw new Error(`Failed to load ${lang} story review table from both network and cache.`);
    }
    
    parsedJsonCache[url] = data;
    return data;
  };

  let data: Record<string, RawReviewTableEntry>;
  
  try {
    const dataPromise = fetchList(dataLang);
    
    const zhPromise = (!zhReferenceData && dataLang !== 'zh_CN') 
      ? fetchList('zh_CN').catch(() => null) 
      : Promise.resolve(null);
      
    const enPromise = (!enReferenceData && dataLang !== 'en_US') 
      ? fetchList('en_US').catch(() => null) 
      : Promise.resolve(null);
      
    const [primaryData, zhRef, enRef] = await Promise.all([dataPromise, zhPromise, enPromise]);
    
    data = primaryData;
    
    if (dataLang === 'zh_CN') {
      zhReferenceData = data;
    } else if (zhRef) {
      zhReferenceData = zhRef;
    }
    
    if (dataLang === 'en_US') {
      enReferenceData = data;
    } else if (enRef) {
      enReferenceData = enRef;
    }
  } catch (err) {
    console.warn(`Failed to fetch ${dataLang} data, falling back to zh_CN:`, err);
    if (dataLang !== 'zh_CN') {
      try {
        data = await fetchList('zh_CN');
        zhReferenceData = data;
      } catch {
        throw new Error(`Failed to fetch both ${dataLang} and zh_CN data.`);
      }
    } else {
      throw err;
    }
  }
  
  const episodes: StoryEpisode[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    const obj = value;
    if (obj && obj.infoUnlockDatas && Array.isArray(obj.infoUnlockDatas)) {
      const chapters: StoryChapter[] = obj.infoUnlockDatas
        .filter((info) => Boolean(info.storyTxt))
        .map((info) => ({
          id: info.storyId || 'unknown',
          code: info.storyCode || '',
          name: info.storyName || 'Unnamed Story',
          storyTxt: info.storyTxt || '',
          iconId: info.storyIconId || info.storyId,
          storyPic: info.storyPic
        }));
        
      if (chapters.length > 0) {
        const MAIN_STORY_TIMESTAMPS: Record<number, number> = {
          0: 1556668800, // May 1, 2019 (Year 1)
          1: 1556668801, // May 1, 2019 (Year 1)
          2: 1556668802, // May 1, 2019 (Year 1)
          3: 1556668803, // May 1, 2019 (Year 1)
          4: 1556668804, // May 1, 2019 (Year 1)
          5: 1562630400, // July 9, 2019 (Year 1)
          6: 1577145600, // Dec 24, 2019 (Year 1)
          7: 1588291200, // May 1, 2020 (Year 2)
          8: 1604188800, // Nov 1, 2020 (Year 2)
          9: 1631836800, // Sept 17, 2021 (Year 3)
          10: 1649894400, // Apr 14, 2022 (Year 3)
          11: 1665446400, // Oct 11, 2022 (Year 4)
          12: 1680739200, // Apr 6, 2023 (Year 4)
          13: 1697673600, // Oct 19, 2023 (Year 5)
          14: 1714521600, // May 1, 2024 (Year 6)
          15: 1729123200, // Oct 17, 2024 (Year 6)
          16: 1746057600, // May 1, 2025 (Year 7)
          17: 1777593600, // May 1, 2026 (Year 8)
        };

        const originalObj = (zhReferenceData && zhReferenceData[key]) || obj;
        let startTime = originalObj.startTime ? parseInt(String(originalObj.startTime), 10) : 0;
        
        if (obj.entryType === 'MAINLINE' || key.startsWith('main_')) {
          const match = key.match(/main_(\d+)/);
          if (match) {
            const ch = parseInt(match[1], 10);
            if ((!startTime || startTime <= 0) && MAIN_STORY_TIMESTAMPS[ch]) {
              startTime = MAIN_STORY_TIMESTAMPS[ch];
            }
          }
        }
        
        const year = getArknightsYear(startTime);
        
        const chineseName = zhReferenceData && zhReferenceData[key] ? zhReferenceData[key].name : undefined;
        const englishName = enReferenceData && enReferenceData[key] ? enReferenceData[key].name : undefined;

        let displayName = obj.name || key;
        
        const manualTranslations = UI_STRINGS[currentLanguage]?.story_titles;
        if (manualTranslations && manualTranslations[key]) {
          displayName = manualTranslations[key];
        } else if (manualTranslations && chineseName && manualTranslations[chineseName]) {
          displayName = manualTranslations[chineseName];
        } else if (manualTranslations && obj.name && manualTranslations[obj.name]) {
          displayName = manualTranslations[obj.name];
        } else if (manualTranslations && englishName && manualTranslations[englishName]) {
          displayName = manualTranslations[englishName];
        } else if (dataLang === 'zh_CN' && currentLanguage !== 'zh_CN' && englishName && !/[\u4e00-\u9fa5]/.test(englishName)) {
          displayName = englishName;
        }

        // Russian fallback for CN operator records and stories
        if ((currentLanguage === 'ru_RU' || currentLanguage === 'ru_RU_CN') && /[\u4e00-\u9fa5]/.test(displayName)) {
          if (isOperatorEpisode(key) || obj.entryType === 'NONE') {
            const opKey = extractOperatorKey(key);
            const opDetails = getOperatorDetails(opKey, currentLanguage);
            const setMatch = key.match(/set_(\d+)/i) || key.match(/record_(\d+)/i) || key.match(/_(\d+)$/);
            const setNum = setMatch ? setMatch[1] : '1';
            let uiRu = true;
            try {
              const saved = localStorage.getItem('arknights_ui_lang');
              uiRu = !saved || saved.startsWith('ru');
            } catch {
              /* приватный режим */
            }
            displayName = `${opDetails.displayName} · ${uiRu ? 'Запись' : 'Record'} ${setNum}`;
          }
        }

        episodes.push({
          id: obj.id || key,
          name: displayName,
          chineseName,
          englishName,
          entryType: obj.entryType || 'MAINLINE',
          storyEntryPicId: obj.storyEntryPicId,
          startTime,
          year,
          chapters
        });
      }
    }
  }

  // Merge Extra Stories (Integrated Strategies, Reclamation Algorithm, Side Content)
  for (const extra of EXTRA_STORIES) {
    if (!episodes.some(e => e.id === extra.id)) {
      episodes.push(uiRu ? extra : localizeExtraStory(extra));
    }
  }

  cachedEpisodes[cacheKey] = episodes;
  return episodes;
}

export function normalizeStoryPath(storyPath: string): string {
  if (!storyPath) return storyPath;
  let normalized = storyPath;
  if (normalized.startsWith('gamedata/story/')) {
    normalized = normalized.substring('gamedata/story/'.length);
  }
  if (normalized.startsWith('story/')) {
    normalized = normalized.substring('story/'.length);
  }
  if (normalized.endsWith('.txt')) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}

const scriptExistenceCache: Record<string, boolean> = {};

export async function checkScriptExists(
  storyPath: string,
  lang: Language,
  _translator?: string
): Promise<boolean> {
  const normalizedPath = normalizeStoryPath(storyPath);
  const isOfficial = ['zh_CN', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);

  if (isOfficial) {
    return true;
  }

  // В папке сцены лежит ровно один перевод, его автор известен из индекса.
  const sceneTranslator = await sceneTranslatorForStoryPath(normalizedPath, lang);
  const cacheKey = `${lang}_${normalizedPath}_scene:${sceneTranslator ?? 'unknown'}`;
  if (cacheKey in scriptExistenceCache) {
    return scriptExistenceCache[cacheKey];
  }

  const baseName = normalizedPath.split('/').pop() || '';
  const suffix = getTranslatorSuffix(sceneTranslator ?? '');
  const candidates = getExactTranslationCsvCandidates(lang, baseName, suffix);
  const probeKey = `${lang}:${baseName}:${sceneTranslator ?? 'unknown'}`;
  const probed = readProbe(probeKey);
  if (probed !== null) {
    scriptExistenceCache[cacheKey] = probed;
    return probed;
  }

  const found = await firstWorking(candidates, 1, async (urlStr) => {
    try {
      const response = await fetchWithTimeout(urlStr, { method: 'HEAD' }, 3000);
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) return null;
      return true;
    } catch {
      return null;
    }
  });

  const exists = Boolean(found);
  rememberProbe(probeKey, exists);
  scriptExistenceCache[cacheKey] = exists;
  return exists;
}

export let currentStoryChapter = 'a001';

const storyTranslatorCache = new Map<string, Promise<string | null>>();

/**
 * Кто перевёл конкретную сцену. Имя автора зашито в имя CSV-файла
 * (`level_main_00_01_<translator>.csv`), поэтому проверяем точные файлы
 * каждого переводчика из реестра, без отката на чужие/community-файлы.
 */
export function findStoryTranslator(
  storyPath: string,
  lang: Language = 'ru_RU'
): Promise<string | null> {
  const normalizedPath = normalizeStoryPath(storyPath);
  const cacheKey = `${lang}:${normalizedPath}`;
  const cached = storyTranslatorCache.get(cacheKey);
  if (cached) return cached;

  // Автор уже записан в `episodes.json`, поэтому подпись появляется без
  // единого сетевого запроса. `null` — community-файл или сцена вне индекса.
  const request = (async (): Promise<string | null> => {
    const baseName = normalizedPath.split('/').pop() || '';
    if (getEpisodeFolderForStory(baseName) === 'memory') return null;
    const sceneTranslator = await sceneTranslatorForStoryPath(normalizedPath, lang);
    return sceneTranslator || null;
  })().catch(() => null);

  storyTranslatorCache.set(cacheKey, request);
  return request;
}

/**
 * Кэш «есть ли перевод этой главы».
 *
 * Каждая проверка — это десяток запросов (переводчики × раскладки путей ×
 * зеркала), и без кэша глава открывалась в 60+ лишних 404. Отрицательный
 * результат живёт 6 часов: если перевод добавят, он появится в тот же день.
 */
const TRANSLATION_PROBE_KEY = 'arknights_translation_probes_v1';
const TRANSLATION_PROBE_TTL_MS = 6 * 60 * 60 * 1000;

type TranslationProbe = { has: boolean; at: number };

function loadTranslationProbes(): Array<[string, TranslationProbe]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TRANSLATION_PROBE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, TranslationProbe>);
    }
  } catch {
    /* повреждённый кэш не мешает работе */
  }
  return [];
}

const translationProbes = new Map<string, TranslationProbe>(loadTranslationProbes());

let probePersistTimer: ReturnType<typeof setTimeout> | null = null;

function rememberProbe(key: string, has: boolean): void {
  translationProbes.set(key, { has, at: Date.now() });
  if (typeof window === 'undefined') return;
  if (probePersistTimer) clearTimeout(probePersistTimer);
  probePersistTimer = setTimeout(() => {
    try {
      const entries = Array.from(translationProbes.entries()).slice(-800);
      window.localStorage.setItem(TRANSLATION_PROBE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {
      /* localStorage может быть переполнен */
    }
  }, 1000);
}

/** `null` — неизвестно, `true/false` — проверено недавно. */
function readProbe(key: string): boolean | null {
  const hit = translationProbes.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TRANSLATION_PROBE_TTL_MS) {
    translationProbes.delete(key);
    return null;
  }
  return hit.has;
}

/**
 * Параллельная проверка списка URL с ограничением: первый успешный ответ
 * выигрывает, остальные просто догружаются в фоне и игнорируются.
 */
async function firstWorking<T>(
  urls: string[],
  concurrency: number,
  attempt: (url: string) => Promise<T | null>
): Promise<{ url: string; value: T } | null> {
  if (urls.length === 0) return null;
  let nextIndex = 0;
  let settled = false;

  return new Promise((resolve) => {
    const run = async () => {
      while (!settled) {
        const index = nextIndex++;
        if (index >= urls.length) return;
        const url = urls[index];
        try {
          const value = await attempt(url);
          if (value && !settled) {
            settled = true;
            resolve({ url, value });
            return;
          }
        } catch {
          /* пробуем следующий */
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => run());
    void Promise.all(workers).then(() => {
      if (!settled) resolve(null);
    });
  });
}

function isBadScriptText(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return (
    !lower ||
    lower.startsWith('<!doctype') ||
    lower.startsWith('<html') ||
    lower.startsWith('404:') ||
    lower.startsWith('not found')
  );
}

/**
 * Кто реально переводил главу. `translation/<lang>/episodes.json` в zoot-data
 * генерируется из самих CSV, поэтому содержит точный список авторов. Это
 * позволяет не перебирать всех переводчиков реестра (до 40 лишних 404 на
 * каждую сцену) и не упираться в 403 от jsDelivr.
 */
interface EpisodeTranslationInfo {
  files: number;
  translators: string[];
  /**
   * Точный автор каждой сцены: `<базовое имя> → <ник>`.
   * Пустая строка — community-файл без суффикса. В папке эпизода на сцену
   * лежит ровно один перевод, поэтому перебирать авторов не нужно.
   */
  scenes?: Record<string, string>;
}

const episodeIndexPromises = new Map<
  string,
  Promise<Record<string, EpisodeTranslationInfo> | null>
>();

// Карта `scenes` обновляется вместе с переводами, а jsDelivr кэширует ветку
// `main` и может отдавать старый episodes.json без неё. Поэтому сначала
// читаем raw (всегда свежий), а CDN оставляем запасным зеркалом.
const EPISODE_INDEX_URLS = (lang: Language) => [
  `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${lang}/episodes.json`,
  `https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/translation/${lang}/episodes.json`,
];

function loadEpisodeTranslationIndex(
  lang: Language
): Promise<Record<string, EpisodeTranslationInfo> | null> {
  if (lang !== 'ru_RU') return Promise.resolve(null);
  const existing = episodeIndexPromises.get(lang);
  if (existing) return existing;

  const task = (async () => {
    const cacheKey = `translation-index:${lang}:v4`;
    try {
      const cached = await CacheService.getCachedJson<Record<string, EpisodeTranslationInfo>>(cacheKey);
      if (cached && typeof cached === 'object') return cached;
    } catch {
      /* кэш недоступен */
    }

    for (const url of EPISODE_INDEX_URLS(lang)) {
      // Идём напрямую: fetchWithTimeout для raw-URL сначала пробует jsDelivr,
      // а тот кэширует ветку main и отдаёт устаревший индекс без `scenes`.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await platform.fetch(url, {
          cache: 'no-cache',
          signal: controller.signal,
        });
        if (!response.ok) continue;
        const data = (await response.json()) as Record<string, EpisodeTranslationInfo>;
        if (!data || typeof data !== 'object') continue;
        CacheService.cacheJson(cacheKey, data).catch(() => {});
        return data;
      } catch {
        /* пробуем следующий адрес */
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  })();

  episodeIndexPromises.set(lang, task);
  return task;
}

/**
 * Сегмент пути, который является ID главы. Важно не спутать папку
 * `activities` с главой `act18d3`: `'activities'.startsWith('act')` — true,
 * из-за чего раньше определялась не та глава и перевод искался у всех
 * переводчиков подряд.
 */
function isChapterPathSegment(part: string): boolean {
  if (!part || part === 'activities' || part === 'obtain') return false;
  return (
    part.startsWith('act') ||
    part === 'main' ||
    part.startsWith('a00') ||
    part.startsWith('guide')
  );
}

/** ID главы из пути сцены: `activities/act18d3/...` → `act18d3`. */
function chapterIdFromStoryPath(normalizedPath: string): string | null {
  for (const part of normalizedPath.split('/')) {
    if (isChapterPathSegment(part)) return part;
  }
  return null;
}

/**
 * Точный автор сцены из `episodes.json`.
 *
 * `undefined` — индекс не знает сцену (новая загрузка или нет сети);
 * `''` — community-файл без суффикса; иначе — ник автора.
 * Личные дела (`obt/memory/story_*`) в индекс не входят и всегда community.
 */
async function sceneTranslatorForStoryPath(
  normalizedPath: string,
  lang: Language
): Promise<string | undefined> {
  if (lang !== 'ru_RU') return undefined;
  const baseName = normalizedPath.split('/').pop() || '';
  if (!baseName) return undefined;
  const folder = getEpisodeFolderForStory(baseName);
  if (folder === 'memory') return '';

  const index = await loadEpisodeTranslationIndex(lang).catch(() => null);
  // Сначала ключ эпизода (`main`, `ui`, `act3d0`), затем — прежний `st`
  // и глава из пути. После переезда `level_st_*` в папки эпизодов их автор
  // лежит в индексе `main`; старый индекс `st` оставлен фолбэком.
  const indexKeys = [
    getTranslationIndexKey(baseName),
    baseName.startsWith('level_st_') ? 'st' : null,
    folder,
    chapterIdFromStoryPath(normalizedPath),
  ].filter((value): value is string => Boolean(value));
  const chapterId = indexKeys.find((key) => index?.[key]?.scenes);
  if (!chapterId) return undefined;
  const scenes = index?.[chapterId]?.scenes;
  if (!scenes || typeof scenes !== 'object') return undefined;
  const value = scenes[baseName];
  return typeof value === 'string' ? value : undefined;
}

/** Публичный доступ к автору сцены без сетевых проверок. */
export function getStorySceneTranslator(
  storyPath: string,
  lang: Language = 'ru_RU'
): Promise<string | undefined> {
  return sceneTranslatorForStoryPath(normalizeStoryPath(storyPath), lang);
}

/**
 * Кандидаты CSV-перевода: ровно один файл сцены (автор из `scenes`), но
 * в нескольких раскладках путей. Перебора переводчиков нет.
 *
 * `sceneTranslator`: `undefined` — сцена вне индекса, читаем community-файл;
 * `''` — community; иначе — ник автора.
 */
function buildTranslationCandidates(
  lang: Language,
  baseName: string,
  sceneTranslator?: string
): string[] {
  const suffix = getTranslatorSuffix(sceneTranslator ?? '');
  return getExactTranslationCsvCandidates(lang, baseName, suffix);
}

export async function fetchStoryScript(storyPath: string, langOverride?: Language, noFallback?: boolean, translator?: string): Promise<string> {
  const normalizedPath = normalizeStoryPath(storyPath);
  const parts = normalizedPath.split('/');
  for (const part of parts) {
    if (isChapterPathSegment(part)) {
      currentStoryChapter = part;
      break;
    }
  }
  
  const targetLang = langOverride || currentLanguage;
  
  const fetchScript = async (lang: Language): Promise<string> => {
    const isOfficial = ['zh_CN', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);
    
    if (isOfficial) {
      const baseUrl = getBaseUrl(lang);
      const urlsToTry = [`${baseUrl}/gamedata/story/${normalizedPath}.txt`];

      // torappu.prts.wiki раздаёт `gamedata/latest` только китайского клиента.
      // Для en/ja/ko этот адрес отдаёт китайский текст, поэтому он годится
      // лишь как фолбэк для zh_CN (и для ru_RU, который строится поверх zh_CN).
      const cnFallback = (path: string): string | null =>
        lang === 'zh_CN'
          ? `https://torappu.prts.wiki/gamedata/latest/story/${path}.txt`
          : null;
      const cnUrl = cnFallback(normalizedPath);
      if (cnUrl) urlsToTry.push(cnUrl);

      // Add roguelike and legacy path mapping fallbacks
      if (normalizedPath.includes('ro00_st_') || normalizedPath.includes('ro0_st_')) {
        let numStr = normalizedPath.slice(-2);
        if (numStr.startsWith('0')) numStr = numStr.slice(1);
        const legacyPath = `activities/act12d6/level_act12d6_ending_${numStr}`;
        urlsToTry.push(`${baseUrl}/gamedata/story/${legacyPath}.txt`);
        const legacyCn = cnFallback(legacyPath);
        if (legacyCn) urlsToTry.push(legacyCn);
      } else if (normalizedPath.includes('obt/roguelike/')) {
        const roMatch = normalizedPath.match(/ro0?(\d)_st_0?(\d)/i);
        if (roMatch) {
          const num = roMatch[1];
          const endingNum = roMatch[2];
          const roguePath = `obt/roguelike/ro${num}/level_rogue${num}_ending_${endingNum}`;
          const rogueCn = cnFallback(roguePath);
          if (rogueCn) urlsToTry.push(rogueCn);
        }
      }
      
      let text: string | null = null;

      for (const url of urlsToTry) {
        text = await CacheService.getCachedText(url);
        if (text) break;

        try {
          const response = await fetchWithTimeout(url);
          if (response.ok) {
            const fetchedText = await response.text();
            const lowerText = fetchedText.trim().toLowerCase();
            if (!lowerText.startsWith('<!doctype') && !lowerText.startsWith('<html') && !lowerText.startsWith('404:') && !lowerText.startsWith('not found')) {
              text = fetchedText;
              await CacheService.cacheText(url, text);
              break;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch script from ${url}:`, e);
        }
      }

      if (!text) {
        throw new Error(`Failed to fetch ${lang} story script: ${normalizedPath}`);
      }

      return text;
    } else {
      const originalScript = await fetchScript('zh_CN');
      
      if (translator === 'none') {
        return originalScript;
      }

      // Автор сцены известен из `episodes.json`: в папке лежит ровно один
      // перевод, поэтому запрашиваем точный файл, а не перебираем всех.
      const sceneTranslator = await sceneTranslatorForStoryPath(normalizedPath, lang);
      const baseName = normalizedPath.split('/').pop() || '';
      const csvUrls = buildTranslationCandidates(lang, baseName, sceneTranslator);
      const probeKey = `${lang}:${baseName}:${sceneTranslator ?? 'unknown'}`;

      let csvText: string | null = null;

      // Недавно проверяли и не нашли — не тратим полсотни запросов повторно.
      if (readProbe(probeKey) !== false) {
        // 1. Уже скачанное — мгновенно, даже без сети.
        for (const csvUrl of csvUrls) {
          const cached = await CacheService.getCachedText(csvUrl);
          if (cached && !isBadScriptText(cached)) {
            csvText = cached;
            break;
          }
        }

        // 2. Раскладки проверяем по очереди: актуальная почти всегда первая,
        //    остальные нужны только для старых загрузок Discord-бота.
        if (!csvText) {
          const found = await firstWorking(csvUrls, 1, async (csvUrl) => {
            const response = await fetchWithTimeout(csvUrl, { cache: 'no-cache' }, 8000);
            if (!response.ok) return null;
            const fresh = await response.text();
            if (isBadScriptText(fresh)) return null;
            await CacheService.cacheText(csvUrl, fresh);
            return fresh;
          });
          if (found) csvText = found.value;
        }

        rememberProbe(probeKey, Boolean(csvText));
      }

      if (!csvText) {
        return originalScript;
      }
      
      const parsed = Papa.parse<TranslationRow>(csvText, { header: true, skipEmptyLines: true });
      const translations = parsed.data;
      
      const lines = originalScript.split(/\r?\n/);
      
      const translatedLines = lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('//') || trimmed.toUpperCase().startsWith('[HEADER')) {
          return line;
        }
        
        const match = line.match(/^(\s*(?:\[(?:[^"'\]]|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*\]\s*)*)(.*)$/);
        if (match) {
          const prefix = match[1];
          let textToTranslate = match[2];
          
          if (/\[delay\b/i.test(prefix)) {
            textToTranslate = '';
          }
          
          const optionsMatch = prefix.match(/options="([^"]+)"/);
          const subtitleMatch = prefix.match(/\[Subtitle[^\]]*text="([^"]+)"/i);
          const stickerMatch = prefix.match(/\[Sticker[^\]]*text="([^"]+)"/i);
          
          if (textToTranslate.trim() === '' && !optionsMatch && !subtitleMatch && !stickerMatch) {
            return line;
          }
          
          const id = `line-${index}`;
          
          const translationRow = translations.find(row => row['ID'] === id);
          if (translationRow && translationRow['Translation']) {
            let finalPrefix = prefix;
            const translatedText = translationRow['Translation'].replace(/\r?\n/g, '\\n');
            
            let characterName: string | undefined = undefined;
            const nameMatch = prefix.match(/name="([^"]+)"/);
            if (nameMatch) {
              characterName = nameMatch[1];
              const charTranslationRow = translations.find(row => row['Original Text'] === characterName && row['ID']?.startsWith('char-'));
              if (charTranslationRow && charTranslationRow['Translation']) {
                const translatedName = charTranslationRow['Translation'].replace(/\r?\n/g, '');
                finalPrefix = finalPrefix.replace(`name="${characterName}"`, `name="${translatedName}"`);
              }
            }

            if (optionsMatch) {
              const options = optionsMatch[1];
              if (textToTranslate.trim() === '') {
                finalPrefix = finalPrefix.replace(`options="${options}"`, `options="${translatedText}"`);
                return finalPrefix;
              } else {
                const optionsTranslationRow = translations.find(row => row['Original Text'] === options && row['ID']?.startsWith('line-'));
                if (optionsTranslationRow && optionsTranslationRow['Translation']) {
                  const translatedOptions = optionsTranslationRow['Translation'].replace(/\r?\n/g, '\\n');
                  finalPrefix = finalPrefix.replace(`options="${options}"`, `options="${translatedOptions}"`);
                }
              }
            }

            if (subtitleMatch) {
              const subtitleText = subtitleMatch[1];
              if (textToTranslate.trim() === '') {
                finalPrefix = finalPrefix.replace(`text="${subtitleText}"`, `text="${translatedText}"`);
                return finalPrefix;
              } else {
                const subtitleTranslationRow = translations.find(row => row['Original Text'] === subtitleText && row['ID']?.startsWith('line-'));
                if (subtitleTranslationRow && subtitleTranslationRow['Translation']) {
                  const translatedSubtitle = subtitleTranslationRow['Translation'].replace(/\r?\n/g, '\\n');
                  finalPrefix = finalPrefix.replace(`text="${subtitleText}"`, `text="${translatedSubtitle}"`);
                }
              }
            }

            if (stickerMatch) {
              const stickerText = stickerMatch[1];
              if (textToTranslate.trim() === '') {
                finalPrefix = finalPrefix.replace(`text="${stickerText}"`, `text="${translatedText}"`);
                return finalPrefix;
              } else {
                const stickerTranslationRow = translations.find(row => row['Original Text'] === stickerText && row['ID']?.startsWith('line-'));
                if (stickerTranslationRow && stickerTranslationRow['Translation']) {
                  const translatedSticker = stickerTranslationRow['Translation'].replace(/\r?\n/g, '\\n');
                  finalPrefix = finalPrefix.replace(`text="${stickerText}"`, `text="${translatedSticker}"`);
                }
              }
            }
            
            return `${finalPrefix}${translatedText}`;
          }
        }
        return line;
      });
      
      return translatedLines.join('\n');
    }
  };

  try {
    return await fetchScript(targetLang);
  } catch (err) {
    console.warn(`Failed to fetch ${targetLang} script:`, err);
    if (!noFallback && targetLang !== 'zh_CN') {
      console.warn(`Falling back to zh_CN for ${storyPath}`);
      try {
        return await fetchScript('zh_CN');
      } catch {
        throw new Error(`Failed to fetch story script in both ${targetLang} and zh_CN.`);
      }
    } else {
      throw err;
    }
  }
}
