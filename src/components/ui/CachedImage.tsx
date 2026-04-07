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
          const blob = await response.blob();
          await CacheService.cacheBlob(src, blob);
          const newCachedUrl = await CacheService.getCachedBlobUrl(src);
          if (newCachedUrl && isMounted) {
            setDisplaySrc(newCachedUrl);
            setIsLoaded(true);
          }
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
