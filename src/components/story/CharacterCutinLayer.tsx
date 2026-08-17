import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StoryLine } from '../../types';

interface CharacterCutinLayerProps {
  characterCutin: { bodyUrl: string; faceUrl?: string; line: StoryLine } | null;
}

export function CharacterCutinLayer({ characterCutin }: CharacterCutinLayerProps) {
  // Use explicit width from line or default to 50% width
  const refWidth = 1920;
  const panelWidthPercent = characterCutin?.line.width ? (characterCutin.line.width / refWidth) * 100 : 125;
  
  // Calculate offset relative to reference width for consistent scaling
  // Default offset is -300px on a 1920 screen (approx -15.6%)
  const offsetXPercent = characterCutin?.line.offsetx !== undefined ? (characterCutin.line.offsetx / refWidth) * 100 : -30;
  const leftPositionPercent = 50 + offsetXPercent;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 12 }}>
      <AnimatePresence>
        {characterCutin && (
          <motion.div
            key={characterCutin.line.assetName || 'cutin'}
            initial={{ opacity: 0, x: '-50%' }}
            animate={{ opacity: 1, x: '-50%' }}
            exit={{ 
              opacity: 0, 
              x: '-50%', 
              transition: { duration: characterCutin.line.duration !== undefined ? characterCutin.line.duration : 0.3 } 
            }}
            transition={{ duration: characterCutin.line.duration !== undefined ? characterCutin.line.duration : 0.3, ease: 'easeOut' }}
            className="absolute top-0 bottom-0 overflow-hidden"
            style={{ 
              left: `${leftPositionPercent}%`,
              width: `${panelWidthPercent}%`,
              // Add a subtle shadow to the container itself
              boxShadow: '10px 0 20px rgba(0,0,0,0.5)',
              backgroundColor: 'rgba(43, 43, 43, 0.95)'
            }}
          >
            {/* Image container anchored to the center of the panel */}
            <div className="absolute inset-0 flex items-end justify-center overflow-hidden z-10">
              <div className="relative h-full w-full flex items-end justify-center translate-y-[50%]">
                <img 
                   src={characterCutin.bodyUrl} 
                   alt="Cut-in"
                   className="h-[150%] w-auto max-w-none origin-bottom object-contain object-bottom pointer-events-none drop-shadow-2xl"
                />
                {characterCutin.faceUrl && (
                  <img 
                    src={characterCutin.faceUrl} 
                    alt="Cut-in expression"
                    className="absolute bottom-0 h-[150%] w-auto max-w-none origin-bottom object-contain object-bottom pointer-events-none"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

