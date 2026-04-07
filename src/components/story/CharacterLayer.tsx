import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CharacterSlot {
  url: string | null;
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

export const CharacterLayer: React.FC<CharacterLayerProps> = React.memo(({ characterSlots }) => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex justify-center items-end overflow-hidden">
      {(Object.entries(characterSlots) as [string, CharacterSlot][])
        .filter(([_, data]) => {
          if (data.name && !data.url) {
            console.warn(`Missing URL for character: ${data.name}`);
          }
          return data.url && data.name;
        })
        .map(([slot, data]) => {
          // Animation logic
          const initial: any = {};
          const animate: any = {};
          const transition: any = { duration: 0.3, ease: "easeOut" };

          const hasPosAnim = data.animation?.posFrom || data.animation?.posTo;
          const hasAlphaAnim = data.animation?.aFrom !== undefined || data.animation?.aTo !== undefined;

          if (data.animation) {
            const parsePos = (pos: string) => {
              const [x, y] = pos.split(',').map(v => parseFloat(v));
              return { x, y: -y }; // Invert Y for screen coordinates
            };

            if (data.animation.posFrom) {
              const p = parsePos(data.animation.posFrom);
              initial.x = p.x;
              initial.y = p.y;
            }
            if (data.animation.posTo) {
              const p = parsePos(data.animation.posTo);
              animate.x = p.x;
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

          // Dimming logic: use opacity instead of brightness for better performance and less flickering
          const isDimmed = !data.focus && !Object.values(characterSlots).every((s: any) => !s.focus);
          animate.filter = isDimmed ? 'brightness(0.7)' : 'brightness(1)';
          
          return (
            <motion.div
              key={slot}
              initial={data.animation ? initial : false}
              animate={animate}
              transition={transition}
              style={{ 
                zIndex: data.focus ? 20 : 10,
                willChange: 'transform, opacity, filter'
              }}
              className={cn(
                "absolute bottom-[-40%] h-[135%]",
                slot === 'left' ? "left-[-5%]" : slot === 'right' ? "right-[-5%]" : "left-1/2 -translate-x-1/2"
              )}
            >
              <img 
                src={data.url!} 
                alt={`Character ${slot}`} 
                className="h-full w-auto max-w-none object-contain drop-shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                referrerPolicy="no-referrer"
                draggable="false"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </motion.div>
          );
        })}
    </div>
  );
});
