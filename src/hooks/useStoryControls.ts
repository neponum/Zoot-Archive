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
  setShowUI: (show: boolean) => void;
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
  setShowUI,
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
    
    // Ignore clicks on UI elements
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], .pwa-ui-element, .z-50, .z-max')) {
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
    if (target.closest('button, [role="button"], .pwa-ui-element, .z-50, .z-max')) {
      pointerDownTime.current = 0;
      return;
    }

    const deltaX = e.clientX - pointerDownPos.current.x;
    const deltaY = e.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - pointerDownTime.current;
    
    pointerDownTime.current = 0;

    const isSwipe = distance > SWIPE_THRESHOLD && duration < SWIPE_DURATION;

    if (!showBackConfirm && !currentDecision && !showSettings && !showLog) {
      if (e.pointerType !== 'mouse' || e.button === 0) {
        if (!showUI) {
          // If UI was hidden, show it and advance
          setShowUI(true);
        }
        advance();
      }
    }
  }, [showBackConfirm, currentDecision, showSettings, showLog, showUI, advance, setShowUI]);

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
