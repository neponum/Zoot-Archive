import React from 'react';
import { cn } from '../../lib/utils';
import { Settings, History, Maximize, Minimize } from 'lucide-react';

interface ControlsOverlayProps {
  showUI: boolean;
  isAuto: boolean;
  isSkipping: boolean;
  skipSpeed: number;
  isHoldingSkip: boolean;
  activeAnimText: any;
  isFullscreen: boolean;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onBackClick: () => void;
  onSettingsClick: () => void;
  onLogClick: () => void;
  onToggleFullscreen: () => void;
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
  isFullscreen,
  onToggleAuto,
  onToggleSkip,
  onBackClick,
  onSettingsClick,
  onLogClick,
  onToggleFullscreen,
  setShowUI,
  t,
}) => {
  return (
    <>
      <div className={cn(
        "absolute top-0 left-0 right-0 p-4 sm:p-8 flex justify-between items-start z-40 transition-opacity duration-300",
        (showUI && !activeAnimText) ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4 sm:gap-8 items-center">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-2"
          >
            <Settings className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onLogClick(); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-2"
          >
            <History className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-2"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-6 h-6 sm:w-8 sm:h-8" /> : <Maximize className="w-6 h-6 sm:w-8 sm:h-8" />}
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowUI(false); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-2"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </button>
        </div>

        <div className="flex gap-4 sm:gap-10 items-center">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleAuto(); }}
            className={cn(
              "font-bold text-base sm:text-[20px] tracking-[0.2em] transition-all drop-shadow-lg p-2",
              isAuto ? "text-white" : "text-white/60 hover:text-white"
            )}
          >
            AUTO <span className="text-[10px] sm:text-[12px] opacity-60">{isAuto ? 'ON' : 'OFF'}</span>
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onBackClick(); }}
            className={cn(
              "font-bold text-base sm:text-[20px] tracking-[0.2em] text-white/60 hover:text-white transition-all drop-shadow-lg p-2"
            )}
          >
            SKIP
          </button>
        </div>
      </div>

      {/* Hidden UI Overlay (to bring back UI) */}
      {!showUI && (
        <div 
          className="absolute inset-0 z-50 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowUI(true); }}
        />
      )}
    </>
  );
};
