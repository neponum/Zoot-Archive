import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { cleanAndUnwrapUrl, getNaturalSize, isImageLoadedInCache, recordLoadedImage } from '../../services/storyService';

interface CharacterSlot {
  url: string | null;
  faceUrl?: string | null;
  faceRect?: { x: number; y: number; w: number; h: number };
  size?: { x: number; y: number };
  pos?: { x: number; y: number };
  focus: boolean;
  name: string | null;
  animation?: {
    posFrom?: string;
    posTo?: string;
    aFrom?: number;
    aTo?: number;
    duration?: number;
  };
}

interface CharacterLayerProps {
  characterSlots: Record<string, CharacterSlot>;
}

const CharacterSlotItem: React.FC<{ slot: string; data: CharacterSlot; characterSlots: Record<string, CharacterSlot> }> = ({ slot, data, characterSlots }) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(() => {
    if (data.url) {
      const cached = getNaturalSize(data.url);
      if (cached) return cached;
    }
    if (data.size && data.size.x && data.size.y) {
      return { w: data.size.x, h: data.size.y };
    }
    return null;
  });

  const [faceLoaded, setFaceLoaded] = useState<boolean>(() => {
    if (!data.faceUrl) return true;
    return isImageLoadedInCache(data.faceUrl);
  });

  // Sync face loaded and naturalSize states when URL or size changes
  useEffect(() => {
    if (data.url) {
      const cached = getNaturalSize(data.url);
      if (cached) {
        setNaturalSize(cached);
      } else if (data.size && data.size.x && data.size.y) {
        setNaturalSize({ w: data.size.x, h: data.size.y });
      }
    }
    if (data.faceUrl) {
      setFaceLoaded(isImageLoadedInCache(data.faceUrl));
    } else {
      setFaceLoaded(true);
    }
  }, [data.url, data.faceUrl, data.size]);

  const handleBodyRef = React.useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth && img.naturalHeight) {
      if (data.url) recordLoadedImage(data.url, img.naturalWidth, img.naturalHeight);
      setNaturalSize({
        w: img.naturalWidth,
        h: img.naturalHeight
      });
    }
  }, [data.url]);

  const handleFaceRef = React.useCallback((img: HTMLImageElement | null) => {
    if (img) {
      if (data.faceUrl) recordLoadedImage(data.faceUrl);
      if (img.complete && img.naturalWidth) {
        setFaceLoaded(true);
      }
    }
  }, [data.faceUrl]);

  // Dimming logic
  const isDimmed = !data.focus && !Object.values(characterSlots).every((s: any) => !s.focus);

  // Arknights characters coordinate system base (standard 1024 viewport unit)
  const coordinateBase = 1024;
  const baseHeightPercent = 120; // 120% height for standard 1024-unit operator

  // 1. Scale factor based purely on character.json size.y (e.g. 1024 -> 1.0, 460 -> 0.45, 1200 -> 1.17)
  let scaleFactor = 1;
  if (data.size && data.size.y && data.size.y > 0) {
    scaleFactor = data.size.y / coordinateBase;
  }
  const normalizedHeight = baseHeightPercent * scaleFactor;

  // 2. Vertical position adjustment based on Arknights Unity Center Pivot
  // In Unity AVG, character sprites are anchored from their geometric center.
  // Standard 1024 character has center at -28% + 60% = 32% viewport height.
  // Using center-anchoring ensures tall characters expand downwards as well as upwards
  // (lowering their head properly into the frame instead of shooting through the ceiling).
  const defaultPosY = 150;
  const posY = data.pos && data.pos.y !== undefined ? data.pos.y : defaultPosY;
  
  const baseCenterYPercent = -28 + (baseHeightPercent / 2); // 32%
  const posDelta = ((posY - defaultPosY) / coordinateBase) * 100;
  const centerYPercent = baseCenterYPercent + posDelta;

  const bottomOffset = centerYPercent - (normalizedHeight / 2);

  // 3. Horizontal offset from character.json pos.x
  let slotBaseX = '-50%';
  if (data.pos && data.pos.x) {
    // Container has 16:9 aspect ratio relative to 1024 base height -> virtual width is 1820.44
    const coordinateWidth = coordinateBase * (16 / 9);
    const xOffsetPercent = (data.pos.x / coordinateWidth) * 100;
    slotBaseX = `calc(-50% + ${xOffsetPercent.toFixed(2)}%)`;
  }

  const initial: any = { opacity: 0, x: slotBaseX, y: 0 };
  const animate: any = { 
    opacity: 1, 
    x: slotBaseX,
    y: 0,
    filter: isDimmed ? 'brightness(0.7)' : 'brightness(1)'
  };
  
  // Arknights default character transition duration
  const duration = data.animation?.duration !== undefined ? data.animation.duration : 0.25;
  const transition: any = { duration, ease: "easeOut" };

  if (data.animation) {
    const parsePos = (pos: string) => {
      if (!pos || typeof pos !== 'string') return { x: 0, y: 0 };
      const parts = pos.split(',');
      const x = parseFloat(parts[0] || '0');
      const y = parts.length > 1 ? parseFloat(parts[1] || '0') : 0;
      return { 
        x: isNaN(x) ? 0 : x, 
        y: isNaN(y) ? 0 : -y // Invert Y for screen coordinates (in AVG engine +Y is up, in CSS translateY +Y is down)
      };
    };

    if (data.animation.posFrom) {
      const p = parsePos(data.animation.posFrom);
      initial.x = `calc(${slotBaseX} + ${p.x}px)`;
      initial.y = p.y;
    }
    if (data.animation.posTo) {
      const p = parsePos(data.animation.posTo);
      animate.x = `calc(${slotBaseX} + ${p.x}px)`;
      animate.y = p.y;
    }
    if (data.animation.aFrom !== undefined) {
      initial.opacity = data.animation.aFrom;
    }
    if (data.animation.aTo !== undefined) {
      animate.opacity = data.animation.aTo;
    }
    if (data.animation.duration !== undefined) {
      transition.duration = data.animation.duration;
    }
  }

  const baseName = data.name?.split(/[#$]/)[0] || data.name;
  const itemKey = `${slot}-${baseName}`;

  // Slot horizontal anchoring: Left at 30%, Center at 50%, Right at 70%
  const slotLeft = slot === 'left' ? '35%' : slot === 'right' ? '65%' : '50%';

  return (
    <motion.div
      key={itemKey}
      initial={initial}
      animate={animate}
      exit={{
        opacity: 0,
        transition: { duration: data.animation?.duration !== undefined ? data.animation.duration : 0.2 }
      }}
      transition={transition}
      style={{ 
        zIndex: data.focus ? 20 : 10,
        willChange: 'transform, opacity, filter',
        left: slotLeft,
        bottom: `${bottomOffset}%`,
        height: `${normalizedHeight}%`
      }}
      className="absolute flex flex-col items-center justify-end"
    >
      <div className="relative h-full w-fit">
        <img 
          ref={handleBodyRef}
          src={data.url!} 
          alt={`Character ${slot}`} 
          className="h-full w-auto max-w-none object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.3)] pointer-events-none select-none"
          referrerPolicy="no-referrer"
          draggable="false"
          loading="eager"
          onLoad={(e) => {
            const w = e.currentTarget.naturalWidth;
            const h = e.currentTarget.naturalHeight;
            if (data.url && w && h) recordLoadedImage(data.url, w, h);
            setNaturalSize({ w, h });
          }}
          onError={(e) => {
            const currentSrc = e.currentTarget.src;
            const cleanUrl = cleanAndUnwrapUrl(data.url || '');
            const isCdnUrl = currentSrc.includes('weserv.nl') || currentSrc.includes('wsrv.nl') || currentSrc.includes('wp.com') || currentSrc.includes('statically.io');
            if (isCdnUrl && cleanUrl && !currentSrc.includes('/api/proxy')) {
              e.currentTarget.src = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
              return;
            }
            console.error(`Failed to load character body: ${data.url}`);
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Render face expression overlay with precise positioning relative to the body image */}
        {data.faceUrl && data.faceRect && naturalSize && (
          <img 
            ref={handleFaceRef}
            src={data.faceUrl} 
            alt="" 
            className={cn(
              "absolute max-w-none pointer-events-none select-none",
              faceLoaded ? "opacity-100" : "opacity-0"
            )}
            style={{
              // We use percentages relative to the body image's ACTUAL pixel dimensions (naturalSize)
              // This ensures the face is perfectly aligned even if the asset has padding or different resolution
              left: `${(data.faceRect.x / naturalSize.w) * 100}%`,
              top: `${(data.faceRect.y / naturalSize.h) * 100}%`,
              width: `${(data.faceRect.w / naturalSize.w) * 100}%`,
              height: `${(data.faceRect.h / naturalSize.h) * 100}%`,
            }}
            referrerPolicy="no-referrer"
            draggable="false"
            loading="eager"
            onLoad={() => {
              if (data.faceUrl) recordLoadedImage(data.faceUrl);
              setFaceLoaded(true);
            }}
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              const cleanUrl = cleanAndUnwrapUrl(data.faceUrl || '');
              const isCdnUrl = currentSrc.includes('weserv.nl') || currentSrc.includes('wsrv.nl') || currentSrc.includes('wp.com') || currentSrc.includes('statically.io');
              if (isCdnUrl && cleanUrl && !currentSrc.includes('/api/proxy')) {
                e.currentTarget.src = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
                return;
              }
              console.error(`Failed to load character face: ${data.faceUrl}`);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export const CharacterLayer: React.FC<CharacterLayerProps> = React.memo(({ characterSlots }) => {
  const slots = ['left', 'center', 'right'];
  
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex justify-center items-end overflow-hidden">
      {slots.map(slot => (
        <AnimatePresence key={slot} custom={characterSlots[slot]?.animation?.duration}>
          {characterSlots[slot]?.url && characterSlots[slot]?.name && (
            <CharacterSlotItem 
              key={`${slot}-${characterSlots[slot].name.split(/[#$]/)[0]}`} 
              slot={slot} 
              data={characterSlots[slot]} 
              characterSlots={characterSlots} 
            />
          )}
        </AnimatePresence>
      ))}
    </div>
  );
});
