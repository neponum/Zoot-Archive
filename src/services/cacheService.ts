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
  private static blobUrlRefs = new Map<string, number>();

  private static async createBlobUrl(url: string): Promise<string | null> {
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

  private static revokeCachedBlobUrl(url: string): void {
    const blobUrl = this.blobUrlCache.get(url);
    if (!blobUrl) return;
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('Failed to revoke object URL:', blobUrl, e);
    }
    this.blobUrlCache.delete(url);
  }

  /**
   * Returns a cached blob URL and registers a reference to it.
   * Each acquired URL must later be handed back with releaseBlobUrl.
   */
  static async acquireBlobUrl(url: string): Promise<string | null> {
    if (url.startsWith('blob:')) return url;
    const blobUrl = await this.createBlobUrl(url);
    if (!blobUrl) return null;
    this.blobUrlRefs.set(url, (this.blobUrlRefs.get(url) ?? 0) + 1);
    return blobUrl;
  }

  /**
   * Drops a previously acquired reference. The blob URL is revoked and
   * forgotten only once the last reference is released.
   */
  static releaseBlobUrl(url: string): void {
    const refs = this.blobUrlRefs.get(url);
    if (refs === undefined) return;
    if (refs > 1) {
      this.blobUrlRefs.set(url, refs - 1);
      return;
    }
    this.blobUrlRefs.delete(url);
    this.revokeCachedBlobUrl(url);
  }

  /**
   * Revokes blob URLs nobody holds a reference to. URLs handed out through
   * acquireBlobUrl stay valid until their references are released, so
   * components still rendering them (e.g. CachedImage) keep a working src.
   */
  static revokeBlobUrls(): void {
    try {
      let revokedCount = 0;
      this.blobUrlCache.forEach((_blobUrl, sourceUrl) => {
        if (this.blobUrlRefs.get(sourceUrl)) return;
        this.revokeCachedBlobUrl(sourceUrl);
        revokedCount++;
      });
      console.log(`Blob URLs successfully revoked and cleared from memory (${revokedCount} revoked)`);
    } catch (err) {
      console.warn('Failed to revoke blob URLs:', err);
    }
  }

  /**
   * Retrieves cached blob and returns a URL
   */
  static async getCachedBlobUrl(url: string): Promise<string | null> {
    if (url.startsWith('blob:')) return url;
    return this.createBlobUrl(url);
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
   * Removes a cached JSON entry (used to drop outdated asset manifests)
   */
  static async deleteCachedJson(url: string): Promise<void> {
    if (url.startsWith('blob:')) return;
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(url);
    } catch (err) {
      console.warn('Failed to delete cached JSON:', err);
    }
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
