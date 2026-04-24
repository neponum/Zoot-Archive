import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface BackgroundLayerProps {
  bgUrl: string | null;
  imageUrl: string | null;
  imageTween: any;
  bgTween: any;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = React.memo(({
  bgUrl,
  imageUrl,
  imageTween,
  bgTween,
}) => {
  return (
    <>
      {/* Background Layer */}
      <AnimatePresence mode="wait">
        {!imageUrl && (
          <motion.div
            key={bgUrl || 'black'}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              x: bgTween ? [bgTween.xFrom ?? 0, bgTween.xTo ?? 0] : 0,
              y: bgTween ? [bgTween.yFrom ?? 0, bgTween.yTo ?? 0] : 0,
              scaleX: bgTween ? [bgTween.xScaleFrom ?? 1, bgTween.xScaleTo ?? 1] : 1,
              scaleY: bgTween ? [bgTween.yScaleFrom ?? 1, bgTween.yScaleTo ?? 1] : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: bgTween?.duration || 1 },
              scaleX: { duration: bgTween?.duration || 1, ease: bgTween?.ease || "linear" },
              scaleY: { duration: bgTween?.duration || 1, ease: bgTween?.ease || "linear" },
              x: { duration: bgTween?.duration || 1, ease: bgTween?.ease || "linear" },
              y: { duration: bgTween?.duration || 1, ease: bgTween?.ease || "linear" },
            }}
            className={cn("absolute inset-0 bg-black", bgTween?.tiled ? "bg-repeat" : "")}
          >
            {bgUrl && bgUrl !== 'BLACK_FALLBACK' && (
              <img 
                src={bgUrl} 
                alt="Background" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                draggable="false"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
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
              x: imageTween ? [imageTween.xFrom ?? 0, imageTween.xTo ?? 0] : 0,
              y: imageTween ? [imageTween.yFrom ?? 0, imageTween.yTo ?? 0] : 0,
              scaleX: imageTween ? [imageTween.xScaleFrom ?? 1, imageTween.xScaleTo ?? 1] : 1,
              scaleY: imageTween ? [imageTween.yScaleFrom ?? 1, imageTween.yScaleTo ?? 1] : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 0.5 },
              scaleX: { duration: imageTween?.duration || 0.5, ease: imageTween?.ease || "linear" },
              scaleY: { duration: imageTween?.duration || 0.5, ease: imageTween?.ease || "linear" },
              x: { duration: imageTween?.duration || 0.5, ease: imageTween?.ease || "linear" },
              y: { duration: imageTween?.duration || 0.5, ease: imageTween?.ease || "linear" }
            }}
            className="absolute inset-0 z-[24]"
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <img 
              src={imageUrl} 
              alt="Image" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              draggable="false"
              loading="eager"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
