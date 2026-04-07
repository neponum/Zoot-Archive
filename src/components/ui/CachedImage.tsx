import React, { useState, useEffect } from 'react';
import { CacheService } from '../../services/cacheService';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({ src, fallbackSrc, ...props }) => {
  const [displaySrc, setDisplaySrc] = useState<string>(src);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const resolveSrc = async () => {
      // Check cache first
      const cachedUrl = await CacheService.getCachedBlobUrl(src);
      if (cachedUrl && isMounted) {
        setDisplaySrc(cachedUrl);
        setIsLoaded(true);
        return;
      }

      // If not in cache, load normally and then cache
      try {
        const response = await fetch(src);
        if (response.ok) {
          const contentType = response.headers.get('Content-Type');
          // Basic check to ensure we're not caching HTML or error pages as images
          if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
            console.warn('Fetched non-image content for image URL:', src, contentType);
            if (isMounted) setDisplaySrc(src);
            return;
          }
          
          const blob = await response.blob();
          // Ensure the blob is actually an image
          if (!blob.type.startsWith('image/') && blob.size < 1000) {
             // Small non-image blobs are likely error messages
             console.warn('Fetched small non-image blob for image URL:', src, blob.type);
             if (isMounted) setDisplaySrc(src);
             return;
          }
          
          await CacheService.cacheBlob(src, blob);
          const newCachedUrl = await CacheService.getCachedBlobUrl(src);
          if (newCachedUrl && isMounted) {
            setDisplaySrc(newCachedUrl);
            setIsLoaded(true);
          }
        } else {
          if (isMounted) setDisplaySrc(src);
        }
      } catch (err) {
        console.warn('Failed to fetch and cache image:', src, err);
        if (isMounted) setDisplaySrc(src); // Fallback to original URL
      }
    };

    resolveSrc();

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <img 
      src={displaySrc} 
      {...props} 
      className={`${props.className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
    />
  );
};
