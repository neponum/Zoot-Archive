import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface BackgroundLayerProps {
  bgUrl: string | null;
  imageUrl: string | null;
  imageTween: any;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = React.memo(({
  bgUrl,
  imageUrl,
  imageTween,
}) => {
  return (
    <>
      {/* Background Layer */}
      <AnimatePresence mode="wait">
        {bgUrl && !imageUrl && (
          <motion.div
            key={bgUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={cn("absolute inset-0", bgUrl === 'BLACK_FALLBACK' ? "bg-black" : "")}
          >
            {bgUrl !== 'BLACK_FALLBACK' && (
              <img 
                src={bgUrl} 
                alt="Background" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                draggable="false"
                onError={(e) => {
                  e.currentTarget.src = 'https://cdn.jsdelivr.net/gh/akgcc/arkdata@main/assets/torappu/dynamicassets/avg/backgrounds/bg_black.png';
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Layer (CGs) */}
      <AnimatePresence mode="wait">
        {imageUrl && (
          <motion.div
            key={imageUrl}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              scaleX: imageTween ? [imageTween.xScaleFrom ?? 1, imageTween.xScaleTo ?? 1] : 1,
              scaleY: imageTween ? [imageTween.yScaleFrom ?? 1, imageTween.yScaleTo ?? 1] : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 0.5 },
              scaleX: { duration: imageTween?.duration || 0.5, ease: "linear" },
              scaleY: { duration: imageTween?.duration || 0.5, ease: "linear" }
            }}
            className="absolute inset-0 z-5"
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <img 
              src={imageUrl} 
              alt="Image" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              draggable="false"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
