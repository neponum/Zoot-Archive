import { StoryLine } from '../../types';
import { CacheService } from '../cacheService';
import { assetStore } from '../assetStore';
import { platform } from '../../platform';
import { resolveAudioViaManifest } from './audioManifest';
import { 
  CharacterAssetInfo, 
  CharacterDataMap, 
  CharacterFaceItem, 
  CharacterEntry 
} from './storyTypes';

export let activeAudioMusic: Record<string, string> = { 
  'tense_intro': 'https://torappu.prts.wiki/assets/audio/music/beta2_180603/m_dia_escape_intro.mp3',
  'tense_loop': 'https://torappu.prts.wiki/assets/audio/music/beta2_180603/m_dia_escape_loop.mp3',
};

export let activeAudioSound: Record<string, string> = { 
  'd_avg_stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  's_d_avg_stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
  'stinkbomb': 'https://torappu.prts.wiki/assets/audio/avg/d_avg_stinkbomb.mp3',
};

let audioMapsPromise: Promise<void> | null = null;

export async function fetchLatestAudioMaps(): Promise<void> {
  if (audioMapsPromise) return audioMapsPromise;

  audioMapsPromise = (async () => {
    try {
      const cached = await CacheService.getCachedJson<{ music: Record<string, string>; sound: Record<string, string> }>('arknights_audio_maps_v2');
      if (cached && cached.music && cached.sound) {
        activeAudioMusic = { ...activeAudioMusic, ...cached.music };
        activeAudioSound = { ...activeAudioSound, ...cached.sound };
      }
    } catch {
      // Ignore cache lookup error
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

/**
 * weserv/wsrv не умеют тянуть файлы с `$`/`#` в имени (спрайты и лица
 * PRTS: `avg_npc_394_1$1.png`, `7$1.png`) — стабильно отдают 404.
 * Такие URL отдаём напрямую.
 */
function canUseWeserv(url: string): boolean {
  // `$`/`#` могут быть уже закодированы (`%24`/`%23`) — проверяем оба вида.
  return !/[$#]|%24|%23/i.test(url);
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
    url.includes('prts.wiki')
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
      // Если предзагрузка выяснила, что прямой путь не работает, отдаём
      // ровно тот адрес, который реально открылся, — иначе картинка
      // «загрузилась» и всё равно не отрисуется.
      if (preferredImageTransport === 'weserv') {
        return canUseWeserv(safeUrl) ? weservUrl(safeUrl, preferredWeservHost) : safeUrl;
      }
      // Aceship хранит спрайты в «плоской» раскладке, которая покрывает не
      // все персонажи. Для спрайтов туда не уходим: прямой PRTS и weserv
      // надёжнее, а битый URL здесь означал бы пустого персонажа в сцене.
      if (preferredImageTransport === 'aceship' && !url.includes('/assets/avg/characters/')) {
        return aceshipUrl(safeUrl) ?? safeUrl;
      }
      if (preferredImageTransport === 'proxy') return platform.proxyUrl(safeUrl);
      return safeUrl;
    }
    return platform.proxyUrl(url);
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
 * Remote sources for the character asset manifest.
 *
 * torappu.prts.wiki is the authoritative source: the `character.json` it serves
 * describes exactly the PNGs it hosts, including the `faceRect` of every
 * `face_overlay` group (the rectangle is expressed in the pixel space of the
 * base texture). The zoot-data mirrors are static snapshots, so they lag behind
 * whenever PRTS re-renders a sprite (for example at a higher resolution) and
 * their stale `faceRect` no longer matches the artwork that is downloaded.
 * A manifest that lags behind the artwork makes the face overlay land on the
 * wrong spot, or disappear completely and leave a blank face on the sprite.
 */
const REMOTE_CHARACTER_SOURCES: Array<{ url: string; viaProxy: boolean }> = [
  // PRTS serves the manifest with `Access-Control-Allow-Origin: *`, so the
  // browser can read it directly; the proxied variant stays as a safety net.
  { url: 'https://torappu.prts.wiki/assets/avg/character.json', viaProxy: false },
  { url: 'https://torappu.prts.wiki/assets/avg/character.json', viaProxy: true },
  // Mirrors are only a last resort: they are static snapshots of the PRTS
  // manifest and go stale as soon as PRTS re-renders a sprite.
  // jsDelivr отдаёт 403 для файлов из репозиториев больше 50 МБ, а zoot-data
  // давно перерос лимит: raw надёжнее, пусть и без CDN-кэша.
  { url: 'https://raw.githubusercontent.com/neponum/zoot-data/main/character.json', viaProxy: false },
  { url: 'https://fastly.jsdelivr.net/gh/neponum/zoot-data@main/character.json', viaProxy: false }
];

/**
 * The manifest is a ~1.7 MB JSON file, so a short timeout cuts the request off
 * exactly when it is about to succeed. The mirrors are tried afterwards.
 */
const MANIFEST_FETCH_TIMEOUT_MS = 20000;

/**
 * Helper to fetch latest character data from remote sources (PRTS Wiki / GitHub CDN).
 */
async function fetchRemoteCharacterData(): Promise<CharacterDataMap | null> {
  for (const source of REMOTE_CHARACTER_SOURCES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MANIFEST_FETCH_TIMEOUT_MS);
    try {
      const fetchUrl = source.viaProxy
        ? platform.proxyUrl(source.url)
        : source.url;

      const response = await platform.fetch(fetchUrl, { signal: controller.signal });


      if (response.ok) {
        const text = await response.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = JSON.parse(trimmed) as CharacterDataMap;
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // Continue to next remote URL
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return null;
}

/**
 * Robust fetcher for character asset definitions with client-side CacheService persistence.
 * Character data is fetched dynamically from remote sources (PRTS Wiki / GitHub) and updated on the client.
 */
export async function fetchCharacterData(): Promise<CharacterDataMap> {
  if (cachedCharacterData && Object.keys(cachedCharacterData).length > 0) {
    return cachedCharacterData;
  }

  if (characterDataPromise) return characterDataPromise;

  characterDataPromise = (async (): Promise<CharacterDataMap> => {
    // v2 drops the v1 manifest: it was seeded from a static mirror and kept
    // stale `faceRect` values that no longer match the sprites on PRTS.
    const CACHE_KEY = 'arknights_character_json_v2';
    const LEGACY_CACHE_KEYS = ['arknights_character_json_v1'];

    // 1. Try loading client-side persisted cache from CacheService (IndexedDB / Cache API)
    try {
      const localCached = await CacheService.getCachedJson<CharacterDataMap>(CACHE_KEY);
      if (localCached && typeof localCached === 'object' && Object.keys(localCached).length > 0) {
        cachedCharacterData = localCached;
        cachedNormalizedCharMap = buildNormalizedCharMap(localCached);

        // Drop manifests written by older builds so they cannot resurface later.
        for (const legacyKey of LEGACY_CACHE_KEYS) {
          CacheService.deleteCachedJson(legacyKey).catch(() => {});
        }

        // Non-blocking background refresh from remote to stay updated
        fetchRemoteCharacterData().then((remoteData) => {
          if (remoteData && Object.keys(remoteData).length > 0) {
            cachedCharacterData = remoteData;
            cachedNormalizedCharMap = buildNormalizedCharMap(remoteData);
            // A refreshed manifest may point at re-rendered sprites, so every
            // character resolved against the previous one has to be resolved again.
            characterAssetInfoCache.clear();
            CacheService.cacheJson(CACHE_KEY, remoteData).catch(() => {});
          }
        }).catch(() => {});

        return localCached;
      }
    } catch {
      // Ignore cache lookup error and proceed to remote fetch
    }

    // 2. If no client cache exists, fetch from remote sources (PRTS Wiki / GitHub)
    const remoteData = await fetchRemoteCharacterData();
    if (remoteData && Object.keys(remoteData).length > 0) {
      cachedCharacterData = remoteData;
      cachedNormalizedCharMap = buildNormalizedCharMap(remoteData);
      CacheService.cacheJson(CACHE_KEY, remoteData).catch(() => {});
      for (const legacyKey of LEGACY_CACHE_KEYS) {
        CacheService.deleteCachedJson(legacyKey).catch(() => {});
      }
      return remoteData;
    }

    // Ни один источник не ответил: не кэшируем пустоту навсегда, иначе все
    // спрайты в этой сессии останутся без картинок. Следующий вызов
    // getCharacterAssetInfo попробует снова.
    cachedCharacterData = {};
    cachedNormalizedCharMap = new Map();
    characterDataPromise = null;
    return cachedCharacterData;
  })();

  return characterDataPromise;
}

export function warmCharacterData(): void {
  void fetchCharacterData().catch(() => {});
}

export async function getCharacterAssetInfo(name: string): Promise<CharacterAssetInfo> {
  if (!name || SLOT_NAMES.has(name.toLowerCase().trim())) {
    return { bodyUrl: '' };
  }

  const cleanName = name.trim().toLowerCase();
  if (cleanName === 'char_empty' || cleanName.startsWith('char_empty#')) {
    return {
      bodyUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    };
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
          const cachedUrl = await acquireBlobUrl(assetCacheBlobRefs, rawBodyUrl);
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
          const cachedBody = await acquireBlobUrl(assetCacheBlobRefs, rawBodyUrl);

          // У некоторых персонажей поле «face» указывает на тот же файл, что и
          // тело. Это не лицо, а полный спрайт: если наложить его на faceRect,
          // на лице появляется маленькая копия всего персонажа. Такой оверлей
          // не рисуем — остаётся обычное лицо из тела.
          if (facePath === bodyPath) {
            return {
              bodyUrl: cachedBody || wrapUrlWithProxy(rawBodyUrl),
              size: data.size,
              pos: data.pos
            };
          }

          const rawFaceUrl = `https://torappu.prts.wiki/assets/avg/characters/${facePath}.png`;
          const cachedFace = await acquireBlobUrl(assetCacheBlobRefs, rawFaceUrl);
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
        const cachedUrl = await acquireBlobUrl(assetCacheBlobRefs, rawBodyUrl);
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
          const cachedUrl = await acquireBlobUrl(assetCacheBlobRefs, rawBodyUrl);
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

      const cachedBody = await acquireBlobUrl(assetCacheBlobRefs, resolvedBodyUrl);
      const cachedFace = resolvedFaceUrl ? await acquireBlobUrl(assetCacheBlobRefs, resolvedFaceUrl) : undefined;

      return {
        bodyUrl: cachedBody || wrapUrlWithProxy(resolvedBodyUrl),
        faceUrl: cachedFace || (resolvedFaceUrl ? wrapUrlWithProxy(resolvedFaceUrl) : undefined),
        size: data?.size,
        pos: data?.pos
      };
    }

    const fallbackBodyUrl = await getImageUrl('character_body', baseName);
    const cachedFallback = await acquireBlobUrl(assetCacheBlobRefs, fallbackBodyUrl);
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

// Разрешённые URL переживают перезагрузку страницы: повторный визит не
// тратит время на перебор кандидатов и HEAD-проверки.
const RESOLVED_URL_CACHE_KEY = 'arknights_resolved_image_urls_v1';
const persistedResolvedUrls: Record<string, string> = (() => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(RESOLVED_URL_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
})();
let persistResolvedTimer: ReturnType<typeof setTimeout> | null = null;

function persistResolvedUrl(key: string, url: string): void {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) return;
  if (persistedResolvedUrls[key] === url) return;
  persistedResolvedUrls[key] = url;
  if (typeof window === 'undefined') return;
  if (persistResolvedTimer) clearTimeout(persistResolvedTimer);
  persistResolvedTimer = setTimeout(() => {
    try {
      const entries = Object.entries(persistedResolvedUrls).slice(-3000);
      window.localStorage.setItem(
        RESOLVED_URL_CACHE_KEY,
        JSON.stringify(Object.fromEntries(entries))
      );
    } catch {
      // localStorage может быть переполнен или недоступен — не критично.
    }
  }, 1200);
}

// Blob URLs handed out to consumers keyed by their source URL with the number of
// outstanding references. References are dropped when the owning cache is cleared.
const urlCacheBlobRefs = new Map<string, number>();
const assetCacheBlobRefs = new Map<string, number>();

// Uses the referenced blob URL from CacheStorage and keeps a reference to it, so
// CacheService.revokeBlobUrls() does not pull it away from mounted consumers.
async function acquireBlobUrl(refs: Map<string, number>, url: string): Promise<string | null> {
  if (!url || url.startsWith('blob:')) return url ?? null;
  const blobUrl = await CacheService.acquireBlobUrl(url).catch(() => null);
  if (blobUrl) {
    refs.set(url, (refs.get(url) ?? 0) + 1);
  }
  return blobUrl;
}

function releaseBlobRefs(refs: Map<string, number>): void {
  refs.forEach((count, url) => {
    for (let i = 0; i < count; i++) {
      CacheService.releaseBlobUrl(url);
    }
  });
  refs.clear();
}

export function clearUrlCache(): void {
  urlCache.clear();
  pendingUrlPromises.clear();
  releaseBlobRefs(urlCacheBlobRefs);
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await platform.fetch(url, { ...options, signal: controller.signal });
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

/** Стабильный ключ скачанного файла: не зависит от зеркала/прокси. */
export function storyAssetCacheKey(type: AssetType, name: string): string {
  return `story-asset:${type}:${name.trim().toLowerCase()}`;
}

const CACHEABLE_BY_NAME: ReadonlySet<AssetType> = new Set([
  'background',
  'image',
  'music',
  'sound',
  'voice',
]);

export async function getImageUrl(type: AssetType, name: string): Promise<string> {
  if (!name) return '';
  const normalizedKey = `${type}-${name.trim().toLowerCase()}`;
  
  if (urlCache.has(normalizedKey)) {
    return urlCache.get(normalizedKey)!;
  }
  
  if (pendingUrlPromises.has(normalizedKey)) {
    return pendingUrlPromises.get(normalizedKey)!;
  }

  // Скачанный предзагрузкой файл: на Android отдаём и звук из кэша, на сайте
  // аудио оставляем потоковым (Safari плохо играет blob-URL).
  const canUseStored =
    CACHEABLE_BY_NAME.has(type) &&
    (type === 'background' || type === 'image' || platform.kind === 'capacitor');
  if (canUseStored) {
    const stored = await acquireBlobUrl(
      urlCacheBlobRefs,
      storyAssetCacheKey(type, name)
    );
    if (stored) {
      urlCache.set(normalizedKey, stored);
      return stored;
    }
  }

  const persistedUrl = persistedResolvedUrls[normalizedKey];
  if (persistedUrl) {
    // Мгновенный путь для повторных визитов: URL уже известен.
    if (type !== 'music' && type !== 'sound' && type !== 'voice') {
      const cachedBlobUrl = await acquireBlobUrl(urlCacheBlobRefs, persistedUrl);
      if (cachedBlobUrl) {
        urlCache.set(normalizedKey, cachedBlobUrl);
        return cachedBlobUrl;
      }
    }
    const immediate = wrapUrlWithProxy(persistedUrl);
    urlCache.set(normalizedKey, immediate);
    return immediate;
  }

  const promise = (async () => {
    const rawUrl = await resolveAssetUrl(type, name);

    // WebKit/iOS Safari does not support playing audio from blob URLs reliably (or at all).
    // Always use standard proxy streaming URLs for audio assets.
    if (type !== 'music' && type !== 'sound' && type !== 'voice') {
      const cachedBlobUrl = await acquireBlobUrl(urlCacheBlobRefs, rawUrl);
      if (cachedBlobUrl) return cachedBlobUrl;
    }

    return wrapUrlWithProxy(rawUrl);
  })();
  
  pendingUrlPromises.set(normalizedKey, promise);
  const finalUrl = await promise;
  urlCache.set(normalizedKey, finalUrl);
  if (!finalUrl.startsWith('blob:')) {
    persistResolvedUrl(normalizedKey, finalUrl);
  }
  pendingUrlPromises.delete(normalizedKey);
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

function checkAudioViaElement(url: string, timeoutMs = 5000): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    let resolved = false;
    const audio = new Audio();
    audio.preload = 'metadata';
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        audio.onloadedmetadata = null;
        audio.onerror = null;
        // Do NOT set audio.src = '' here: it aborts an in-flight request (NS_BINDING_ABORTED)
        resolve(false);
      }
    }, timeoutMs);

    audio.onloadedmetadata = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        resolve(true);
      }
    };
    audio.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        resolve(false);
      }
    };
    audio.src = url;
    audio.load();
  });
}

export async function checkImageExists(url: string): Promise<boolean> {
  if (!url) return false;
  
  // Audio files on torappu.prts.wiki cannot be checked with a plain fetch HEAD from the
  // browser (CORS), so probe them through an HTMLAudioElement requesting only metadata.
  // The result (including misses) is cached, so probing stays cheap.
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i.test(url) || url.includes('/assets/audio/')) {
    if (existenceCheckCache.has(url)) {
      return existenceCheckCache.get(url)!;
    }

    const audioExists = typeof window !== 'undefined'
      ? await checkAudioViaElement(url)
      : await fetchWithTimeout(url, { method: 'HEAD' }, 5000).then(r => r.ok || r.status === 206).catch(() => false);
    existenceCheckCache.set(url, audioExists);
    return audioExists;
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
    const clean = cleanAndUnwrapUrl(url);
    const proxyUrl = platform.proxyUrl(clean);
    if (proxyUrl !== targetUrl && proxyUrl !== url) {
      const proxyExists = await checkImageViaElement(proxyUrl);
      if (proxyExists) {
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
    if (ok) {
      existenceCheckCache.set(url, true);
      return true;
    }
  } catch {
    // Continue to proxy check
  }

  try {
    const clean = cleanAndUnwrapUrl(url);
    const proxyUrl = platform.proxyUrl(clean);
    const response = await fetchWithTimeout(proxyUrl, { method: 'HEAD' }, 2500);
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
  const lowerNoAvg = lowerName.replace(/^avg_/i, '');
  const lowerNoBg = lowerName.replace(/^bg_/i, '');
  const lowerWithBg = lowerName.startsWith('bg_') ? lowerName : `bg_${lowerName}`;
  const lowerWithAvg = lowerName.startsWith('avg_') ? lowerName : `avg_${lowerName}`;

  const noAvgName = cleanName.replace(/^avg_/i, '');
  const noBgName = cleanName.replace(/^bg_/i, '');
  const withBgName = cleanName.toLowerCase().startsWith('bg_') ? cleanName : `bg_${cleanName}`;
  const withAvgName = cleanName.toLowerCase().startsWith('avg_') ? cleanName : `avg_${cleanName}`;

  // PRTS wiki has: background/, characters/, images/
  // Lowercase paths MUST come first because almost all Arknights server assets are strictly lowercase (e.g. bg_nobled.png)
  const rawCandidates: string[] = [];

  if (preferredType === 'image') {
    rawCandidates.push(
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerWithAvg)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerNoAvg)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerNoBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(noAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(withAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerWithBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerNoBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(withBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noBgName)}.png`
    );
  } else {
    rawCandidates.push(
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerWithBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerNoBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(lowerNoAvg)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(withBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/background/${encodeURIComponent(noBgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerWithAvg)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerNoAvg)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(lowerNoBg)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(cleanName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(noAvgName)}.png`,
      `https://torappu.prts.wiki/assets/avg/images/${encodeURIComponent(withAvgName)}.png`
    );
  }

  const uniqueCandidates = Array.from(new Set(rawCandidates));

  // Check the first candidate directly if cached
  for (const c of uniqueCandidates) {
    if (existenceCheckCache.get(c) === true) {
      return c;
    }
  }

  // Проверяем кандидатов небольшими параллельными волнами: это сокращает
  // ожидание с «N последовательных 404» до одного-двух RTT, но не заваливает
  // CDN десятками одновременных запросов на каждую картинку.
  const PROBE_BATCH = 4;
  for (let i = 0; i < uniqueCandidates.length; i += PROBE_BATCH) {
    const batch = uniqueCandidates.slice(i, i + PROBE_BATCH);
    const results = await Promise.all(
      batch.map(async (candidate) => ({
        candidate,
        exists: await checkImageExists(candidate),
      }))
    );
    const hit = results.find((result) => result.exists);
    if (hit) return hit.candidate;
  }

  return uniqueCandidates[0];
}

let persistAudioTimeout: any = null;
function saveAudioMapsToCache() {
  if (persistAudioTimeout) clearTimeout(persistAudioTimeout);
  persistAudioTimeout = setTimeout(() => {
    CacheService.cacheJson('arknights_audio_maps_v2', {
      music: activeAudioMusic,
      sound: activeAudioSound
    }).catch(() => {});
  }, 2000);
}

async function resolveAssetUrl(type: AssetType, name: string): Promise<string> {
  const normalizedKey = `${type}:${name.trim().toLowerCase()}`;
  if (resolvedAudioCache[normalizedKey]) return resolvedAudioCache[normalizedKey];

  switch (type) {
    case 'background': {
      const res = await resolveVisualAssetUrl(name, 'background');
      resolvedAudioCache[normalizedKey] = res;
      return res;
    }
    case 'image': {
      const res = await resolveVisualAssetUrl(name, 'image');
      resolvedAudioCache[normalizedKey] = res;
      return res;
    }
    case 'character': {
      const parts = name.split('/');
      const encodedPath = parts.map(p => encodeURIComponent(p.toLowerCase())).join('/');
      
      if (parts.length === 1) {
        const baseNameMatch = name.match(/^([^#$]+)/);
        const rawBaseName = baseNameMatch ? baseNameMatch[1] : name;
        const baseName = rawBaseName.toLowerCase();
        const lowName = name.toLowerCase();
        
        const candidate1 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(lowName)}.png`;
        const candidate2 = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(rawBaseName)}/${encodeURIComponent(name)}.png`;
        if (await checkImageExists(candidate1)) return candidate1;
        if (await checkImageExists(candidate2)) return candidate2;
        return candidate1;
      }
      
      return `https://torappu.prts.wiki/assets/avg/characters/${encodedPath}.png`;
    }
    case 'character_body': {
      const parts = name.split('/');
      const baseName = parts[0].split('$')[0].toLowerCase();
      const rawBaseName = parts[0].split('$')[0];
      const encodedPath = parts.map(p => encodeURIComponent(p.toLowerCase())).join('/');
      
      let urlBase: string;
      if (parts.length > 1) {
        urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodedPath}.png`;
      } else {
        urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodedPath}.png`;
      }
      
      if (name.includes('$') || parts.length > 1) return urlBase;
      
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(baseName + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;
      if (await checkImageExists(urlBase)) return urlBase;

      // Варианты вида `char_002_amiya_5` лежат не в собственной папке, а в
      // папке базовой формы (`char_002_amiya_1`). Без этого спрайт получал
      // 404 и попадал в список «не загрузилось».
      const familyMatch = baseName.match(/^(.+?)_(\d+)$/);
      if (familyMatch) {
        const family = familyMatch[1];
        const familyCandidates = [
          `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(family + '_1')}/${encodeURIComponent(baseName)}.png`,
          `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(family)}/${encodeURIComponent(baseName)}.png`,
          `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(family + '_1')}/${encodeURIComponent(baseName + '$1')}.png`,
        ];
        for (const candidate of familyCandidates) {
          if (await checkImageExists(candidate)) return candidate;
        }
      }

      const urlOrigWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(rawBaseName)}/${encodeURIComponent(rawBaseName + '$1')}.png`;
      if (await checkImageExists(urlOrigWithDollar)) return urlOrigWithDollar;

      return urlWithDollar;
    }
    case 'character_face': {
      const [rawBase, rawExp] = name.split('/');
      const baseName = (rawBase || '').toLowerCase();
      const expression = (rawExp || '').toLowerCase();
      
      const urlBase = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression)}.png`;
      if (await checkImageExists(urlBase)) return urlBase;
      
      const urlWithDollar = `https://torappu.prts.wiki/assets/avg/characters/${encodeURIComponent(baseName)}/${encodeURIComponent(expression + '$1')}.png`;
      if (await checkImageExists(urlWithDollar)) return urlWithDollar;
      
      return urlWithDollar;
    }
    case 'music': {
      const parts = name.split('/');
      const baseNameOnly = parts[parts.length - 1];
      const cleanAudioName = baseNameOnly.replace(/^\$/, '').replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '').toLowerCase();

      // Пустая строка означает «проверено, не найдено» — такой кэш живёт недолго.
      const cached = activeAudioMusic[cleanAudioName];
      if (cached) return cached;

      // 1. Манифест хоста: точный путь вместе с префиксом движка, без перебора папок.
      const viaManifest = await resolveAudioViaManifest(name);
      if (viaManifest) {
        activeAudioMusic[cleanAudioName] = viaManifest;
        saveAudioMapsToCache();
        return viaManifest;
      }

      // 2. Ручной путь вида music/<папка>/<файл>, если он задан явно.
      const explicitCandidates: string[] = [];
      if (parts.length > 1) {
        const filteredParts = parts.filter((p, i) => {
          if (i === 0) {
            const low = p.toLowerCase();
            return low !== 'sound' && low !== 'sound_beta_2' && low !== 'sound_beta_1' && low !== 'voice' && low !== 'music';
          }
          return true;
        });
        const pathStr = filteredParts.map(p => p.toLowerCase()).join('/');
        explicitCandidates.push(`https://torappu.prts.wiki/assets/audio/${pathStr}.mp3`);
        explicitCandidates.push(`https://torappu.prts.wiki/assets/audio/music/${pathStr}.mp3`);
      }

      // 3. Перебор папок — последний рубеж. Идём строго последовательно: хост
      //    рейт-лимитит и при параллельных запросах честные треки выглядят как 404.
      const baseNames = [cleanAudioName];
      if (cleanAudioName.startsWith('m_')) {
        baseNames.push(cleanAudioName.replace(/^m_[a-z0-9]+?_/, ''));
      } else {
        for (const prefix of ['m_dia_', 'm_sys_', 'm_bat_', 'm_avg_', 'm_']) {
          baseNames.push(`${prefix}${cleanAudioName}`);
        }
      }

      const folders = ['music', 'music/avg', 'avg', 'battle', 'general', 'player',
                       'music/beta1_180603', 'music/beta2_180603', 'beta1_180603', 'beta2_180603'];

      const candidates = [
        ...explicitCandidates,
        ...baseNames.flatMap(bName => folders.map(folder =>
          `https://torappu.prts.wiki/assets/audio/${folder}/${bName}.mp3`))
      ];

      for (const url of candidates) {
        if (await checkImageExists(url)) {
          activeAudioMusic[cleanAudioName] = url;
          saveAudioMapsToCache();
          return url;
        }
      }

      // Ничего не нашлось — честно сообщаем, вместо того чтобы отдать URL,
      // который молча сломается в плеере.
      console.warn(`Music track not found on torappu.prts.wiki: ${name}`);
      activeAudioMusic[cleanAudioName] = '';
      return '';
    }
    case 'sound': {
      const parts = name.split('/');
      const baseNameOnly = parts[parts.length - 1];
      const cleanAudioName = baseNameOnly.replace(/^\$/, '').replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '').toLowerCase();
      
      if (cleanAudioName in activeAudioSound) {
        return activeAudioSound[cleanAudioName];
      }

      // Манифест хоста знает точный путь (`sound_beta_2/avg/...`,
      // `sound_beta_2/enemy/...`) и не требует перебора папок. Именно перебор
      // раньше давал по 40–50 лишних 404 на один отсутствующий звук и
      // задерживал аудио следующей сцены.
      const viaManifest = await resolveAudioViaManifest(name);
      if (viaManifest) {
        activeAudioSound[cleanAudioName] = viaManifest;
        saveAudioMapsToCache();
        return viaManifest;
      }
      
      const baseNames = [cleanAudioName];
      if (cleanAudioName.startsWith('s_')) {
        baseNames.push(cleanAudioName.substring(2));
      } else if (cleanAudioName.startsWith('d_')) {
        baseNames.push(cleanAudioName.substring(2));
      } else {
        baseNames.push(`s_${cleanAudioName}`);
        baseNames.push(`d_${cleanAudioName}`);
        baseNames.push(`s_avg_${cleanAudioName}`);
        baseNames.push(`d_avg_${cleanAudioName}`);
        baseNames.push(`s_b_${cleanAudioName}`);
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
      
      const foundSound = checkResults.find(r => r.exists);
      if (foundSound) {
        activeAudioSound[cleanAudioName] = foundSound.url;
        saveAudioMapsToCache();
        return foundSound.url;
      }
      
      console.warn(`Sound asset not found on torappu.prts.wiki: ${name}`);
      activeAudioSound[cleanAudioName] = '';
      return '';
    }
    case 'voice': {
      const cleanAudioName = name.replace(/^\$/, '').replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '').toLowerCase();
      return `https://torappu.prts.wiki/assets/audio/voice/${encodeURIComponent(cleanAudioName)}.mp3`;
    }
    default:
      return '';
  }
}

let preloadedImages: HTMLImageElement[] = [];
let preloadedAudio: HTMLAudioElement[] = [];
// Успешно предзагруженные в этом сеансе ассеты. Повторный заход в главу или
// фоновый префетч не должны заново тянуть те же байты.
const preloadedAssetKeys = new Set<string>();

function preloadedKeyOf(item: { url: string; cacheKey?: string }): string {
  return item.cacheKey || item.url;
}

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

/** Освобождает медиаплееры предзагрузки: Chrome лимитирует их число. */
export function releasePreloadedMedia(): void {
  preloadedAudio.forEach((audio) => {
    try {
      audio.pause();
      audio.oncanplaythrough = null;
      audio.onerror = null;
      audio.src = '';
      audio.load();
    } catch {
      /* элемент уже выгружен */
    }
  });
  preloadedAudio = [];
  preloadedImages.forEach((img) => {
    img.onload = null;
    img.onerror = null;
  });
  preloadedImages = [];
}

export function clearPreloadedImages(): void {
  releasePreloadedMedia();
  characterAssetInfoCache.clear();
  pendingCharacterInfoPromises.clear();
  naturalSizeCache.clear();
  loadedImageUrlSet.clear();
  releaseBlobRefs(assetCacheBlobRefs);
  // Сначала снимаем все ссылки, потом отзываем blob-URL: иначе URL из
  // urlCache остаются в памяти до следующего открытия читалки.
  clearUrlCache();
  CacheService.revokeBlobUrls();
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

/**
 * Тихо подгружает одну картинку в HTTP-кэш браузера. Дубликаты не грузятся.
 */
const quietPrefetched = new Set<string>();
// Фоновая догрузка идёт строго по одному файлу: не создаём параллельную
// пачку запросов к PRTS.
let quietChain: Promise<void> = Promise.resolve();

/**
 * Тихая догрузка аудио в HTTP-кэш браузера. Вызывается заранее (за несколько
 * реплик до `[Music]`/`[Sound]`), чтобы музыка стартовала без сетевой паузы.
 * На Android байты кладутся в assetStore фоновым prefetch-циклом, поэтому
 * здесь достаточно веб-пути.
 */
const quietAudioPrefetched = new Set<string>();
let quietAudioChain: Promise<void> = Promise.resolve();

export function preloadAudioQuietly(url: string): void {
  if (!url || typeof fetch !== 'function') return;
  if (url.startsWith('blob:') || url.startsWith('data:')) return;
  if (quietAudioPrefetched.has(url)) return;
  if (quietAudioPrefetched.size > 2000) quietAudioPrefetched.clear();
  quietAudioPrefetched.add(url);

  quietAudioChain = quietAudioChain.then(async () => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        quietAudioPrefetched.delete(url);
        return;
      }
      // Читаем тело целиком: без этого браузер может не положить файл в кэш.
      await response.arrayBuffer();
    } catch {
      quietAudioPrefetched.delete(url);
    }
  });
}

/**
 * Подгружает звук для ближайших строк. В отличие от картинок, аудио нельзя
 * предзагрузить «в общий котёл»: держим отдельную последовательную очередь,
 * чтобы не отбирать канал у спрайтов.
 */
export function prefetchStoryAudio(lines: StoryLine[]): void {
  // Android играет аудио из assetStore (blob), поэтому простой прогрев
  // HTTP-кэша там бесполезен: байты нужно именно сохранить. На сайте
  // наоборот — держим потоковую загрузку без лишних <audio>-элементов.
  if (platform.kind === 'capacitor') {
    void preloadAssets(
      lines,
      undefined,
      undefined,
      20000,
      { images: false, audio: 'all' }
    ).catch(() => []);
    return;
  }
  for (const line of lines) {
    if (!['music', 'sound', 'voice'].includes(line.type)) continue;
    const names = [line.assetName, line.introAssetName].filter(Boolean) as string[];
    for (const name of names) {
      void getImageUrl(line.type as AssetType, name)
        .then((url) => preloadAudioQuietly(url))
        .catch(() => {});
    }
  }
}

export function preloadImageQuietly(url: string): void {
  if (!url || typeof Image === 'undefined') return;
  if (url.startsWith('blob:') || url.startsWith('data:')) return;
  if (quietPrefetched.has(url)) return;
  if (quietPrefetched.size > 2000) quietPrefetched.clear();
  quietPrefetched.add(url);

  quietChain = quietChain.then(
    () =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          recordLoadedImage(url, img.naturalWidth, img.naturalHeight);
          resolve();
        };
        img.onerror = () => {
          // Ошибка не критична: основной <img> сам попробует зеркала.
          quietPrefetched.delete(url);
          resolve();
        };
        img.src = url;
      })
  );
}

const PREFETCH_CHAR_TYPES = new Set([
  'character',
  'charactertween',
  'charactercutin',
  'characteraction',
  'interlude',
]);

/**
 * Подгружает картинки для ближайших строк сценария, чтобы следующая сцена
 * появлялась без ожидания.
 */
export function prefetchStoryImages(lines: StoryLine[]): void {
  for (const line of lines) {
    const names = [line.assetName, (line as { assetName2?: string }).assetName2].filter(
      Boolean
    ) as string[];
    if (names.length === 0) continue;

    if (PREFETCH_CHAR_TYPES.has(line.type)) {
      for (const name of names) {
        if (SLOT_NAMES.has(name.toLowerCase().trim())) continue;
        void getCharacterAssetInfo(name)
          .then((info) => {
            if (info.bodyUrl) preloadImageQuietly(info.bodyUrl);
            if (info.faceUrl) preloadImageQuietly(info.faceUrl);
          })
          .catch(() => {});
      }
      continue;
    }

    if (['background', 'image', 'imagetween'].includes(line.type)) {
      // `animtext` — это текстовый стиль, а не файл изображения.
      const type: AssetType = line.type === 'imagetween' ? 'image' : (line.type as AssetType);
      for (const name of names) {
        void getImageUrl(type, name)
          .then((url) => preloadImageQuietly(url))
          .catch(() => {});
      }
    }
  }
}

/**
 * Блокирующая предзагрузка всех изображений главы (фоны, CG, персонажи,
 * cut-in). Нужна, чтобы к моменту старта истории спрайты уже были в кэше и
 * не появлялись с задержкой посреди сцены. Аудио сюда не входит — оно
 * догружается после старта и не блокирует читалку.
 */
export async function preloadStoryImages(
  lines: StoryLine[],
  onProgress?: (loaded: number, total: number, currentFile?: string) => void
): Promise<void> {
  const imageAssets = new Set<string>();
  const resolutionPromises: Promise<void>[] = [];

  const charLineTypes = ['character', 'charactertween', 'charactercutin', 'characteraction', 'interlude'];

  for (const line of lines) {
    if (line.assetName || (line.type === 'character' && line.assetName2)) {
      if (charLineTypes.includes(line.type)) {
        const names = [line.assetName, (line as { assetName2?: string }).assetName2].filter(Boolean) as string[];
        for (const name of names) {
          if (SLOT_NAMES.has(name.toLowerCase().trim())) continue;
          resolutionPromises.push(
            getCharacterAssetInfo(name).then((info) => {
              if (info.bodyUrl) imageAssets.add(info.bodyUrl);
              if (info.faceUrl) imageAssets.add(info.faceUrl);
            })
          );
        }
      } else if (['background', 'image', 'imagetween'].includes(line.type)) {
        // `animtext` — это текстовый стиль, а не файл изображения.
        const type: AssetType = line.type === 'imagetween' ? 'image' : (line.type as AssetType);
        if (line.assetName) {
          resolutionPromises.push(
            getImageUrl(type, line.assetName).then((url) => {
              if (url) imageAssets.add(url);
            })
          );
        }
      }
    }
  }

  await Promise.all(resolutionPromises);

  const urls = Array.from(imageAssets);
  const total = urls.length;
  let loaded = 0;

  const loadImage = (url: string) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        recordLoadedImage(url, img.naturalWidth, img.naturalHeight);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });

  // Строго последовательная загрузка: PRTS не любит параллельные пачки
  // запросов и начинает отдавать 404/таймауты. Один файл за раз.
  const CONCURRENCY = 1;
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      await loadImage(url);
      loaded += 1;
      onProgress?.(loaded, total, extractFileName(url));
    }
  });

  await Promise.all(workers);
  if (total > 0) onProgress?.(total, total, '');
}

/**
 * Предзагрузка «в фоне»: сначала первые строки (чтобы старт был мгновенным),
 * остальное — в простое, не соревнуясь с видимой сценой за канал.
 */
export function preloadAssetsInBackground(
  lines: StoryLine[],
  onProgress?: (loaded: number, total: number, currentFile?: string) => void
): void {
  const runRemaining = () => {
    const rest = lines.slice(12);
    if (rest.length === 0) return;
    void preloadAssets(rest, onProgress).catch(() => {});
  };

  void preloadAssets(lines.slice(0, 12), onProgress).catch(() => {});

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(runRemaining, { timeout: 4000 });
  } else {
    setTimeout(runRemaining, 1500);
  }
}

export interface PreloadFailure {
  url: string;
  type: 'image' | 'audio';
  /**
   * `timeout` — не уложилось в бюджет, `error` — сеть/404,
   * `network` — исключение, `unavailable` — хост перестал отдавать файлы.
   */
  reason: 'timeout' | 'error' | 'network' | 'unavailable';
}

/** Сколько всего ждём предполётную загрузку, прежде чем показать диалог. */
const PRELOAD_BUDGET_MS = 180000;

/**
 * Каким путём в этом сеансе реально ходят картинки PRTS: напрямую или через
 * серверный прокси. Один неудачный прямой запрос переключает все следующие,
 * иначе каждая картинка ждёт таймаут заново.
 */
let preferredImageTransport: 'direct' | 'weserv' | 'aceship' | 'proxy' | null = null;
/** Конкретный домен зеркала, который сработал (images.weserv.nl или wsrv.nl). */
let preferredWeservHost = 'https://images.weserv.nl/';

/** Зеркало картинок: тянет PRTS со своей стороны и не упирается в антибот. */
function weservUrl(rawUrl: string, host = 'https://images.weserv.nl/'): string {
  return `${host}?url=${encodeURIComponent(rawUrl)}`;
}

/**
 * Зеркало Arknight-Images: плоская раскладка вместо папок PRTS.
 *
 *   assets/avg/background/<name>.png  → avg/backgrounds/<name>.png
 *   assets/avg/images/<name>.png      → avg/images/<name>.png
 *   assets/avg/characters/<dir>/<f>.png → avg/characters/<dir>$1.png
 *                                        (или <dir>#<expr>.png для эмоций)
 */
const ACESHIP_BASES = [
  'https://fastly.jsdelivr.net/gh/Aceship/Arknight-Images@master',
  'https://raw.githubusercontent.com/Aceship/Arknight-Images/master',
];

function aceshipPath(rawUrl: string): string | null {
  const marker = '/assets/avg/';
  const index = rawUrl.indexOf(marker);
  if (index === -1) return null;
  const rest = rawUrl.slice(index + marker.length).split('?')[0];
  const segments = rest.split('/');
  const encode = (value: string) =>
    value.replace(/#/g, '%23').replace(/\$/g, '%24');

  if (segments.length === 2) {
    const [folder, file] = segments;
    if (folder === 'background' || folder === 'backgrounds') {
      return `avg/backgrounds/${encode(file)}`;
    }
    if (folder === 'images') {
      return `avg/images/${encode(file)}`;
    }
    return null;
  }

  if (segments.length === 3 && segments[0] === 'characters') {
    const [, dir, file] = segments;
    const name = file.replace(/\.png$/i, '');
    const flat = name.startsWith(dir) ? name : `${dir}#${name}`;
    return `avg/characters/${encode(`${flat}.png`)}`;
  }

  return null;
}

/** Адрес на зеркале Arknight-Images либо `null`, если файл не картиночный. */
function aceshipUrl(rawUrl: string, baseIndex = 0): string | null {
  const mapped = aceshipPath(rawUrl);
  if (!mapped) return null;
  const base = ACESHIP_BASES[baseIndex] ?? ACESHIP_BASES[0];
  return `${base}/${mapped}`;
}

export interface PreloadOptions {
  /** Грузить картинки (фон, CG, спрайты). */
  images?: boolean;
  /** Аудио: всё, только музыка или не грузить вовсе. */
  audio?: 'all' | 'music' | 'none';
}

export async function preloadAssets(
  lines: StoryLine[],
  onProgress?: (loaded: number, total: number, currentFile?: string) => void,
  signal?: AbortSignal,
  budgetMs: number = PRELOAD_BUDGET_MS,
  options: PreloadOptions = {}
): Promise<PreloadFailure[]> {
  if (signal?.aborted) return [];
  const wantImages = options.images !== false;
  const audioMode = options.audio ?? 'all';
  if (audioMode !== 'none') {
    await fetchLatestAudioMaps().catch(() => {});
    if (signal?.aborted) return [];
  }

  type PreloadItem = {
    url: string;
    type: 'image' | 'audio';
    /** Ключ, под которым байты кладутся в assetStore (для повторных заходов). */
    cacheKey?: string;
    /** Ключ `urlCache`, куда подставить blob-URL после скачивания. */
    cacheName?: string;
  };
  const items = new Map<string, PreloadItem>();
  const allItems: PreloadItem[] = [];
  const queue: PreloadItem[] = [];
  const waiters: Array<() => void> = [];
  let pendingResolutions = 0;
  let resolutionClosed = false;

  const wakeWorkers = () => {
    while (waiters.length > 0) waiters.shift()?.();
  };
  const waitForWork = () => new Promise<void>((resolve) => waiters.push(resolve));

  const addItem = (item: PreloadItem) => {
    if (!item.url) return;
    const dedupe = `${item.type}|${item.url}`;
    const existing = items.get(dedupe);
    if (!existing) {
      items.set(dedupe, item);
      allItems.push(item);
      queue.push(item);
      wakeWorkers();
      return;
    }
    if (!existing.cacheKey && item.cacheKey) {
      // Та же картинка, но теперь известен ключ кэша: заменяем запись, пока
      // она ещё не начала скачиваться.
      const queueIndex = queue.indexOf(existing);
      if (queueIndex >= 0) queue[queueIndex] = item;
      const allIndex = allItems.indexOf(existing);
      if (allIndex >= 0) allItems[allIndex] = item;
      items.set(dedupe, item);
      wakeWorkers();
    }
  };
  const resolutionPromises: Promise<void>[] = [];

  const charLineTypes = ['character', 'charactertween', 'charactercutin', 'characteraction', 'interlude'];

  for (const line of lines) {
    if (line.assetName || (line.type === 'character' && line.assetName2)) {
      if (wantImages && charLineTypes.includes(line.type)) {
        const names = [line.assetName, (line as { assetName2?: string }).assetName2].filter(Boolean) as string[];
        for (const name of names) {
          if (SLOT_NAMES.has(name.toLowerCase().trim())) continue;
          resolutionPromises.push(getCharacterAssetInfo(name).then(info => {
            // Спрайты персонажей кэшируются по своему исходному URL — именно
            // этот ключ проверяет getCharacterAssetInfo.
            for (const url of [info.bodyUrl, info.faceUrl]) {
              if (url) {
                addItem({
                  url,
                  type: 'image',
                  // Ключ кэша — исходный адрес PRTS, а не зеркало: именно по
                  // нему getCharacterAssetInfo ищет спрайт при повторном входе.
                  cacheKey: url.startsWith('blob:') ? undefined : cleanAndUnwrapUrl(url),
                });
              }
            }
          }));
        }
      } else if (wantImages && ['background', 'image', 'imagetween'].includes(line.type)) {
        // `animtext` — это текстовый стиль, а не файл изображения.
        const type: AssetType = line.type === 'imagetween' ? 'image' : (line.type as AssetType);
        const assetName = line.assetName;
        if (assetName) {
          resolutionPromises.push(
            getImageUrl(type, assetName).then(url => addItem({
              url,
              type: 'image',
              cacheKey: storyAssetCacheKey(type, assetName),
              cacheName: `${type}-${assetName.trim().toLowerCase()}`,
            }))
          );
        }
      } else if (
        audioMode !== 'none' &&
        ['music', 'sound', 'voice'].includes(line.type) &&
        (audioMode === 'all' || line.type === 'music')
      ) {
        const addAudio = (name: string) => {
          resolutionPromises.push(
            getImageUrl(line.type as AssetType, name).then(url => addItem({
              url,
              type: 'audio',
              cacheKey: storyAssetCacheKey(line.type as AssetType, name),
              cacheName: `${line.type}-${name.trim().toLowerCase()}`,
            }))
          );
        };
        if (line.assetName) addAudio(line.assetName);
        if (line.introAssetName) addAudio(line.introAssetName);
      }
    }
  }

  // Разрешение ассетов (character.json, манифест аудио) идёт параллельно с
  // загрузкой: раньше мы ждали ВСЕ ссылки, включая 1.7-МБ character.json, и
  // только потом начинали качать фоны. Теперь фон грузится сразу, как только
  // для него известен URL.
  pendingResolutions = resolutionPromises.length;
  for (const promise of resolutionPromises) {
    void promise
      .finally(() => {
        pendingResolutions = Math.max(0, pendingResolutions - 1);
        wakeWorkers();
      })
      .catch(() => undefined);
  }
  const resolutionTimer = setTimeout(() => {
    if (pendingResolutions > 0) {
      console.warn('[preload] разрешение ассетов не уложилось в лимит');
    }
    resolutionClosed = true;
    pendingResolutions = 0;
    wakeWorkers();
  }, 15000);

  let loaded = 0;

  const updateProgress = (url: string) => {
    loaded++;
    const fileName = extractFileName(url);
    if (onProgress) onProgress(loaded, items.size, fileName);
  };

  /**
   * Все способы достать картинку: прямой, зеркала, затем серверный прокси.
   * Порядок и есть приоритет; рабочий способ запоминается на сеанс.
   */
  const imageCandidates = (url: string): string[] => {
    if (!/^https?:\/\//i.test(url)) return [url];
    // Ссылка могла прийти уже обёрнутой в зеркало/прокси. Разворачиваем,
    // иначе получается `weserv → weserv` и гарантированный 404.
    const rawUrl = cleanAndUnwrapUrl(url);
    if (!/^https?:\/\//i.test(rawUrl)) return [url];
    // Зеркала первыми: прямой PRTS нередко отвечает по 3–5 секунд (антибот)
    // или вовсе рвёт запрос, а images.weserv.nl отдаёт тот же файл за доли
    // секунды. Если зеркало недоступно, цепочка ниже всё равно дойдёт до
    // прямого адреса.
    const list: string[] = [];
    if (canUseWeserv(rawUrl)) {
      list.push(weservUrl(rawUrl));
      // wsrv.nl — тот же сервис под другим доменом: помогает, когда основной
      // адрес заблокирован на уровне DNS/провайдера.
      list.push(weservUrl(rawUrl, 'https://wsrv.nl/'));
    }
    list.push(rawUrl);
    // Серверный прокси надёжнее плоских зеркал Aceship: пробуем его раньше.
    const proxied = platform.proxyUrl(rawUrl);
    if (proxied && proxied !== rawUrl) list.push(proxied);
    const aceshipJsd = aceshipUrl(rawUrl, 0);
    if (aceshipJsd) list.push(aceshipJsd);
    const aceshipRaw = aceshipUrl(rawUrl, 1);
    if (aceshipRaw) list.push(aceshipRaw);
    return list;
  };

  const transportOf = (
    candidate: string
  ): 'direct' | 'weserv' | 'aceship' | 'proxy' => {
    if (candidate.includes('weserv.nl') || candidate.includes('wsrv.nl')) return 'weserv';
    if (candidate.includes('Aceship/Arknight-Images')) return 'aceship';
    if (candidate.startsWith('/api/proxy')) return 'proxy';
    return 'direct';
  };

  const loadImageOnce = (
    src: string,
    originalUrl: string,
    timeoutMs: number
  ): Promise<'ok' | 'timeout' | 'error'> =>
    new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => finish('error');
      const finish = (value: 'ok' | 'timeout' | 'error') => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      };
      timer = setTimeout(() => finish('timeout'), timeoutMs);
      signal?.addEventListener('abort', onAbort, { once: true });
      img.onload = () => {
        recordLoadedImage(originalUrl, img.naturalWidth, img.naturalHeight);
        finish('ok');
      };
      img.onerror = () => finish('error');
      img.src = src;
      preloadedImages.push(img);
    });

  /**
   * Загрузка картинки с «подстраховкой»: сначала зеркало, но если оно не
   * ответило за 1.2 с (или вернуло ошибку), параллельно стартует прямой
   * адрес PRTS. Первый успех выигрывает.
   *
   * Так мы не ждём 6–8 секунд на медленное зеркало и не остаёмся без
   * спрайта, когда конкретный файл на зеркале недоступен (например,
   * `avg_npc_188` отдаётся напрямую, а через wsrv — таймаут).
   */
  const loadImageAdaptive = (
    url: string,
    timeoutMs: number
  ): Promise<{
      outcome: 'ok' | 'timeout' | 'error';
      transport?: 'direct' | 'weserv' | 'proxy' | 'aceship';
    }> =>
    new Promise((resolve) => {
      const raw = cleanAndUnwrapUrl(url);
      const sources: Array<{
        src: string;
        transport: 'direct' | 'weserv' | 'proxy' | 'aceship';
      }> = [];
      if (/^https?:\/\//i.test(raw)) {
        if (canUseWeserv(raw)) {
          sources.push({ src: weservUrl(raw), transport: 'weserv' });
        }
        sources.push({ src: raw, transport: 'direct' });
        const proxied = platform.proxyUrl(raw);
        if (proxied && proxied !== raw) {
          sources.push({ src: proxied, transport: 'proxy' });
        }
        // Aceship/JSDelivr спасает, когда PRTS и его зеркало одновременно
        // не отвечают. Запускается последним страховочным транспортом.
        const aceship = aceshipUrl(raw, 0);
        if (aceship) sources.push({ src: aceship, transport: 'aceship' });
      } else {
        sources.push({ src: url, transport: 'direct' });
      }

      let settled = false;
      let started = 0;
      let failed = 0;
      let nextIndex = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const hedgeTimers: Array<ReturnType<typeof setTimeout>> = [];
      const images: HTMLImageElement[] = [];

      const finish = (
        outcome: 'ok' | 'timeout' | 'error',
        transport?: 'direct' | 'weserv' | 'proxy' | 'aceship'
      ) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        for (const hedgeTimer of hedgeTimers) clearTimeout(hedgeTimer);
        for (const img of images) {
          img.onload = null;
          img.onerror = null;
        }
        resolve({ outcome, transport });
      };

      const start = (source: {
        src: string;
        transport: 'direct' | 'weserv' | 'proxy' | 'aceship';
      }) => {
        if (settled) return;
        started += 1;
        const img = new Image();
        images.push(img);
        img.onload = () => {
          if (settled) return;
          recordLoadedImage(url, img.naturalWidth, img.naturalHeight);
          // Отменяем проигравший запрос, чтобы не тянуть лишние байты.
          for (const other of images) {
            if (other !== img) {
              other.onload = null;
              other.onerror = null;
              other.src = '';
            }
          }
          finish('ok', source.transport);
        };
        img.onerror = () => {
          failed += 1;
          // Ошибка зеркала — сразу пробуем следующий источник, не ждём
          // страховочный таймер.
          if (nextIndex < sources.length) {
            startNext();
            return;
          }
          if (failed >= started) finish('error');
        };
        img.src = source.src;
      };

      const startNext = () => {
        if (settled) return;
        const source = sources[nextIndex];
        nextIndex += 1;
        if (!source) return;
        start(source);
      };

      timer = setTimeout(() => finish('timeout'), Math.max(6000, timeoutMs));

      startNext();
      // Страховочные запуски: каждые 1.2 с подключаем следующий транспорт,
      // если предыдущий ещё не ответил.
      for (let index = 1; index < sources.length; index += 1) {
        hedgeTimers.push(
          setTimeout(() => {
            if (!settled && nextIndex < sources.length) startNext();
          }, 1200 * index)
        );
      }
    });

  const loadAudioOnce = (src: string, timeoutMs: number): Promise<'ok' | 'timeout' | 'error'> =>
    new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onAbort = () => finish('error');
      const finish = (value: 'ok' | 'timeout' | 'error') => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(value);
      };
      timer = setTimeout(() => finish('timeout'), timeoutMs);
      signal?.addEventListener('abort', onAbort, { once: true });
      audio.preload = 'auto';
      audio.oncanplaythrough = () => finish('ok');
      audio.onerror = () => finish('error');
      audio.src = src;
      audio.load();
      preloadedAudio.push(audio);
    });

  const base64ToBlob = (base64: string, mime: string): Blob => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  };

  const fetchBytes = async (
    src: string,
    timeoutMs: number,
    accept?: (type: string) => boolean
  ): Promise<Blob | null> => {
    // На Android window.fetch перехвачен CapacitorHttp, но бинарные ответы
    // проходят только с явным responseType: 'blob'. Иначе картинки приходят
    // как текст и сохраняются битыми.
    if (platform.kind === 'capacitor') {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const response = await CapacitorHttp.request({
          url: src,
          method: 'GET',
          responseType: 'blob',
          connectTimeout: timeoutMs,
          readTimeout: timeoutMs,
        });
        if (response.status < 200 || response.status >= 300) return null;
        const mime =
          response.headers['Content-Type'] ||
          response.headers['content-type'] ||
          'application/octet-stream';
        const blob = base64ToBlob(String(response.data || ''), mime);
        if (!blob.size) return null;
        if (blob.type && accept && !accept(blob.type)) return null;
        return blob;
      } catch {
        return null;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await platform.fetch(src, { signal: controller.signal });
      if (!response.ok) return null;
      const blob = await response.blob();
      if (!blob.size) return null;
      if (blob.type && accept && !accept(blob.type)) return null;
      return blob;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  /** Кладём байты в persistent-кэш и сразу подставляем blob в urlCache. */
  const storeFetched = async (
    item: PreloadItem,
    blob: Blob,
    mime: string
  ): Promise<boolean> => {
    if (!item.cacheKey) return false;
    try {
      await assetStore.put(item.cacheKey, blob, blob.type || mime);
    } catch {
      return false;
    }
    if (item.type === 'image') {
      try {
        if (typeof createImageBitmap === 'function') {
          const bitmap = await createImageBitmap(blob);
          recordLoadedImage(item.cacheKey, bitmap.width, bitmap.height);
          bitmap.close?.();
        }
      } catch {
        /* размеры подхватятся при отрисовке */
      }
    }
    const shouldUseBlob =
      item.type === 'image' || platform.kind === 'capacitor';
    if (shouldUseBlob && item.cacheName) {
      const blobUrl = await acquireBlobUrl(urlCacheBlobRefs, item.cacheKey);
      if (blobUrl) urlCache.set(item.cacheName, blobUrl);
    }
    return true;
  };

  const loadAsset = async (
    item: PreloadItem
  ): Promise<PreloadFailure | null> => {
    const { url, type } = item;
    const cacheId = preloadedKeyOf(item);
    if (preloadedAssetKeys.has(cacheId)) {
      updateProgress(url);
      return null;
    }
    try {
      if (type === 'audio') {
        // Сначала скачиваем байты в кэш (Android): иначе WebView проигрывает
        // трек потоком и при каждом повторе ходит в сеть. На сайте оставляем
        // поток: Safari плохо играет blob-аудио.
        if (item.cacheKey && platform.kind === 'capacitor' && !url.startsWith('blob:')) {
          const audioCandidates = [url];
          const proxiedAudio = platform.proxyUrl(url);
          if (proxiedAudio && proxiedAudio !== url) audioCandidates.push(proxiedAudio);
          for (const candidate of audioCandidates) {
            const blob = await fetchBytes(candidate, 15000);
            if (blob && (await storeFetched(item, blob, 'audio/mpeg'))) {
              audioFailStreak = 0;
              preloadedAssetKeys.add(cacheId);
              return null;
            }
          }
        }

        // Резерв: потоковая предзагрузка (и для Safari, где blob-аудио капризно).
        let outcome: 'ok' | 'timeout' | 'error' = 'error';
        const audioCandidates = [url];
        const proxiedAudio = platform.proxyUrl(url);
        if (proxiedAudio && proxiedAudio !== url) audioCandidates.push(proxiedAudio);
        if (audioFailStreak >= 3) {
          return { url, type, reason: 'unavailable' };
        }
        for (const candidate of audioCandidates) {
          outcome = await loadAudioOnce(candidate, 6000);
          if (outcome === 'ok') break;
        }
        if (outcome === 'ok') {
          audioFailStreak = 0;
          preloadedAssetKeys.add(cacheId);
          return null;
        }
        audioFailStreak += 1;
        return { url, type, reason: outcome };
      }

      const cachedBlobUrl = await acquireBlobUrl(assetCacheBlobRefs, url);
      if (cachedBlobUrl) {
        const cachedOutcome = await loadImageOnce(cachedBlobUrl, url, 6000);
        if (cachedOutcome === 'ok') {
          preloadedAssetKeys.add(cacheId);
          return null;
        }
      }

      const candidates = imageCandidates(url);
      // Известный рабочий путь — первым; неизвестный проверяем с коротким
      // таймаутом, чтобы один недоступный хост не съел весь бюджет.
      const ordered = preferredImageTransport
        ? [
            ...candidates.filter((c) => transportOf(c) === preferredImageTransport),
            ...candidates.filter((c) => transportOf(c) !== preferredImageTransport),
          ]
        : candidates;
      const firstTimeout = preferredImageTransport ? 6000 : 3500;

      // Основной путь на Android: скачать байты и сохранить их, чтобы при
      // чтении картинка бралась из кэша, а не из сети.
      // На сайте не форсируем fetch: PRTS иногда отдаёт CORS-ошибку на
      // fetch, хотя <img> тот же файл грузит нормально. Изображения там
      // кэширует Service Worker (CacheFirst), а лишние 3–5 секунд ожидания
      // на старте главы недопустимы.
      if (
        platform.kind === 'capacitor' &&
        item.cacheKey &&
        !url.startsWith('blob:') &&
        !url.startsWith('data:')
      ) {
        for (let index = 0; index < ordered.length; index += 1) {
          const candidate = ordered[index];
          const blob = await fetchBytes(
            candidate,
            index === 0 ? firstTimeout : 6000,
            (mime) => mime.startsWith('image/') || mime === 'application/octet-stream'
          );
          if (!blob) continue;
          if (!(await storeFetched(item, blob, 'image/png'))) continue;
          preferredImageTransport = transportOf(candidate);
          if (preferredImageTransport === 'weserv') {
            preferredWeservHost = candidate.startsWith('https://wsrv.nl/')
              ? 'https://wsrv.nl/'
              : 'https://images.weserv.nl/';
          }
          preloadedAssetKeys.add(cacheId);
          return null;
        }
      }

      // Зеркало + прямой адрес с подстраховкой: первый успех выигрывает.
      const adaptive = await loadImageAdaptive(url, firstTimeout);
      if (adaptive.outcome === 'ok') {
        // Aceship — аварийный источник, не общий транспорт.
        if (adaptive.transport && adaptive.transport !== 'aceship') {
          preferredImageTransport = adaptive.transport;
        }
        if (adaptive.transport === 'weserv') {
          preferredWeservHost = 'https://images.weserv.nl/';
        }
        preloadedAssetKeys.add(cacheId);
        return null;
      }

      // Экзотические зеркала (Aceship, серверный прокси) — только если не
      // сработали ни PRTS, ни weserv.
      for (const candidate of ordered) {
        const transport = transportOf(candidate);
        if (transport === 'weserv' || transport === 'direct' || transport === 'proxy') continue;
        const outcome = await loadImageOnce(candidate, url, 6000);
        if (outcome === 'ok') {
          // Aceship — только аварийный источник для конкретного файла, не
          // общий транспорт: его плоские пути есть не для всех спрайтов.
          if (transport !== 'aceship') preferredImageTransport = transport;
          preloadedAssetKeys.add(cacheId);
          return null;
        }
      }
      return { url, type, reason: adaptive.outcome };
    } catch {
      return { url, type, reason: 'network' };
    } finally {
      updateProgress(url);
    }
  };

  const failures: PreloadFailure[] = [];
  // Если хост заблокировал аудио, не тратим по 10 секунд на каждый трек.
  let audioFailStreak = 0;
  // Умеренная параллельность: 4 файла одновременно. Последовательная
  // загрузка первых 12 строк занимала до 25–30 секунд; PRTS и зеркала
  // спокойно держат такую нагрузку.
  // Общий бюджет: лучше показать диалог с ошибками, чем висеть на 0%,
  // если хост отвечает по 10 секунд на каждый файл.
  const deadline = Date.now() + budgetMs;

  const runWorkers = async (concurrency: number) => {
    const worker = async () => {
      while (!signal?.aborted) {
        const item = queue.shift();
        if (!item) {
          if (resolutionClosed || pendingResolutions <= 0) {
            // Очередь могла пополниться между проверкой и пробуждением.
            if (queue.length === 0) return;
            continue;
          }
          await waitForWork();
          continue;
        }
        if (Date.now() > deadline) {
          failures.push({ url: item.url, type: item.type, reason: 'timeout' });
          updateProgress(item.url);
          continue;
        }
        const failure = await loadAsset(item);
        if (failure) failures.push(failure);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  };

  await runWorkers(4);
  clearTimeout(resolutionTimer);
  if (signal?.aborted) return [];
  // Спрайты персонажей кэшируются по исходному URL: сбрасываем ранее
  // вычисленные ссылки, чтобы они пересобрались уже как blob-URL.
  if (allItems.some((item) => item.type === 'image' && item.cacheKey && !item.cacheName)) {
    characterAssetInfoCache.clear();
  }
  await new Promise(resolve => setTimeout(resolve, 200));
  return failures;
}
