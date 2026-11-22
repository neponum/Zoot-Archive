import React, { useEffect, useState } from 'react';
import { ArchiveImage } from './ArchiveImage';
import { SpineIllustration } from './SpineIllustration';

/**
 * Арт образа: статичная иллюстрация или динамическая Spine-модель.
 *
 * Динамический образ в игре — это два слоя: статичная иллюстрация (пейзаж,
 * дым, снег, дальний план) и Spine поверх неё (персонаж, дракон, ближний
 * план). Поэтому статичный арт всегда остаётся фоном, а модель рисуется
 * сверху; иначе анимированный скин висит на пустом поле.
 *
 * Пока картинка/модель грузится, показывается спиннер, а не предыдущий образ:
 * браузер иначе держит старую картинку до загрузки новой, и при переключении
 * скинов выглядит так, будто клик не сработал.
 */
export interface SkinArtworkProps {
  src: string;
  /** `dynIllustId`, если у образа есть анимированная версия. */
  dynIllust?: string;
  alt: string;
  /** Тень под артом; в режиме увеличения её отключают. */
  shadow?: boolean;
  /** Плотность рендера Spine при увеличении (1 — обычная). */
  renderScale?: number;
  className?: string;
}

export const SkinArtwork: React.FC<SkinArtworkProps> = ({
  src,
  dynIllust,
  alt,
  shadow = true,
  renderScale = 1,
  className = '',
}) => {
  const [ready, setReady] = useState(false);
  const [spineFailed, setSpineFailed] = useState(false);
  const useSpine = Boolean(dynIllust) && !spineFailed;
  const shadowClass = shadow ? 'drop-shadow-[0_14px_28px_rgba(0,0,0,0.42)]' : '';

  // Новый образ всегда начинается с нуля: старый кадр не показываем.
  useEffect(() => {
    setReady(false);
    setSpineFailed(false);
  }, [src, dynIllust]);

  return (
    <span className={`relative block w-full h-full ${className}`}>
      {useSpine && (
        // Фон динамического образа. Тень вешаем только на него: у канваса
        // она легла бы поверх арта тёмным ореолом вокруг модели.
        <ArchiveImage
          key={`bg:${src}`}
          src={src}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`absolute inset-0 w-full h-full object-contain object-bottom ${shadowClass}`}
        />
      )}

      {useSpine ? (
        <SpineIllustration
          dynIllust={dynIllust as string}
          renderScale={renderScale}
          onReady={() => setReady(true)}
          onError={() => setSpineFailed(true)}
          className="absolute inset-0 object-contain"
        />
      ) : (
        <ArchiveImage
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
          className={`w-full h-full object-contain object-bottom transition-opacity duration-200 ${
            ready ? 'opacity-100' : 'opacity-0'
          } ${shadowClass}`}
        />
      )}

      {!ready && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-[#202225]/15 border-t-[#f5b400]" />
        </span>
      )}
    </span>
  );
};

export default SkinArtwork;
