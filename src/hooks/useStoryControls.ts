import React, { useRef, useCallback, useEffect } from 'react';
import { LONG_PRESS_DELAY, SWIPE_THRESHOLD, SWIPE_DURATION, SKIP_SPEEDS } from '../constants';

interface StoryControlsProps {
  isAuto: boolean;
  isSkipping: boolean;
  isHoldingSkip: boolean;
  currentDecision: any;
  showBackConfirm: boolean;
  showSettings: boolean;
  showLog: boolean;
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
  showSettings,
  showLog,
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
    if (currentDecision || showBackConfirm || showSettings || showLog) return;
    
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    pointerDownTime.current = Date.now();
    
    holdStartY.current = e.clientY;
  }, [currentDecision, showBackConfirm, showSettings, showLog]);

  const handlePointerMove = useCallback((_e: React.PointerEvent) => {
    // Speed selection removed
  }, []);

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

    if (!showBackConfirm && !currentDecision && !showSettings && !showLog && showUI) {
      if (e.pointerType !== 'mouse' || e.button === 0) {
        advance();
      }
    }
  }, [showBackConfirm, currentDecision, showSettings, showLog, showUI, advance]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBackConfirm || currentDecision || showSettings || showLog) return;
      
      if (e.code === 'Space' || e.code === 'Enter') {
        advance();
      }

      if (e.code === 'ControlLeft') {
        setIsHoldingSkip(true);
        setIsSkipping(true);
        setIsAuto(false);
        setSkipSpeed(SKIP_SPEEDS.LEVEL_5); // Fixed high speed for Ctrl skip
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ControlLeft') {
        setIsHoldingSkip(false);
        setIsSkipping(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [advance, showBackConfirm, currentDecision, showSettings, showLog, setIsHoldingSkip, setIsSkipping, setIsAuto, setSkipSpeed]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
