import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { StoryLine } from '../../types';
import { parseTags } from '../../lib/textUtils';

interface CinematicEffectsLayerProps {
  isFlashing: boolean;
  blocker: { a: number, r: number, g: number, b: number, duration: number } | null;
  activeAnimText: StoryLine | null;
}

export const CinematicEffectsLayer: React.FC<CinematicEffectsLayerProps> = ({
  isFlashing,
  blocker,
  activeAnimText,
}) => {
  return (
    <>
      {/* Blocker Layer */}
      <div 
        className="absolute inset-0 z-[25] pointer-events-none"
        style={{
          backgroundColor: blocker ? `rgba(${blocker.r}, ${blocker.g}, ${blocker.b}, ${blocker.a})` : 'transparent',
          transition: blocker ? `background-color ${blocker.duration}s ease-in-out` : 'none'
        }}
      />

      {/* AnimText Layer */}
      <AnimatePresence>
        {activeAnimText && (
          <motion.div
            key={`animtext-${activeAnimText.id || 'default'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute z-40 pointer-events-none"
            style={{
              left: activeAnimText.pos && activeAnimText.pos.includes(',') ? `${((parseFloat(activeAnimText.pos.split(',')[0]) + 640) / 1280) * 100}%` : '50%',
              top: activeAnimText.pos && activeAnimText.pos.includes(',') ? `${((360 - parseFloat(activeAnimText.pos.split(',')[1])) / 720) * 100}%` : '50%',
              transform: activeAnimText.pos && activeAnimText.pos.includes(',') ? 'none' : 'translate(-50%, -50%)',
            }}
          >
            <div className={cn(
              "flex flex-col gap-1",
              activeAnimText.style === 'avg_both' ? "border-l-2 border-white/40 pl-4" : ""
            )}>
              {activeAnimText.text?.split('\\n').map((line, i) => {
                const segments = parseTags(line);
                return (
                  <p 
                    key={i} 
                    className={cn(
                      "text-white font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,1)] tracking-[0.2em] whitespace-pre-wrap uppercase",
                      i === 0 ? "text-[3.5cqh] opacity-100" : "text-[2.5cqh] opacity-70 font-light"
                    )}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {segments.map((seg, idx) => (
                      <span 
                        key={idx} 
                        style={{ 
                          color: seg.color,
                          fontWeight: seg.bold ? 'bold' : undefined
                        }}
                      >
                        {seg.text}
                      </span>
                    ))}
                  </p>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Overlay */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 bg-white z-[60] pointer-events-none"
          />
        )}
      </AnimatePresence>
    </>
  );
};
