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
  showBugReport?: boolean;
  showUI: boolean;
  isTypewriterFinished: boolean;
  advance: () => void;
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
  showBugReport,
  showUI,
  isTypewriterFinished,
  advance,
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
    if (currentDecision || showBackConfirm || showSettings || showLog || showBugReport) return;
    
    // Ignore clicks on UI elements (buttons, overlays with high z-index)
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], .z-50, .z-max, .z-\[60\], .z-\[70\], .z-\[80\]')) {
      return;
    }

    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    pointerDownTime.current = Date.now();
    
    holdStartY.current = e.clientY;
  }, [currentDecision, showBackConfirm, showSettings, showLog, showBugReport]);

  const handlePointerMove = useCallback((_e: React.PointerEvent) => {
    // Speed selection removed
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (pointerDownTime.current === 0) return;

    // Ignore if target is UI
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], .z-50, .z-max, .z-\[60\], .z-\[70\], .z-\[80\]')) {
      pointerDownTime.current = 0;
      return;
    }

    const deltaX = e.clientX - pointerDownPos.current.x;
    const deltaY = e.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - pointerDownTime.current;
    
    pointerDownTime.current = 0;

    const isSwipe = distance > SWIPE_THRESHOLD && duration < SWIPE_DURATION;

    if (!showBackConfirm && !currentDecision && !showSettings && !showLog && showUI) {
      if (e.pointerType !== 'mouse' || e.button === 0) {
        advance();
      }
    }
  }, [showBackConfirm, currentDecision, showSettings, showLog, showUI, advance]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBackConfirm || currentDecision || showSettings || showLog || showBugReport) return;
      
      if (e.code === 'Space' || e.code === 'Enter') {
        advance();
      }

      if (e.code === 'ControlLeft' && !isHoldingSkip) {
        setIsHoldingSkip(true);
        setIsSkipping(true);
        setIsAuto(false);
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
  }, [advance, showBackConfirm, currentDecision, showSettings, showLog, showBugReport, isHoldingSkip, setIsHoldingSkip, setIsSkipping, setIsAuto]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
