import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { StoryLine } from '../../types';
import { parseTags } from '../../lib/textUtils';

interface CinematicEffectsLayerProps {
  isFlashing: { active: boolean, duration: number };
  cameraEffect: { effect: string, duration: number, amount: number } | null;
  blocker: { a: number, r: number, g: number, b: number, duration: number, initr?: number; initg?: number; initb?: number; inita?: number, ease?: string } | null;
  activeAnimText: StoryLine | null;
}

const getRgba = (r: number, g: number, b: number, a: number) => {
  const safeR = isNaN(r) ? 0 : (r <= 1 ? Math.round(r * 255) : Math.round(r));
  const safeG = isNaN(g) ? 0 : (g <= 1 ? Math.round(g * 255) : Math.round(g));
  const safeB = isNaN(b) ? 0 : (b <= 1 ? Math.round(b * 255) : Math.round(b));
  const safeA = isNaN(a) ? 0 : Math.max(0, Math.min(1, a));
  return `rgba(${safeR}, ${safeG}, ${safeB}, ${safeA})`;
};

export const CinematicEffectsLayer: React.FC<CinematicEffectsLayerProps> = ({
  isFlashing,
  cameraEffect,
  blocker,
  activeAnimText,
}) => {
  const blockerProps = React.useMemo(() => {
    if (!blocker) return null;
    const target = getRgba(blocker.r, blocker.g, blocker.b, blocker.a);
    const initial = blocker.initr !== undefined 
      ? getRgba(blocker.initr, blocker.initg || 0, blocker.initb || 0, blocker.inita || 0)
      : undefined;
    
    return { target, initial, duration: Math.max(blocker.duration, 0), ease: blocker.ease };
  }, [blocker]);

  return (
    <>
      {/* Blocker Layer */}
      {blockerProps && (
        <motion.div 
          // Re-mount only if initial colors are provided to ensure a "snap"
          key={blocker?.initr !== undefined ? `snap-${blocker.initr}-${blocker.initg}-${blocker.initb}-${blocker.inita}-${Date.now()}` : 'continuous'}
          initial={blockerProps.initial ? { backgroundColor: blockerProps.initial } : false}
          animate={{ backgroundColor: blockerProps.target }}
          transition={{ 
            duration: blockerProps.duration,
            ease: blockerProps.ease || "easeInOut"
          }}
          className="absolute inset-0 z-[25] pointer-events-none"
        />
      )}

      {/* Camera Effects Layer */}
      <AnimatePresence>
        {cameraEffect?.effect === 'record' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              x: [-1, 1, -1, 1, 0],
              y: [-0.5, 0.5, -0.5, 0.5, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 1 },
              x: { duration: 0.8, repeat: Infinity, ease: "linear" }, 
              y: { duration: 1.2, repeat: Infinity, ease: "linear" }  
            }}
            className="absolute inset-0 z-[30] pointer-events-none overflow-hidden"
          >
            {/* Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,118,0.03))] bg-[length:100%_4px,3px_100%]" />
            
            {/* REC Indicator */}
            <div className="absolute top-8 left-8 flex items-center gap-3">
              <motion.div 
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-4 h-4 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]"
              />
              <span className="text-white/80 font-mono text-xl tracking-widest font-bold drop-shadow-md">REC</span>
            </div>

            {/* Timecode placeholder */}
            <Timecode />
          </motion.div>
        )}
      </AnimatePresence>

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
              left: (() => {
                if (!activeAnimText.pos) return '50%';
                const parts = activeAnimText.pos.split(',');
                if (parts.length < 1) return '50%';
                const val = parseFloat(parts[0]);
                if (isNaN(val)) return '50%';
                return `${((val + 640) / 1280) * 100}%`;
              })(),
              top: (() => {
                if (!activeAnimText.pos) return '50%';
                const parts = activeAnimText.pos.split(',');
                const val = parseFloat(parts.length > 1 ? parts[1] : parts[0]);
                if (isNaN(val)) return '50%';
                return `${((360 - val) / 720) * 100}%`;
              })(),
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
        {isFlashing.active && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isFlashing.duration, ease: "easeOut" }}
            className="absolute inset-0 bg-white z-[60] pointer-events-none"
            style={{ mixBlendMode: 'screen' }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const Timecode: React.FC = () => {
  const [time, setTime] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `00:${h}:${m}:${s}`;
  };

  return (
    <div className="absolute bottom-32 right-8 font-mono text-white/60 text-lg tracking-wider">
      {formatTime(time)}
    </div>
  );
};
