import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { StoryLine } from '../../types';
import { MemoizedTypewriter } from './Typewriter';

interface StickerLayerProps {
  stickers: StoryLine[];
  isSkipping?: boolean;
  shouldSkipTypewriter?: boolean;
  skipSpeed?: number;
  fontFamily?: string;
  onTypewriterFinished?: () => void;
}

export const StickerLayer: React.FC<StickerLayerProps> = ({ 
  stickers, 
  isSkipping = false, 
  shouldSkipTypewriter = false,
  skipSpeed = 1, 
  fontFamily = 'sans-serif',
  onTypewriterFinished
}) => {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <AnimatePresence>
        {stickers.filter(s => !s.isExiting).map((sticker) => {
          const baseDelay = sticker.delay ? sticker.delay * 1000 : 30;
          const typewriterSpeed = isSkipping ? (baseDelay / (skipSpeed * 2)) : baseDelay;
          
          return (
            <motion.div
              key={`sticker-${sticker.id}-${sticker._instanceId || 'default'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: sticker.exitDuration !== undefined ? sticker.exitDuration : 0.5 } }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute"
              style={{
                left: sticker.x !== undefined ? `${(sticker.x / 1280) * 100}%` : '50%',
                top: sticker.y !== undefined ? `${(sticker.y / 720) * 100}%` : '50%',
                transform: sticker.x !== undefined && sticker.y !== undefined ? 'none' : 'translate(-50%, -50%)',
                width: sticker.width !== undefined ? `${(sticker.width / 1280) * 100}%` : 'auto',
                textAlign: (sticker.alignment as any) || 'left',
              }}
            >
              <div 
                className="text-white font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,1)] tracking-[0.1em] whitespace-pre-wrap flex flex-col gap-1"
                style={{
                  fontSize: sticker.size ? `${(sticker.size / 720) * 100}cqh` : '3.5cqh',
                  fontFamily: fontFamily,
                  lineHeight: '1.6',
                }}
              >
                <MemoizedTypewriter 
                  text={sticker.text?.replace(/\\n/g, '\n') || ''}
                  speed={typewriterSpeed}
                  skip={isSkipping || shouldSkipTypewriter}
                  onFinished={onTypewriterFinished}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
