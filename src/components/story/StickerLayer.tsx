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
  // Only stickers that still have to type something can hold the current line back
  const typingStickers = React.useMemo(
    () => stickers.filter(s => !s.isExiting && !!s.text && s.text.trim().length > 0),
    [stickers]
  );

  const getStickerText = React.useCallback((sticker: StoryLine) => sticker.text?.replace(/\\n/g, '\n') || '', []);
  const getStickerKey = React.useCallback(
    (sticker: StoryLine) => sticker._instanceId || `${sticker.id ?? ''}|${getStickerText(sticker)}`,
    [getStickerText]
  );

  // sticker instance key -> text that instance has already fully typed
  const typedStickerTextsRef = React.useRef<Map<string, string>>(new Map());

  const areAllTyped = React.useCallback(() => (
    typingStickers.every(s => typedStickerTextsRef.current.get(getStickerKey(s)) === getStickerText(s))
  ), [typingStickers, getStickerKey, getStickerText]);

  const handleStickerTyped = React.useCallback((sticker: StoryLine) => {
    const text = getStickerText(sticker);
    const key = getStickerKey(sticker);
    if (typedStickerTextsRef.current.get(key) === text) return;

    const visibleKeys = new Set(typingStickers.map(getStickerKey));
    typedStickerTextsRef.current.forEach((_, trackedKey) => {
      if (!visibleKeys.has(trackedKey)) typedStickerTextsRef.current.delete(trackedKey);
    });

    typedStickerTextsRef.current.set(key, text);

    // The line only counts as typed once every visible sticker finished typing
    if (areAllTyped()) onTypewriterFinished?.();
  }, [typingStickers, getStickerKey, getStickerText, areAllTyped, onTypewriterFinished]);

  // Safety net: when the set of visible stickers changes (e.g. one of them got cleared
  // while typing) the line must not stay blocked if the rest is already typed.
  const typingStickersSignature = React.useMemo(
    () => typingStickers.map(getStickerKey).join('||'),
    [typingStickers, getStickerKey]
  );
  const lastTypingSignatureRef = React.useRef(typingStickersSignature);

  React.useEffect(() => {
    if (lastTypingSignatureRef.current === typingStickersSignature) return;
    lastTypingSignatureRef.current = typingStickersSignature;
    if (typingStickers.length > 0 && areAllTyped()) onTypewriterFinished?.();
  }, [typingStickersSignature, typingStickers.length, areAllTyped, onTypewriterFinished]);

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
                className="text-white font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,1)] tracking-[0.04em] whitespace-pre-wrap"
                style={{
                  fontSize: sticker.size ? `${(sticker.size / 1080) * 100}cqh` : '2.3cqh',
                  fontFamily: fontFamily,
                  lineHeight: '1.3',
                }}
              >
                <MemoizedTypewriter 
                  text={getStickerText(sticker)}
                  speed={typewriterSpeed}
                  skip={isSkipping || shouldSkipTypewriter}
                  onFinished={() => handleStickerTyped(sticker)}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
