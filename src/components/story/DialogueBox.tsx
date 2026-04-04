import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Typewriter } from './Typewriter';

interface DialogueBoxProps {
  showUI: boolean;
  currentSubtitle: any;
  activeAnimText: any;
  currentSpeaker: string | null;
  currentText: string;
  isSkipping: boolean;
  skipSpeed: number;
  forceComplete: boolean;
  onComplete: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  showUI,
  currentSubtitle,
  activeAnimText,
  currentSpeaker,
  currentText,
  isSkipping,
  skipSpeed,
  forceComplete,
  onComplete
}) => {
  return (
    <AnimatePresence>
      {showUI && !currentSubtitle && !activeAnimText && (
        <motion.div 
          key="dialogue-area"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none"
        >
          {/* Background Bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent h-[150%] -bottom-0 pointer-events-none" />
          
          <div className="relative px-24 pb-12 flex justify-center">
            <div className="w-full max-w-5xl flex items-start gap-8">
              {/* Name Tag */}
              <div className="w-40 flex-shrink-0 text-right pt-1">
                {currentSpeaker && (
                  <div 
                    key={currentSpeaker}
                    className="text-white/60 text-[20px] font-normal tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  >
                    {currentSpeaker}
                  </div>
                )}
              </div>
              
              {/* Text Area */}
              <div className="flex-grow">
                <p className="text-white text-[20px] leading-[1.6] font-normal drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                  <Typewriter 
                    text={currentText} 
                    isSkipping={isSkipping} 
                    skipSpeed={skipSpeed} 
                    forceComplete={forceComplete} 
                    onComplete={onComplete} 
                  />
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
