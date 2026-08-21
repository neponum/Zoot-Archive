import { StoryLine } from '../../types';
import { CacheService } from '../cacheService';
import { 
  CharacterAssetInfo, 
  CharacterDataMap, 
  CharacterFaceItem, 
  CharacterEntry 
} from './storyTypes';
import localAudioMusic from '../../data/audio_music.json';
import localAudioSound from '../../data/audio_sound.json';

const rawMusicMap = (localAudioMusic as any).default || localAudioMusic;
export let activeAudioMusic: Record<string, string> = { 
  'tense_intro': 'https://torappu.prts.wiki/assets/audio/music/beta2_180603/m_dia_escape_intro.mp3',
  'tense_loop': 'https://torappu.prts.wiki/assets/audio/music/beta2_180603/m_dia_escape_loop.mp3',
  ...rawMusicMap
};

const rawSoundMap = (localAudioSound as any).default || localAudioSound;
export let activeAudioSound: Record<string, string> = { 
  'd_avg_stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  's_d_avg_stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  'stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  ...rawSoundMap
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

      const musicUrls = [
        'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/audio_music.json',
        'https://raw.githubusercontent.com/neponum/zoot-data/main/audio_music.json'
      ];
      const soundUrls = [
        'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/audio_sound.json',
        'https://raw.githubusercontent.com/neponum/zoot-data/main/audio_sound.json'
      ];

      const fetchWithFallback = async (urls: string[]) => {
        for (const url of urls) {
          try {
            const directRes = await fetch(url, { signal: controller.signal });
            if (directRes.ok) return directRes;
          } catch {
            // fallback
          }
        }
        for (const url of urls) {
          try {
            const proxyRes = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, { signal: controller.signal });
            if (proxyRes && proxyRes.ok) return proxyRes;
          } catch {
            // fallback
          }
        }
        return null;
      };

      const [musicRes, soundRes] = await Promise.all([
        fetchWithFallback(musicUrls),
        fetchWithFallback(soundUrls)
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
  // If url contains nested proxies, unwrap recursively to original raw URL
  let depth = 0;
  while (depth < 10) {
    depth++;
    const weservMatch = url.match(/(?:images\.weserv\.nl|wsrv\.nl)\/\?url=([^&]+)/i);
    if (weservMatch && weservMatch[1]) {
      try {
        url = decodeURIComponent(weservMatch[1]);
        continue;
      } catch {
        break;
      }
    }
    const wpMatch = url.match(/i[0-3]\.wp\.com\/(.+)/i);
    if (wpMatch && wpMatch[1]) {
      url = 'https://' + wpMatch[1];
      continue;
    }
    const staticallyMatch = url.match(/cdn\.statically\.io\/img\/(.+)/i);
    if (staticallyMatch && staticallyMatch[1]) {
      url = 'https://' + staticallyMatch[1];
      continue;
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

export function shouldAvoidWeserv(): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    const browserLang = (navigator.language || '').toLowerCase();
    
    // CIS/RF/RB languages
    const cisLanguages = ['ru', 'be', 'by', 'kk', 'uz', 'ky', 'uk'];
    if (cisLanguages.some(lang => browserLang.startsWith(lang) || browserLang.includes(lang))) {
      return true;
    }

    // Check timezone
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        const lowerTz = tz.toLowerCase();
        if (
          lowerTz.includes('moscow') ||
          lowerTz.includes('minsk') ||
          lowerTz.includes('russia') ||
          lowerTz.includes('belarus') ||
          lowerTz.includes('novosibirsk') ||
          lowerTz.includes('yekaterinburg') ||
          lowerTz.includes('krasnoyarsk') ||
          lowerTz.includes('vladivostok') ||
          lowerTz.includes('omsk') ||
          lowerTz.includes('irkutsk') ||
          lowerTz.includes('yakutsk') ||
          lowerTz.includes('magadan') ||
          lowerTz.includes('kamchatka') ||
          lowerTz.includes('samara') ||
          lowerTz.includes('saratov') ||
          lowerTz.includes('volgograd') ||
          lowerTz.includes('tashkent') ||
          lowerTz.includes('almaty') ||
          lowerTz.includes('bishkek')
        ) {
          return true;
        }
      }
    }
  } catch (e) {
    // Fail-safe
  }
  return false;
}

export function wrapUrlWithProxy(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) return rawUrl;
  
  // If it's a relative local asset (not proxy endpoint)
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('/api/proxy')) return rawUrl;

  const url = cleanAndUnwrapUrl(rawUrl);

  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/') && !url.startsWith('/api/proxy')) return url;

  // Convert raw.githubusercontent.com directly to fastly.jsdelivr.net CDN (0 Vercel bandwidth cost)
  if (url.includes('raw.githubusercontent.com')) {
    const match = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
    if (match) {
      const [, user, repo, branch, pathStr] = match;
      return `https://fastly.jsdelivr.net/gh/${user}/${repo}@${branch}/${pathStr}`;
    }
    return url;
  }
  if (url.includes('github.com')) return url;

  if (
    url.includes('torappu.prts.wiki') ||
    url.includes('prts.wiki') ||
    url.includes('banyat.com')
  ) {
    // Play audio files directly since torappu.prts.wiki has open CORS headers (Access-Control-Allow-Origin: *)
    // and our cloud run server-side datacenter IPs are blocked by prts.wiki's firewall/DDoS protection.
    if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i.test(url) || url.includes('/assets/audio/')) {
      return url;
    }

    if (
      /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || 
      url.includes('/assets/avg/characters/') ||
      url.includes('/assets/avg/background/') ||
      url.includes('/assets/avg/images/') ||
      url.includes('/assets/char_arts/')
    ) {
      const safeUrl = url.replace(/#/g, '%23').replace(/\$/g, '%24');
      if (shouldAvoidWeserv()) {
        // WordPress Photon CDN (i0.wp.com) is an open, unblocked image proxy CDN for CIS region
        const cleanNoProto = safeUrl.replace(/^https?:\/\//, '');
        return `https://i0.wp.com/${cleanNoProto}`;
      }
      // Global Cloudflare-powered image proxy CDN (wsrv.nl)
      return `https://wsrv.nl/?url=${encodeURIComponent(safeUrl)}`;
    }
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

const SLOT_NAMES = new Set(['left', 'right', 'center', 'l', 'r', 'c', 'm', '1', '2', '3', 'left2', 'right2', 'middle', 'mid', 'top', 'bottom', 'bg', 'sub']);
let cachedCharacterData: CharacterDataMap | null = null;
let cachedNormalizedCharMap: Map<string, CharacterEntry> | null = null;
let characterDataPromise: Promise<CharacterDataMap> | null = null;

function buildNormalizedCharMap(charData: CharacterDataMap): Map<string, CharacterEntry> {
  const map = new Map<string, CharacterEntry>();
  for (const [key, val] of Object.entries(charData)) {
    const lowKey = key.toLowerCase();
    map.set(lowKey, val);
    // Cross-alias char_ <-> avg_
    if (lowKey.startsWith('char_')) {
      map.set('avg_' + lowKey.substring(5), val);
    } else if (lowKey.startsWith('avg_')) {
      map.set('char_' + lowKey.substring(4), val);
    }
  }
  return map;
}

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
    // 1. First check free jsDelivr & GitHub Raw CDN (0 Vercel Bandwidth cost, cached, ultra-fast)
    const githubUrls = [
      'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/character.json',
      'https://fastly.jsdelivr.net/gh/neponum/Zoot-Archive@main/public/character.json',
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
              cachedNormalizedCharMap = buildNormalizedCharMap(parsed);
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
            cachedNormalizedCharMap = buildNormalizedCharMap(parsed);
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
          cachedNormalizedCharMap = buildNormalizedCharMap(localData);
          return localData;
        }
      }
    } catch {
      // Silently fall back to empty map if all fail
    }

    cachedCharacterData = {};
    cachedNormalizedCharMap = new Map();
    return cachedCharacterData;
  })();

  return characterDataPromise;
}

export async function getCharacterAssetInfo(name: string): Promise<CharacterAssetInfo> {
  if (!name || SLOT_NAMES.has(name.toLowerCase().trim())) {
    return { bodyUrl: '' };
  }

  const cacheKey = name.trim();
  if (characterAssetInfoCache.has(cacheKey)) {
    return characterAssetInfoCache.get(cacheKey)!;
  }
  if (pendingCharacterInfoPromises.has(cacheKey)) {
    return pendingCharacterInfoPromises.get(cacheKey)!;
  }

  const promise = (async (): Promise<CharacterAssetInfo> => {
    const charData = await fetchCharacterData();
    if (!cachedNormalizedCharMap || cachedNormalizedCharMap.size === 0) {
      cachedNormalizedCharMap = buildNormalizedCharMap(charData);
    }
    
    let baseName = name.trim();
    let expression = '';
    
    if (baseName.includes('#')) {
      const parts = baseName.split('#');
      baseName = parts[0];
      expression = parts[1];
    }

    const lowBase = baseName.toLowerCase();
    const data: CharacterEntry | undefined = charData[baseName] || 
      cachedNormalizedCharMap.get(lowBase) ||
      cachedNormalizedCharMap.get('avg_' + lowBase.replace(/^(char_|avg_)/, '')) ||
      cachedNormalizedCharMap.get('char_' + lowBase.replace(/^(char_|avg_)/, ''));

    let faceItem: CharacterFaceItem | undefined = undefined;

    if (data && expression) {
      const lowExp = expression.toLowerCase();
      faceItem = data.array?.find((item: CharacterFaceItem) => {
        const lowItemName = (item.name || '').toLowerCase();
        const lowAlias = (item.alias || '').toLowerCase();
        return (
          lowItemName === lowExp ||
          lowAlias === lowExp ||
          lowItemName === `${lowBase}#${lowExp}` ||
          lowItemName.endsWith(`#${lowExp}`) ||
          lowItemName.endsWith(`_${lowExp}`) ||
          lowItemName.endsWith(`$${lowExp}`) ||
          lowItemName === `${lowExp}$1` ||
          lowItemName === `${lowExp}$2`
        );
      });
      
      if (faceItem) {
        const faceOrImg = faceItem.face || faceItem.image;
        if (faceItem.group === -1 && faceOrImg) {
          const imagePath = faceOrImg.split('/').map(p => encodeURIComponent(p)).join('/');
          const rawBodyUrl = `https://torappu.prts.wiki/assets/avg/characters/${imagePath}.png`;
          const cachedUrl = await CacheService.getCachedBlobUrl(rawBodyUrl);
          return {
            bodyUrl: cachedUrl || wrapUrlWithProxy(rawBodyUrl),
            size: data.size,
            pos: data.pos
          };
        }
        const group = (data as { groups?: Array<{ base: string; faceRect?: { x: number; y: number; w: number; h: number } }> }).groups?.[faceItem.group ?? 0];
        if (group && faceOrImg) {
          const bodyPath = group.base.split('/').map(p => encodeURIComponent(p)).join('/');
          const facePath = faceOrImg.split('/').map(p => encodeURIComponent(p)).join('/');
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
        const bodyPath = group.base.split('/').map(p => encodeURIComponent(p)).join('/');
        const rawBodyUrl = `https://torappu.prts.wiki/assets/avg/characters/${bodyPath}.png`;
        const cachedUrl = await CacheService.getCachedBlobUrl(rawBodyUrl);
        return {
          bodyUrl: cachedUrl || wrapUrlWithProxy(rawBodyUrl),
          size: data.size,
          pos: data.pos
        };
      } else if (data.array && data.array.length > 0) {
        const firstItem = data.array[0];
        const faceOrImg = firstItem.image || firstItem.face;
        if (faceOrImg) {
          const imagePath = faceOrImg.split('/').map(p => encodeURIComponent(p)).join('/');
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

    // Fallback: character is not indexed in character.json or has unmapped expression
    if (expression && (!data || !faceItem)) {
      const bodyVar = expression.includes('$') ? expression.split('$')[1] : '1';
      const cleanExp = expression.split('$')[0];
      
      const bodyUrlCandidate1 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName + '$' + bodyVar)}.png`;
      const bodyUrlCandidate2 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName + '$1')}.png`;
      const bodyUrlCandidate3 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName)}.png`;
      const bodyUrlCandidate4 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName + '#' + cleanExp)}.png`;

      const candidates = [bodyUrlCandidate1, bodyUrlCandidate2, bodyUrlCandidate3, bodyUrlCandidate4];
      let resolvedBodyUrl = bodyUrlCandidate2;
      for (const cand of candidates) {
        if (await checkImageExists(cand)) {
          resolvedBodyUrl = cand;
          break;
        }
      }

      const rawFaceUrl = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression)}.png`;
      let resolvedFaceUrl: string | undefined = undefined;
      if (await checkImageExists(rawFaceUrl)) {
        resolvedFaceUrl = rawFaceUrl;
      } else if (!expression.includes('$') && /^\d+$/.test(expression)) {
        const rawFaceWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression + '$1')}.png`;
        if (await checkImageExists(rawFaceWithDollar)) {
          resolvedFaceUrl = rawFaceWithDollar;
        }
      }

      const cachedBody = await CacheService.getCachedBlobUrl(resolvedBodyUrl);
      const cachedFace = resolvedFaceUrl ? await CacheService.getCachedBlobUrl(resolvedFaceUrl) : undefined;

      return {
        bodyUrl: cachedBody || wrapUrlWithProxy(resolvedBodyUrl),
        faceUrl: cachedFace || (resolvedFaceUrl ? wrapUrlWithProxy(resolvedFaceUrl) : undefined),
        size: data?.size,
        pos: data?.pos
      };
    }

    const fallbackBodyUrl = await getImageUrl('character_body', baseName);
    const cachedFallback = await CacheService.getCachedBlobUrl(fallbackBodyUrl);
    return {
      bodyUrl: cachedFallback || wrapUrlWithProxy(fallbackBodyUrl),
      size: data?.size
    };
  })();

  pendingCharacterInfoPromises.set(cacheKey, promise);
  const result = await promise;
  characterAssetInfoCache.set(cacheKey, result);
  pendingCharacterInfoPromises.delete(cacheKey);
  return result;
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

export type AssetType = 'background' | 'character' | 'image' | 'music' | 'sound' | 'voice' | 'character_body' | 'character_face';

export async function getImageUrl(type: AssetType, name: string): Promise<string> {
  if (!name) return '';
  const cacheKey = `${type}-${name}`;
  
  if (urlCache.has(cacheKey)) {
    return urlCache.get(cacheKey)!;
  }
  
  if (pendingUrlPromises.has(cacheKey)) {
    return pendingUrlPromises.get(cacheKey)!;
  }
  
  const promise = (async () => {
    const rawUrl = await resolveAssetUrl(type, name);
    
    // WebKit/iOS Safari does not support playing audio from blob URLs reliably (or at all).
    // Always use standard proxy streaming URLs for audio assets.
    if (type !== 'music' && type !== 'sound' && type !== 'voice') {
      const cachedBlobUrl = await CacheService.getCachedBlobUrl(rawUrl).catch(() => null);
      if (cachedBlobUrl) return cachedBlobUrl;
    }
    
    return wrapUrlWithProxy(rawUrl);
  })();
  
  pendingUrlPromises.set(cacheKey, promise);
  const finalUrl = await promise;
  urlCache.set(cacheKey, finalUrl);
  pendingUrlPromises.delete(cacheKey);
  return finalUrl;
}

const resolvedAudioCache: Record<string, string> = {};
const existenceCheckCache = new Map<string, boolean>();

function checkImageViaElement(url: string, timeoutMs = 3500): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        img.onload = null;
        img.onerror = null;
        // Do NOT set img.src = '' as setting empty src on an in-flight request triggers NS_BINDING_ABORTED
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        if (img.naturalWidth && img.naturalHeight) {
          recordLoadedImage(url, img.naturalWidth, img.naturalHeight);
        }
        resolve(true);
      }
    };
    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }
    };
    img.src = url;
  });
}

export async function checkImageExists(url: string): Promise<boolean> {
  if (!url) return false;
  
  // Audio files on torappu.prts.wiki cannot be checked via browser fetch/HEAD because of CORS limitations.
  // Instead, always assume they exist so the HTML5 Audio element can play them directly (which supports simple GET requests).
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i.test(url) || url.includes('/assets/audio/')) {
    return true;
  }

  if (existenceCheckCache.has(url)) {
    return existenceCheckCache.get(url)!;
  }
  
  const targetUrl = wrapUrlWithProxy(url);

  // In browser, using HTMLImageElement (new Image()) avoids triggering CORS policy violations on 404/400
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    const exists = await checkImageViaElement(targetUrl);
    if (exists) {
      existenceCheckCache.set(url, true);
      return true;
    }
    if (targetUrl !== url) {
      const directExists = await checkImageViaElement(url);
      if (directExists) {
        existenceCheckCache.set(url, true);
        return true;
      }
    }
    existenceCheckCache.set(url, false);
    return false;
  }

  // Server-side fallback
  try {
    const response = await fetchWithTimeout(targetUrl, { method: 'HEAD' }, 2500);
    const ok = response.ok || response.status === 206;
    existenceCheckCache.set(url, ok);
    return ok;
  } catch {
    existenceCheckCache.set(url, false);
    return false;
  }
}

async function resolveVisualAssetUrl(name: string, preferredType: 'background' | 'image'): Promise<string> {
  const cleanName = name.trim().replace(/\.png$/i, '');
  const lowerName = cleanName.toLowerCase();
  const noAvgName = cleanName.replace(/^avg_/i, '');
  const withAvgName = lowerName.startsWith('avg_') ? cleanName : `avg_${cleanName}`;
  const noBgName = cleanName.replace(/^bg_/i, '');
  const withBgName = lowerName.startsWith('bg_') ? cleanName : `bg_${cleanName}`;

  // PRTS wiki only has: background/, characters/, images/
  const rawCandidates: string[] = [];

  if (preferredType === 'image') {
    rawCandidates.push(
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(noAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(withBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(withAvgName)}.png`
    );
  } else {
    rawCandidates.push(
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(withBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(noAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(withAvgName)}.png`
    );
  }

  // Also append lowercase variants if different
  if (lowerName !== cleanName) {
    const lowerNoAvg = lowerName.replace(/^avg_/i, '');
    const lowerNoBg = lowerName.replace(/^bg_/i, '');
    const lowerWithBg = lowerName.startsWith('bg_') ? lowerName : `bg_${lowerName}`;
    rawCandidates.push(
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerNoAvg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerWithBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerNoBg)}.png`
    );
  }

  const uniqueCandidates = Array.from(new Set(rawCandidates));

  // Check the first candidate directly if cached
  for (const c of uniqueCandidates) {
    if (existenceCheckCache.get(c) === true) {
      return c;
    }
  }

  // Check candidates sequentially to avoid sending redundant parallel requests for non-existent paths
  for (const cand of uniqueCandidates) {
    if (await checkImageExists(cand)) {
      return cand;
    }
  }

  return uniqueCandidates[0];
}

async function resolveAssetUrl(type: AssetType, name: string): Promise<string> {
  const cacheKey = `${type}:${name}`;
  if (resolvedAudioCache[cacheKey]) return resolvedAudioCache[cacheKey];

  switch (type) {
    case 'background': {
      const res = await resolveVisualAssetUrl(name, 'background');
      resolvedAudioCache[cacheKey] = res;
      return res;
    }
    case 'image': {
      const res = await resolveVisualAssetUrl(name, 'image');
      resolvedAudioCache[cacheKey] = res;
      return res;
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
      
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(name + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;

      if (await checkImageExists(urlBase)) return urlBase;
      
      return urlWithDollar;
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
      const parts = name.split('/');
      const baseNameOnly = parts[parts.length - 1];
      const cleanAudioName = baseNameOnly.replace(/^\$/, '').toLowerCase();
      
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
      
      if (parts.length > 1) {
        const filteredParts = parts.filter((p, i) => {
          if (i === 0) {
            const low = p.toLowerCase();
            return low !== 'sound' && low !== 'sound_beta_2' && low !== 'sound_beta_1' && low !== 'voice' && low !== 'music';
          }
          return true;
        });
        const pathStr = filteredParts.map(p => p.toLowerCase()).join('/');
        candidates.push(`https://torappu.prts.wiki/assets/audio/${pathStr}.mp3`);
        candidates.push(`https://torappu.prts.wiki/assets/audio/music/${pathStr}.mp3`);
      }

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
      const parts = name.split('/');
      const baseNameOnly = parts[parts.length - 1];
      const cleanAudioName = baseNameOnly.replace(/^\$/, '').toLowerCase();
      
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
      
      if (parts.length > 1) {
        const filteredParts = parts.filter((p, i) => {
          if (i === 0) {
            const low = p.toLowerCase();
            return low !== 'sound' && low !== 'sound_beta_2' && low !== 'sound_beta_1' && low !== 'voice' && low !== 'music';
          }
          return true;
        });
        const pathStr = filteredParts.map(p => p.toLowerCase()).join('/');
        candidates.push(`https://torappu.prts.wiki/assets/audio/${pathStr}.mp3`);
        candidates.push(`https://torappu.prts.wiki/assets/audio/sound/${pathStr}.mp3`);
      }

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

const characterAssetInfoCache = new Map<string, CharacterAssetInfo>();
const pendingCharacterInfoPromises = new Map<string, Promise<CharacterAssetInfo>>();
const naturalSizeCache = new Map<string, { w: number; h: number }>();
const loadedImageUrlSet = new Set<string>();

export function getNaturalSize(url: string): { w: number; h: number } | undefined {
  if (!url) return undefined;
  return naturalSizeCache.get(url);
}

export function isImageLoadedInCache(url: string): boolean {
  if (!url) return false;
  return loadedImageUrlSet.has(url);
}

export function recordLoadedImage(url: string, naturalWidth?: number, naturalHeight?: number): void {
  if (!url) return;
  loadedImageUrlSet.add(url);
  if (naturalWidth && naturalHeight) {
    naturalSizeCache.set(url, { w: naturalWidth, h: naturalHeight });
  }
}

export function clearPreloadedImages(): void {
  preloadedImages = [];
  preloadedAudio = [];
  characterAssetInfoCache.clear();
  pendingCharacterInfoPromises.clear();
  naturalSizeCache.clear();
  loadedImageUrlSet.clear();
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

  const charLineTypes = ['character', 'charactertween', 'charactercutin', 'characteraction', 'interlude'];

  for (const line of lines) {
    if (line.assetName || (line.type === 'character' && line.assetName2)) {
      if (charLineTypes.includes(line.type)) {
        const names = [line.assetName, (line as { assetName2?: string }).assetName2].filter(Boolean) as string[];
        for (const name of names) {
          if (SLOT_NAMES.has(name.toLowerCase().trim())) continue;
          resolutionPromises.push(getCharacterAssetInfo(name).then(info => {
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
    try {
      if (type === 'audio') {
        // Preload audio using the standard proxy URL to trigger browser native HTTP caching.
        // Avoid caching audio as Blob to bypass iOS Safari's WebKit media element blob URL playback bugs.
        await new Promise<void>((resolve) => {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.oncanplaythrough = () => resolve();
          audio.onerror = () => resolve();
          audio.src = url;
          audio.load();
          preloadedAudio.push(audio);
        });
        return;
      }

      const cachedBlobUrl = await CacheService.getCachedBlobUrl(url).catch(() => null);
      if (cachedBlobUrl) {
        if (type === 'image') {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              recordLoadedImage(url, img.naturalWidth, img.naturalHeight);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = cachedBlobUrl;
            preloadedImages.push(img);
          });
        }
        return;
      }

      // Preload image directly via HTMLImageElement (populates browser HTTP cache, avoids XHR CORS restrictions)
      if (type === 'image') {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            recordLoadedImage(url, img.naturalWidth, img.naturalHeight);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
          preloadedImages.push(img);
        });
      }
    } catch {
      // fallback handled by outer catch / finally
    } finally {
      updateProgress(url);
    }
  };

  const allUrls = [
    ...imageUrls.map(url => ({ url, type: 'image' as const })), 
    ...audioUrls.map(url => ({ url, type: 'audio' as const }))
  ];
  
  const CONCURRENCY = 12;
  const executing = new Set<Promise<void>>();
  
  for (const item of allUrls) {
    const p = loadAsset(item.url, item.type).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= CONCURRENCY) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  await new Promise(resolve => setTimeout(resolve, 200));
}
