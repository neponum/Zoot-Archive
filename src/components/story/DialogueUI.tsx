import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { StoryLine } from '../../types';
import { MemoizedTypewriter } from './Typewriter';

interface DialogueUIProps {
  showUI: boolean;
  currentIndex: number;
  currentSpeaker: string | null;
  currentText: string;
  isSkipping: boolean;
  skipSpeed: number;
  shouldSkipTypewriter: boolean;
  currentDecision: StoryLine | null;
  currentSubtitle: StoryLine | null;
  activeAnimText: StoryLine | null;
  fontSize: number;
  showSettings: boolean;
  onChoice: (value: string) => void;
  onTypewriterFinished: () => void;
  t: any;
}

export const DialogueUI: React.FC<DialogueUIProps> = React.memo(({
  showUI,
  currentIndex,
  currentSpeaker,
  currentText,
  isSkipping,
  skipSpeed,
  shouldSkipTypewriter,
  currentDecision,
  currentSubtitle,
  activeAnimText,
  fontSize,
  showSettings,
  onChoice,
  onTypewriterFinished,
  t,
}) => {
  if (!showUI) return null;

  // Use subtitle delay if available, otherwise default to 30ms
  const baseDelay = currentSubtitle?.duration ? currentSubtitle.duration * 1000 : 30;
  const typewriterSpeed = isSkipping ? (baseDelay / (skipSpeed * 2)) : baseDelay;
  const skip = isSkipping || shouldSkipTypewriter;

  const fontScale = fontSize / 100;

  return (
    <>
      {/* Bottom Gradient Overlay (Arknights Style) */}
      {!currentSubtitle && (
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black via-black/70 to-transparent z-20 pointer-events-none" />
      )}

      {/* Subtitle Area */}
      <AnimatePresence>
        {currentSubtitle && (
          <motion.div
            key={`subtitle-${currentIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute z-30 pointer-events-none flex"
            style={{
              left: currentSubtitle.x !== undefined ? `${(currentSubtitle.x / 1280) * 100}%` : '50%',
              top: currentSubtitle.y !== undefined ? `${(currentSubtitle.y / 720) * 100}%` : '50%',
              transform: currentSubtitle.x === undefined && currentSubtitle.y === undefined ? 'translate(-50%, -50%)' : 'none',
              width: currentSubtitle.width !== undefined ? `${(currentSubtitle.width / 1280) * 100}%` : '100%',
              justifyContent: currentSubtitle.alignment === 'center' ? 'center' : currentSubtitle.alignment === 'right' ? 'flex-end' : 'flex-start',
              textAlign: (currentSubtitle.alignment as any) || 'center',
            }}
          >
            <div 
              className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide"
              style={{
                fontSize: currentSubtitle.size !== undefined ? `${(currentSubtitle.size / 720) * 100 * fontScale}cqh` : `${3.33 * fontScale}cqh`,
              }}
            >
              <MemoizedTypewriter 
                key={`typewriter-subtitle-${currentIndex}`}
                text={currentText}
                speed={typewriterSpeed}
                onFinished={onTypewriterFinished}
                skip={skip}
                paused={showSettings}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue Area */}
      <AnimatePresence>
        {!currentSubtitle && !activeAnimText && !currentDecision && (
          <motion.div 
            key="dialogue-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 px-24 pb-12 z-30 pointer-events-none flex justify-center"
          >
            <div className="w-full max-w-5xl flex items-start gap-8">
              {/* Name Tag */}
              <div className="w-40 flex-shrink-0 text-right pt-1">
                {currentSpeaker && (
                  <div 
                    key={currentSpeaker}
                    className="text-white/60 text-[20px] font-normal tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    style={{ fontSize: `${20 * fontScale}px` }}
                  >
                    {currentSpeaker}
                  </div>
                )}
              </div>
              
              {/* Text Area */}
              <div className="flex-grow">
                <div 
                  className="text-white text-[20px] leading-[1.6] font-normal drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide"
                  style={{ fontSize: `${20 * fontScale}px` }}
                >
                  <MemoizedTypewriter 
                    key={`typewriter-dialogue-${currentIndex}`}
                    text={currentText}
                    speed={typewriterSpeed}
                    onFinished={onTypewriterFinished}
                    skip={skip}
                    paused={showSettings}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Overlay */}
      <AnimatePresence>
        {currentDecision && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-8"
          >
            <div className="w-full max-w-2xl space-y-4">
              {currentDecision.options?.map((option, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChoice(currentDecision.values?.[idx] || String(idx + 1));
                  }}
                  className="w-full p-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xl font-medium transition-all text-center backdrop-blur-md pointer-events-auto"
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
