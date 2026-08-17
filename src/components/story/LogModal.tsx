import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, RotateCcw, FileText, ArrowDown } from 'lucide-react';
import { parseTags } from '../../lib/textUtils';

interface LogModalProps {
  show: boolean;
  history: { speaker: string | null; text: string; lineIndex: number; stateSnapshot?: string; audioSnapshot?: any }[];
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
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayedLog = showFull && fullScript ? fullScript : history;

  // Auto-scroll to bottom when modal opens or toggled
  useEffect(() => {
    if (show && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [show, showFull]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 200;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

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
          <div className="p-4 portrait:p-4 landscape:p-8 md:p-8 flex items-center justify-between border-b border-white/5 bg-zinc-950/40 backdrop-blur-md shrink-0 z-10">
            <button 
              onClick={onClose}
              className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              aria-label="Close History Log"
            >
              <ChevronLeft className="w-8 h-8 portrait:w-6 portrait:h-6 landscape:w-10 landscape:h-10 md:w-10 md:h-10" />
            </button>
            {fullScript && (
              <button
                onClick={() => setShowFull(!showFull)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${showFull ? 'border-white text-white bg-white/10' : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'} text-xs portrait:text-[10px] landscape:text-sm md:text-sm`}
              >
                <FileText className="w-4 h-4 portrait:w-3.5 portrait:h-3.5 landscape:w-5 landscape:h-5 md:w-5 md:h-5" />
                <span className="font-medium tracking-wider uppercase font-mono">
                  {showFull ? (t.show_history || 'ПОКАЗАТЬ ИСТОРИЮ') : (t.show_full_log || 'ПОКАЗАТЬ ВЕСЬ ЛОГ')}
                </span>
              </button>
            )}
          </div>

          {/* History List */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-grow overflow-y-auto scrollbar-none px-4 portrait:px-4 landscape:px-6 pb-28 relative"
          >
            <div className="max-w-5xl mx-auto space-y-6 portrait:space-y-4 pt-6 portrait:pt-4 landscape:pt-8 md:pt-8">
              {displayedLog.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 uppercase tracking-[0.2em] text-sm py-20 font-mono">
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
                  
                  const segments = parseTags(item.text);

                  return (
                    <div 
                      key={idx} 
                      className="flex flex-col portrait:flex-col landscape:flex-row md:flex-row items-start gap-1 portrait:gap-0.5 landscape:gap-12 md:gap-12 group relative border-b border-white/5 portrait:border-b portrait:border-white/5 pb-2.5 portrait:pb-2.5 landscape:pb-0 md:pb-0 landscape:border-b-0 md:border-b-0 last:border-b-0"
                    >
                      {/* Speaker Name */}
                      <div className="w-full portrait:w-full landscape:w-1/3 md:w-1/3 text-left portrait:text-left landscape:text-right md:text-right shrink-0">
                        {item.speaker ? (
                          <span className="text-white/50 portrait:text-blue-400 font-semibold portrait:font-bold landscape:text-white/50 landscape:font-medium md:text-white/50 md:font-medium text-sm portrait:text-[13px] landscape:text-base md:text-[20px] leading-[1.6] tracking-wider group-hover:text-white/90 transition-colors uppercase font-mono">
                            {item.speaker}
                          </span>
                        ) : (
                          <span className="text-white/30 portrait:text-white/30 font-medium text-sm portrait:text-[12px] landscape:text-base md:text-[20px] leading-[1.6] tracking-wider italic font-mono">
                            {t.narrator || 'Narrator'}
                          </span>
                        )}
                      </div>
                      
                      {/* Dialogue Text */}
                      <div className="w-full portrait:w-full landscape:w-2/3 md:w-2/3 text-left relative pl-1 portrait:pl-1.5 landscape:pl-0 md:pl-0">
                        <p className="text-white portrait:text-white/95 text-sm portrait:text-[14px] portrait:leading-[1.5] landscape:text-base md:text-[20px] leading-[1.6] font-normal tracking-wide drop-shadow-md pr-12">
                          {segments.map((seg, sIdx) => (
                            <span
                              key={sIdx}
                              style={{
                                color: seg.color,
                                fontWeight: seg.bold ? 'bold' : undefined,
                                fontStyle: seg.italic ? 'italic' : undefined,
                                textDecoration: seg.underline ? 'underline' : undefined,
                                fontSize: seg.size ? seg.size : undefined,
                              }}
                            >
                              {seg.text}
                            </span>
                          ))}
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
                            className="absolute right-0 top-1/2 portrait:top-1.5 -translate-y-1/2 portrait:translate-y-0 opacity-40 portrait:opacity-75 md:opacity-20 hover:opacity-100 group-hover:opacity-100 p-2.5 text-white hover:bg-white/10 rounded-full transition-all flex items-center gap-2 cursor-pointer touch-manipulation"
                            title="Jump to this line"
                            aria-label="Jump to this line"
                          >
                            <RotateCcw className="w-5 h-5 portrait:w-4.5 portrait:h-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Floating Scroll-to-Bottom Button */}
          <AnimatePresence>
            {showScrollBottom && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={scrollToBottom}
                className="absolute bottom-6 right-6 z-20 bg-zinc-800/90 hover:bg-zinc-700 text-white p-3 rounded-full shadow-2xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
                aria-label="Scroll to bottom"
              >
                <ArrowDown className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Bottom Gradient for readability */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
