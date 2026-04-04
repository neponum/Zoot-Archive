import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DecisionOverlayProps {
  currentDecision: any;
  onChoice: (value: string) => void;
}

export const DecisionOverlay: React.FC<DecisionOverlayProps> = ({ currentDecision, onChoice }) => {
  return (
    <AnimatePresence>
      {currentDecision && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div className="w-full max-w-2xl space-y-4 p-8">
            {currentDecision.options?.map((option: string, idx: number) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  const val = currentDecision.values?.[idx] || String(idx + 1);
                  onChoice(val);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="w-full p-4 bg-black/60 hover:bg-white/20 border border-white/30 text-white text-xl font-medium transition-all text-left pl-8 relative group overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 group-hover:bg-white transition-colors" />
                {option}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
