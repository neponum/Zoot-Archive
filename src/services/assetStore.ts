/**
 * Хранилище скачанных ассетов и текстов.
 *
 * На сайте (и в Android WebView) доступен Cache Storage — он и используется.
 * В Android WebView Cache Storage может быть недоступен, поэтому есть резервный
 * бэкенд на IndexedDB: обычные Blob-записи с ключом-URL.
 *
 * Интерфейс намеренно маленький: get/put/has/delete/keys/stats/clear.
 * Логика кэша (текст, JSON, blob-URL) живёт в `CacheService`.
 */

const DB_NAME = 'rhodes-asset-cache';
const DB_VERSION = 1;
const STORE = 'files';
const CACHE_NAME = 'arknights-story-cache-v1';

export type AssetStoreKind = 'cache-storage' | 'indexeddb' | 'memory';

interface StoredRecord {
  url: string;
  blob: Blob;
  contentType: string;
  date: string;
}

function available(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}

const cacheStorageAvailable = () =>
  available(() => typeof caches !== 'undefined' && typeof caches.open === 'function');

const indexedDbAvailable = () =>
  available(
    () =>
      typeof indexedDB !== 'undefined' && typeof indexedDB.open === 'function'
  );

// ---------------------------------------------------------------- Cache Storage

async function csOpen(): Promise<Cache> {
  return caches.open(CACHE_NAME);
}

// ------------------------------------------------------------------- IndexedDB

let dbPromise: Promise<IDBDatabase> | null = null;

function idb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'url' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

async function idbRun<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest | null
): Promise<T | null> {
  const db = await idb();
  return new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = run(store);
    let result: T | null = null;
    if (request) {
      request.onsuccess = () => {
        result = request.result as T;
      };
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

// --------------------------------------------------------------------- Memo

const memory = new Map<string, Blob>();

// ------------------------------------------------------------------- Backend

type Backend = 'cache-storage' | 'indexeddb' | 'memory';

let backend: Backend | null = null;

async function pickBackend(): Promise<Backend> {
  if (backend) return backend;
  if (cacheStorageAvailable()) {
    try {
      await caches.open(CACHE_NAME);
      backend = 'cache-storage';
      return backend;
    } catch {
      /* WebView без Cache Storage — уходим в IndexedDB */
    }
  }
  backend = indexedDbAvailable() ? 'indexeddb' : 'memory';
  return backend;
}

export function assetStoreKind(): AssetStoreKind {
  return backend ?? 'cache-storage';
}

export const assetStore = {
  async put(url: string, blob: Blob, contentType: string): Promise<void> {
    const target = await pickBackend();
    if (target === 'cache-storage') {
      const cache = await csOpen();
      await cache.put(
        url,
        new Response(blob, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(blob.size),
            'X-Cache-Date': new Date().toISOString(),
          },
        })
      );
      return;
    }
    if (target === 'indexeddb') {
      await idbRun('readwrite', (store) =>
        store.put({
          url,
          blob,
          contentType,
          date: new Date().toISOString(),
        } satisfies StoredRecord)
      );
      return;
    }
    memory.set(url, blob);
  },

  async get(url: string): Promise<Blob | null> {
    const target = await pickBackend();
    if (target === 'cache-storage') {
      const cache = await csOpen();
      const response = await cache.match(url);
      if (!response) return null;
      try {
        const blob = await response.blob();
        return blob.size > 0 ? blob : null;
      } catch {
        return null;
      }
    }
    if (target === 'indexeddb') {
      const record = await idbRun<StoredRecord>('readonly', (store) =>
        store.get(url)
      );
      return record?.blob ?? null;
    }
    return memory.get(url) ?? null;
  },

  async has(url: string): Promise<boolean> {
    const target = await pickBackend();
    if (target === 'cache-storage') {
      const cache = await csOpen();
      return Boolean(await cache.match(url));
    }
    if (target === 'indexeddb') {
      const count = await idbRun<number>('readonly', (store) => store.count(url));
      return (count ?? 0) > 0;
    }
    return memory.has(url);
  },

  async delete(url: string): Promise<void> {
    const target = await pickBackend();
    if (target === 'cache-storage') {
      const cache = await csOpen();
      await cache.delete(url);
      return;
    }
    if (target === 'indexeddb') {
      await idbRun('readwrite', (store) => store.delete(url));
      return;
    }
    memory.delete(url);
  },

  async stats(): Promise<{ entries: number; bytes: number }> {
    const target = await pickBackend();
    if (target === 'cache-storage') {
      const cache = await csOpen();
      const requests = await cache.keys();
      let bytes = 0;
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) continue;
        const length = Number(response.headers.get('content-length') || 0);
        if (length > 0) {
          bytes += length;
          continue;
        }
        try {
          bytes += (await response.clone().blob()).size;
        } catch {
          /* пропускаем нечитаемую запись */
        }
      }
      return { entries: requests.length, bytes };
    }
    if (target === 'indexeddb') {
      const records =
        (await idbRun<StoredRecord[]>('readonly', (store) => store.getAll())) ?? [];
      return {
        entries: records.length,
        bytes: records.reduce((sum, record) => sum + (record.blob?.size ?? 0), 0),
      };
    }
    let bytes = 0;
    memory.forEach((blob) => {
      bytes += blob.size;
    });
    return { entries: memory.size, bytes };
  },

  async clear(): Promise<void> {
    const target = await pickBackend();
    if (target === 'cache-storage') {
      await caches.delete(CACHE_NAME);
      return;
    }
    if (target === 'indexeddb') {
      await idbRun('readwrite', (store) => store.clear());
      return;
    }
    memory.clear();
  },
};
