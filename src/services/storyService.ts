import { StoryChapter, StoryLine, StoryEpisode, Language } from '../types';
import audioMap from '../audio_map.json';
import imageMap from '../image_map.json';

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
          const key = this.eat(TokenType.IDENTIFIER).value;
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
          options: params.options ? params.options.split(';') : [],
          values: params.values ? params.values.split(';') : [],
          originalTag: original
        };
      case 'predicate':
        return {
          type: 'predicate',
          references: params.references ? params.references.split(';') : [],
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

let currentLanguage: Language = 'zh_CN';
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
}

export function getLanguage(): Language {
  return currentLanguage;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
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
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Failed to fetch ${lang} story review table: ${response.status}`);
    return await response.json();
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

export async function checkScriptExists(storyPath: string, lang: Language): Promise<boolean> {
  const isOfficial = ['zh_CN', 'zh_TW', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);
  
  // For official languages, if it's in the story_review_table, the script almost certainly exists.
  // Skip the network request to save bandwidth and reduce the number of requests.
  if (isOfficial) {
    return true;
  }

  const cacheKey = `${lang}_${storyPath}`;
  if (cacheKey in scriptExistenceCache) {
    return scriptExistenceCache[cacheKey];
  }
  
  const url = `/translations/${lang}/${storyPath}.txt`;
  
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

export async function fetchStoryScript(storyPath: string, langOverride?: Language, noFallback?: boolean): Promise<string> {
  const targetLang = langOverride || currentLanguage;
  
  const fetchScript = async (lang: Language) => {
    // For unofficial languages, we load from local public/translations folder
    const isOfficial = ['zh_CN', 'zh_TW', 'en_US', 'ja_JP', 'ko_KR'].includes(lang);
    
    let url;
    if (isOfficial) {
      const baseUrl = getBaseUrl(lang);
      url = `${baseUrl}/${lang}/gamedata/story/${storyPath}.txt`;
    } else {
      url = `/translations/${lang}/${storyPath}.txt`;
    }
    
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Failed to fetch ${lang} story script: ${storyPath}`);
    
    const text = await response.text();
    if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
      throw new Error(`Failed to fetch ${lang} story script: ${storyPath} (Returned HTML)`);
    }
    return text;
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
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
    const response = await fetchWithTimeout(url, { method: 'HEAD' }, 3000);
    return response.ok;
  } catch (e) {
    return false;
  }
}

export async function getPrtsWikiImageUrl(episodeName: string, episodeId?: string, chineseName?: string): Promise<string | null> {
  // PRTS Wiki image fetching has been disabled to reduce proxy requests
  return null;
}

const urlCache = new Map<string, string>();

function generateNamesToTry(name: string): string[] {
  const baseNames = [name];
  if (name.startsWith('$')) {
    baseNames.push(name.substring(1));
  }
  
  const namesToTry: string[] = [];
  baseNames.forEach(n => {
    namesToTry.push(n);
    // Try common prefixes used in game files
    if (!n.startsWith('m_') && !n.startsWith('d_') && !n.startsWith('p_')) {
      namesToTry.push(`m_${n}`);
      namesToTry.push(`m_bat_${n}`);
      namesToTry.push(`m_avg_${n}`);
      namesToTry.push(`m_sys_${n}`);
      namesToTry.push(`m_dia_${n}`);
      namesToTry.push(`d_${n}`);
      namesToTry.push(`d_gen_${n}`);
      namesToTry.push(`d_avg_${n}`);
      namesToTry.push(`d_bat_${n}`);
      namesToTry.push(`d_sys_${n}`);
      namesToTry.push(`d_dia_${n}`);
      namesToTry.push(`p_skill_${n}`);
    }
    if (!n.startsWith('bgm_')) namesToTry.push(`bgm_${n}`);
  });

  // Add variations for '_loop'
  const finalNames: string[] = [];
  namesToTry.forEach(n => {
    finalNames.push(n);
    if (n.endsWith('_loop')) {
      finalNames.push(n.replace('_loop', ''));
    } else {
      finalNames.push(`${n}_loop`);
    }
  });
  
  // Add story specific prefixes if not present
  const storyNames: string[] = [];
  finalNames.forEach(n => {
    storyNames.push(n);
    if (!n.startsWith('story_pic_')) storyNames.push(`story_pic_${n}`);
    if (!n.startsWith('story_icon_')) storyNames.push(`story_icon_${n}`);
    if (!n.startsWith('story_entry_')) storyNames.push(`story_entry_${n}`);
  });

  return Array.from(new Set([
    ...storyNames,
    ...storyNames.map(n => n.toLowerCase())
  ]));
}

export async function getImageUrl(type: 'background' | 'character' | 'image' | 'music' | 'sound' | 'voice', name: string): Promise<string> {
  const cacheKey = `${type}-${name}`;
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey)!;
  }
  
  const url = await _getImageUrl(type, name);
  urlCache.set(cacheKey, url);
  return url;
}

let imageMapKeys: string[] | null = null;
let audioMapKeys: string[] | null = null;

async function _getImageUrl(type: 'background' | 'character' | 'image' | 'music' | 'sound' | 'voice', name: string): Promise<string> {
  const allNames = generateNamesToTry(name);
  
  switch (type) {
    case 'background':
    case 'character':
    case 'image': {
      // Special handling for black background which is very common
      if (name.toLowerCase() === 'black' || name.toLowerCase() === 'bg_black') {
        return 'https://cdn.jsdelivr.net/gh/akgcc/arkdata@main/assets/torappu/dynamicassets/avg/backgrounds/bg_black.png';
      }

      for (const n of allNames) {
        if ((imageMap as any)[n]) {
          return (imageMap as any)[n];
        }
        // For characters, try common suffixes if not already present
        if (type === 'character') {
          if (!n.includes('#') && (imageMap as any)[`${n}#1$1`]) {
            return (imageMap as any)[`${n}#1$1`];
          }
          if (!n.includes('$') && (imageMap as any)[`${n}$1`]) {
            return (imageMap as any)[`${n}$1`];
          }
        }
      }
      
      if (!imageMapKeys) imageMapKeys = Object.keys(imageMap);
      const fuzzyMatch = imageMapKeys.find(k => k.includes(name));
      if (fuzzyMatch) return (imageMap as any)[fuzzyMatch];

      // Fallback for new assets not in the map
      if (type === 'character') {
        let finalName = name;
        // Try common suffixes if not already present
        if (!finalName.includes('#')) {
          finalName += '#1$1';
        } else if (!finalName.includes('$')) {
          finalName += '$1';
        }
        const encodedName = encodeURIComponent(finalName);
        return `https://cdn.jsdelivr.net/gh/akgcc/arkdata@main/assets/avg/characters/${encodedName}.png`;
      }
      
      if (type === 'background' || name.startsWith('bg_')) {
        return `https://cdn.jsdelivr.net/gh/akgcc/arkdata@main/assets/torappu/dynamicassets/avg/backgrounds/${name}.png`;
      }
      
      // Try torappu images path as well
      if (name.startsWith('story_pic_') || name.startsWith('story_icon_') || name.startsWith('pic_')) {
        return `https://cdn.jsdelivr.net/gh/akgcc/arkdata@main/assets/torappu/dynamicassets/avg/images/${name}.png`;
      }
      
      // Try story review entry pics
      const lowerName = name.toLowerCase();
      if (lowerName.startsWith('storyentrypic_') || lowerName.startsWith('story_entry_') || lowerName.includes('main_') || lowerName.includes('act') || lowerName.includes('mini_')) {
        let cleanName = lowerName.replace('story_entry_', 'storyentrypic_');
        if (!cleanName.startsWith('storyentrypic_')) {
          cleanName = `storyentrypic_${cleanName}`;
        }

        let hub = 'mini';
        if (cleanName.includes('_main_') || cleanName.includes('main_')) hub = 'main';
        else if (cleanName.includes('_char_') || cleanName.includes('char_')) hub = 'none';
        else if (cleanName.includes('_act') || cleanName.includes('act')) hub = 'activity';
        
        // Try Aceship first as it's often more complete for these specific UI assets
        return `https://cdn.jsdelivr.net/gh/Aceship/Arknights-Bot-Assets@master/arts/ui/storyreview/hubs/${hub}/storyentrypic/${cleanName}.png`;
      }

      // Fallback for character avatars (useful for Operator Records)
      if (name.startsWith('char_')) {
        const charId = name.replace('story_entry_', '');
        return `https://cdn.jsdelivr.net/gh/Aceship/Arknights-Bot-Assets@master/avatar/${charId}.png`;
      }

      // Generic fallback for other images
      return `https://cdn.jsdelivr.net/gh/akgcc/arkdata@main/assets/avg/images/${name}.png`;
    }
    case 'music':
    case 'sound':
    case 'voice': {
      for (const n of allNames) {
        if ((audioMap as any)[n]) {
          return (audioMap as any)[n];
        }
      }

      // Fuzzy search fallback
      const cleanName = name.replace('$', '').replace('_loop', '');
      if (!audioMapKeys) audioMapKeys = Object.keys(audioMap);
      const fuzzyMatch = audioMapKeys.find(k => k.includes(cleanName));
      if (fuzzyMatch) return (audioMap as any)[fuzzyMatch];
      
      return '';
    }
    default:
      return '';
  }
}

export async function preloadAssets(lines: StoryLine[], onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const imageAssets = new Set<string>();
  const audioAssets = new Set<string>();

  // Resolve all URLs in parallel
  const resolutionPromises: Promise<void>[] = [];

  for (const line of lines) {
    if (line.assetName || (line.type === 'character' && line.assetName2)) {
      if (['background', 'character', 'image'].includes(line.type)) {
        if (line.assetName) {
          resolutionPromises.push(
            getImageUrl(line.type as any, line.assetName).then(url => { if (url) imageAssets.add(url); })
          );
        }
        if (line.type === 'character' && line.assetName2) {
          resolutionPromises.push(
            getImageUrl('character', line.assetName2).then(url => { if (url) imageAssets.add(url); })
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

  const updateProgress = () => {
    loaded++;
    if (onProgress) onProgress(loaded, total);
  };

  const createImagePromise = (url: string) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { updateProgress(); resolve(null); };
    img.onerror = () => { updateProgress(); resolve(null); };
    img.src = url;
    // Add a timeout for image loading to prevent hanging
    setTimeout(() => { resolve(null); }, 10000);
  });

  const createAudioPromise = (url: string) => new Promise((resolve) => {
    const audio = new Audio();
    audio.oncanplaythrough = () => { updateProgress(); resolve(null); };
    audio.onerror = () => { updateProgress(); resolve(null); };
    audio.src = url;
    audio.load();
    // Don't wait forever for audio
    setTimeout(() => { resolve(null); }, 5000);
  });

  // Preload everything in parallel with a concurrency limit
  const allUrls = [...imageUrls.map(url => ({ url, type: 'image' })), ...audioUrls.map(url => ({ url, type: 'audio' }))];
  
  const CONCURRENCY = 6;
  for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
    const batch = allUrls.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map(item => 
      item.type === 'image' ? createImagePromise(item.url) : createAudioPromise(item.url)
    ));
  }
}
