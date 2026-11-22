import React, { useEffect, useState } from 'react';
import { handleImageFallback } from '../lib/imageFallback';

/**
 * Арт оперативников с CDN приходит большими PNG (до 4 МБ).
 * Часть браузеров (в том числе встроенный Chromium) режет такие
 * кросс-доменные `<img>` запросы через ORB, поэтому при ошибке
 * догружаем картинку через `fetch` (CORS на torappu открыт)
 * и подменяем источник на blob-URL.
 */
const blobCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

async function fetchAsBlobUrl(src: string): Promise<string | null> {
  const cached = blobCache.get(src);
  if (cached) return cached;
  const existing = pending.get(src);
  if (existing) return existing;

  const task = fetch(src, { mode: 'cors' })
    .then((response) => (response.ok ? response.blob() : null))
    .then((blob) => {
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      blobCache.set(src, url);
      return url;
    })
    .catch(() => null)
    .finally(() => {
      pending.delete(src);
    });

  pending.set(src, task);
  return task;
}

type ArchiveImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

export const ArchiveImage: React.FC<ArchiveImageProps> = ({ src, ...rest }) => {
  const [resolved, setResolved] = useState<string | undefined>(() => blobCache.get(src));

  useEffect(() => {
    setResolved(blobCache.get(src));
  }, [src]);

  return (
    <img
      loading="lazy"
      {...rest}
      src={resolved ?? src}
      decoding="async"
      onError={(event) => {
        rest.onError?.(event);
        if (resolved) return;
        // Сначала пробуем зеркала (jsDelivr/raw/proxy), потом blob-загрузку.
        if (handleImageFallback(event, src)) return;
        void fetchAsBlobUrl(src).then((url) => {
          if (url) setResolved(url);
        });
      }}
    />
  );
};
