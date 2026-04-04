import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Typewriter } from './Typewriter';

interface SubtitleBoxProps {
  currentSubtitle: any;
  currentText: string;
  isSkipping: boolean;
  skipSpeed: number;
  forceComplete: boolean;
  onComplete: () => void;
}

export const SubtitleBox: React.FC<SubtitleBoxProps> = ({
  currentSubtitle,
  currentText,
  isSkipping,
  skipSpeed,
  forceComplete,
  onComplete
}) => {
  return (
    <AnimatePresence>
      {currentSubtitle && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center px-24"
        >
          <div 
            className="w-full text-center"
            style={{
              position: 'absolute',
              left: currentSubtitle.x ? `${currentSubtitle.x}px` : '50%',
              top: currentSubtitle.y ? `${currentSubtitle.y}px` : '50%',
              transform: `translate(${currentSubtitle.x ? '0' : '-50%'}, ${currentSubtitle.y ? '0' : '-50%'})`,
              width: currentSubtitle.width ? `${currentSubtitle.width}px` : '100%',
              textAlign: (currentSubtitle.alignment as any) || 'center',
            }}
          >
            <p 
              className="text-white font-normal drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide"
              style={{ fontSize: currentSubtitle.size ? `${currentSubtitle.size}px` : '24px' }}
            >
              <Typewriter 
                text={currentText} 
                isSkipping={isSkipping} 
                skipSpeed={skipSpeed} 
                forceComplete={forceComplete} 
                onComplete={onComplete} 
              />
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
