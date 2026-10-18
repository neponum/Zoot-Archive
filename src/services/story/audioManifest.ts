import { CacheService } from '../cacheService';

/**
 * Резолвер аудио через манифест torappu.prts.wiki.
 *
 * У хоста есть собственный поиск по ассетам:
 *   GET /api/v1/version                            → список релизов
 *   GET /api/v1/manifest/{versionId}/search?q=<имя> → путь к файлу
 *
 * Отдаёт точный путь вместе с префиксом движка (`m_dia_`, `m_sys_`, `m_bat_`,
 * `m_avg_`), поэтому перебирать папки и угадывать имя не нужно. Манифест
 * обновляется владельцем хоста под каждый релиз игры — ручная индексация не
 * нужна.
 *
 * Игровые пути выглядят как `audio/sound_beta_2/music/<папка>/<файл>`, а
 * раздаются как `assets/audio/music/<папка>/<файл>.mp3`.
 */

const API_BASE = 'https://torappu.prts.wiki/api/v1';
const ASSETS_BASE = 'https://torappu.prts.wiki/assets/';
const VERSION_CACHE_KEY = 'prts_asset_version_v1';
const MANIFEST_CACHE_KEY = 'prts_audio_manifest_v1';
/** Сколько живёт отрицательный ответ: трек могут добавить на хосте позже. */
const NEGATIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ManifestHit {
  name: string;
  path: string;
  nodeType: string;
}

let versionPromise: Promise<number | null> | null = null;
let negativeHits = new Map<string, number>();

/** `audio/sound_beta_2/music/beta1/x.mp3` → `assets/audio/music/beta1/x.mp3` */
function manifestPathToUrl(path: string): string {
  // Игровые пути: `audio/sound_beta_2/music/<папка>/<файл>` и `audio/sound_beta_2/dialog/<файл>`.
  // Хост раздаёт их как `assets/audio/<папка>/<файл>.mp3`.
  const lowered = path.toLowerCase();
  const normalized = lowered.replace(/^audio\/sound_beta_2\//, 'audio/');
  return ASSETS_BASE + normalized + '.mp3';
}

/** `$babel_loop` → `babel_loop` */
function cleanAudioName(name: string): string {
  const base = name.split('/').pop() || name;
  return base
    .replace(/^\$/, '')
    .replace(/\.(mp3|wav|ogg|flac|aac|m4a)$/i, '')
    .toLowerCase();
}

/** Варианты запроса: как есть, с системными префиксами, если в сценарии имя уже полное. */
function queryVariants(cleanName: string): string[] {
  const variants = [cleanName];
  if (cleanName.startsWith('m_')) {
    const stripped = cleanName.replace(/^m_[a-z0-9]+?_/, '');
    if (stripped !== cleanName) variants.push(stripped);
  } else {
    for (const prefix of ['m_dia_', 'm_sys_', 'm_bat_', 'm_avg_', 'm_']) {
      variants.push(prefix + cleanName);
    }
  }
  return [...new Set(variants)];
}

async function fetchLatestVersionId(): Promise<number | null> {
  if (versionPromise) return versionPromise;

  versionPromise = (async () => {
    try {
      const cached = await CacheService.getCachedJson<number>(VERSION_CACHE_KEY);
      if (cached) return cached;
    } catch {
      // кэш недоступен — идём в сеть
    }
    try {
      const response = await fetch(`${API_BASE}/version`, { headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const versions = (await response.json()) as { id: number }[];
      if (!Array.isArray(versions) || versions.length === 0) return null;
      const latest = versions[versions.length - 1].id;
      CacheService.cacheJson(VERSION_CACHE_KEY, latest).catch(() => {});
      return latest;
    } catch {
      return null;
    }
  })();

  return versionPromise;
}

async function searchManifest(versionId: number, query: string): Promise<ManifestHit | null> {
  try {
    const response = await fetch(
      `${API_BASE}/manifest/${versionId}/search?q=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return null;
    const hits = (await response.json()) as ManifestHit[];
    if (!Array.isArray(hits)) return null;

    const files = hits.filter((hit) => hit.nodeType === 'file');
    // В манифесте путь и имя БЕЗ расширения (`.../m_dia_babel_loop`), поэтому
    // отсеиваем по префиксу `audio/`, а не по `.mp3`.
    const audio = files.filter((hit) => hit.path.toLowerCase().startsWith('audio/'));
    // Короткое имя вроде `midautumn` совпадает и с артом магазина, и с треком:
    // сперва пробуем папку music/, затем любой аудиофайл. Не-аудио не берём никогда —
    // иначе в плеер уедет URL картинки.
    return (
      audio.find((hit) => hit.path.toLowerCase().includes('/music/')) ??
      audio[0] ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Ищет трек в манифесте хоста. Возвращает прямой URL либо null.
 * Результат (включая отрицательный) кэшируется локально.
 */
export async function resolveAudioViaManifest(
  rawName: string
): Promise<string | null> {
  const cleanName = cleanAudioName(rawName);
  if (!cleanName) return null;

  const negativeAt = negativeHits.get(cleanName);
  if (negativeAt && Date.now() - negativeAt < NEGATIVE_TTL_MS) return null;

  const versionId = await fetchLatestVersionId();
  if (!versionId) return null;

  for (const query of queryVariants(cleanName)) {
    const hit = await searchManifest(versionId, query);
    if (!hit) continue;
    const url = manifestPathToUrl(hit.path);
    if (!url) continue;
    negativeHits.delete(cleanName);
    const cache = await CacheService.getCachedJson<Record<string, string>>(MANIFEST_CACHE_KEY);
    CacheService.cacheJson(MANIFEST_CACHE_KEY, { ...(cache ?? {}), [cleanName]: url }).catch(() => {});
    return url;
  }

  negativeHits.set(cleanName, Date.now());
  return null;
}

/** Сброс отрицательного кэша — например, при ручной перезагрузке. */
export function clearAudioNegativeCache(): void {
  negativeHits.clear();
}