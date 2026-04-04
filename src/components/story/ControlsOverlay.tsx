import React from 'react';
import { cn } from '../../lib/utils';

interface ControlsOverlayProps {
  showUI: boolean;
  isAuto: boolean;
  isSkipping: boolean;
  skipSpeed: number;
  isHoldingSkip: boolean;
  activeAnimText: any;
  scriptContent: string | null;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onBackClick: () => void;
  setShowUI: (show: boolean) => void;
  t: any;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  showUI,
  isAuto,
  isSkipping,
  skipSpeed,
  isHoldingSkip,
  activeAnimText,
  scriptContent,
  onToggleAuto,
  onToggleSkip,
  onBackClick,
  setShowUI,
  t,
}) => {
  return (
    <>
      <div className={cn(
        "absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-40 transition-opacity duration-300",
        (showUI && !activeAnimText) ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex gap-6 items-center mt-2 ml-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowUI(false); }}
            className="p-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-white drop-shadow-md" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (scriptContent) {
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`<pre>${scriptContent}</pre>`);
                } else {
                  alert(t.popup_blocked);
                }
              } else {
                alert(t.script_not_loaded);
              }
            }}
            className="p-2 opacity-80 hover:opacity-100 transition-opacity text-white font-bold text-xl drop-shadow-md"
          >
            LOG
          </button>
        </div>

        <div className="flex gap-8 items-center mt-2 mr-4 relative">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleAuto(); }}
            className={cn(
              "p-2 font-bold text-[20px] tracking-widest drop-shadow-md transition-colors",
              isAuto ? "text-white" : "text-white/60 hover:text-white"
            )}
          >
            AUTO
          </button>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); onBackClick(); }}
              className={cn(
                "p-2 flex items-center gap-1 font-bold text-[20px] tracking-widest drop-shadow-md transition-colors",
                isSkipping ? "text-white" : "text-white/60 hover:text-white"
              )}
            >
              SKIP
            </button>
          </div>
        </div>
      </div>

      {/* Hidden UI Overlay (to bring back UI) */}
      {!showUI && (
        <div 
          className="absolute inset-0 z-50 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowUI(true); }}
        />
      )}

      {/* Skip Speed Indicator */}
      {isHoldingSkip && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-4 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Skip Speed</div>
          {[32, 16, 8, 4, 2].map((speed) => (
            <div 
              key={speed}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg font-bold transition-all duration-200 text-[12px]",
                skipSpeed === speed 
                  ? "bg-white text-black scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
                  : "text-white/40 border border-white/5"
              )}
            >
              {speed}x
            </div>
          ))}
        </div>
      )}
    </>
  );
};
