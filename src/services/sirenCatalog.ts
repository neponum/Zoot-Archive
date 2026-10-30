import { CacheService } from './cacheService';

/**
 * Каталог саундтреков Monster Siren Records (Hypergryph).
 *
 * Здесь только чтение каталога и метаданных трека. Аудио принадлежит
 * правообладателю, поэтому сайт ничего не скачивает и не хранит: плеер
 * открывает официальный поток с CDN, а кнопки ведут на страницу трека
 * на monster-siren.hypergryph.com.
 *
 * История: раньше модуль умел собирать треки в Blob, склеивать альбомы
 * в ZIP и отдавать файлы на скачивание. От этого отказались — см.
 * страницу /takedown и /disclaimer.
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

/** Официальная страница трека — единственный «скачать/слушать» вне нашего плеера. */
export const OFFICIAL_SONG_BASE = 'https://monster-siren.hypergryph.com/music';
export const OFFICIAL_SITE = 'https://monster-siren.hypergryph.com';

export const officialSongUrl = (cid: string): string => `${OFFICIAL_SONG_BASE}/${cid}`;

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
