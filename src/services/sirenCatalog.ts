import { CacheService } from './cacheService';

/**
 * Каталог саундтреков Monster Siren Records (Hypergryph) и скачивание файлов.
 *
 * Раньше всё делалось прямо в компоненте:
 *  — два последовательных запроса при каждом монтировании, без кэша;
 *  — при сбое подставлялись шесть выдуманных треков с несуществующими cid;
 *  — файл трека целиком читался в Blob (WAV по 35–58 МБ) и сохранялся
 *    с расширением `.mp3`, хотя приходил `audio/wav`;
 *  — альбом целиком собирался в памяти и дважды (треки + zip).
 */

export interface AlbumData {
  cid: string;
  name: string;
  coverUrl?: string;
  artistes?: string[];
}

export interface SongData {
  cid: string;
  name: string;
  albumCid: string;
  artists?: string[];
}

export interface SongDetail {
  cid: string;
  name: string;
  albumCid: string;
  sourceUrl: string;
  lyricUrl?: string | null;
  mvUrl?: string | null;
  mvCoverUrl?: string | null;
  artists?: string[];
}

const API = 'https://monster-siren.hypergryph.com/api';
const CATALOG_CACHE_KEY = 'siren_catalog_v1';
/** Каталог меняется редко — сутки достаточно, зато вкладка открывается мгновенно. */
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
/** Дальше официальный CDN не отдаёт размер — считаем средним по формату. */
const FALLBACK_TRACK_BYTES = 45 * 1024 * 1024;

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

interface CachedCatalog {
  savedAt: number;
  albums: AlbumData[];
  songs: SongData[];
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** Прямая загрузка, затем через прокси — CDN иногда режет запросы без Origin. */
async function fetchJson(url: string): Promise<unknown> {
  try {
    return await getJson(url);
  } catch {
    const proxied = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!proxied.ok) throw new Error(`${proxied.status} ${url}`);
    return proxied.json();
  }
}

function unwrapList(payload: unknown): unknown[] {
  const data = (payload as { data?: unknown })?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as { list?: unknown[] }).list)) {
    return (data as { list: unknown[] }).list;
  }
  if (Array.isArray(payload)) return payload;
  throw new Error('Неожиданный формат ответа API');
}

/** Ответ приходит с CORS-заголовками; при сбое идём через прокси. */
export async function loadCatalog(force = false): Promise<{ albums: AlbumData[]; songs: SongData[] }> {
  if (!force) {
    const cached = await CacheService.getCachedJson<CachedCatalog>(CATALOG_CACHE_KEY);
    if (cached && Date.now() - cached.savedAt < CATALOG_TTL_MS) {
      return { albums: cached.albums, songs: cached.songs };
    }
  }

  // Оба списка независимы — тянем одновременно, а не по очереди.
  const [albumsRaw, songsRaw] = await Promise.all([
    fetchJson(`${API}/albums`),
    fetchJson(`${API}/songs`)
  ]);

  const albums = unwrapList(albumsRaw) as AlbumData[];
  const songs = unwrapList(songsRaw) as SongData[];
  if (!albums.length || !songs.length) {
    throw new CatalogError('Каталог пришёл пустым');
  }

  await CacheService.cacheJson<CachedCatalog>(CATALOG_CACHE_KEY, {
    savedAt: Date.now(),
    albums,
    songs
  });

  return { albums, songs };
}

export async function fetchSongDetail(cid: string): Promise<SongDetail> {
  const payload = await fetchJson(`${API}/song/${cid}`);
  const detail = (payload as { data?: SongDetail })?.data;
  if (!detail?.sourceUrl) {
    throw new CatalogError('В базе нет ссылки на файл трека');
  }
  return detail;
}

export async function fetchAlbumTracks(albumCid: string): Promise<{ cid: string; name: string }[]> {
  try {
    const payload = await fetchJson(`${API}/album/${albumCid}/detail`);
    const songs = (payload as { data?: { songs?: unknown } })?.data?.songs;
    if (Array.isArray(songs) && songs.length) {
      return songs as { cid: string; name: string }[];
    }
  } catch {
    // откатимся на локальный список треков альбома
  }
  return [];
}

/** `audio/wav` → `.wav`, `audio/mpeg` → `.mp3` — расширение по факту, а не по привычке. */
export function extensionForContentType(contentType: string | null | undefined, url = ''): string {
  const type = (contentType || '').toLowerCase();
  if (type.includes('wav') || type.includes('x-wav')) return '.wav';
  if (type.includes('mpeg') || type.includes('mp3')) return '.mp3';
  if (type.includes('ogg')) return '.ogg';
  if (type.includes('flac')) return '.flac';
  if (type.includes('m4a') || type.includes('mp4')) return '.m4a';
  if (/\.wav(\?|$)/i.test(url)) return '.wav';
  if (/\.mp3(\?|$)/i.test(url)) return '.mp3';
  return '.audio';
}

export interface DownloadProgress {
  loaded: number;
  total: number;
}

export interface DownloadedFile {
  blob: Blob;
  extension: string;
}

/**
 * Качает трек потоком: читает чанки, поэтому появляется честный прогресс
 * и не нужно держать в памяти ничего сверх накопленного Blob.
 * Если CDN не отдал размер — обходимся без прогресса в процентах.
 */
export async function downloadAudio(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<DownloadedFile> {
  const headers: RequestInit = {};
  let res = await fetch(url, headers);
  if (!res.ok) {
    res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  }
  if (!res.ok) throw new Error('Не удалось получить файл трека');

  const extension = extensionForContentType(res.headers.get('content-type'), url);
  const declared = Number(res.headers.get('content-length') || 0);

  if (!res.body) {
    const blob = await res.blob();
    onProgress?.({ loaded: blob.size, total: declared || blob.size });
    return { blob, extension };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const total = declared || 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.({ loaded, total });
    }
  }

  return { blob: new Blob(chunks, { type: res.headers.get('content-type') || 'audio/wav' }), extension };
}

/** Отдаёт файл в браузер одним кликом. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function safeFileName(name: string, fallback = 'track'): string {
  const cleaned = name.replace(/[/\\?%*:|"<>]/g, '_').trim();
  return cleaned || fallback;
}

/** Грубая оценка размера альбома — чтобы предупредить до начала долгой закачки. */
export function estimateAlbumBytes(trackCount: number): number {
  return trackCount * FALLBACK_TRACK_BYTES;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1000 ? `${(mb / 1024).toFixed(1)} ГБ` : `${mb.toFixed(0)} МБ`;
}