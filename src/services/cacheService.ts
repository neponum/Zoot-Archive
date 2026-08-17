/**
 * CacheService provides persistent caching for scripts, images, and audio
 * using the browser's Cache Storage API and IndexedDB.
 */

const CACHE_NAME = 'arknights-story-cache-v1';

export class CacheService {
  /**
   * Caches a text response (like a story script)
   */
  static async cacheText(url: string, text: string): Promise<void> {
    if (url.startsWith('blob:')) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(text, {
        headers: { 'Content-Type': 'text/plain', 'X-Cache-Date': new Date().toISOString() }
      });
      await cache.put(url, response);
    } catch (err) {
      console.warn('Failed to cache text:', err);
    }
  }

  /**
   * Retrieves cached text
   */
  static async getCachedText(url: string): Promise<string | null> {
    if (url.startsWith('blob:')) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        return await response.text();
      }
    } catch (err) {
      console.warn('Failed to get cached text:', err);
    }
    return null;
  }

  /**
   * Caches a blob (image or audio)
   */
  static async cacheBlob(url: string, blob: Blob): Promise<void> {
    if (url.startsWith('blob:')) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(blob, {
        headers: { 
          'Content-Type': blob.type,
          'Content-Length': blob.size.toString(),
          'X-Cache-Date': new Date().toISOString()
        }
      });
      await cache.put(url, response);
    } catch (err) {
      console.warn('Failed to cache blob:', err);
    }
  }

  private static blobUrlCache = new Map<string, string>();

  /**
   * Revokes all cached blob URLs to prevent memory leaks
   */
  static revokeBlobUrls(): void {
    try {
      this.blobUrlCache.forEach((blobUrl) => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (e) {
          console.warn('Failed to revoke object URL:', blobUrl, e);
        }
      });
      this.blobUrlCache.clear();
      console.log('Blob URLs successfully revoked and cleared from memory');
    } catch (err) {
      console.warn('Failed to revoke blob URLs:', err);
    }
  }

  /**
   * Retrieves cached blob and returns a URL
   */
  static async getCachedBlobUrl(url: string): Promise<string | null> {
    if (url.startsWith('blob:')) return url;
    if (this.blobUrlCache.has(url)) {
      return this.blobUrlCache.get(url)!;
    }
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response && (response.ok || response.status === 200 || response.status === 0)) {
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrlCache.set(url, blobUrl);
          return blobUrl;
        }
      }
    } catch (err) {
      console.warn('Failed to get cached blob:', err);
    }
    return null;
  }

  /**
   * Checks if a URL is in cache
   */
  static async has(url: string): Promise<boolean> {
    if (url.startsWith('blob:')) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      return !!response;
    } catch (err) {
      return false;
    }
  }

  /**
   * Caches a JSON object
   */
  static async cacheJson<T = unknown>(url: string, data: T): Promise<void> {
    if (url.startsWith('blob:')) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'X-Cache-Date': new Date().toISOString() }
      });
      await cache.put(url, response);
    } catch (err) {
      console.warn('Failed to cache JSON:', err);
    }
  }

  /**
   * Retrieves cached JSON
   */
  static async getCachedJson<T = unknown>(url: string): Promise<T | null> {
    if (url.startsWith('blob:')) return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        return (await response.json()) as T;
      }
    } catch (err) {
      console.warn('Failed to get cached JSON:', err);
    }
    return null;
  }

  /**
   * Clears the entire cache
   */
  static async clear(): Promise<void> {
    try {
      await caches.delete(CACHE_NAME);
      console.log('Cache cleared successfully');
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    }
  }
}
