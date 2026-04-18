import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface LogModalProps {
  show: boolean;
  history: { speaker: string | null; text: string }[];
  onClose: () => void;
  t: any;
}

export const LogModal: React.FC<LogModalProps> = ({
  show,
  history,
  onClose,
  t
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black flex flex-col"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="p-8 flex items-center">
            <button 
              onClick={onClose}
              className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          </div>

          {/* History List */}
          <div className="flex-grow overflow-y-auto scrollbar-none px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-6 pt-8">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-[0.2em] text-sm py-20">
                  {t.no_history || 'No history recorded'}
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-12 group">
                    {/* Speaker Name */}
                    <div className="w-1/3 text-right">
                      <span className="text-white/50 text-[20px] leading-[1.6] font-medium tracking-wider group-hover:text-white/90 transition-colors">
                        {item.speaker || ''}
                      </span>
                    </div>
                    
                    {/* Dialogue Text */}
                    <div className="w-2/3 text-left">
                      <p className="text-white text-[20px] leading-[1.6] font-normal tracking-wide drop-shadow-md">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Gradient for readability */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
