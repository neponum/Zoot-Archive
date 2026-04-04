import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface SkipControlsProps {
  isSkipping: boolean;
  skipSpeed: number;
  onSetSpeed: (speed: number) => void;
}

export const SkipControls: React.FC<SkipControlsProps> = ({
  isSkipping,
  skipSpeed,
  onSetSpeed
}) => {
  return (
    <AnimatePresence>
      {isSkipping && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-20 right-12 mt-2 flex flex-col gap-2 bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/10 z-60 pointer-events-auto"
        >
          {[2, 4, 8, 16].map(speed => (
            <button
              key={speed}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onSetSpeed(speed); }}
              className={cn(
                "px-4 py-2 text-sm font-bold tracking-wider rounded transition-colors",
                skipSpeed === speed 
                  ? "bg-white text-black" 
                  : "text-white hover:bg-white/20"
              )}
            >
              {speed}x
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
