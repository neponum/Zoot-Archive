import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { StoryLine } from '../../types';
import { parseTags } from '../../lib/textUtils';

interface CinematicEffectsLayerProps {
  isFlashing: boolean;
  cameraEffect: { effect: string, duration: number, amount: number } | null;
  blocker: { a: number, r: number, g: number, b: number, duration: number } | null;
  activeAnimText: StoryLine | null;
}

export const CinematicEffectsLayer: React.FC<CinematicEffectsLayerProps> = ({
  isFlashing,
  cameraEffect,
  blocker,
  activeAnimText,
}) => {
  // Convert Arknights 0-1 range to 0-255 for CSS rgba
  const getRgbValue = (val: number) => {
    return val <= 1 && val > 0 ? Math.round(val * 255) : Math.round(val);
  };

  return (
    <>
      {/* Blocker Layer */}
      <div 
        className="absolute inset-0 z-[45] pointer-events-none"
        style={{
          backgroundColor: `rgba(${getRgbValue(blocker?.r || 0)}, ${getRgbValue(blocker?.g || 0)}, ${getRgbValue(blocker?.b || 0)}, ${blocker?.a || 0})`,
          transition: blocker?.duration ? `background-color ${blocker.duration}s ease-in-out` : 'none'
        }}
      />

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
              x: { duration: 0.8, repeat: Infinity, ease: "linear" }, // Reduced frequency as requested
              y: { duration: 1.2, repeat: Infinity, ease: "linear" }  // Reduced frequency as requested
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
