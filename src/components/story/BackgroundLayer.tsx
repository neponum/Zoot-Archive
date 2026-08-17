import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { CssTransformBox } from './CssTransformBox';

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
  const bgScaleX = bgTween ? (bgTween.xScaleTo !== undefined ? bgTween.xScaleTo : (bgTween.xScale ?? 1)) : 1;
  const bgScaleY = bgTween ? (bgTween.yScaleTo !== undefined ? bgTween.yScaleTo : (bgTween.yScale ?? 1)) : 1;
  const bgX = bgTween ? (bgTween.xTo !== undefined ? bgTween.xTo : (bgTween.x ?? 0)) : 0;
  const bgY = bgTween ? (bgTween.yTo !== undefined ? bgTween.yTo : (bgTween.y ?? 0)) : 0;
  const bgScaleXFrom = bgTween?.xScaleFrom;
  const bgScaleYFrom = bgTween?.yScaleFrom;
  const bgXFrom = bgTween?.xFrom;
  const bgYFrom = bgTween?.yFrom;
  const bgDuration = bgTween?.duration !== undefined ? bgTween.duration : 1.0;
  const bgEase = bgTween?.ease || "easeInOut";

  const isImageTween = imageTween?.type === 'imagetween' || (imageTween?.xScaleTo !== undefined || imageTween?.xTo !== undefined || imageTween?.xScaleFrom !== undefined);
  const isScreenAdapt = imageTween?.screenadapt === true || imageTween?.screenadapt === 'true';

  // Determine if the CG is undergoing panning / position displacement
  const hasPan = Boolean(
    (imageTween?.x !== undefined && imageTween.x !== 0) ||
    (imageTween?.y !== undefined && imageTween.y !== 0) ||
    (imageTween?.xTo !== undefined && imageTween.xTo !== 0) ||
    (imageTween?.yTo !== undefined && imageTween.yTo !== 0) ||
    (imageTween?.xFrom !== undefined && imageTween.xFrom !== 0) ||
    (imageTween?.yFrom !== undefined && imageTween.yFrom !== 0)
  );

  // In Arknights, 0.4 is the base 1.0 (100% screen cover) scale for high-res 2.5x CG textures.
  // We normalize scale <= 0.65 by multiplying by 2.5 so that 0.4 becomes 1.0 full screen.
  // If the CG is panning across screen coordinates, ensure sufficient scale (min 1.25) to prevent border gaps.
  const normalizeScale = (scale: number | undefined): number => {
    if (scale === undefined) return hasPan ? 1.25 : 1;
    let s = scale;
    if (s > 0 && s <= 0.65) {
      s = s * 2.5; // 0.4 -> 1.0, 0.5 -> 1.25, etc.
    }
    if (hasPan && s < 1.2) {
      s = 1.25;
    }
    return s;
  };

  const rawScaleX = imageTween ? (imageTween.xScaleTo !== undefined ? imageTween.xScaleTo : (imageTween.xScale ?? 1)) : 1;
  const rawScaleY = imageTween ? (imageTween.yScaleTo !== undefined ? imageTween.yScaleTo : (imageTween.yScale ?? 1)) : 1;

  const imgScaleX = isScreenAdapt ? 1 : normalizeScale(rawScaleX);
  const imgScaleY = isScreenAdapt ? 1 : normalizeScale(rawScaleY);
  const imgX = isScreenAdapt ? 0 : (imageTween ? (imageTween.xTo !== undefined ? imageTween.xTo : (imageTween.x ?? 0)) : 0);
  const imgY = isScreenAdapt ? 0 : (imageTween ? (imageTween.yTo !== undefined ? imageTween.yTo : (imageTween.y ?? 0)) : 0);
  const imgScaleXFrom = isScreenAdapt ? undefined : (imageTween?.xScaleFrom !== undefined ? normalizeScale(imageTween.xScaleFrom) : undefined);
  const imgScaleYFrom = isScreenAdapt ? undefined : (imageTween?.yScaleFrom !== undefined ? normalizeScale(imageTween.yScaleFrom) : undefined);
  const imgXFrom = isScreenAdapt ? undefined : imageTween?.xFrom;
  const imgYFrom = isScreenAdapt ? undefined : imageTween?.yFrom;
  const imgDuration = isImageTween ? (imageTween?.duration !== undefined ? imageTween.duration : 1.0) : 0;
  const imgEase = imageTween?.ease || "easeInOut";
  const imageFadeDuration = imageTween?.duration !== undefined ? Math.min(imageTween.duration, 1.0) : 0.4;

  return (
    <>
      {/* Background Layer */}
      <div className="absolute inset-0 bg-black pointer-events-none overflow-hidden">
        <AnimatePresence>
          {bgUrl && (
            <motion.div
              key={bgUrl === 'BLACK_FALLBACK' ? 'black' : bgUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 0.5 } }}
              className="absolute inset-0"
            >
              <CssTransformBox
                x={bgX}
                y={bgY}
                scaleX={bgScaleX}
                scaleY={bgScaleY}
                xFrom={bgXFrom}
                yFrom={bgYFrom}
                scaleXFrom={bgScaleXFrom}
                scaleYFrom={bgScaleYFrom}
                duration={bgDuration}
                ease={bgEase}
                className={cn("w-full h-full origin-center", bgTween?.tiled ? "bg-repeat" : "")}
              >
                {bgUrl !== 'BLACK_FALLBACK' && (
                  <img 
                    src={bgUrl} 
                    alt="Background" 
                    className="w-full h-full object-cover pointer-events-none select-none"
                    referrerPolicy="no-referrer"
                    draggable="false"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </CssTransformBox>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Image Layer (CGs / Unique illustrations that overlay the background) */}
      <AnimatePresence>
        {imageUrl && (
          <motion.div
            key={imageUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: imageFadeDuration } }}
            className="absolute inset-0 z-[24] pointer-events-none overflow-hidden bg-black flex items-center justify-center"
          >
            <CssTransformBox
              x={imgX}
              y={imgY}
              scaleX={imgScaleX}
              scaleY={imgScaleY}
              xFrom={imgXFrom}
              yFrom={imgYFrom}
              scaleXFrom={imgScaleXFrom}
              scaleYFrom={imgScaleYFrom}
              duration={imgDuration}
              ease={imgEase}
              className="w-full h-full origin-center flex items-center justify-center"
            >
              <img 
                src={imageUrl} 
                alt="Image" 
                className="w-full h-full object-cover pointer-events-none select-none"
                referrerPolicy="no-referrer"
                draggable="false"
                loading="eager"
              />
            </CssTransformBox>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

