import React, { useRef, useCallback, useEffect } from 'react';
import { LONG_PRESS_DELAY, SWIPE_THRESHOLD, SWIPE_DURATION, SKIP_SPEEDS } from '../constants';

interface StoryControlsProps {
  isAuto: boolean;
  isSkipping: boolean;
  isHoldingSkip: boolean;
  currentDecision: any;
  showBackConfirm: boolean;
  showUI: boolean;
  isTypewriterFinished: boolean;
  advance: () => void;
  setSkipSpeed: (speed: number) => void;
  setIsSkipping: (skipping: boolean) => void;
  setIsAuto: (auto: boolean) => void;
  setIsHoldingSkip: (holding: boolean) => void;
  setShouldSkipTypewriter: (skip: boolean) => void;
}

export const useStoryControls = ({
  isAuto,
  isSkipping,
  isHoldingSkip,
  currentDecision,
  showBackConfirm,
  showUI,
  isTypewriterFinished,
  advance,
  setSkipSpeed,
  setIsSkipping,
  setIsAuto,
  setIsHoldingSkip,
  setShouldSkipTypewriter,
}: StoryControlsProps) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const holdStartY = useRef<number>(0);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const pointerDownTime = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (currentDecision || showBackConfirm) return;
    
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    pointerDownTime.current = Date.now();
    
    holdStartY.current = e.clientY;
    longPressTimer.current = setTimeout(() => {
      setIsHoldingSkip(true);
      setIsSkipping(true);
      setIsAuto(false);
      setSkipSpeed(SKIP_SPEEDS.LEVEL_1);
    }, LONG_PRESS_DELAY);
  }, [currentDecision, showBackConfirm, setIsHoldingSkip, setIsSkipping, setIsAuto, setSkipSpeed]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!longPressTimer.current && !isHoldingSkip) return;
    
    const deltaY = holdStartY.current - e.clientY;
    const absDeltaY = Math.abs(deltaY);
    
    if (absDeltaY > 150) setSkipSpeed(SKIP_SPEEDS.LEVEL_5);
    else if (absDeltaY > 120) setSkipSpeed(SKIP_SPEEDS.LEVEL_4);
    else if (absDeltaY > 90) setSkipSpeed(SKIP_SPEEDS.LEVEL_3);
    else if (absDeltaY > 60) setSkipSpeed(SKIP_SPEEDS.LEVEL_2);
    else setSkipSpeed(SKIP_SPEEDS.LEVEL_1);
  }, [isHoldingSkip, setSkipSpeed]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const deltaX = e.clientX - pointerDownPos.current.x;
    const deltaY = e.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - pointerDownTime.current;
    
    const isSwipe = distance > SWIPE_THRESHOLD && duration < SWIPE_DURATION;

    if (isHoldingSkip) {
      setIsHoldingSkip(false);
      setIsSkipping(false);
      setSkipSpeed(SKIP_SPEEDS.LEVEL_1);
    } else if (!showBackConfirm && !currentDecision && showUI) {
      if (e.pointerType !== 'mouse' || e.button === 0) {
        if (isSwipe) {
          if (!isTypewriterFinished) {
            setShouldSkipTypewriter(true);
          }
          advance();
        } else {
          if (!isTypewriterFinished) {
            setShouldSkipTypewriter(true);
          } else {
            advance();
          }
        }
      }
    }
  }, [isHoldingSkip, showBackConfirm, currentDecision, showUI, isTypewriterFinished, advance, setIsHoldingSkip, setIsSkipping, setSkipSpeed, setShouldSkipTypewriter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBackConfirm || currentDecision) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        advance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advance, showBackConfirm, currentDecision]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
