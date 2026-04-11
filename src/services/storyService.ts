import Papa from 'papaparse';
import { StoryChapter, StoryLine, StoryEpisode, Language } from '../types';
import { CacheService } from './cacheService';
import { TRANSLATION_REGISTRY } from '../config/translationsRegistry';
import audioMap from '../data/audioMap.json';

enum TokenType {
  LEFT_BRACKET,
  RIGHT_BRACKET,
  LEFT_PAREN,
  RIGHT_PAREN,
  EQUALS,
  COMMA,
  IDENTIFIER,
  STRING,
  TEXT,
  NEWLINE,
  EOF
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

class Lexer {
  public input: string;
  public pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  private insideTag: boolean = false;

  constructor(input: string) {
    this.input = input;
  }

  nextToken(): Token {
    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: '', line: this.line, col: this.col };
    }

    const char = this.input[this.pos];

    if (!this.insideTag) {
      if (char === '[') {
        this.insideTag = true;
        return this.emitToken(TokenType.LEFT_BRACKET, '[');
      }
      if (char === '\n') {
        const token = this.emitToken(TokenType.NEWLINE, '\n');
        this.line++;
        this.col = 1;
        return token;
      }
      // Collect text
      let text = '';
      while (this.pos < this.input.length && this.input[this.pos] !== '[' && this.input[this.pos] !== '\n') {
        text += this.input[this.pos];
        this.pos++;
        this.col++;
      }
      return { type: TokenType.TEXT, value: text, line: this.line, col: this.col - text.length };
    } else {
      // Inside tag
      while (this.pos < this.input.length && /\s/.test(this.input[this.pos]) && this.input[this.pos] !== '\n') {
        this.pos++;
        this.col++;
      }

      if (this.pos >= this.input.length) return this.nextToken();

      const c = this.input[this.pos];
      if (c === ']') {
        this.insideTag = false;
        return this.emitToken(TokenType.RIGHT_BRACKET, ']');
      }
      if (c === '(') return this.emitToken(TokenType.LEFT_PAREN, '(');
      if (c === ')') return this.emitToken(TokenType.RIGHT_PAREN, ')');
      if (c === '=') return this.emitToken(TokenType.EQUALS, '=');
      if (c === ',') return this.emitToken(TokenType.COMMA, ',');
      if (c === '"') {
        const startCol = this.col;
        this.pos++; // skip opening quote
        this.col++;
        let str = '';
        while (this.pos < this.input.length && this.input[this.pos] !== '"') {
          str += this.input[this.pos];
          this.pos++;
          this.col++;
        }
        if (this.pos < this.input.length) {
          this.pos++; // skip closing quote
          this.col++;
        }
        return { type: TokenType.STRING, value: str, line: this.line, col: startCol };
      }
      if (c === '\n') {
        this.insideTag = false;
        return this.nextToken();
      }

      // Identifier or unquoted value
      const startCol = this.col;
      let id = '';
      while (this.pos < this.input.length && /[^\s\[\]\(\)=,]/.test(this.input[this.pos])) {
        id += this.input[this.pos];
        this.pos++;
        this.col++;
      }
      return { type: TokenType.IDENTIFIER, value: id, line: this.line, col: startCol };
    }
  }

  private emitToken(type: TokenType, value: string): Token {
    const token = { type, value, line: this.line, col: this.col };
    this.pos += value.length;
    this.col += value.length;
    return token;
  }
}

class StoryParser {
  private lexer: Lexer;
  private currentToken: Token;
  private currentCharacterName: string | undefined;

  constructor(script: string) {
    this.lexer = new Lexer(script);
    this.currentToken = this.lexer.nextToken();
  }

  private eat(type: TokenType): Token {
    if (this.currentToken.type === type) {
      const token = this.currentToken;
      this.currentToken = this.lexer.nextToken();
      return token;
    }
    // Graceful recovery: just skip and move on if unexpected
    const token = this.currentToken;
    this.currentToken = this.lexer.nextToken();
    return token;
  }

  private isType(type: TokenType): boolean {
    return this.currentToken.type === type;
  }

  parse(): StoryLine[] {
    const lines: StoryLine[] = [];
    while (this.currentToken.type !== TokenType.EOF) {
      const lineObjects = this.parseLine();
      lines.push(...lineObjects);
    }
    return lines;
  }

  private parseLine(): StoryLine[] {
    const lineObjects: StoryLine[] = [];
    let lineText = '';
    let hasAnimText = false;
    const tagsOnThisLine: { name: string, params: Record<string, string>, original: string }[] = [];

    while (!this.isType(TokenType.NEWLINE) && !this.isType(TokenType.EOF)) {
      if (this.isType(TokenType.LEFT_BRACKET)) {
        const tag = this.parseTag();
        tagsOnThisLine.push(tag);
        if (tag.name.toLowerCase() === 'animtext') hasAnimText = true;
      } else if (this.isType(TokenType.TEXT)) {
        lineText += this.eat(TokenType.TEXT).value;
      } else {
        lineText += this.currentToken.value;
        this.eat(this.currentToken.type);
      }
    }

    if (this.isType(TokenType.NEWLINE)) {
      this.eat(TokenType.NEWLINE);
    }

    // Process tags
    for (const tag of tagsOnThisLine) {
      const storyLine = this.createStoryLineFromTag(tag, lineText);
      if (storyLine) {
        lineObjects.push(storyLine);
      }
    }

    // Process dialogue
    const dialogueText = lineText.trim();
    if (dialogueText && dialogueText !== 'undefined' && !hasAnimText) {
      lineObjects.push({
        type: 'dialogue',
        characterName: this.currentCharacterName,
        text: dialogueText
      });
    }

    return lineObjects;
  }

  private parseTag(): { name: string, params: Record<string, string>, original: string } {
    const startPos = this.lexer.pos;
    this.eat(TokenType.LEFT_BRACKET);
    
    let tagName = '';
    if (this.isType(TokenType.IDENTIFIER)) {
      tagName = this.eat(TokenType.IDENTIFIER).value;
    }

    const params: Record<string, string> = {};

    if (this.isType(TokenType.LEFT_PAREN)) {
      this.eat(TokenType.LEFT_PAREN);
      while (!this.isType(TokenType.RIGHT_PAREN) && !this.isType(TokenType.EOF) && !this.isType(TokenType.NEWLINE)) {
        if (this.isType(TokenType.IDENTIFIER)) {
          const key = this.eat(TokenType.IDENTIFIER).value.toLowerCase();
          if (this.isType(TokenType.EQUALS)) {
            this.eat(TokenType.EQUALS);
            if (this.isType(TokenType.STRING)) {
              params[key] = this.eat(TokenType.STRING).value;
            } else if (this.isType(TokenType.IDENTIFIER)) {
              params[key] = this.eat(TokenType.IDENTIFIER).value;
            }
          }
        } else if (this.isType(TokenType.COMMA)) {
          this.eat(TokenType.COMMA);
        } else {
          this.eat(this.currentToken.type);
        }
      }
      if (this.isType(TokenType.RIGHT_PAREN)) {
        this.eat(TokenType.RIGHT_PAREN);
      }
    } else if (this.isType(TokenType.EQUALS)) {
      this.eat(TokenType.EQUALS);
      if (this.isType(TokenType.STRING)) {
        params['name'] = this.eat(TokenType.STRING).value;
      } else if (this.isType(TokenType.IDENTIFIER)) {
        params['name'] = this.eat(TokenType.IDENTIFIER).value;
      }
    }

    while (!this.isType(TokenType.RIGHT_BRACKET) && !this.isType(TokenType.EOF) && !this.isType(TokenType.NEWLINE)) {
      this.eat(this.currentToken.type);
    }

    if (this.isType(TokenType.RIGHT_BRACKET)) {
      this.eat(TokenType.RIGHT_BRACKET);
    }

    const endPos = this.lexer.pos;
    const original = this.lexer.input.substring(startPos, endPos);

    return { name: tagName, params, original };
  }

  private createStoryLineFromTag(tag: { name: string, params: Record<string, string>, original: string }, lineText: string): StoryLine | null {
    const { name: tagName, params, original } = tag;
    const lowerTagName = tagName.toLowerCase();

    if (lowerTagName === 'name') {
      this.currentCharacterName = params.name || this.currentCharacterName;
      return null;
    }

    switch (lowerTagName) {
      case 'header':
        return { type: 'header', originalTag: original };
      case 'imagetween':
        return {
          type: 'imagetween',
          assetName: params.image || params.name,
          xScaleFrom: params.xscalefrom ? parseFloat(params.xscalefrom) : undefined,
          yScaleFrom: params.yscalefrom ? parseFloat(params.yscalefrom) : undefined,
          xScaleTo: params.xscaleto ? parseFloat(params.xscaleto) : undefined,
          yScaleTo: params.yscaleto ? parseFloat(params.yscaleto) : undefined,
          duration: params.duration ? parseFloat(params.duration) : undefined,
          tiled: params.tiled === 'true',
          block: params.block === 'true',
          originalTag: original
        };
      case 'cameraeffect':
        return {
          type: 'cameraeffect',
          effect: params.effect,
          duration: params.fadetime ? parseFloat(params.fadetime) : undefined,
          a: params.amount ? parseFloat(params.amount) : undefined,
          block: params.block === 'true',
          originalTag: original
        };
      case 'character':
      case 'charslot':
        return {
          type: 'character',
          assetName: params.name,
          assetName2: params.name2,
          slot: params.slot,
          focus: params.focus ? parseInt(params.focus) : undefined,
          duration: params.duration ? parseFloat(params.duration) : undefined,
          posFrom: params.posfrom,
          posTo: params.posto,
          aFrom: params.afrom ? parseFloat(params.afrom) : undefined,
          aTo: params.ato ? parseFloat(params.ato) : undefined,
          originalTag: original
        };
      case 'background':
        return {
          type: 'background',
          assetName: params.image || params.name,
          originalTag: original
        };
      case 'image':
      case 'showimage':
        return {
          type: 'image',
          assetName: params.image || params.name,
          originalTag: original
        };
      case 'playmusic':
        return {
          type: 'music',
          assetName: params.key || params.intro,
          volume: params.volume ? parseFloat(params.volume) : 1,
          originalTag: original
        };
      case 'playsound':
        return {
          type: 'sound',
          assetName: params.key,
          volume: params.volume ? parseFloat(params.volume) : 1,
          originalTag: original
        };
      case 'playvoice':
        return {
          type: 'voice',
          assetName: params.voice || params.key,
          volume: params.volume ? parseFloat(params.volume) : 1,
          originalTag: original
        };
      case 'stopmusic':
      case 'stopsound':
        return { type: 'stop_music', originalTag: original };
      case 'delay':
        return {
          type: 'delay',
          duration: params.time ? parseFloat(params.time) : 0,
          originalTag: original
        };
      case 'shake':
        return {
          type: 'shake',
          duration: params.time ? parseFloat(params.time) : 0.5,
          originalTag: original
        };
      case 'camerashake':
        return {
          type: 'camerashake',
          duration: params.duration ? parseFloat(params.duration) : 0,
          xstrength: params.xstrength ? parseFloat(params.xstrength) : 0,
          ystrength: params.ystrength ? parseFloat(params.ystrength) : 0,
          vibrato: params.vibrato ? parseFloat(params.vibrato) : 0,
          randomness: params.randomness ? parseFloat(params.randomness) : 0,
          fadeout: params.fadeout === 'true',
          block: params.block === 'true',
          originalTag: original
        };
      case 'flash':
        return {
          type: 'flash',
          duration: params.time ? parseFloat(params.time) : 0.5,
          originalTag: original
        };
      case 'decision':
        return {
          type: 'decision',
          options: params.options ? params.options.split(';').map(s => s.trim()) : [],
          values: params.values ? params.values.split(';').map(s => s.trim()) : [],
          originalTag: original
        };
      case 'predicate':
        return {
          type: 'predicate',
          references: params.references ? params.references.split(';').map(s => s.trim()) : [],
          originalTag: original
        };
      case 'subtitle':
        return {
          type: 'subtitle',
          text: params.text,
          x: params.x ? parseFloat(params.x) : undefined,
          y: params.y ? parseFloat(params.y) : undefined,
          alignment: params.alignment,
          size: params.size ? parseFloat(params.size) : undefined,
          duration: params.delay ? parseFloat(params.delay) : undefined,
          width: params.width ? parseFloat(params.width) : undefined,
          originalTag: original
        };
      case 'blocker':
        return {
          type: 'blocker',
          a: params.a ? parseFloat(params.a) : 1,
          r: params.r ? parseFloat(params.r) : 0,
          g: params.g ? parseFloat(params.g) : 0,
          b: params.b ? parseFloat(params.b) : 0,
          duration: params.fadetime ? parseFloat(params.fadetime) : 0,
          block: params.block === 'true',
          originalTag: original
        };
      case 'animtext':
        let processedText = lineText.trim();
        processedText = processedText.replace(/<\/>\s*<P=\d+>/g, '\\n');
        processedText = processedText.replace(/<\/>/g, '\\n');
        processedText = processedText.replace(/<[^>]*>/g, '');
        processedText = processedText.replace(/(\\n)+$/, '');
        
        return {
          type: 'animtext',
          id: params.id,
          assetName: params.name,
          style: params.style,
          pos: params.pos,
          block: params.block === 'true',
          text: processedText,
          originalTag: original
        };
      case 'animtextclean':
        return {
          type: 'animtextclean',
          originalTag: original
        };
      default:
        return null;
    }
  }
}

function detectInitialLanguage(): Language {
  try {
    // 1. Check localStorage
    const saved = localStorage.getItem('arknights_story_lang') as Language;
    const validLanguages: Language[] = ['zh_CN', 'zh_TW', 'de_DE', 'en_US', 'es_ES', 'fr_FR', 'id_ID', 'it_IT', 'ja_JP', 'ko_KR', 'pt_PT', 'ru_RU'];
    if (saved && validLanguages.includes(saved)) {
      return saved;
    }

    // 2. Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.includes('zh-cn') || browserLang.includes('zh-hans')) return 'zh_CN';
    if (browserLang.includes('zh-tw') || browserLang.includes('zh-hk') || browserLang.includes('zh-hant')) return 'zh_TW';
    if (browserLang.startsWith('ru')) return 'ru_RU';
    if (browserLang.startsWith('ja')) return 'ja_JP';
    if (browserLang.startsWith('ko')) return 'ko_KR';
    if (browserLang.startsWith('de')) return 'de_DE';
    if (browserLang.startsWith('fr')) return 'fr_FR';
    if (browserLang.startsWith('es')) return 'es_ES';
    if (browserLang.startsWith('it')) return 'it_IT';
    if (browserLang.startsWith('pt')) return 'pt_PT';
    if (browserLang.startsWith('id')) return 'id_ID';
    if (browserLang.startsWith('en')) return 'en_US';
  } catch (e) {
    console.warn('Failed to detect language:', e);
  }

  return 'zh_CN'; // Fallback to CN
}

let currentLanguage: Language = detectInitialLanguage();
const BASE_DATA_URL_CN = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master';
const BASE_DATA_URL_YOSTAR = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/master';

function getBaseUrl(lang: Language): string {
  return lang === 'zh_CN' ? BASE_DATA_URL_CN : BASE_DATA_URL_YOSTAR;
}

let cachedEpisodes: Partial<Record<Language, StoryEpisode[] | null>> = {
  zh_CN: null,
  en_US: null,
  ja_JP: null,
  ko_KR: null
};

let enReferenceData: any = null;
let zhReferenceData: any = null;
let characterMappingCache: Record<string, string> | null = null;

export async function fetchCharacterMapping(): Promise<Record<string, string>> {
  if (characterMappingCache) return characterMappingCache;

  try {
    const url = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/excel/character_table.json';
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error('Failed to fetch character table');
    const data = await response.json();
    
    const mapping: Record<string, string> = {};
    for (const charId in data) {
      // charId is like char_101_sora
      const parts = charId.split('_');
      if (parts.length >= 3) {
        // Extract the name part (e.g., 'sora' from 'char_101_sora')
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

export function setLanguage(lang: Language) {
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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function getArknightsYear(timestamp: number): number {
  if (timestamp <= 0) return 1;
  const date = new Date(timestamp * 1000);
  const releaseDate = new Date(2019, 4, 1); // May 1, 2019
  
  let years = date.getFullYear() - releaseDate.getFullYear();
  const m = date.getMonth() - releaseDate.getMonth();
  if (m < 0 || (m === 0 && date.getDate() < releaseDate.getDate())) {
    years--;
  }
  return years + 1;
}

export async function fetchChapterList(): Promise<StoryEpisode[]> {
  if (cachedEpisodes[currentLanguage]) {
    return cachedEpisodes[currentLanguage]!;
  }

  const fetchList = async (lang: Language) => {
    const baseUrl = getBaseUrl(lang);
    const url = `${baseUrl}/${lang}/gamedata/excel/story_review_table.json`;
    
    // Check cache first
    const cached = await CacheService.getCachedJson(url);
    if (cached) return cached;
    
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Failed to fetch ${lang} story review table: ${response.status}`);
    
    const data = await response.json();
    // Cache for next time
    await CacheService.cacheJson(url, data);
    return data;
  };

  let data;
  
  try {
    data = await fetchList(currentLanguage);
    
    // Fetch reference data for search and fallback
    if (!zhReferenceData) {
      try {
        zhReferenceData = await fetchList('zh_CN');
      } catch (e) {
        console.warn('Failed to fetch zh_CN reference data');
      }
    }
    if (!enReferenceData) {
      try {
        enReferenceData = await fetchList('en_US');
      } catch (e) {
        console.warn('Failed to fetch en_US reference data');
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch ${currentLanguage} data, falling back to zh_CN:`, err);
    if (currentLanguage !== 'zh_CN') {
      try {
        data = await fetchList('zh_CN');
        zhReferenceData = data;
      } catch (fallbackErr) {
        throw new Error(`Failed to fetch both ${currentLanguage} and zh_CN data.`);
      }
    } else {
      throw err;
    }
  }
  
  const episodes: StoryEpisode[] = [];
  
  for (const [key, value] of Object.entries(data)) {
    const obj = value as any;
    if (obj && obj.infoUnlockDatas && Array.isArray(obj.infoUnlockDatas)) {
      const chapters: StoryChapter[] = obj.infoUnlockDatas
        .filter((info: any) => info.storyTxt)
        .map((info: any) => ({
          id: info.storyId || 'unknown',
          code: info.storyCode || '',
          name: info.storyName || 'Unnamed Story',
          storyTxt: info.storyTxt,
          iconId: info.storyIconId || info.storyId,
          storyPic: info.storyPic
        }));
        
      if (chapters.length > 0) {
        // Use CN startTime as source of truth for "Arknights Age"
        const originalObj = (zhReferenceData && zhReferenceData[key]) || obj;
        const startTime = originalObj.startTime ? parseInt(originalObj.startTime) : 0;
        let year = getArknightsYear(startTime);
        
        // Fix for mainline chapters which often have -1 or 0 startTime
        if (obj.entryType === 'MAINLINE' || key.startsWith('main_')) {
          const match = key.match(/main_(\d+)/);
          if (match) {
            const ch = parseInt(match[1]);
            if (ch <= 6) year = 1;
            else if (ch <= 8) year = 2;
            else if (ch <= 10) year = 3;
            else if (ch === 11) year = 4;
            else if (ch <= 13) year = 5;
            else if (ch >= 14) year = 6;
          }
        }
        
        const chineseName = zhReferenceData && zhReferenceData[key] ? zhReferenceData[key].name : undefined;
        const englishName = enReferenceData && enReferenceData[key] ? enReferenceData[key].name : undefined;

        // If current language is English and name is Chinese, try to use englishName if it's different
        let displayName = obj.name || key;
        if (currentLanguage === 'en_US' && englishName && /[\u4e00-\u9fa5]/.test(displayName)) {
          if (!/[\u4e00-\u9fa5]/.test(englishName)) {
            displayName = englishName;
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

  cachedEpisodes[currentLanguage] = episodes;
  return episodes;
}

const scriptExistenceCache: Record<string, boolean> = {};

export async function checkScriptExists(storyPath: string, lang: Language, translator?: string): Promise<boolean> {
  const isOfficial = ['zh_CN', 'zh_TW', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);
  
  // For official languages, if it's in the story_review_table, the script almost certainly exists.
  // Skip the network request to save bandwidth and reduce the number of requests.
  if (isOfficial) {
    return true;
  }

  const cacheKey = `${lang}_${storyPath}_${translator || 'default'}`;
  if (cacheKey in scriptExistenceCache) {
    return scriptExistenceCache[cacheKey];
  }
  
  const extension = isOfficial ? 'txt' : 'csv';
  const translatorSuffix = translator && translator !== 'Community Translators' && translator !== 'Переводчики сообщества' ? `_${translator}` : '';
  const baseName = storyPath.split('/').pop();
  const url = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${lang}/${baseName}${translatorSuffix}.${extension}`;
  
  try {
    // Use HEAD to save bandwidth, fallback to GET if needed
    const response = await fetchWithTimeout(url, { method: 'HEAD' }, 3000);
    if (!response.ok) {
      scriptExistenceCache[cacheKey] = false;
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      // This is likely a SPA fallback (index.html)
      scriptExistenceCache[cacheKey] = false;
      return false;
    }
    
    scriptExistenceCache[cacheKey] = true;
    return true;
  } catch (e) {
    scriptExistenceCache[cacheKey] = false;
    return false;
  }
}

let currentStoryChapter = 'a001';

export async function fetchStoryScript(storyPath: string, langOverride?: Language, noFallback?: boolean, translator?: string): Promise<string> {
  // Extract chapter ID from path for music folder detection
  const parts = storyPath.split('/');
  for (const part of parts) {
    if (part.startsWith('act') || part === 'main' || part.startsWith('a00') || part.startsWith('guide')) {
      currentStoryChapter = part;
      break;
    }
  }
  
  const targetLang = langOverride || currentLanguage;
  
  const fetchScript = async (lang: Language) => {
    // For unofficial languages, we load from the zoot-data repository
    const isOfficial = ['zh_CN', 'zh_TW', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);
    
    if (isOfficial) {
      const baseUrl = getBaseUrl(lang);
      const url = `${baseUrl}/${lang}/gamedata/story/${storyPath}.txt`;
      
      // Check cache first
      const cached = await CacheService.getCachedText(url);
      if (cached) return cached;
      
      const response = await fetchWithTimeout(url);
      if (!response.ok) throw new Error(`Failed to fetch ${lang} story script: ${storyPath}`);
      
      const text = await response.text();
      const lowerText = text.trim().toLowerCase();
      if (lowerText.startsWith('<!doctype') || lowerText.startsWith('<html') || lowerText.startsWith('404:') || lowerText.startsWith('not found')) {
        throw new Error(`Failed to fetch ${lang} story script: ${storyPath} (Invalid content or Not Found)`);
      }
      
      // Cache for next time
      await CacheService.cacheText(url, text);
      return text;
    } else {
      // Unofficial language: fetch original (zh_CN) and apply CSV
      const originalScript = await fetchScript('zh_CN');
      
      if (translator === 'none') {
        return originalScript;
      }

      const registry = TRANSLATION_REGISTRY[lang];
      const defaultTranslator = (registry && registry.translators.length > 0) ? registry.translators[0] : undefined;
      const effectiveTranslator = translator || defaultTranslator;
      const translatorSuffix = effectiveTranslator && effectiveTranslator !== 'Community Translators' && effectiveTranslator !== 'Переводчики сообщества' ? `_${effectiveTranslator}` : '';
      const baseName = storyPath.split('/').pop();
      const csvUrl = `https://raw.githubusercontent.com/neponum/zoot-data/main/translation/${lang}/${baseName}${translatorSuffix}.csv`;
      
      let csvText = await CacheService.getCachedText(csvUrl);
      
      if (!csvText) {
        const response = await fetchWithTimeout(csvUrl);
        if (!response.ok) {
          // If CSV doesn't exist, just return the original script
          console.warn(`No CSV translation found for ${lang} at ${csvUrl}`);
          return originalScript;
        }
        csvText = await response.text();
        await CacheService.cacheText(csvUrl, csvText);
      }
      
      // Parse CSV and apply to originalScript
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const translations = parsed.data as any[];
      
      // Apply translations to originalScript lines
      const lines = originalScript.split(/\r?\n/);
      
      const translatedLines = lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('//') || trimmed.toUpperCase().startsWith('[HEADER')) {
          return line;
        }
        
        const match = line.match(/^(\s*(?:\[[^\]]*\]\s*)*)(.*)$/);
        if (match) {
          const prefix = match[1];
          const textToTranslate = match[2];
          
          const optionsMatch = prefix.match(/options="([^"]+)"/);
          
          if (textToTranslate.trim() === '' && !optionsMatch) {
            return line;
          }
          
          const id = `line-${index}`;
          
          // Find translation for this line
          const translationRow = translations.find(row => row['ID'] === id);
          if (translationRow && translationRow['Translation']) {
            let finalPrefix = prefix;
            
            // Handle character name translation
            let characterName = undefined;
            const nameMatch = prefix.match(/name="([^"]+)"/);
            if (nameMatch) {
              characterName = nameMatch[1];
              const charTranslationRow = translations.find(row => row['Original Text'] === characterName && row['ID']?.startsWith('char-'));
              if (charTranslationRow && charTranslationRow['Translation']) {
                finalPrefix = finalPrefix.replace(`name="${characterName}"`, `name="${charTranslationRow['Translation']}"`);
              }
            }

            // Handle decision options translation
            if (optionsMatch) {
              const options = optionsMatch[1];
              if (textToTranslate.trim() === '') {
                // If there's no dialogue text, the translation row itself is for the options
                finalPrefix = finalPrefix.replace(`options="${options}"`, `options="${translationRow['Translation']}"`);
                return finalPrefix;
              } else {
                // If there is dialogue text, we need to find a separate translation for options if it exists
                // In the current CSV format, options usually share the same row if text is empty, 
                // but if there is text, we might need to look for another row or handle it differently.
                // However, parseTranslationBlocks puts options in 'zh_CN' text if text is empty.
                // If both exist, we need to be careful.
                const optionsTranslationRow = translations.find(row => row['Original Text'] === options && row['ID']?.startsWith('line-'));
                if (optionsTranslationRow && optionsTranslationRow['Translation']) {
                  finalPrefix = finalPrefix.replace(`options="${options}"`, `options="${optionsTranslationRow['Translation']}"`);
                }
              }
            }
            
            return `${finalPrefix}${translationRow['Translation']}`;
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
      } catch (fallbackErr) {
        throw new Error(`Failed to fetch story script in both ${targetLang} and zh_CN.`);
      }
    } else {
      throw err;
    }
  }
}

export function parseStoryScript(script: string): StoryLine[] {
  const parser = new StoryParser(script);
  return parser.parse();
}

const CACHE_KEY = 'prts_wiki_image_cache';
const prtsWikiCache: Record<string, string | null> = (() => {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
})();

function saveCache() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(prtsWikiCache));
    }
  } catch (e) {
    console.warn('Failed to save PRTS Wiki cache to localStorage');
  }
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, retries - 1);
    }
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
}

/**
 * Checks if an image exists at the given URL
 */
export async function checkImageExists(url: string): Promise<boolean> {
  try {
    // Try HEAD first as it's faster
    const response = await fetchWithTimeout(url, { method: 'HEAD' }, 2000);
    if (response.ok) return true;
    
    // If HEAD failed with 405 (Method Not Allowed) or 403 (Forbidden), try a quick GET
    // Some servers block HEAD requests
    if (response.status === 405 || response.status === 403) {
      const getResponse = await fetchWithTimeout(url, { method: 'GET' }, 2000);
      return getResponse.ok;
    }
    return false;
  } catch (e) {
    return false;
  }
}


let characterDataPromise: Promise<Record<string, any>> | null = null;

export async function fetchCharacterData(): Promise<Record<string, any>> {
  if (characterDataPromise) return characterDataPromise;
  
  characterDataPromise = (async () => {
    try {
      console.log('Fetching character.json...');
      const response = await fetch('/character.json');
      if (!response.ok) throw new Error(`Failed to fetch character.json: ${response.status}`);
      const text = await response.text();
      console.log(`Loaded character.json, size: ${text.length} bytes`);
      const data = JSON.parse(text);
      return data;
    } catch (err) {
      console.error('Failed to fetch character data:', err);
      characterDataPromise = null; // Reset on failure so it can be retried
      return {};
    }
  })();

  return characterDataPromise;
}

export interface CharacterAssetInfo {
  bodyUrl: string;
  faceUrl?: string;
  faceRect?: { x: number; y: number; w: number; h: number };
  size?: { x: number; y: number };
}

/**
 * Retrieves detailed asset information for a character, including body and face URLs,
 * and positioning data from character.json.
 */
export async function getCharacterAssetInfo(name: string): Promise<CharacterAssetInfo> {
  const charData = await fetchCharacterData();
  
  let baseName = name;
  let expression = '';
  
  if (name.includes('#')) {
    [baseName, expression] = name.split('#');
  }

  const data = charData[baseName];
  let faceItem = null;
  if (data && expression) {
    // Improved matching: exact name, name with #, suffix match (e.g. "6" matches "char_002_amiya_6"), or alias
    faceItem = data.array?.find((item: any) => 
      item.name === expression || 
      item.name === `${baseName}#${expression}` ||
      item.name.endsWith(`_${expression}`) ||
      item.alias === expression
    );
    
    if (faceItem) {
      if (faceItem.group === -1 && faceItem.image) {
        const imagePath = faceItem.image.split('/').map(encodeURIComponent).join('/');
        return {
          bodyUrl: `https://torappu.prts.wiki/assets/avg/characters/${imagePath}.png`,
          size: data.size
        };
      }
      const group = data.groups?.[faceItem.group];
      if (group) {
        const bodyPath = group.base.split('/').map(encodeURIComponent).join('/');
        const facePath = faceItem.face.split('/').map(encodeURIComponent).join('/');
        return {
          bodyUrl: `https://torappu.prts.wiki/assets/avg/characters/${bodyPath}.png`,
          faceUrl: `https://torappu.prts.wiki/assets/avg/characters/${facePath}.png`,
          faceRect: group.faceRect,
          size: data.size
        };
      }
    }
  }

  if (data && !expression) {
    if (data.groups && data.groups.length > 0) {
      const group = data.groups[0];
      const bodyPath = group.base.split('/').map(encodeURIComponent).join('/');
      return {
        bodyUrl: `https://torappu.prts.wiki/assets/avg/characters/${bodyPath}.png`,
        size: data.size
      };
    } else if (data.array && data.array.length > 0) {
      const firstItem = data.array[0];
      if (firstItem.image) {
        const imagePath = firstItem.image.split('/').map(encodeURIComponent).join('/');
        return {
          bodyUrl: `https://torappu.prts.wiki/assets/avg/characters/${imagePath}.png`,
          size: data.size
        };
      }
    }
  }

  // Fallback: use baseName instead of full name to avoid # in URL
  if (expression && (!data || !faceItem)) {
    // Smart fallback for characters like Amiya: 
    // If baseName ends with _1 and expression is a number, try replacing _1 with _expression
    if (baseName.endsWith('_1') && /^\d+$/.test(expression)) {
      const guessedName = baseName.replace(/_1$/, `_${expression}`);
      
      // Try with original baseName as folder (e.g., char_002_amiya_1/char_002_amiya_6)
      const guessedPath = `${baseName}/${guessedName}`;
      const guessedUrl1 = await getImageUrl('character_body', guessedPath);
      if (await checkImageExists(guessedUrl1)) {
        return { bodyUrl: guessedUrl1, size: data?.size };
      }
      
      // Try with guessedName as folder (e.g., char_002_amiya_6/char_002_amiya_6)
      const guessedUrl2 = await getImageUrl('character_body', guessedName);
      if (await checkImageExists(guessedUrl2)) {
        return { bodyUrl: guessedUrl2, size: data?.size };
      }
    }
    
    // Try baseName_expression
    const suffixGuessedName = `${baseName}_${expression}`;
    const suffixGuessedUrl = await getImageUrl('character_body', suffixGuessedName);
    if (await checkImageExists(suffixGuessedUrl)) {
      return { bodyUrl: suffixGuessedUrl, size: data?.size };
    }
  }

  return {
    bodyUrl: await getImageUrl('character_body', baseName),
    size: data?.size
  };
}

const urlCache = new Map<string, string>();

const pendingUrlPromises = new Map<string, Promise<string>>();

export async function getImageUrl(type: 'background' | 'character' | 'image' | 'music' | 'sound' | 'voice' | 'character_body' | 'character_face', name: string): Promise<string> {
  const cacheKey = `${type}-${name}`;
  
  if (urlCache.has(cacheKey)) {
    const cachedUrl = urlCache.get(cacheKey)!;
    if (cachedUrl.startsWith('blob:')) {
      return cachedUrl;
    }
  }
  
  if (pendingUrlPromises.has(cacheKey)) {
    return pendingUrlPromises.get(cacheKey)!;
  }
  
  const promise = (async () => {
    let url = urlCache.get(cacheKey);
    if (!url) {
      url = await _getImageUrl(type, name);
    }
    
    // Check persistent cache for images/audio
    if (['background', 'character', 'image', 'music', 'sound', 'voice', 'character_body', 'character_face'].includes(type)) {
      const cachedBlobUrl = await CacheService.getCachedBlobUrl(url);
      if (cachedBlobUrl) return cachedBlobUrl;
    }
    
    return url;
  })();
  
  pendingUrlPromises.set(cacheKey, promise);
  const finalUrl = await promise;
  urlCache.set(cacheKey, finalUrl);
  pendingUrlPromises.delete(cacheKey);
  return finalUrl;
}

// Cache for resolved audio URLs to avoid repeated network checks
const resolvedAudioCache: Record<string, string> = {};

async function _getImageUrl(type: 'background' | 'character' | 'image' | 'music' | 'sound' | 'voice' | 'character_body' | 'character_face', name: string): Promise<string> {
  const cacheKey = `${type}:${name}`;
  if (resolvedAudioCache[cacheKey]) return resolvedAudioCache[cacheKey];

  switch (type) {
    case 'background':
      return `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(name)}.png`;
    case 'image':
      return `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(name)}.png`;
    case 'character': {
      // Fallback for character if not using body/face split
      const parts = name.split('/');
      const encodedPath = parts.map(encodeURIComponent).join('/');
      
      // If it's just a name, we assume it's in a folder with the same name
      if (parts.length === 1) {
        const baseNameMatch = name.match(/^([^#$]+)/);
        const baseName = baseNameMatch ? baseNameMatch[1] : name;
        return `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(name)}.png`;
      }
      
      return `https://torappu.prts.wiki/assets/avg/characters/${encodedPath}.png`;
    }
    case 'character_body': {
      const parts = name.split('/');
      const encodedPath = parts.map(encodeURIComponent).join('/');
      const baseName = parts[0].split('$')[0];
      
      let urlBase: string;
      if (parts.length > 1) {
        // If it already has a path, use it directly
        urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodedPath}.png`;
      } else {
        // Otherwise use the baseName as folder
        urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodedPath}.png`;
      }
      
      // If name already has suffix or path, use it
      if (name.includes('$') || parts.length > 1) return urlBase;
      
      // Try without $1 first
      if (await checkImageExists(urlBase)) return urlBase;
      
      // Try with $1 suffix
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(name + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;
      
      // Default to no-dollar if neither check passed or both failed
      return urlBase;
    }
    case 'character_face': {
      const [baseName, expression] = name.split('/');
      
      // 1. Try exact match (e.g., "1.png")
      const urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression)}.png`;
      if (await checkImageExists(urlBase)) return urlBase;
      
      // 2. Try with $1 suffix (e.g., "1$1.png")
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;
      
      // 3. Fallback to $1 suffix if neither exists
      return urlWithDollar;
    }
    case 'music': {
      const cleanAudioName = name.replace(/^\$/, '').toLowerCase();
      
      // 1. Check static audio map first (Highest priority)
      if ((audioMap.music as any)[cleanAudioName]) {
        return (audioMap.music as any)[cleanAudioName];
      }
      
      console.error(`Music file not found in audioMap: ${cleanAudioName}`);
      return '';
    }
    case 'sound': {
      const cleanAudioName = name.replace(/^\$/, '').toLowerCase();
      
      // 1. Check static audio map first
      if ((audioMap.sound as any)[cleanAudioName]) {
        return (audioMap.sound as any)[cleanAudioName];
      }
      
      console.error(`Sound file not found in audioMap: ${cleanAudioName}`);
      return '';
    }
    case 'voice': {
      const cleanAudioName = name.replace(/^\$/, '');
      return `https://torappu.prts.wiki/assets/audio/voice/${encodeURIComponent(cleanAudioName)}.mp3`;
    }
    default:
      return '';
  }
}

export async function preloadAssets(lines: StoryLine[], onProgress?: (loaded: number, total: number, currentFile?: string) => void): Promise<void> {
  const imageAssets = new Set<string>();
  const audioAssets = new Set<string>();

  // Resolve all URLs in parallel
  const resolutionPromises: Promise<void>[] = [];

  for (const line of lines) {
    if (line.assetName || (line.type === 'character' && line.assetName2)) {
      if (line.type === 'character') {
        const names = [line.assetName, line.assetName2].filter(Boolean) as string[];
        for (const name of names) {
          resolutionPromises.push(getCharacterAssetInfo(name).then(info => {
            if (info.bodyUrl) imageAssets.add(info.bodyUrl);
            if (info.faceUrl) imageAssets.add(info.faceUrl);
          }));
        }
      } else if (['background', 'image', 'imagetween', 'animtext'].includes(line.type)) {
        const type = (line.type === 'imagetween' || line.type === 'animtext') ? 'image' : line.type as any;
        if (line.assetName) {
          resolutionPromises.push(
            getImageUrl(type, line.assetName).then(url => { if (url) imageAssets.add(url); })
          );
        }
      } else if (['music', 'sound', 'voice'].includes(line.type)) {
        if (line.assetName) {
          resolutionPromises.push(
            getImageUrl(line.type as any, line.assetName).then(url => { if (url) audioAssets.add(url); })
          );
        }
      }
    }
  }

  await Promise.all(resolutionPromises);

  const imageUrls = Array.from(imageAssets);
  const audioUrls = Array.from(audioAssets);
  const total = imageUrls.length + audioUrls.length;
  let loaded = 0;

  const updateProgress = (url: string) => {
    loaded++;
    const fileName = url.split('/').pop() || url;
    if (onProgress) onProgress(loaded, total, fileName);
  };

  const loadAsset = async (url: string, type: 'image' | 'audio') => {
    const fileName = url.split('/').pop() || url;
    if (onProgress) onProgress(loaded, total, fileName);
    try {
      // Check if already in cache
      if (await CacheService.has(url)) {
        if (type === 'image') {
          const blobUrl = await CacheService.getCachedBlobUrl(url);
          if (blobUrl) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = resolve;
              img.onerror = resolve;
              img.src = blobUrl;
            });
          }
        }
        updateProgress(url);
        return;
      }

      const response = await fetchWithRetry(url, 3);
      if (response.ok) {
        const blob = await response.blob();
        await CacheService.cacheBlob(url, blob);
        
        // If it's an image, create an Image object to force the browser to decode it
        if (type === 'image') {
          const blobUrl = await CacheService.getCachedBlobUrl(url);
          if (blobUrl) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = resolve;
              img.onerror = resolve;
              img.src = blobUrl;
            });
          }
        }
      }
    } catch (err) {
      if (type === 'audio') {
        // Audio preloading often fails due to CORS on assets/ folder, but html5:true bypasses this during playback.
        console.info(`Audio preloading info: ${url} will be loaded on demand during playback.`);
      } else {
        console.warn(`Failed to preload/cache ${type}:`, url, err);
      }
    } finally {
      updateProgress(url);
    }
  };

  const allUrls = [...imageUrls.map(url => ({ url, type: 'image' as const })), ...audioUrls.map(url => ({ url, type: 'audio' as const }))];
  
  // Load in batches of 1
  const CONCURRENCY = 1;
  let i = 0;
  const executing = new Set<Promise<void>>();
  
  for (const item of allUrls) {
    const p = loadAsset(item.url, item.type).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= CONCURRENCY) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);

  // Small delay to ensure browser has settled
  await new Promise(resolve => setTimeout(resolve, 300));
}
