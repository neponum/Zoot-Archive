import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, RotateCcw, FileText } from 'lucide-react';

interface LogModalProps {
  show: boolean;
  history: { speaker: string | null; text: string; lineIndex: number; stateSnapshot: string; audioSnapshot?: any }[];
  fullScript?: { speaker: string | null; text: string; lineIndex: number }[];
  onClose: () => void;
  onJumpToLine?: (lineIndex: number, snapshotStateRaw: string, audioSnapshot: any, historyIndex: number) => void;
  t: any;
}

export const LogModal: React.FC<LogModalProps> = ({
  show,
  history,
  fullScript,
  onClose,
  onJumpToLine,
  t
}) => {
  const [showFull, setShowFull] = useState(false);

  const displayedLog = showFull && fullScript ? fullScript : history;

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
          <div className="p-8 flex items-center justify-between">
            <button 
              onClick={onClose}
              className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            {fullScript && (
              <button
                onClick={() => setShowFull(!showFull)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${showFull ? 'border-white text-white bg-white/10' : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'}`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium tracking-wider uppercase">
                  {showFull ? (t.show_history || 'ПОКАЗАТЬ ИСТОРИЮ') : (t.show_full_log || 'ПОКАЗАТЬ ВЕСЬ ЛОГ')}
                </span>
              </button>
            )}
          </div>

          {/* History List */}
          <div className="flex-grow overflow-y-auto scrollbar-none px-4 pb-24">
            <div className="max-w-5xl mx-auto space-y-6 pt-8">
              {displayedLog.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-[0.2em] text-sm py-20">
                  {t.no_history || 'No history recorded'}
                </div>
              ) : (
                displayedLog.map((item, idx) => {
                  // If viewing full script, try to find a history match to allow jumping back
                  const historyMatch = showFull 
                    ? history.find(h => h.lineIndex === item.lineIndex)
                    : item;
                  
                  const canJump = !!historyMatch && 'stateSnapshot' in historyMatch && typeof (historyMatch as any).stateSnapshot === 'string';
                  
                  const historyIdx = showFull
                    ? history.findIndex(h => h.lineIndex === item.lineIndex)
                    : idx;
                  
                  return (
                    <div key={idx} className="flex items-start gap-4 md:gap-12 group relative">
                      {/* Speaker Name */}
                      <div className="w-1/3 text-right">
                        <span className="text-white/50 text-base md:text-[20px] leading-[1.6] font-medium tracking-wider group-hover:text-white/90 transition-colors">
                          {item.speaker || ''}
                        </span>
                      </div>
                      
                      {/* Dialogue Text */}
                      <div className="w-2/3 text-left relative">
                        <p className="text-white text-base md:text-[20px] leading-[1.6] font-normal tracking-wide drop-shadow-md pr-12">
                          {item.text}
                        </p>
                        
                        {/* Jump Button */}
                        {onJumpToLine && canJump && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (historyMatch && (historyMatch as any).stateSnapshot) {
                                onJumpToLine(
                                  (historyMatch as any).lineIndex, 
                                  (historyMatch as any).stateSnapshot, 
                                  (historyMatch as any).audioSnapshot, 
                                  historyIdx
                                );
                              }
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 opacity-40 md:opacity-20 hover:opacity-100 group-hover:opacity-100 p-2 text-white hover:bg-white/20 rounded-full transition-all flex items-center gap-2"
                            title="Jump to this line"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
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
