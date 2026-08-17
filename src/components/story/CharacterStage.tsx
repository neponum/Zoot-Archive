import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface CharacterStageProps {
  characterSlots: Record<string, {
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
  }>;
}

export const CharacterStage: React.FC<CharacterStageProps> = ({ characterSlots }) => {
  const getSlotPosition = (slot: string) => {
    switch (slot) {
      case 'left_far': return '10%';
      case 'left': return '25%';
      case 'center': return '50%';
      case 'right': return '75%';
      case 'right_far': return '90%';
      default: return '50%';
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex justify-center items-end pointer-events-none pb-[2%]">
      <AnimatePresence>
        {Object.entries(characterSlots).map(([slot, data]: [string, any]) => {
          if (!data.url) return null;
          
          const baseZIndex = data.focus ? 30 : 20;
          const leftPos = getSlotPosition(slot);
          
          return (
            <motion.div
              key={`${slot}-${data.name}`}
              initial={{ opacity: 0, y: 20 }}
              animate={data.animation ? {
                x: [data.animation.posFrom ? parseInt(data.animation.posFrom) : 0, data.animation.posTo ? parseInt(data.animation.posTo) : 0],
                y: [0, 0],
                opacity: [data.animation.aFrom ?? 1, data.animation.aTo ?? 1]
              } : { opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={data.animation ? {
                duration: data.animation.duration || 1,
                ease: "linear"
              } : { duration: 0.3 }}
              className={cn(
                "absolute bottom-0 -translate-x-1/2 transition-all duration-300",
                data.focus ? "brightness-100 scale-105" : "brightness-50 scale-100"
              )}
              style={{ 
                zIndex: baseZIndex,
                left: leftPos
              }}
            >
              <img 
                src={data.url} 
                alt={data.name || 'Character'} 
                className="h-[80cqh] max-h-[82vh] max-w-[85vw] object-contain drop-shadow-2xl object-bottom pointer-events-none select-none"
                referrerPolicy="no-referrer"
              />
              {data.faceUrl && (
                <img 
                  src={data.faceUrl} 
                  alt={`${data.name} face`} 
                  className="absolute bottom-0 left-0 h-full w-full object-contain object-bottom pointer-events-none select-none"
                  referrerPolicy="no-referrer"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
