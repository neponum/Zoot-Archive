import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface AnimTextOverlayProps {
  activeAnimText: any;
}

export const AnimTextOverlay: React.FC<AnimTextOverlayProps> = ({ activeAnimText }) => {
  return (
    <AnimatePresence mode="wait">
      {activeAnimText && (
        <motion.div
          key={activeAnimText.id || activeAnimText.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 pointer-events-none flex"
          style={{
            alignItems: activeAnimText.pos && activeAnimText.pos.includes(',') ? 'flex-start' : 'center',
            justifyContent: activeAnimText.pos && activeAnimText.pos.includes(',') ? 'flex-start' : 'center',
            left: activeAnimText.pos && activeAnimText.pos.includes(',') ? `${50 + parseInt(activeAnimText.pos.split(',')[0]) / 10}%` : '50%',
            top: activeAnimText.pos && activeAnimText.pos.includes(',') ? `${50 + parseInt(activeAnimText.pos.split(',')[1]) / 10}%` : '50%',
            transform: activeAnimText.pos && activeAnimText.pos.includes(',') ? 'none' : 'translate(-50%, -50%)',
          }}
        >
          <div className={cn(
            "flex flex-col gap-1",
            activeAnimText.style === 'avg_both' ? "border-l-2 border-white/40 pl-4" : ""
          )}>
            {activeAnimText.text?.split('\\n').map((t: string, i: number) => (
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
                {t}
              </p>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
