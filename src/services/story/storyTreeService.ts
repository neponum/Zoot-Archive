import Papa from 'papaparse';
import { StoryChapter, StoryEpisode, Language } from '../../types';
import { CacheService } from '../cacheService';
import { TRANSLATION_REGISTRY, getDefaultTranslator } from '../../config/translationsRegistry';
import { UI_STRINGS } from '../../translations';
import { TranslationRow } from './storyTypes';

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

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  let useProxy = false;
  try {
    const response = await fetch(url, {
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

  if (useProxy) {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const proxyController = new AbortController();
    const proxyId = setTimeout(() => proxyController.abort(), timeout);
    try {
      const response = await fetch(proxyUrl, {
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

export async function fetchChapterList(): Promise<StoryEpisode[]> {
  const dataLang = getDataLanguage(currentLanguage);
  const cacheKey = `${dataLang}_${currentLanguage}`;
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
        } else if (dataLang === 'zh_CN' && currentLanguage !== 'zh_CN' && englishName && !/[\u4e00-\u9fa5]/.test(englishName)) {
          displayName = englishName;
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

  cachedEpisodes[cacheKey] = episodes;
  return episodes;
}

export function normalizeStoryPath(storyPath: string): string {
  if (!storyPath) return storyPath;
  let normalized = storyPath;
  if (normalized.startsWith('gamedata/story/')) {
    normalized = normalized.substring('gamedata/story/'.length);
  }
  if (normalized.endsWith('.txt')) {
    normalized = normalized.slice(0, -4);
  }
  return normalized;
}

const scriptExistenceCache: Record<string, boolean> = {};

export async function checkScriptExists(storyPath: string, lang: Language, translator?: string): Promise<boolean> {
  const normalizedPath = normalizeStoryPath(storyPath);
  const isOfficial = ['zh_CN', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);
  
  if (isOfficial) {
    return true;
  }

  const cacheKey = `${lang}_${normalizedPath}_${translator || 'default'}`;
  if (cacheKey in scriptExistenceCache) {
    return scriptExistenceCache[cacheKey];
  }
  
  const extension = 'csv';
  let cleanTranslator = translator;
  if (cleanTranslator === 'neponum') cleanTranslator = 'nep0num';
  const translatorSuffix = cleanTranslator && cleanTranslator !== 'Community Translators' && cleanTranslator !== 'Переводчики сообщества' ? `_${cleanTranslator}` : '';
  const baseName = normalizedPath.split('/').pop();
  
  const tryUrl = async (urlStr: string) => {
    try {
      const response = await fetchWithTimeout(urlStr, { method: 'HEAD' }, 3000);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  };

  const primaryUrl = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${lang}/${baseName}${translatorSuffix}.${extension}`;
  let exists = await tryUrl(primaryUrl);

  if (!exists && translatorSuffix) {
    const fallbackUrl = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${lang}/${baseName}.${extension}`;
    exists = await tryUrl(fallbackUrl);
  }

  scriptExistenceCache[cacheKey] = exists;
  return exists;
}

export let currentStoryChapter = 'a001';

export async function fetchStoryScript(storyPath: string, langOverride?: Language, noFallback?: boolean, translator?: string): Promise<string> {
  const normalizedPath = normalizeStoryPath(storyPath);
  const parts = normalizedPath.split('/');
  for (const part of parts) {
    if (part.startsWith('act') || part === 'main' || part.startsWith('a00') || part.startsWith('guide')) {
      currentStoryChapter = part;
      break;
    }
  }
  
  const targetLang = langOverride || currentLanguage;
  
  const fetchScript = async (lang: Language): Promise<string> => {
    const isOfficial = ['zh_CN', 'en_US', 'ja_JP'].includes(lang);
    
    if (isOfficial) {
      const baseUrl = getBaseUrl(lang);
      const url = `${baseUrl}/gamedata/story/${normalizedPath}.txt`;
      
      let text = await CacheService.getCachedText(url);
      
      if (!text) {
        try {
          const response = await fetchWithTimeout(url);
          if (response.ok) {
            text = await response.text();
            const lowerText = text.trim().toLowerCase();
            if (!lowerText.startsWith('<!doctype') && !lowerText.startsWith('<html') && !lowerText.startsWith('404:') && !lowerText.startsWith('not found')) {
              await CacheService.cacheText(url, text);
            } else {
              text = null;
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ${lang} official script:`, e);
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

      const registry = TRANSLATION_REGISTRY[lang];
      const defaultTranslator = (registry && registry.translators.length > 0) ? getDefaultTranslator(registry.translators) : undefined;
      const effectiveTranslator = translator || defaultTranslator;
      const translatorSuffix = effectiveTranslator && effectiveTranslator !== 'Community Translators' && effectiveTranslator !== 'Переводчики сообщества' ? `_${effectiveTranslator}` : '';
      const baseName = normalizedPath.split('/').pop();
      const csvUrl = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${lang}/${baseName}${translatorSuffix}.csv`;
      
      let csvText: string | null = null;
      
      try {
        const response = await fetchWithTimeout(csvUrl, { cache: 'no-cache' });
        if (response.ok) {
          csvText = await response.text();
          const lowerText = csvText.trim().toLowerCase();
          if (!lowerText.startsWith('<!doctype') && !lowerText.startsWith('<html') && !lowerText.startsWith('404:') && !lowerText.startsWith('not found')) {
            await CacheService.cacheText(csvUrl, csvText);
          } else {
            csvText = null;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch fresh translation, trying cache:', e);
      }

      if (!csvText) {
        csvText = await CacheService.getCachedText(csvUrl);
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
            
            let characterName = undefined;
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
