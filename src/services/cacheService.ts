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
   * Retrieves cached blob and returns a URL
   */
  static async getCachedBlobUrl(url: string): Promise<string | null> {
    if (this.blobUrlCache.has(url)) {
      return this.blobUrlCache.get(url)!;
    }
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlCache.set(url, blobUrl);
        return blobUrl;
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
  static async cacheJson(url: string, data: any): Promise<void> {
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
  static async getCachedJson(url: string): Promise<any | null> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        return await response.json();
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
