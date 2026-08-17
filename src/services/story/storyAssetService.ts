import { StoryLine } from '../../types';
import { CacheService } from '../cacheService';
import { 
  CharacterAssetInfo, 
  CharacterDataMap, 
  CharacterFaceItem, 
  CharacterEntry 
} from './storyTypes';

export let activeAudioMusic: Record<string, string> = { 
  'tense_intro': 'https://torappu.prts.wiki/assets/audio/music/beta2_180603/m_dia_escape_intro.mp3',
  'tense_loop': 'https://torappu.prts.wiki/assets/audio/music/beta2_180603/m_dia_escape_loop.mp3'
};

export let activeAudioSound: Record<string, string> = { 
  'd_avg_stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  's_d_avg_stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  'stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3'
};

let audioMapsPromise: Promise<void> | null = null;

export async function fetchLatestAudioMaps(): Promise<void> {
  if (audioMapsPromise) return audioMapsPromise;

  audioMapsPromise = (async () => {
    let musicLoadedSuccessfully = false;
    let soundLoadedSuccessfully = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

      const musicUrl = 'https://raw.githubusercontent.com/neponum/zoot-data/main/audio_music.json';
      const soundUrl = 'https://raw.githubusercontent.com/neponum/zoot-data/main/audio_sound.json';

      const fetchWithFallback = async (rawUrl: string) => {
        try {
          const directRes = await fetch(rawUrl, { signal: controller.signal });
          if (directRes.ok) return directRes;
        } catch {
          // fallback
        }
        return fetch(`/api/proxy?url=${encodeURIComponent(rawUrl)}`, { signal: controller.signal }).catch(() => null);
      };

      const [musicRes, soundRes] = await Promise.all([
        fetchWithFallback(musicUrl),
        fetchWithFallback(soundUrl)
      ]);

      clearTimeout(timeoutId);

      if (musicRes && musicRes.ok) {
        try {
          const musicData = (await musicRes.json()) as Record<string, string>;
          if (musicData && typeof musicData === 'object') {
            activeAudioMusic = { ...activeAudioMusic, ...musicData };
            musicLoadedSuccessfully = true;
          }
        } catch {
          // fallback to dynamic import below
        }
      }
      
      if (soundRes && soundRes.ok) {
        try {
          const soundData = (await soundRes.json()) as Record<string, string>;
          if (soundData && typeof soundData === 'object') {
            activeAudioSound = { ...activeAudioSound, ...soundData };
            soundLoadedSuccessfully = true;
          }
        } catch {
          // fallback to dynamic import below
        }
      }
    } catch {
      // Use dynamic imports below
    }

    // Lazy load the local JSONs ONLY if GitHub CDN and proxy failed to load them
    if (!musicLoadedSuccessfully) {
      try {
        const localMusic = await import('../../data/audio_music.json').then(m => m.default || m);
        activeAudioMusic = { ...localMusic, ...activeAudioMusic };
      } catch (err) {
        console.warn('Failed to dynamically load local audio_music.json:', err);
      }
    }

    if (!soundLoadedSuccessfully) {
      try {
        const localSound = await import('../../data/audio_sound.json').then(m => m.default || m);
        activeAudioSound = { ...localSound, ...activeAudioSound };
      } catch (err) {
        console.warn('Failed to dynamically load local audio_sound.json:', err);
      }
    }
  })();

  return audioMapsPromise;
}

if (typeof window !== 'undefined') {
  fetchLatestAudioMaps().catch(() => {});
}

export function cleanAndUnwrapUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let url = rawUrl;
  // If url contains nested weserv.nl proxies or /api/proxy, unwrap recursively to original raw URL
  let depth = 0;
  while (depth < 10 && (url.includes('images.weserv.nl') || url.includes('/api/proxy?url='))) {
    depth++;
    const weservMatch = url.match(/images\.weserv\.nl\/\?url=([^&]+)/i);
    if (weservMatch && weservMatch[1]) {
      try {
        url = decodeURIComponent(weservMatch[1]);
        continue;
      } catch {
        break;
      }
    }
    const proxyMatch = url.match(/\/api\/proxy\?url=([^&]+)/i);
    if (proxyMatch && proxyMatch[1]) {
      try {
        url = decodeURIComponent(proxyMatch[1]);
        continue;
      } catch {
        break;
      }
    }
    break;
  }
  return url;
}

export function wrapUrlWithProxy(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) return rawUrl;
  
  // If it's a relative local asset (not proxy endpoint)
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('/api/proxy')) return rawUrl;

  const url = cleanAndUnwrapUrl(rawUrl);

  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/') && !url.startsWith('/api/proxy')) return url;
  if (url.includes('raw.githubusercontent.com') || url.includes('github.com')) return url;

  if (
    url.includes('torappu.prts.wiki') ||
    url.includes('prts.wiki') ||
    url.includes('banyat.com')
  ) {
    // For images, route through images.weserv.nl (free Cloudflare CDN image proxy - zero Vercel bandwidth)
    if (
      /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || 
      url.includes('/assets/avg/characters/') ||
      url.includes('/assets/avg/background/') ||
      url.includes('/assets/avg/images/') ||
      url.includes('/assets/char_arts/')
    ) {
      return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
    }
    // For audio files or other media, return direct URL (browsers play cross-origin audio natively)
    return url;
  }
  return url;
}

let cachedCharacterData: CharacterDataMap | null = null;
let characterDataPromise: Promise<CharacterDataMap> | null = null;

/**
 * Robust fetcher for character asset definitions with guaranteed local fallback
 * to eliminate JSON parse stream termination warnings.
 */
export async function fetchCharacterData(): Promise<CharacterDataMap> {
  if (cachedCharacterData && Object.keys(cachedCharacterData).length > 0) {
    return cachedCharacterData;
  }

  if (characterDataPromise) return characterDataPromise;

  characterDataPromise = (async (): Promise<CharacterDataMap> => {
    // 1. First check free GitHub Raw CDN (0 Vercel Bandwidth cost, cached, ultra-fast)
    const githubUrls = [
      'https://raw.githubusercontent.com/neponum/zoot-data/main/character.json',
      'https://raw.githubusercontent.com/neponum/Zoot-Archive/main/public/character.json'
    ];

    for (const githubUrl of githubUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const response = await fetch(githubUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
          const text = await response.text();
          const trimmed = text.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const parsed = JSON.parse(trimmed) as CharacterDataMap;
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              cachedCharacterData = parsed;
              return parsed;
            }
          }
        }
      } catch {
        // Continue to next URL
      }
    }

    // 2. Secondary: fetch from wiki proxy with size & termination validation (0 Vercel static asset cost)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const wikiUrl = 'https://torappu.prts.wiki/assets/avg/character.json';
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(wikiUrl)}`;

      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed) as CharacterDataMap;
          if (parsed && typeof parsed === 'object') {
            cachedCharacterData = parsed;
            return parsed;
          }
        }
      }
    } catch {
      // Continue to local fallback if all else fails
    }

    // 3. Ultimate Fallback: check local bundled /character.json (reliable fallback, but costs Vercel bandwidth)
    try {
      const localResponse = await fetch('/character.json');
      if (localResponse.ok) {
        const localData = (await localResponse.json()) as CharacterDataMap;
        if (localData && typeof localData === 'object' && Object.keys(localData).length > 0) {
          cachedCharacterData = localData;
          return localData;
        }
      }
    } catch {
      // Silently fall back to empty map if all fail
    }

    cachedCharacterData = {};
    return cachedCharacterData;
  })();

  return characterDataPromise;
}

export async function getCharacterAssetInfo(name: string): Promise<CharacterAssetInfo> {
  const charData = await fetchCharacterData();
  
  let baseName = name;
  let expression = '';
  
  if (name.includes('#')) {
    [baseName, expression] = name.split('#');
  }

  const data: CharacterEntry | undefined = charData[baseName];
  let faceItem: CharacterFaceItem | undefined = undefined;

  if (data && expression) {
    faceItem = data.array?.find((item: CharacterFaceItem) => 
      item.name === expression || 
      item.name === `${baseName}#${expression}` ||
      item.name.endsWith(`_${expression}`) ||
      item.alias === expression
    );
    
    if (faceItem) {
      if (faceItem.group === -1 && faceItem.image) {
        const imagePath = faceItem.image.split('/').map(encodeURIComponent).join('/');
        const rawBodyUrl = `https://torappu.prts.wiki/assets/avg/characters/${imagePath}.png`;
        const cachedUrl = await CacheService.getCachedBlobUrl(rawBodyUrl);
        return {
          bodyUrl: cachedUrl || wrapUrlWithProxy(rawBodyUrl),
          size: data.size,
          pos: data.pos
        };
      }
      const group = (data as { groups?: Array<{ base: string; faceRect?: { x: number; y: number; w: number; h: number } }> }).groups?.[faceItem.group ?? 0];
      if (group && faceItem.image) {
        const bodyPath = group.base.split('/').map(encodeURIComponent).join('/');
        const facePath = faceItem.image.split('/').map(encodeURIComponent).join('/');
        const rawBodyUrl = `https://torappu.prts.wiki/assets/avg/characters/${bodyPath}.png`;
        const rawFaceUrl = `https://torappu.prts.wiki/assets/avg/characters/${facePath}.png`;
        const cachedBody = await CacheService.getCachedBlobUrl(rawBodyUrl);
        const cachedFace = await CacheService.getCachedBlobUrl(rawFaceUrl);
        return {
          bodyUrl: cachedBody || wrapUrlWithProxy(rawBodyUrl),
          faceUrl: cachedFace || wrapUrlWithProxy(rawFaceUrl),
          faceRect: group.faceRect,
          size: data.size,
          pos: data.pos
        };
      }
    }
  }

  if (data && !expression) {
    const groupList = (data as { groups?: Array<{ base: string }> }).groups;
    if (groupList && groupList.length > 0) {
      const group = groupList[0];
      const bodyPath = group.base.split('/').map(encodeURIComponent).join('/');
      const rawBodyUrl = `https://torappu.prts.wiki/assets/avg/characters/${bodyPath}.png`;
      const cachedUrl = await CacheService.getCachedBlobUrl(rawBodyUrl);
      return {
        bodyUrl: cachedUrl || wrapUrlWithProxy(rawBodyUrl),
        size: data.size,
        pos: data.pos
      };
    } else if (data.array && data.array.length > 0) {
      const firstItem = data.array[0];
      if (firstItem.image) {
        const imagePath = firstItem.image.split('/').map(encodeURIComponent).join('/');
        const rawBodyUrl = `https://torappu.prts.wiki/assets/avg/characters/${imagePath}.png`;
        const cachedUrl = await CacheService.getCachedBlobUrl(rawBodyUrl);
        return {
          bodyUrl: cachedUrl || wrapUrlWithProxy(rawBodyUrl),
          size: data.size,
          pos: data.pos
        };
      }
    }
  }

  // Fallback: use baseName instead of full name to avoid # in URL
  if (expression && (!data || !faceItem)) {
    if (baseName.endsWith('_1') && /^\d+$/.test(expression)) {
      const guessedName = baseName.replace(/_1$/, `_${expression}`);
      
      const guessedPath = `${baseName}/${guessedName}`;
      const guessedUrl1 = await getImageUrl('character_body', guessedPath);
      if (await checkImageExists(guessedUrl1)) {
        return { bodyUrl: wrapUrlWithProxy(guessedUrl1), size: data?.size, pos: data?.pos };
      }
      
      const guessedUrl2 = await getImageUrl('character_body', guessedName);
      if (await checkImageExists(guessedUrl2)) {
        return { bodyUrl: wrapUrlWithProxy(guessedUrl2), size: data?.size, pos: data?.pos };
      }
    }
    
    const suffixGuessedName = `${baseName}_${expression}`;
    const suffixGuessedUrl = await getImageUrl('character_body', suffixGuessedName);
    if (await checkImageExists(suffixGuessedUrl)) {
      return { bodyUrl: wrapUrlWithProxy(suffixGuessedUrl), size: data?.size };
    }
  }

  const fallbackBodyUrl = await getImageUrl('character_body', baseName);
  const cachedFallback = await CacheService.getCachedBlobUrl(fallbackBodyUrl);
  return {
    bodyUrl: cachedFallback || wrapUrlWithProxy(fallbackBodyUrl),
    size: data?.size
  };
}

const urlCache = new Map<string, string>();
const pendingUrlPromises = new Map<string, Promise<string>>();

export function clearUrlCache(): void {
  urlCache.clear();
  pendingUrlPromises.clear();
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  try {
    const response = await fetchWithTimeout(url, {}, 30000);
    if (!response.ok && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, retries - 1);
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
}

export async function checkImageExists(url: string): Promise<boolean> {
  try {
    const targetUrl = wrapUrlWithProxy(url);
    const response = await fetchWithTimeout(targetUrl, { method: 'GET' }, 3000);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        return false;
      }
      return true;
    }

    if (targetUrl !== url) {
      const directResponse = await fetchWithTimeout(url, { method: 'GET' }, 2000);
      if (directResponse.ok) {
        const contentType = directResponse.headers.get('content-type');
        return !(contentType && contentType.includes('text/html'));
      }
    }
    return false;
  } catch {
    try {
      if (!url.startsWith('/api/proxy')) {
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(proxiedUrl, { method: 'GET' }, 2500);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          return !(contentType && contentType.includes('text/html'));
        }
      }
    } catch {
      return false;
    }
    return false;
  }
}

export type AssetType = 'background' | 'character' | 'image' | 'music' | 'sound' | 'voice' | 'character_body' | 'character_face';

export async function getImageUrl(type: AssetType, name: string): Promise<string> {
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
      url = await resolveAssetUrl(type, name);
    }
    
    const cachedBlobUrl = await CacheService.getCachedBlobUrl(url);
    if (cachedBlobUrl) return cachedBlobUrl;
    
    return wrapUrlWithProxy(url);
  })();
  
  pendingUrlPromises.set(cacheKey, promise);
  const finalUrl = await promise;
  urlCache.set(cacheKey, finalUrl);
  pendingUrlPromises.delete(cacheKey);
  return finalUrl;
}

const resolvedAudioCache: Record<string, string> = {};

async function resolveAssetUrl(type: AssetType, name: string): Promise<string> {
  const cacheKey = `${type}:${name}`;
  if (resolvedAudioCache[cacheKey]) return resolvedAudioCache[cacheKey];

  switch (type) {
    case 'background': {
      const cleanName = name.trim();
      const urlBase = `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(cleanName)}.png`;
      if (await checkImageExists(urlBase)) return urlBase;

      const lowerName = cleanName.toLowerCase();
      if (lowerName !== cleanName) {
        const urlLower = `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerName)}.png`;
        if (await checkImageExists(urlLower)) return urlLower;
      }

      if (!cleanName.toLowerCase().startsWith('bg_')) {
        const urlWithBg = `https://torappu.prts.wiki/assets/avg/background/bg_${encodeURIComponent(cleanName)}.png`;
        if (await checkImageExists(urlWithBg)) return urlWithBg;
        const urlWithBgLower = `https://torappu.prts.wiki/assets/avg/background/bg_${encodeURIComponent(lowerName)}.png`;
        if (await checkImageExists(urlWithBgLower)) return urlWithBgLower;
      } else {
        const noBgName = cleanName.replace(/^bg_/i, '');
        const urlNoBg = `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noBgName)}.png`;
        if (await checkImageExists(urlNoBg)) return urlNoBg;
        const urlNoBgLower = `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noBgName.toLowerCase())}.png`;
        if (await checkImageExists(urlNoBgLower)) return urlNoBgLower;
      }

      const urlImages = `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(cleanName)}.png`;
      if (await checkImageExists(urlImages)) return urlImages;
      const urlImagesLower = `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerName)}.png`;
      if (await checkImageExists(urlImagesLower)) return urlImagesLower;

      return lowerName !== cleanName ? `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerName)}.png` : urlBase;
    }
    case 'image': {
      const cleanName = name.trim();
      const urlBase = `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(cleanName)}.png`;
      if (await checkImageExists(urlBase)) return urlBase;

      const lowerName = cleanName.toLowerCase();
      if (lowerName !== cleanName) {
        const urlLower = `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerName)}.png`;
        if (await checkImageExists(urlLower)) return urlLower;
      }

      const urlBg = `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(cleanName)}.png`;
      if (await checkImageExists(urlBg)) return urlBg;
      const urlBgLower = `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerName)}.png`;
      if (await checkImageExists(urlBgLower)) return urlBgLower;

      return urlBase;
    }
    case 'character': {
      const parts = name.split('/');
      const encodedPath = parts.map(encodeURIComponent).join('/');
      
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
        urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodedPath}.png`;
      } else {
        urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodedPath}.png`;
      }
      
      if (name.includes('$') || parts.length > 1) return urlBase;
      
      if (await checkImageExists(urlBase)) return urlBase;
      
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(name + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;
      
      return urlBase;
    }
    case 'character_face': {
      const [baseName, expression] = name.split('/');
      
      const urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression)}.png`;
      if (await checkImageExists(urlBase)) return urlBase;
      
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;
      
      return urlWithDollar;
    }
    case 'music': {
      const cleanAudioName = name.replace(/^\$/, '').toLowerCase();
      
      if (cleanAudioName in activeAudioMusic) {
        return activeAudioMusic[cleanAudioName];
      }
      
      const baseNames = [cleanAudioName];
      if (cleanAudioName.startsWith('m_')) {
        baseNames.push(cleanAudioName.substring(2));
      } else {
        baseNames.push(`m_${cleanAudioName}`);
        baseNames.push(`m_avg_${cleanAudioName}`);
        baseNames.push(`m_sys_${cleanAudioName}`);
        baseNames.push(`m_bat_${cleanAudioName}`);
      }
      
      const folders = ['music/avg', 'music', 'avg', 'battle', 'general', 'player'];
      const candidates: string[] = [];
      for (const bName of baseNames) {
        for (const folder of folders) {
          candidates.push(`https://torappu.prts.wiki/assets/audio/${folder}/${bName}.mp3`);
        }
      }
      
      const checkResults = await Promise.all(
        candidates.map(async (url) => {
          const exists = await checkImageExists(url);
          return { url, exists };
        })
      );
      
      const found = checkResults.find(r => r.exists);
      if (found) {
        activeAudioMusic[cleanAudioName] = found.url;
        return found.url;
      }
      
      activeAudioMusic[cleanAudioName] = '';
      return '';
    }
    case 'sound': {
      const cleanAudioName = name.replace(/^\$/, '').toLowerCase();
      
      if (cleanAudioName in activeAudioSound) {
        return activeAudioSound[cleanAudioName];
      }
      
      const baseNames = [cleanAudioName];
      if (cleanAudioName.startsWith('s_')) {
        baseNames.push(cleanAudioName.substring(2));
      } else {
        baseNames.push(`s_${cleanAudioName}`);
      }
      
      const folders = ['sound/avg', 'sound', 'avg', 'battle', 'general', 'ambience', 'music', 'player'];
      const candidates: string[] = [];
      for (const bName of baseNames) {
        for (const folder of folders) {
          candidates.push(`https://torappu.prts.wiki/assets/audio/${folder}/${bName}.mp3`);
        }
      }
      
      const checkResults = await Promise.all(
        candidates.map(async (url) => {
          const exists = await checkImageExists(url);
          return { url, exists };
        })
      );
      
      const found = checkResults.find(r => r.exists);
      if (found) {
        activeAudioSound[cleanAudioName] = found.url;
        return found.url;
      }
      
      activeAudioSound[cleanAudioName] = '';
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

let preloadedImages: HTMLImageElement[] = [];
let preloadedAudio: HTMLAudioElement[] = [];

export function clearPreloadedImages(): void {
  preloadedImages = [];
  preloadedAudio = [];
  CacheService.revokeBlobUrls();
  clearUrlCache();
}

export function extractFileName(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    let url = rawUrl;
    if (url.includes('?url=') || url.includes('&url=')) {
      const match = url.match(/[?&]url=([^&]+)/);
      if (match && match[1]) {
        url = decodeURIComponent(match[1]);
      }
    }
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    const lastPart = parts.filter(Boolean).pop();
    if (lastPart) {
      return decodeURIComponent(lastPart);
    }
  } catch {
    // fallback
  }
  return rawUrl.split('/').pop() || rawUrl;
}

export async function preloadAssets(
  lines: StoryLine[], 
  onProgress?: (loaded: number, total: number, currentFile?: string) => void
): Promise<void> {
  await fetchLatestAudioMaps().catch(() => {});

  const imageAssets = new Set<string>();
  const audioAssets = new Set<string>();
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
      } else if (line.type === 'charactercutin' || line.type === 'characteraction') {
        if (line.assetName) {
          resolutionPromises.push(getCharacterAssetInfo(line.assetName).then(info => {
            if (info.bodyUrl) imageAssets.add(info.bodyUrl);
            if (info.faceUrl) imageAssets.add(info.faceUrl);
          }));
        }
      } else if (['background', 'image', 'imagetween', 'animtext'].includes(line.type)) {
        const type: AssetType = (line.type === 'imagetween' || line.type === 'animtext') ? 'image' : (line.type as AssetType);
        if (line.assetName) {
          resolutionPromises.push(
            getImageUrl(type, line.assetName).then(url => { if (url) imageAssets.add(url); })
          );
        }
      } else if (['music', 'sound', 'voice'].includes(line.type)) {
        if (line.assetName) {
          resolutionPromises.push(
            getImageUrl(line.type as AssetType, line.assetName).then(url => { if (url) audioAssets.add(url); })
          );
        }
        if (line.introAssetName) {
          resolutionPromises.push(
            getImageUrl(line.type as AssetType, line.introAssetName).then(url => { if (url) audioAssets.add(url); })
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
    const fileName = extractFileName(url);
    if (onProgress) onProgress(loaded, total, fileName);
  };

  const loadAsset = async (url: string, type: 'image' | 'audio') => {
    const fileName = extractFileName(url);
    if (onProgress) onProgress(loaded, total, fileName);
    try {
      const cachedBlobUrl = await CacheService.getCachedBlobUrl(url).catch(() => null);
      if (cachedBlobUrl) {
        if (type === 'image') {
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = cachedBlobUrl;
            preloadedImages.push(img);
          });
        } else if (type === 'audio') {
          await new Promise<void>((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => resolve();
            audio.src = cachedBlobUrl;
            audio.load();
            preloadedAudio.push(audio);
          });
        }
        updateProgress(url);
        return;
      }

      const response = await fetchWithRetry(url, 3);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('Fetched response is an HTML page, not binary asset');
        }
        const blob = await response.blob();
        await CacheService.cacheBlob(url, blob);
        
        if (type === 'image') {
          const blobUrl = await CacheService.getCachedBlobUrl(url);
          if (blobUrl) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = resolve;
              img.onerror = resolve;
              img.src = blobUrl;
              preloadedImages.push(img);
            });
          }
        } else if (type === 'audio') {
          const blobUrl = await CacheService.getCachedBlobUrl(url);
          if (blobUrl) {
            await new Promise<void>((resolve) => {
              const audio = new Audio();
              audio.preload = 'auto';
              audio.oncanplaythrough = () => resolve();
              audio.onerror = () => resolve();
              audio.src = blobUrl;
              audio.load();
              preloadedAudio.push(audio);
            });
          }
        }
      }
    } catch {
      if (type === 'audio') {
        try {
          await new Promise<void>((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => resolve();
            audio.src = url;
            audio.load();
            preloadedAudio.push(audio);
          });
        } catch {
          // Ignore fallback errors
        }
      }
    } finally {
      updateProgress(url);
    }
  };

  const allUrls = [
    ...imageUrls.map(url => ({ url, type: 'image' as const })), 
    ...audioUrls.map(url => ({ url, type: 'audio' as const }))
  ];
  
  const CONCURRENCY = 5;
  const executing = new Set<Promise<void>>();
  
  for (const item of allUrls) {
    const p = loadAsset(item.url, item.type).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= CONCURRENCY) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  await new Promise(resolve => setTimeout(resolve, 300));
}
