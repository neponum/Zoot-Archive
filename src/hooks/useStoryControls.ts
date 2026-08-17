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
  onToggleAuto?: () => void;
  onToggleLog?: () => void;
  onToggleSettings?: () => void;
  onToggleFullscreen?: () => void;
  onCloseModal?: () => void;
  onOpenBackConfirm?: () => void;
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
  onToggleAuto,
  onToggleLog,
  onToggleSettings,
  onToggleFullscreen,
  onCloseModal,
  onOpenBackConfirm,
}: StoryControlsProps) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const holdStartY = useRef<number>(0);
  const pointerDownPos = useRef({ x: 0, y: 0 });
  const pointerDownTime = useRef(0);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (currentDecision || showBackConfirm || showSettings || showLog || showBugReport) return;
    
    // Ignore clicks on UI elements
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], a, input, select, textarea, .pwa-ui-element, [class*="z-"], [data-modal]')) {
      return;
    }

    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    pointerDownTime.current = Date.now();
    holdStartY.current = e.clientY;

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    longPressTimer.current = setTimeout(() => {
      setIsHoldingSkip(true);
      setIsSkipping(true);
      setIsAuto(false);
    }, 400); // 400ms is standard and comfortable
  }, [currentDecision, showBackConfirm, showSettings, showLog, showBugReport, setIsHoldingSkip, setIsSkipping, setIsAuto]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerDownTime.current === 0) return;
    
    const deltaX = e.clientX - pointerDownPos.current.x;
    const deltaY = e.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // If they drag too much, cancel the long press timer
    if (distance > 20) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (pointerDownTime.current === 0) return;

    // If we are currently holding skip, disable normal click advance and stop skipping on release
    if (isHoldingSkip) {
      setIsHoldingSkip(false);
      setIsSkipping(false);
      pointerDownTime.current = 0;
      return;
    }

    if (showBackConfirm || currentDecision || showSettings || showLog || showBugReport) {
      pointerDownTime.current = 0;
      return;
    }

    // Ignore if target is UI
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], a, input, select, textarea, .pwa-ui-element, [class*="z-"], [data-modal]')) {
      pointerDownTime.current = 0;
      return;
    }

    const deltaX = e.clientX - pointerDownPos.current.x;
    const deltaY = e.clientY - pointerDownPos.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - pointerDownTime.current;
    
    pointerDownTime.current = 0;

    const isSwipe = distance > SWIPE_THRESHOLD && duration < SWIPE_DURATION;

    if (e.pointerType !== 'mouse' || e.button === 0) {
      if (!showUI) {
        // If UI was hidden, ONLY show it and do NOT advance the story
        setShowUI(true);
        return;
      }
      advance();
    }
  }, [showBackConfirm, currentDecision, showSettings, showLog, showBugReport, showUI, advance, setShowUI, isHoldingSkip, setIsHoldingSkip, setIsSkipping]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Handle Escape for modals
      if (e.code === 'Escape') {
        e.preventDefault();
        if (showSettings || showLog || showBugReport) {
          onCloseModal?.();
        } else if (showBackConfirm) {
          onCloseModal?.();
        } else {
          onOpenBackConfirm?.();
        }
        return;
      }

      // Modals active: block gameplay hotkeys
      if (showBackConfirm || currentDecision || showSettings || showLog || showBugReport) return;
      
      // Advance hotkeys: Space, Enter, ArrowRight, ArrowDown
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault();
        advance();
        return;
      }

      // Open History Log: ArrowUp, KeyL
      if (e.code === 'ArrowUp' || e.code === 'KeyL') {
        e.preventDefault();
        onToggleLog?.();
        return;
      }

      // Toggle Auto: KeyA
      if (e.code === 'KeyA') {
        e.preventDefault();
        if (onToggleAuto) onToggleAuto();
        else setIsAuto(!isAuto);
        return;
      }

      // Toggle Settings: KeyS
      if (e.code === 'KeyS') {
        e.preventDefault();
        onToggleSettings?.();
        return;
      }

      // Toggle Hide UI: KeyH or KeyU
      if (e.code === 'KeyH' || e.code === 'KeyU') {
        e.preventDefault();
        setShowUI(!showUI);
        return;
      }

      // Toggle Fullscreen: KeyF
      if (e.code === 'KeyF') {
        e.preventDefault();
        onToggleFullscreen?.();
        return;
      }

      // Fast Skip Hold: ControlLeft, ControlRight, Tab
      if ((e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Tab') && !isHoldingSkip) {
        e.preventDefault();
        setIsHoldingSkip(true);
        setIsSkipping(true);
        setIsAuto(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'Tab') {
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
  }, [
    advance, 
    showBackConfirm, 
    currentDecision, 
    showSettings, 
    showLog, 
    showBugReport, 
    showUI, 
    isAuto, 
    isHoldingSkip, 
    setIsHoldingSkip, 
    setIsSkipping, 
    setIsAuto, 
    setShowUI,
    onToggleAuto,
    onToggleLog,
    onToggleSettings,
    onToggleFullscreen,
    onCloseModal,
    onOpenBackConfirm
  ]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
