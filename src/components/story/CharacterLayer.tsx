import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

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

  // Reset face loaded state when URL changes
  useEffect(() => {
    setFaceLoaded(false);
  }, [data.faceUrl]);

  // Dimming logic
  const isDimmed = !data.focus && !Object.values(characterSlots).every((s: any) => !s.focus);

  // Arknights characters are designed on a specific coordinate system (usually 1024 or 2048).
  const coordinateBase = 1024;

  // Animation logic
  let slotBaseX = slot === 'center' ? '-50%' : '0%';
  
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
  const transition: any = { duration: 0.3, ease: "easeOut" };

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

  const scaleFactor = data.size ? data.size.y / coordinateBase : 1;
  
  // Base height in % of the parent container (which maintains a 16:9 aspect ratio)
  // This completely removes the need for JS-based responsive scaling because % scales perfectly with the container.
  const baseHeight = 125; 
  const normalizedHeight = baseHeight * scaleFactor;
  
  // Dynamic bottom offset based on scale factor
  // Base offset is -35%. We adjust it so small characters are pushed up and large characters are pushed down.
  const baseBottom = -55;
  let bottomOffset = baseBottom - (scaleFactor - 1) * 60;

  // Apply pos.y from character.json if available
  if (data.pos && data.pos.y) {
    // The pos.y value in character.json is an absolute offset.
    // We convert it to a percentage of the container height.
    // Positive pos.y means the character should be pushed up.
    bottomOffset += (data.pos.y / coordinateBase) * baseHeight;
  }

  return (
    <motion.div
      key={`${slot}-${data.name}`}
      initial={initial}
      animate={animate}
      exit={{ opacity: 0, y: 0 }}
      transition={transition}
      style={{ 
        zIndex: data.focus ? 20 : 10,
        willChange: 'transform, opacity, filter',
        bottom: `${bottomOffset}%`,
        height: `${normalizedHeight}%`
      }}
      className={cn(
        "absolute flex flex-col items-center justify-end",
        slot === 'left' ? "left-[-5%]" : slot === 'right' ? "right-[-5%]" : "left-1/2"
      )}
    >
      <div className="relative h-full w-fit">
        <img 
          src={data.url!} 
          alt={`Character ${slot}`} 
          className="h-full w-auto max-w-none object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.3)]"
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
            console.error(`Failed to load character body: ${data.url}`);
            e.currentTarget.style.display = 'none';
          }}
        />
        {/* Render face expression overlay with precise positioning relative to the body image */}
        {data.faceUrl && data.faceRect && naturalSize && (
          <img 
            src={data.faceUrl} 
            alt="" 
            className={cn(
              "absolute max-w-none transition-opacity duration-150",
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
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex justify-center items-end overflow-hidden">
      {(Object.entries(characterSlots) as [string, CharacterSlot][])
        .filter(([slot, data]) => !!(data.url && data.name))
        .map(([slot, data]) => (
          <CharacterSlotItem key={`${slot}-${data.name}`} slot={slot} data={data} characterSlots={characterSlots} />
        ))}
    </div>
  );
});
