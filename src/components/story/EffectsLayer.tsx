import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EffectsLayerProps {
  isFlashing: boolean;
  blocker: { a: number; r: number; g: number; b: number; duration: number } | null;
}

export const EffectsLayer: React.FC<EffectsLayerProps> = ({ isFlashing, blocker }) => {
  return (
    <>
      {/* Flash Effect */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 bg-white z-[35] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Blocker Effect */}
      <AnimatePresence>
        {blocker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: blocker.a }}
            exit={{ opacity: 0 }}
            transition={{ duration: blocker.duration }}
            className="absolute inset-0 z-[35] pointer-events-none"
            style={{ backgroundColor: `rgb(${blocker.r}, ${blocker.g}, ${blocker.b})` }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
