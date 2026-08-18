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
  if (url.includes('raw.githubusercontent.com') || url.includes('github.com')) return url;

  if (
    url.includes('torappu.prts.wiki') ||
    url.includes('prts.wiki') ||
    url.includes('banyat.com')
  ) {
    if (
      /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url) || 
      url.includes('/assets/avg/characters/') ||
      url.includes('/assets/avg/background/') ||
      url.includes('/assets/avg/images/') ||
      url.includes('/assets/char_arts/')
    ) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
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
      item.name === `${expression}$1` ||
      item.alias === expression
    );
    
    if (faceItem) {
      const faceOrImg = faceItem.face || faceItem.image;
      if (faceItem.group === -1 && faceOrImg) {
        const imagePath = faceOrImg.split('/').map(encodeURIComponent).join('/');
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
        const bodyPath = group.base.split('/').map(encodeURIComponent).join('/');
        const facePath = faceOrImg.split('/').map(encodeURIComponent).join('/');
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

  // Fallback: character is not indexed in character.json or has unmapped expression
  if (expression && (!data || !faceItem)) {
    const bodyVar = expression.includes('$') ? expression.split('$')[1] : '1';
    
    // Canonical candidate 1: specific body variation (e.g. avg_1015_aglna2_1/avg_1015_aglna2_1$2.png)
    const bodyUrlCandidate1 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName + '$' + bodyVar)}.png`;
    // Canonical candidate 2: default body variation (e.g. avg_1015_aglna2_1/avg_1015_aglna2_1$1.png)
    const bodyUrlCandidate2 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName + '$1')}.png`;
    // Canonical candidate 3: base name directly (e.g. avg_1015_aglna2_1/avg_1015_aglna2_1.png)
    const bodyUrlCandidate3 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName)}.png`;

    let resolvedBodyUrl = '';
    if (await checkImageExists(bodyUrlCandidate1)) {
      resolvedBodyUrl = bodyUrlCandidate1;
    } else if (await checkImageExists(bodyUrlCandidate2)) {
      resolvedBodyUrl = bodyUrlCandidate2;
    } else if (await checkImageExists(bodyUrlCandidate3)) {
      resolvedBodyUrl = bodyUrlCandidate3;
    } else {
      resolvedBodyUrl = bodyUrlCandidate2;
    }

    // Face is located at avg/characters/{baseName}/{expression}.png
    const rawFaceUrl = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression)}.png`;
    let resolvedFaceUrl: string | undefined = undefined;
    if (await checkImageExists(rawFaceUrl)) {
      resolvedFaceUrl = rawFaceUrl;
    } else if (!expression.includes('$') && /^\d+$/.test(expression)) {
      // If expression was simply '1' instead of '1$1'
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
    
    const cachedBlobUrl = await CacheService.getCachedBlobUrl(rawUrl);
    if (cachedBlobUrl) return cachedBlobUrl;
    
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

export async function checkImageExists(url: string): Promise<boolean> {
  if (!url) return false;
  if (existenceCheckCache.has(url)) {
    return existenceCheckCache.get(url)!;
  }
  
  try {
    const targetUrl = wrapUrlWithProxy(url);
    // Use GET with Range: bytes=0-0 for fast, universal single-byte existence check
    const response = await fetchWithTimeout(targetUrl, { 
      method: 'GET',
      headers: { 'Range': 'bytes=0-0' }
    }, 2500);

    if (response.ok || response.status === 206) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        existenceCheckCache.set(url, false);
        return false;
      }
      existenceCheckCache.set(url, true);
      return true;
    }

    if (targetUrl !== url) {
      const directResponse = await fetchWithTimeout(url, { 
        method: 'GET',
        headers: { 'Range': 'bytes=0-0' }
      }, 2000);
      if (directResponse.ok || directResponse.status === 206) {
        const contentType = directResponse.headers.get('content-type');
        const ok = !(contentType && contentType.includes('text/html'));
        existenceCheckCache.set(url, ok);
        return ok;
      }
    }
    existenceCheckCache.set(url, false);
    return false;
  } catch {
    try {
      if (!url.startsWith('/api/proxy')) {
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const res = await fetchWithTimeout(proxiedUrl, { 
          method: 'GET',
          headers: { 'Range': 'bytes=0-0' }
        }, 2500);
        if (res.ok || res.status === 206) {
          const contentType = res.headers.get('content-type');
          const ok = !(contentType && contentType.includes('text/html'));
          existenceCheckCache.set(url, ok);
          return ok;
        }
      }
    } catch {
      existenceCheckCache.set(url, false);
      return false;
    }
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

  // Check all candidates simultaneously in parallel for instant resolution
  const checks = await Promise.all(
    uniqueCandidates.map(async url => ({ url, exists: await checkImageExists(url) }))
  );
  const match = checks.find(res => res.exists);
  if (match) return match.url;

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
