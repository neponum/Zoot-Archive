import React from 'react';
import { cn } from '../../lib/utils';
import { Settings, History, Maximize, Minimize, Bookmark, AlertTriangle } from 'lucide-react';

interface ControlsOverlayProps {
  showUI: boolean;
  isAuto: boolean;
  isSkipping: boolean;
  skipSpeed: number;
  isHoldingSkip: boolean;
  forceHideUI: boolean;
  isFullscreen: boolean;
  currentIndex?: number;
  totalLines?: number;
  lang?: string;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onBackClick: () => void;
  onSettingsClick: () => void;
  onLogClick: () => void;
  onBugReportClick?: () => void;
  onToggleFullscreen: () => void;
  setShowUI: (show: boolean) => void;
  t: any;
  className?: string;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  showUI,
  isAuto,
  isSkipping,
  skipSpeed,
  isHoldingSkip,
  forceHideUI,
  isFullscreen,
  currentIndex = 0,
  totalLines = 0,
  onToggleAuto,
  onToggleSkip,
  onBackClick,
  onSettingsClick,
  onLogClick,
  onBugReportClick,
  onToggleFullscreen,
  setShowUI,
  t,
  className
}) => {
  const currentLineNum = currentIndex + 1;
  const progressPercent = totalLines > 0 ? Math.min(100, Math.max(0, Math.round((currentLineNum / totalLines) * 100))) : 0;

  return (
    <div className={cn(className, "pwa-ui-element")}>
      {/* Top Reading Progress Bar Line */}
      {totalLines > 0 && (
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 z-50 transition-opacity duration-300 pointer-events-none",
            (showUI && !forceHideUI) ? "opacity-100" : "opacity-60"
          )}
        >
          <div className="w-full h-1 sm:h-1.5 bg-black/50 backdrop-blur-xs relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-400 shadow-[0_0_10px_rgba(56,189,248,0.8)] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className={cn(
        "absolute top-0 left-0 right-0 px-2 py-1.5 sm:px-4 sm:py-3 md:px-8 md:py-6 flex justify-between items-start z-40 transition-opacity duration-300",
        (showUI && !forceHideUI) ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1 sm:gap-2 md:gap-4 items-center">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onLogClick(); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2"
            title="History"
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
          </button>
          {onBugReportClick && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onBugReportClick(); }}
              className="text-white/60 hover:text-yellow-400 transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2"
              title="Report Bug"
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          )}
          {document.fullscreenEnabled && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
              className="text-white/60 hover:text-white transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            </button>
          )}
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowUI(false); }}
            className="text-white/60 hover:text-white transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 sm:gap-4 md:gap-8 items-center">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleAuto(); }}
            className={cn(
              "font-bold text-[11px] sm:text-sm md:text-base tracking-[0.08em] sm:tracking-[0.15em] transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2",
              isAuto ? "text-white" : "text-white/60 hover:text-white"
            )}
          >
            AUTO <span className="text-[7px] sm:text-[9px] md:text-[11px] opacity-60">{isAuto ? 'ON' : 'OFF'}</span>
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onBackClick(); }}
            className={cn(
              "font-bold text-[11px] sm:text-sm md:text-base tracking-[0.08em] sm:tracking-[0.15em] text-white/60 hover:text-white transition-all drop-shadow-lg p-1 sm:p-1.5 md:p-2"
            )}
          >
            SKIP
          </button>
        </div>
      </div>
    </div>
  );
};
