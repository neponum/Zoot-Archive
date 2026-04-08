import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CharacterSlot {
  url: string | null;
  faceUrl?: string | null;
  faceRect?: { x: number; y: number; w: number; h: number };
  size?: { x: number; y: number };
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
  const [responsiveScale, setResponsiveScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const currentRatio = vw / vh;
    const targetRatio = 16 / 9;
    return currentRatio < targetRatio ? currentRatio / targetRatio : 1;
  });
  const [faceLoaded, setFaceLoaded] = useState(false);

  // Reset face loaded state when URL changes
  useEffect(() => {
    setFaceLoaded(false);
  }, [data.faceUrl]);

  // Calculate responsive scale based on aspect ratio
  // We want to maintain a consistent look relative to a 16:9 "stage"
  useEffect(() => {
    const updateScale = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const currentRatio = vw / vh;
      const targetRatio = 16 / 9;

      if (currentRatio < targetRatio) {
        // Screen is narrower than 16:9 (e.g. mobile portrait or tablet)
        // Scale down based on how much narrower it is
        setResponsiveScale(currentRatio / targetRatio);
      } else {
        // Screen is wider than 16:9 (desktop)
        setResponsiveScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Dimming logic
  const isDimmed = !data.focus && !Object.values(characterSlots).every((s: any) => !s.focus);

  // Animation logic
  const slotBaseX = slot === 'center' ? '-50%' : '0%';
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
      const [x, y] = pos.split(',').map(v => parseFloat(v));
      return { x, y: -y }; // Invert Y for screen coordinates
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

  // Arknights characters are designed on a specific coordinate system (usually 1024 or 2048).
  // Some characters are drawn "far away" on a large canvas (e.g. size.y = 1024 but the character is small).
  // However, usually, a larger size.y means a more detailed/larger asset.
  
  // We use the coordinate system height (data.size.y) to normalize the display.
  // If size.y is 1024, we want them at a standard height.
  // If size.y is 2048, they are twice as detailed, so we scale the container to match.
  const coordinateBase = 1024;
  const scaleFactor = data.size ? data.size.y / coordinateBase : 1;
  
  // Base height in % of the parent container (which is the screen height)
  // We multiply by responsiveScale to ensure it looks the same on narrow screens
  const baseHeight = 125; 
  const normalizedHeight = baseHeight * scaleFactor * responsiveScale;

  return (
    <motion.div
      key={`${slot}-${data.name}`}
      initial={initial}
      animate={animate}
      exit={{ opacity: 0, y: 0 }}
      transition={transition}
      style={{ 
        zIndex: data.focus ? 20 : 10,
        willChange: 'transform, opacity, filter'
      }}
      className={cn(
        "absolute bottom-[-35%] flex flex-col items-center justify-end",
        slot === 'left' ? "left-[-5%]" : slot === 'right' ? "right-[-5%]" : "left-1/2"
      )}
    >
      <div 
        className="relative w-fit"
        style={{ height: `${normalizedHeight}vh` }}
      >
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
