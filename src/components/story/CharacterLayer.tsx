import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { cleanAndUnwrapUrl } from '../../services/storyService';

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
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [faceLoaded, setFaceLoaded] = useState(false);

  // Reset face loaded and naturalSize states when URL changes
  useEffect(() => {
    setNaturalSize(null);
    setFaceLoaded(false);
  }, [data.url, data.faceUrl]);

  const handleBodyRef = React.useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth && img.naturalHeight) {
      setNaturalSize({
        w: img.naturalWidth,
        h: img.naturalHeight
      });
    }
  }, []);

  const handleFaceRef = React.useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth) {
      setFaceLoaded(true);
    }
  }, []);

  // Dimming logic
  const isDimmed = !data.focus && !Object.values(characterSlots).every((s: any) => !s.focus);

  // Arknights characters are designed on a specific coordinate system (usually 1024 or 2048).
  const coordinateBase = 1024;

  // Animation logic: Center anchor (-50%) for all slots
  let slotBaseX = '-50%';
  
  // Apply pos.x from character.json if available
  if (data.pos && data.pos.x) {
    // Convert pos.x to percentage of container width (assuming 16:9 aspect ratio)
    // coordinateBase is 1024, which corresponds to the height.
    // Width is 1024 * (16/9) = 1820.44
    const coordinateWidth = coordinateBase * (16 / 9);
    const xOffsetPercent = (data.pos.x / coordinateWidth) * 100;
    slotBaseX = `calc(${slotBaseX} + ${xOffsetPercent}%)`;
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
      const y = parseFloat(parts[parts.length > 1 ? 1 : 0] || '0');
      return { 
        x: isNaN(x) ? 0 : x, 
        y: isNaN(y) ? 0 : -y // Invert Y for screen coordinates
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

  // Mathematically precise alignment based on Arknights coordinate system (1024 height base):
  // Because all character assets are full-body, their scale on screen depends purely on data.size.y relative to coordinateBase (1024).
  // Image pixel resolution (naturalSize) is only used for face overlay positioning, not for altering CSS display height.
  let scaleFactor = 1;
  if (data.size && data.size.y) {
    // If size.y is explicitly provided in character data (e.g. 1024 = 1.0, 1150 = 1.12)
    scaleFactor = data.size.y / coordinateBase;
  }
  
  // Base height in % of the parent container (which maintains a 16:9 aspect ratio)
  const baseHeight = 130; 
  const normalizedHeight = baseHeight * scaleFactor;
  
  // Apply pos.y from character.json if available, otherwise apply default
  const posY = data.pos && data.pos.y !== undefined ? data.pos.y : 150;

  // Floor anchor (-36% into dialogue box area)
  const bottomOffset = -42 + ((posY - 150) / coordinateBase) * baseHeight;

  const baseName = data.name?.split(/[#$]/)[0] || data.name;
  const itemKey = `${slot}-${baseName}`;

  // Slot horizontal anchoring: Left at 36%, Center at 50%, Right at 64%
  const slotLeft = slot === 'left' ? '36%' : slot === 'right' ? '64%' : '50%';

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
            setNaturalSize({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight
            });
          }}
          onError={(e) => {
            const currentSrc = e.currentTarget.src;
            const cleanUrl = cleanAndUnwrapUrl(data.url || '');
            // If weserv fails and we haven't tried local proxy yet, try fallback proxy
            if (currentSrc.includes('images.weserv.nl') && cleanUrl && !currentSrc.includes('/api/proxy')) {
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
              "absolute max-w-none transition-opacity duration-150 pointer-events-none select-none",
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
            onLoad={() => setFaceLoaded(true)}
            onError={(e) => {
              const currentSrc = e.currentTarget.src;
              const cleanUrl = cleanAndUnwrapUrl(data.faceUrl || '');
              if (currentSrc.includes('images.weserv.nl') && cleanUrl && !currentSrc.includes('/api/proxy')) {
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
