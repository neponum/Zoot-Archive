import React, { useEffect, useCallback, useReducer, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStoryScript, parseStoryScript, getImageUrl, preloadAssets, getLanguage, getCharacterAssetInfo, clearPreloadedImages, clearUrlCache, AudioSnapshot } from '../services/storyService';
import { audioManager } from '../services/audioManager';
import { CacheService } from '../services/cacheService';
import { StoryLine, StoryChapter } from '../types';
import { UI_STRINGS } from '../translations';
import { BackgroundLayer } from './story/BackgroundLayer';
import { CssTransformBox } from './story/CssTransformBox';
import { CharacterLayer } from './story/CharacterLayer';
import { CharacterCutinLayer } from './story/CharacterCutinLayer';
import { DialogueUI } from './story/DialogueUI';
import { ControlsOverlay } from './story/ControlsOverlay';
import { CinematicEffectsLayer } from './story/CinematicEffectsLayer';
import { StickerLayer } from './story/StickerLayer';
import { BackConfirmation } from './story/BackConfirmation';
import { SettingsModal } from './story/SettingsModal';
import { LogModal } from './story/LogModal';
import { BugReportModal } from './story/BugReportModal';
import { StoryLoadingScreen } from './story/StoryLoadingScreen';
import { StoryErrorScreen } from './story/StoryErrorScreen';
import { storyReducer, initialState, CharacterSlotData } from '../hooks/useStoryReducer';
import { useStoryControls } from '../hooks/useStoryControls';
import { AUTO_ADVANCE_DELAY, SKIP_SPEEDS } from '../constants';

import { OrientationOverlay } from './story/OrientationOverlay';
import { getChapterDisplayCode, getChapterFullDisplayCode } from '../lib/utils';

interface StoryViewerProps {
  storyTxt: string;
  customScript?: string;
  translator?: string;
  isRead?: boolean;
  onToggleRead?: () => void;
  onBack: () => void;
  onComplete?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ storyTxt, customScript, translator, isRead, onToggleRead, onBack, onComplete }) => {
  const lang = getLanguage();
  const t = UI_STRINGS[lang];
  
  const [state, dispatch] = useReducer(storyReducer, initialState);
  const {
    lines,
    currentIndex,
    bgUrl,
    characterSlots,
    currentSpeaker,
    currentText,
    isTypewriterFinished,
    shouldSkipTypewriter,
    currentDecision,
    currentSubtitle,
    activeAnimText,
    imageUrl,
    imageTween,
    isShaking,
    shakeConfig,
    isFlashing,
    cameraEffect,
    cameraTransform,
    blocker,
    isAuto,
    isSkipping,
    showUI,
    isBlocking,
    isCinematic,
    showBackConfirm,
    showSettings,
    showLog,
    predicateMismatch,
    history,
    settings
  } = state;

  const [loading, setLoading] = React.useState(true);
  const [isReadyToStart, setIsReadyToStart] = React.useState(false);
  const [preloadProgress, setPreloadProgress] = React.useState({ loaded: 0, total: 0, currentFile: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [scriptContent, setScriptContent] = React.useState<string | null>(null);
  const [isHoldingSkip, setIsHoldingSkip] = React.useState(false);

  const processToken = useRef({});
  const currentIndexRef = useRef(0);
  const characterSlotsRef = useRef(characterSlots);
  const currentBgmRef = useRef<AudioSnapshot | null>(null);
  
  // Update characterSlotsRef whenever characterSlots changes
  useEffect(() => {
    characterSlotsRef.current = characterSlots;
  }, [characterSlots]);

  const bgUrlRef = useRef<string | null>(null);
  const currentBgRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    bgUrlRef.current = bgUrl;
    currentBgRef.current = state.currentBg;
    imageUrlRef.current = imageUrl;
  }, [bgUrl, state.currentBg, imageUrl]);

  const predicateMismatchRef = useRef(false);
  const isSkippingRef = useRef(isSkipping);
  useEffect(() => {
    isSkippingRef.current = isSkipping;
  }, [isSkipping]);
  const isProcessing = useRef(false);
  const selectedChoicesRef = useRef<Set<string>>(new Set());
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastAdvanceTime = useRef<number>(0);
  const lastSkipTime = useRef<number>(0);
  const skipBlockerRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearAudioTimeouts = useCallback(() => {
    activeAudioTimeoutsRef.current.forEach(t => clearTimeout(t));
    activeAudioTimeoutsRef.current = [];
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = null;
      dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });
    }
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
      dispatch({ type: 'SET_FLASH', payload: { active: false, duration: 0 } });
    }
  }, []);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showBugReport, setShowBugReport] = React.useState(false);

  // Replacement logic for user nickname
  const replaceNickname = useCallback((text: string | null | undefined): string => {
    if (!text) return '';
    return text.replace(/{@nickname}/g, settings.nickname || '{@nickname}');
  }, [settings.nickname]);

  const processedCurrentText = useMemo(() => replaceNickname(currentText), [currentText, replaceNickname]);
  const processedHistory = useMemo(() => history.map(h => ({ ...h, text: replaceNickname(h.text) })), [history, replaceNickname]);
  const fullScriptText = useMemo(() => {
    return lines
      .map((l, i) => ({ ...l, originalIndex: i }))
      .filter(l => (l.type === 'subtitle' || l.type === 'dialogue') && l.text)
      .map(l => ({
        speaker: l.characterName || null,
        text: replaceNickname(l.text) || '',
        lineIndex: l.originalIndex
      }));
  }, [lines, replaceNickname]);
  const processedStickers = useMemo(() => state.stickers.map(s => ({ ...s, text: replaceNickname(s.text) })), [state.stickers, replaceNickname]);
  const processedAnimText = useMemo(() => activeAnimText ? { ...activeAnimText, text: replaceNickname(activeAnimText.text) } : null, [activeAnimText, replaceNickname]);
  const processedSubtitle = useMemo(() => currentSubtitle ? { ...currentSubtitle, text: replaceNickname(currentSubtitle.text) } : null, [currentSubtitle, replaceNickname]);
  const processedDecision = useMemo(() => {
    if (!currentDecision) return null;
    return {
      ...currentDecision,
      options: currentDecision.options?.map(o => replaceNickname(o))
    };
  }, [currentDecision, replaceNickname]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Settings persistence
  useEffect(() => {
    localStorage.setItem('ak-story-settings', JSON.stringify(settings));
  }, [settings]);

  // Sync ref with state for callbacks
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const processLine = useCallback(async (startIndex: number) => {
    const token = {};
    processToken.current = token;
    clearAudioTimeouts();
    isProcessing.current = true;
    
    try {
      let index = startIndex;
      let lastDispatchedIndex = startIndex;
      let localPredicateMismatch = predicateMismatchRef.current;

      // If starting at a non-dialogue step (e.g. blockers, camera moves, character transitions),
      // clear the previous dialogue text so stale text doesn't linger or flash during animations
      if (startIndex < lines.length) {
        const startLine = lines[startIndex];
        if (startLine.type !== 'dialogue' && startLine.type !== 'subtitle' && startLine.type !== 'decision') {
          dispatch({ type: 'SET_DIALOGUE', payload: { speaker: null, text: '', index: startIndex } });
        }
      }

      const waitForCompletion = async (duration: number) => {
        const safeDuration = isNaN(duration) ? 0 : Math.max(duration, 0);
        const ms = safeDuration * 1000;
        if (ms <= 0 || skipBlockerRef.current || isSkippingRef.current) return true;
        
        const start = Date.now();
        
        while (Date.now() - start < ms) {
          if (skipBlockerRef.current || isSkippingRef.current) break;
          await new Promise(r => setTimeout(r, 16));
          if (processToken.current !== token) return false;
        }
        return true;
      };
      
      while (index < lines.length) {
        if (processToken.current !== token) return;
        currentIndexRef.current = index;
        const isSkipping = isSkippingRef.current;
        const line = lines[index];
        
        if (line.type === 'predicate') {
          if (line.references && line.references.length > 0) {
            localPredicateMismatch = !line.references.some(ref => selectedChoicesRef.current.has(ref));
          } else {
            localPredicateMismatch = false;
          }
          predicateMismatchRef.current = localPredicateMismatch;
          dispatch({ type: 'SET_PREDICATE_MISMATCH', payload: localPredicateMismatch });
          index++;
          continue;
        }

        if (localPredicateMismatch && line.type !== 'decision') {
          index++;
          continue;
        }

        switch (line.type) {
          case 'decision':
            skipBlockerRef.current = false;
            selectedChoicesRef.current.clear();
            dispatch({ type: 'SET_DECISION', payload: line });
            dispatch({ type: 'SET_INDEX', payload: index });
            dispatch({ type: 'SET_SKIPPING', payload: false });
            setIsHoldingSkip(false);
            return;

          case 'subtitle':
            if (line.text) {
              skipBlockerRef.current = false;
              dispatch({ type: 'ADD_TO_HISTORY', payload: { speaker: null, text: line.text, lineIndex: index, audioSnapshot: currentBgmRef.current } });
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: null, text: line.text, index, isSubtitle: true, line } });
              currentIndexRef.current = index;
              return;
            } else {
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: null, text: '', index, isSubtitle: true, line: null } });
              currentIndexRef.current = index;
              dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true });
            }
            break;

          case 'dialogue':
            if (line.text && line.text.trim().length > 0) {
              skipBlockerRef.current = false;
              dispatch({ type: 'ADD_TO_HISTORY', payload: { speaker: line.characterName || null, text: line.text, lineIndex: index, audioSnapshot: currentBgmRef.current } });
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: line.characterName || null, text: line.text, index } });
              currentIndexRef.current = index;
              return;
            } else {
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: line.characterName || null, text: '', index } });
              dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true });
            }
            break;
        
          case 'background':
            if (line.assetName) {
              const isBlack = line.assetName.toLowerCase().includes('black') || line.assetName.toLowerCase() === 'bg_black';
              if (isBlack) {
                bgUrlRef.current = 'BLACK_FALLBACK';
                currentBgRef.current = line.assetName;
                dispatch({ type: 'SET_BG', payload: { bgUrl: 'BLACK_FALLBACK', assetName: line.assetName, tween: line } });
              } else {
                const url = await getImageUrl('background', line.assetName);
                if (processToken.current !== token) return;
                bgUrlRef.current = url;
                currentBgRef.current = line.assetName;
                dispatch({ type: 'SET_BG', payload: { bgUrl: url, assetName: line.assetName, tween: line } });
              }
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              const waitDuration = line.duration;
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(waitDuration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
            
          case 'character':
            if (line.assetName || line.assetName2) {
              const getSlotName = (rawSlot: string | undefined): string => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l') return 'left';
                if (s === '2' || s === 'c' || s === 'm') return 'center';
                if (s === '3' || s === 'r') return 'right';
                return ['left', 'center', 'right'].includes(s) ? s : 'center';
              };

              const slot1 = getSlotName(line.slot);
              const charsToLoad: { name: string, slot: string, focus: boolean }[] = [];
              
              if (line.assetName) {
                charsToLoad.push({ name: line.assetName, slot: slot1, focus: line.focus === 1 });
              }
              
              if (line.assetName2) {
                const slot2 = slot1 === 'left' ? 'right' : slot1 === 'right' ? 'left' : 'right';
                charsToLoad.push({ name: line.assetName2, slot: slot2, focus: line.focus === 2 });
              }

              if (charsToLoad.length > 1) {
                if (charsToLoad[0].slot === 'center') charsToLoad[0].slot = 'left';
                if (charsToLoad[1].slot === 'center') charsToLoad[1].slot = 'right';
              }

              // Load character assets (body, face, positioning) using the new asset info service
              const slotUpdates: Record<string, CharacterSlotData> = {};
              const assetInfos = await Promise.all(charsToLoad.map(char => getCharacterAssetInfo(char.name)));
              if (processToken.current !== token) return;

              charsToLoad.forEach((char, index) => {
                const assetInfo = assetInfos[index];
                const existingSlot = characterSlotsRef.current[char.slot];
                const hasNewAnim = line.posFrom || line.posTo || line.aFrom !== undefined || line.aTo !== undefined;
                
                slotUpdates[char.slot] = { 
                  url: assetInfo.bodyUrl,
                  faceUrl: assetInfo.faceUrl,
                  faceRect: assetInfo.faceRect,
                  size: assetInfo.size,
                  pos: assetInfo.pos,
                  focus: char.focus, 
                  name: char.name,
                  animation: hasNewAnim ? {
                    posFrom: line.posFrom,
                    posTo: line.posTo,
                    aFrom: line.aFrom,
                    aTo: line.aTo,
                    duration: line.duration
                  } : existingSlot?.animation
                };
              });
              dispatch({ type: 'UPDATE_CHARACTER_SLOTS', payload: slotUpdates });
            } else if (line.posFrom || line.posTo || line.aFrom !== undefined || line.aTo !== undefined) {
              const getSlotName = (rawSlot: string | undefined): string => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l') return 'left';
                if (s === '2' || s === 'c' || s === 'm') return 'center';
                if (s === '3' || s === 'r') return 'right';
                return ['left', 'center', 'right'].includes(s) ? s : 'center';
              };
              const targetSlot = getSlotName(line.slot);
              const currentSlot = characterSlotsRef.current[targetSlot];
              if (currentSlot?.url) {
                dispatch({ 
                  type: 'UPDATE_CHARACTER_SLOT', 
                  payload: { 
                    slot: targetSlot, 
                    data: {
                      ...currentSlot,
                      animation: {
                        posFrom: line.posFrom,
                        posTo: line.posTo,
                        aFrom: line.aFrom,
                        aTo: line.aTo,
                        duration: line.duration
                      }
                    }
                  } 
                });
              }
            } else if (line.focus !== undefined) {
              dispatch({ type: 'SET_FOCUS', payload: line.focus });
            } else if (line.slot) {
              const getSlotName = (rawSlot: string | undefined): string => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l') return 'left';
                if (s === '2' || s === 'c' || s === 'm') return 'center';
                if (s === '3' || s === 'r') return 'right';
                return ['left', 'center', 'right'].includes(s) ? s : 'center';
              };
              dispatch({ 
                type: 'CLEAR_CHARACTER_SLOTS', 
                payload: { slot: getSlotName(line.slot), duration: isSkipping ? 0 : line.duration } 
              });
            } else {
              dispatch({ 
                type: 'CLEAR_CHARACTER_SLOTS', 
                payload: { duration: isSkipping ? 0 : line.duration } 
              });
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;

          case 'charactertween': {
            const cleanSearchName = line.assetName?.split(/[#$]/)[0]?.toLowerCase();
            let resolvedSlot = 'center';
            
            if (cleanSearchName) {
              const foundSlotEntry = Object.entries(characterSlotsRef.current).find(([_, slotData]) => {
                const typedData = slotData as CharacterSlotData;
                const slotCleanName = typedData?.name?.split(/[#$]/)[0]?.toLowerCase();
                return slotCleanName === cleanSearchName;
              });
              if (foundSlotEntry) {
                resolvedSlot = foundSlotEntry[0];
              } else if (line.slot) {
                const getSlotName = (rawSlot: string | undefined): string => {
                  let s = (rawSlot || 'center').toLowerCase();
                  if (s === '1' || s === 'l') return 'left';
                  if (s === '2' || s === 'c' || s === 'm') return 'center';
                  if (s === '3' || s === 'r') return 'right';
                  return ['left', 'center', 'right'].includes(s) ? s : 'center';
                };
                resolvedSlot = getSlotName(line.slot);
              }
            } else if (line.slot) {
              const getSlotName = (rawSlot: string | undefined): string => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l') return 'left';
                if (s === '2' || s === 'c' || s === 'm') return 'center';
                if (s === '3' || s === 'r') return 'right';
                return ['left', 'center', 'right'].includes(s) ? s : 'center';
              };
              resolvedSlot = getSlotName(line.slot);
            }

            const currentSlot = characterSlotsRef.current[resolvedSlot];
            if (currentSlot?.url) {
              dispatch({
                type: 'UPDATE_CHARACTER_SLOT',
                payload: {
                  slot: resolvedSlot,
                  data: {
                    ...currentSlot,
                    animation: {
                      posFrom: line.xFrom !== undefined ? `${line.xFrom},${line.yFrom ?? 0}` : undefined,
                      posTo: line.xTo !== undefined ? `${line.xTo},${line.yTo ?? 0}` : undefined,
                      aFrom: line.aFrom,
                      aTo: line.aTo,
                      duration: line.duration
                    }
                  }
                }
              });
            }

            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
          }
            
          case 'image':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              if (processToken.current !== token) return;
              imageUrlRef.current = url;
              dispatch({ type: 'SET_IMAGE', payload: { url, tween: line } });
            } else {
              imageUrlRef.current = null;
              dispatch({ type: 'SET_IMAGE', payload: { url: null } });
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              dispatch({ type: 'SET_CINEMATIC', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
              dispatch({ type: 'SET_CINEMATIC', payload: false });
            }
            break;
            
          case 'charactercutin':
            if (line.assetName) {
              const { bodyUrl, faceUrl } = await getCharacterAssetInfo(line.assetName);
              if (processToken.current !== token) return;
              dispatch({ type: 'SET_CHARACTER_CUTIN', payload: { bodyUrl, faceUrl, line } });
            } else {
              dispatch({ type: 'SET_CHARACTER_CUTIN', payload: null });
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;

          case 'dialog':
            dispatch({ type: 'SET_DIALOGUE', payload: { speaker: null, text: '', line: null } });
            dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true });
            if (line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            } else if (!isSkipping) {
              await new Promise(r => setTimeout(r, 40));
              if (processToken.current !== token) return;
            }
            break;

          case 'backgroundtween':
            dispatch({ type: 'SET_BG', payload: { bgUrl: bgUrlRef.current, assetName: currentBgRef.current, tween: line } });
            if (line.block && line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
            
          case 'imagetween':
            {
              const url = line.assetName ? await getImageUrl('image', line.assetName) : imageUrlRef.current;
              if (processToken.current !== token) return;
              if (url) {
                imageUrlRef.current = url;
                dispatch({ 
                  type: 'SET_IMAGE', 
                  payload: { 
                    url, 
                    tween: {
                      ...line,
                      xScale: line.xScale,
                      yScale: line.yScale,
                      xScaleFrom: line.xScaleFrom,
                      xScaleTo: line.xScaleTo,
                      yScaleFrom: line.yScaleFrom,
                      yScaleTo: line.yScaleTo,
                      x: line.x,
                      y: line.y,
                      xFrom: line.xFrom,
                      xTo: line.xTo,
                      yFrom: line.yFrom,
                      yTo: line.yTo,
                      duration: line.duration,
                      tiled: line.tiled,
                      ease: line.ease,
                      type: 'imagetween'
                    }
                  } 
                });
              }
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              dispatch({ type: 'SET_CINEMATIC', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
              dispatch({ type: 'SET_CINEMATIC', payload: false });
            }
            break;
            
          case 'music':
            if (line.assetName) {
              const url = await getImageUrl('music', line.assetName);
              if (processToken.current !== token) return;
              let introUrl: string | undefined = undefined;
              if (line.introAssetName) {
                introUrl = await getImageUrl('music', line.introAssetName);
                if (processToken.current !== token) return;
              }
              if (url) {
                currentBgmRef.current = { url, volume: line.volume || 0.5, introUrl, assetName: line.assetName, introAssetName: line.introAssetName };
                if (line.delay && !isSkipping) {
                  const t = setTimeout(() => {
                    if (processToken.current === token) {
                      audioManager.playBGM(url, line.volume || 0.5, 1000, introUrl, line.assetName, line.introAssetName);
                    }
                  }, line.delay * 1000);
                  activeAudioTimeoutsRef.current.push(t);
                } else {
                  audioManager.playBGM(url, line.volume || 0.5, 1000, introUrl, line.assetName, line.introAssetName);
                }
              }
            }
            break;
            
          case 'sound':
            if (line.assetName) {
              const url = await getImageUrl('sound', line.assetName);
              if (processToken.current !== token) return;
              if (url) {
                if (line.delay && !isSkipping) {
                  // If blocking and have delay, we should wait for delay
                  if (line.block) {
                     dispatch({ type: 'SET_BLOCKING', payload: true });
                     await new Promise(r => {
                       const t = setTimeout(r, line.delay! * 1000);
                       activeAudioTimeoutsRef.current.push(t);
                     });
                     if (processToken.current === token) {
                       const playPromise = audioManager.playSFX(url, line.volume || 1, line.loop || false, line.channel);
                       await Promise.race([playPromise, waitForCompletion(line.duration || 0.15)]);
                     }
                     dispatch({ type: 'SET_BLOCKING', payload: false });
                  } else {
                    const t = setTimeout(() => {
                      if (processToken.current === token) {
                        audioManager.playSFX(url, line.volume || 1, line.loop || false, line.channel);
                      }
                    }, line.delay * 1000);
                    activeAudioTimeoutsRef.current.push(t);
                  }
                } else {
                  const playPromise = audioManager.playSFX(url, line.volume || 1, line.loop || false, line.channel);
                  if (line.block && !isSkipping) {
                    dispatch({ type: 'SET_BLOCKING', payload: true });
                    await Promise.race([playPromise, waitForCompletion(line.duration || 0.15)]);
                    dispatch({ type: 'SET_BLOCKING', payload: false });
                  }
                }
              }
            }
            break;
            
          case 'voice':
            if (line.assetName) {
              const url = await getImageUrl('voice', line.assetName);
              if (processToken.current !== token) return;
              if (url) audioManager.playVoice(url, line.volume || 1);
            }
            break;
            
          case 'stop_voice':
            audioManager.stopVoice();
            break;

          case 'subtitleclear':
            dispatch({ type: 'SET_SUBTITLE', payload: null });
            break;

          case 'clearchars':
            dispatch({ 
              type: 'CLEAR_CHARACTER_SLOTS', 
              payload: { duration: isSkipping ? 0 : line.duration } 
            });
            break;

          case 'hideimage':
          case 'clearimage':
            imageUrlRef.current = null;
            dispatch({ type: 'SET_IMAGE', payload: { url: null } });
            break;

          case 'stop_music':
            currentBgmRef.current = null;
            audioManager.stopBGM(line.duration !== undefined ? line.duration * 1000 : 1000);
            break;
            
          case 'stop_sound':
            audioManager.stopSFX(line.channel, line.duration !== undefined ? line.duration * 1000 : 0);
            break;
            
          case 'delay':
            if (index !== lastDispatchedIndex) {
               dispatch({ type: 'SET_INDEX', payload: index });
               lastDispatchedIndex = index;
            }
            if (line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;

          case 'shake':
            if (isSkipping) break;
            if (shakeTimeoutRef.current) {
              clearTimeout(shakeTimeoutRef.current);
              shakeTimeoutRef.current = null;
            }
            dispatch({ type: 'SET_SHAKE', payload: { isShaking: true, config: null } });
            shakeTimeoutRef.current = setTimeout(() => {
              dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });
              shakeTimeoutRef.current = null;
            }, (line.duration || 0.5) * 1000);
            break;
          case 'camerashake':
            if (isSkipping) {
              dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });
              break;
            }
            if (shakeTimeoutRef.current) {
              clearTimeout(shakeTimeoutRef.current);
              shakeTimeoutRef.current = null;
            }
            if (!line.duration || line.duration <= 0) {
              dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });
            } else {
              const config = {
                x: line.xstrength ?? 5,
                y: line.ystrength ?? 5,
                vibrato: line.vibrato ?? 30
              };
              dispatch({ type: 'SET_SHAKE', payload: { isShaking: true, config } });
              shakeTimeoutRef.current = setTimeout(() => {
                dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });
                shakeTimeoutRef.current = null;
              }, line.duration * 1000);

              if (line.block && !isSkipping) {
                dispatch({ type: 'SET_BLOCKING', payload: true });
                if (!await waitForCompletion(line.duration)) return;
                dispatch({ type: 'SET_BLOCKING', payload: false });
              }
            }
            break;
          case 'flash':
            if (isSkipping) break;
            if (flashTimeoutRef.current) {
              clearTimeout(flashTimeoutRef.current);
            }
            dispatch({ type: 'SET_FLASH', payload: { active: true, duration: line.duration || 0.5 } });
            flashTimeoutRef.current = setTimeout(() => {
              dispatch({ type: 'SET_FLASH', payload: { active: false, duration: line.duration || 0.5 } });
              flashTimeoutRef.current = null;
            }, (line.duration || 0.5) * 1000);
            break;
          case 'cameraeffect':
            if (line.effect === 'none' || !line.effect) {
              dispatch({ type: 'SET_CAMERA_EFFECT', payload: null });
            } else {
              dispatch({ 
                type: 'SET_CAMERA_EFFECT', 
                payload: { 
                  effect: line.effect, 
                  duration: line.duration || 0, 
                  amount: line.a || 1 
                } 
              });
              
              if (!line.keep && line.duration && line.duration > 0 && !isSkipping) {
                const currentToken = token;
                setTimeout(() => {
                  if (processToken.current === currentToken) {
                    dispatch({ type: 'SET_CAMERA_EFFECT', payload: null });
                  }
                }, line.duration * 1000);
              }
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              dispatch({ type: 'SET_CINEMATIC', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
              dispatch({ type: 'SET_CINEMATIC', payload: false });
            }
            break;

          case 'cameratween': {
            const tweenDuration = line.duration !== undefined ? line.duration : 1.0;
            dispatch({
              type: 'SET_CAMERA_TRANSFORM',
              payload: {
                x: line.x,
                y: line.y,
                scale: line.scale,
                duration: tweenDuration,
                ease: line.ease || 'easeInOut'
              }
            });
            if (line.block && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(tweenDuration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
          }

          case 'cameraset': {
            dispatch({
              type: 'SET_CAMERA_TRANSFORM',
              payload: {
                x: line.x,
                y: line.y,
                scale: line.scale,
                duration: 0
              }
            });
            break;
          }

          case 'characteraction': {
            const rawTarget = (line.assetName || '').toLowerCase().trim();
            let resolvedSlot = 'center';

            if (rawTarget === 'left' || rawTarget === 'l' || rawTarget === '1') {
              resolvedSlot = 'left';
            } else if (rawTarget === 'right' || rawTarget === 'r' || rawTarget === '3') {
              resolvedSlot = 'right';
            } else if (rawTarget === 'center' || rawTarget === 'middle' || rawTarget === 'mid' || rawTarget === 'm' || rawTarget === 'c' || rawTarget === '2') {
              resolvedSlot = 'center';
            } else if (rawTarget) {
              const cleanSearchName = rawTarget.split(/[#$]/)[0];
              const foundSlotEntry = Object.entries(characterSlotsRef.current).find(([_, slotData]) => {
                const typedData = slotData as CharacterSlotData;
                const slotCleanName = typedData?.name?.split(/[#$]/)[0]?.toLowerCase();
                return slotCleanName === cleanSearchName;
              });
              if (foundSlotEntry) {
                resolvedSlot = foundSlotEntry[0];
              }
            }

            if (line.actionType === 'exit') {
              dispatch({ 
                type: 'CLEAR_CHARACTER_SLOTS', 
                payload: { slot: resolvedSlot, duration: isSkipping ? 0 : line.duration } 
              });
            } else if (line.actionType === 'move' && line.assetName) {
              const currentSlot = characterSlotsRef.current[resolvedSlot];
              if (currentSlot?.url) {
                const targetX = line.xpos !== undefined ? line.xpos : 0;
                const targetY = line.ypos !== undefined ? line.ypos : 0;
                dispatch({
                  type: 'UPDATE_CHARACTER_SLOT',
                  payload: {
                    slot: resolvedSlot,
                    data: {
                      ...currentSlot,
                      animation: {
                        posFrom: currentSlot.animation?.posTo || undefined,
                        posTo: `${targetX},${targetY}`,
                        duration: line.duration
                      }
                    }
                  }
                });
              }
            }

            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            } else if (!isSkipping) {
              await new Promise(resolve => setTimeout(resolve, 30));
            }
            break;
          }

          case 'blocker':
            dispatch({ 
              type: 'SET_BLOCKER', 
              payload: {
                a: line.a ?? 1,
                r: line.r ?? 0,
                g: line.g ?? 0,
                b: line.b ?? 0,
                initr: line.initr,
                initg: line.initg,
                initb: line.initb,
                inita: line.inita,
                duration: line.duration ?? 0,
                ease: line.ease
              } 
            });
            if (index !== lastDispatchedIndex) {
               dispatch({ type: 'SET_INDEX', payload: index });
               lastDispatchedIndex = index;
            }
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              dispatch({ type: 'SET_CINEMATIC', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
              dispatch({ type: 'SET_CINEMATIC', payload: false });
            }
            break;
          case 'animtext':
            dispatch({ type: 'SET_ANIM_TEXT', payload: line });
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              dispatch({ type: 'SET_CINEMATIC', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
              dispatch({ type: 'SET_CINEMATIC', payload: false });
            }
            break;
          case 'animtextclean':
            dispatch({ type: 'SET_ANIM_TEXT', payload: null });
            break;
          case 'sticker': {
            dispatch({ type: 'ADD_STICKER', payload: line });
            
            // If the sticker has text, we MUST wait for the player to click to proceed to the next script line.
            // This is exactly how dialogue and subtitle commands work.
            if (line.text && !line.isExiting) {
              skipBlockerRef.current = false;
              dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: false });
              dispatch({ type: 'SET_INDEX', payload: index });
              currentIndexRef.current = index;
              return;
            }
            
            // For clearing stickers or cinematic stickers with explicit block
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            
            break;
          }
          case 'stickerclear':
            dispatch({ type: 'CLEAR_STICKERS' });
            break;

          case 'soundvolume':
            if (line.channel) {
              const fadetime = line.duration !== undefined ? line.duration * 1000 : 0;
              audioManager.setSFXVolume(line.channel, line.volume ?? 1, fadetime);
            }
            break;

          case 'avgdisplay':
            if (line.style === 'bgeffect' && line.assetName === '$eb_distorsion') {
              dispatch({
                type: 'SET_CAMERA_EFFECT',
                payload: {
                  effect: 'Blur',
                  duration: line.duration || 1.5,
                  amount: 3
                }
              });
            }
            break;

          case 'cgitem':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              if (processToken.current !== token) return;
              dispatch({ type: 'SET_IMAGE', payload: { url, tween: line } });
            } else {
              dispatch({ type: 'SET_IMAGE', payload: { url: null } });
            }
            if (line.block && line.sDuration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              dispatch({ type: 'SET_CINEMATIC', payload: true });
              if (!await waitForCompletion(line.sDuration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
              dispatch({ type: 'SET_CINEMATIC', payload: false });
            }
            break;

          case 'hidecgitem':
            dispatch({ type: 'SET_IMAGE', payload: { url: null } });
            break;

          case 'curtain':
            dispatch({
              type: 'SET_BLOCKER',
              payload: {
                a: 1,
                r: 0,
                g: 0,
                b: 0,
                duration: (line.duration || 0.25) / 2
              }
            });
            if (line.duration && !isSkipping) {
              if (!await waitForCompletion((line.duration || 0.25) / 2)) return;
            }
            dispatch({
              type: 'SET_BLOCKER',
              payload: {
                a: 0,
                r: 0,
                g: 0,
                b: 0,
                duration: (line.duration || 0.25) / 2
              }
            });
            if (line.duration && !isSkipping) {
              if (!await waitForCompletion((line.duration || 0.25) / 2)) return;
            }
            break;

          case 'focusout': {
            const isBlurring = (line.to !== undefined && line.to > 0) || (line.from !== undefined && line.to === undefined && line.from === 0);
            if (isBlurring) {
              dispatch({
                type: 'SET_CAMERA_EFFECT',
                payload: {
                  effect: 'Blur',
                  duration: line.duration || 0.5,
                  amount: line.to !== undefined ? line.to * 5 : 5
                }
              });
            } else {
              dispatch({ type: 'SET_CAMERA_EFFECT', payload: null });
            }
            if (line.block && line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
          }

          case 'interlude':
            if (line.clear || line.switch === false) {
              dispatch({ type: 'CLEAR_CHARACTER_SLOTS', payload: { duration: 0 } });
            } else if (line.assetName) {
              const getSlotName = (rawSlot: string | undefined): string => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l') return 'left';
                if (s === '2' || s === 'c' || s === 'm') return 'center';
                if (s === '3' || s === 'r') return 'right';
                return ['left', 'center', 'right'].includes(s) ? s : 'center';
              };

              const slot = getSlotName(line.slot);
              const assetInfo = await getCharacterAssetInfo(line.assetName);
              if (processToken.current !== token) return;

              const slotUpdates = {
                [slot]: {
                  url: assetInfo.bodyUrl,
                  faceUrl: assetInfo.faceUrl,
                  faceRect: assetInfo.faceRect,
                  size: assetInfo.size,
                  pos: assetInfo.pos,
                  focus: true,
                  name: line.assetName,
                  animation: {
                    posFrom: line.pFrom,
                    posTo: line.pTo,
                    aFrom: line.aFrom,
                    aTo: line.aTo,
                    duration: line.duration
                  }
                }
              };
              dispatch({ type: 'UPDATE_CHARACTER_SLOTS', payload: slotUpdates });
            }
            if (line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;

          case 'multiline':
            break;
        }
        
        index++;
        if (index >= lines.length) {
          dispatch({ type: 'SET_INDEX', payload: lines.length - 1 });
          break;
        }
      }
    } finally {
      isProcessing.current = false;
      dispatch({ type: 'SET_BLOCKING', payload: false });
      dispatch({ type: 'SET_CINEMATIC', payload: false });
    }
  }, [lines]);

  const jumpToLine = useCallback((lineIndex: number, snapshotStateRaw: string, audioSnapshot: any, historyIndex: number) => {
    // 1. cancel current processing
    const token = {};
    processToken.current = token;
    isProcessing.current = false;
    skipBlockerRef.current = false;
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    
    // Parse the snapshot
    let parsedState;
    try {
      parsedState = JSON.parse(snapshotStateRaw);
    } catch (e) {
      console.error('Failed to parse state snapshot', e);
      return;
    }

    // 2. restore audio
    audioManager.stopAll();
    currentBgmRef.current = audioSnapshot || null;
    if (audioSnapshot && audioSnapshot.url) {
      audioManager.playBGM(
        audioSnapshot.url, 
        audioSnapshot.volume, 
        1000, 
        audioSnapshot.introUrl, 
        audioSnapshot.assetName, 
        audioSnapshot.introAssetName
      );
    }

    // 3. update react state
    dispatch({ 
      type: 'RESTORE_STATE', 
      payload: {
        ...parsedState,
        isSkipping: false,
        isAuto: false,
        shouldSkipTypewriter: false,
        isTypewriterFinished: false,
        historyIndex
      } 
    });
    currentIndexRef.current = lineIndex;
    
    // 4. close log implicitly handled by restoring the state snapshot where showLog is usually false, 
    // but just in case:
    dispatch({ type: 'SET_SHOW_LOG', payload: false });

    // 5. resume processLine
    processLine(lineIndex);
  }, [processLine]);

  const advance = useCallback(() => {
    if (currentDecision) return;
    
    // If we are currently in a blocking effect, signal to skip it and let processLine continue naturally
    if (isBlocking) {
      skipBlockerRef.current = true;
      if (!isTypewriterFinished && !isSkipping) {
        dispatch({ type: 'SET_SKIP_TYPEWRITER', payload: true });
        lastSkipTime.current = Date.now();
      }
      return;
    }
    
    if (!isTypewriterFinished && !isSkipping) {
      dispatch({ type: 'SET_SKIP_TYPEWRITER', payload: true });
      lastSkipTime.current = Date.now();
      return;
    }

    // If processLine is actively executing script tags in its loop, don't re-enter processLine
    if (isProcessing.current) {
      skipBlockerRef.current = true;
      return;
    }

    const now = Date.now();
    if (!isSkipping && now - lastAdvanceTime.current < 250) return;
    lastAdvanceTime.current = now;
    
    if (currentIndexRef.current >= lines.length - 1) {
      dispatch({ type: 'SET_SKIPPING', payload: false });
      dispatch({ type: 'SET_AUTO', payload: false });
      processToken.current = {};
      clearAudioTimeouts();
      audioManager.stopAll();
      localStorage.removeItem(`ak-story-index-${storyTxt}`);
      onComplete?.();
      onBack();
      return;
    }

    // If we just skipped the typewriter, prevent immediate advance to next line unless skipping whole story
    if (!isSkipping && now - lastSkipTime.current < 250) return;

    processLine(currentIndexRef.current + 1);
  }, [lines, processLine, isSkipping, onBack, currentDecision, isTypewriterFinished, isBlocking, clearAudioTimeouts, storyTxt, onComplete]);

  const controls = useStoryControls({
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
    setShowUI: (val) => dispatch({ type: 'SET_SHOW_UI', payload: val }),
    advance,
    setIsSkipping: (skipping) => dispatch({ type: 'SET_SKIPPING', payload: skipping }),
    setIsAuto: (auto) => dispatch({ type: 'SET_AUTO', payload: auto }),
    setIsHoldingSkip,
    setShouldSkipTypewriter: (skip) => dispatch({ type: 'SET_SKIP_TYPEWRITER', payload: skip }),
    onToggleAuto: () => dispatch({ type: 'TOGGLE_AUTO' }),
    onToggleLog: () => dispatch({ type: 'SET_SHOW_LOG', payload: !showLog }),
    onToggleSettings: () => dispatch({ type: 'SET_SHOW_SETTINGS', payload: !showSettings }),
    onToggleFullscreen: toggleFullscreen,
    onCloseModal: () => {
      if (showSettings) dispatch({ type: 'SET_SHOW_SETTINGS', payload: false });
      if (showLog) dispatch({ type: 'SET_SHOW_LOG', payload: false });
      if (showBugReport) setShowBugReport(false);
      if (showBackConfirm) dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: false });
    },
    onOpenBackConfirm: () => dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: true }),
  });

  // Auto advance logic
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (isAuto && showUI && !isSkipping && !currentDecision && !showBackConfirm && !showSettings && !showLog && !showBugReport && isTypewriterFinished) {
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, settings.autoDelay);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [isAuto, showUI, isSkipping, isTypewriterFinished, advance, currentDecision, showBackConfirm, showSettings, showLog, showBugReport, settings.autoDelay]);

  // Clear camera shake and flashes when skipping is active
  useEffect(() => {
    if (isSkipping) {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = null;
      }
      dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
      dispatch({ type: 'SET_FLASH', payload: { active: false, duration: 0 } });
    }
  }, [isSkipping]);

  // Skip logic
  useEffect(() => {
    if (isSkipping && !showSettings && !showLog && !showBugReport && !showBackConfirm && !currentDecision) {
      const delay = 100 / (settings.skipSpeed || 4);
      const timer = setTimeout(() => {
        advance();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isSkipping, currentIndex, advance, settings.skipSpeed, showSettings, showLog, showBugReport, showBackConfirm, currentDecision]);

  useEffect(() => {
    const loadStory = async () => {
      try {
        setLoading(true);
        setError(null);
        clearPreloadedImages();
        selectedChoicesRef.current.clear();
        predicateMismatchRef.current = false;
        
        // Full state reset
        dispatch({ type: 'RESET_STATE' });
        currentIndexRef.current = 0;
        
        processToken.current = {};
        isProcessing.current = false;
        
        const script = customScript || await fetchStoryScript(storyTxt, undefined, false, translator);
        setScriptContent(script);
        const parsed = parseStoryScript(script);
        
        // --- Inject end of chapter dialog ---
        parsed.push({
          type: 'dialogue',
          characterName: null,
          text: `— ${t.chapter_end || 'КОНЕЦ ГЛАВЫ'} —`
        });

        dispatch({ type: 'SET_LINES', payload: parsed });
        
        await preloadAssets(parsed, (loaded, total, currentFile) => {
          setPreloadProgress({ loaded, total, currentFile: currentFile || '' });
        });
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story');
        setLoading(false);
      }
    };
    
    loadStory();
  }, [storyTxt, customScript, translator]);

  // Initialize volumes from audioManager
  useEffect(() => {
    const volumes = audioManager.getVolumes();
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: { 
        bgmVolume: volumes.bgm, 
        sfxVolume: volumes.sfx, 
        voiceVolume: volumes.voice 
      } 
    });
  }, []);

  // Clean up audio and blob URLs on unmount to prevent invisible ghost tracks playing and memory leaks
  useEffect(() => {
    return () => {
      processToken.current = {};
      isProcessing.current = false;
      clearAudioTimeouts();
      audioManager.stopAll();
      CacheService.revokeBlobUrls();
      clearUrlCache();
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [clearAudioTimeouts]);

  useEffect(() => {
    if (lines.length > 0 && !loading && isReadyToStart) {
      if (currentIndex === 0) {
        processLine(0);
      }
    }
  }, [lines, loading, isReadyToStart, processLine, storyTxt]);

  if (loading || !isReadyToStart) {
    return (
      <StoryLoadingScreen 
        loading={loading}
        preloadProgress={preloadProgress}
        lang={lang}
        t={t}
        onStart={() => {
          audioManager.unlock();
          setIsReadyToStart(true);
        }}
        onBack={() => {
          audioManager.stopAll();
          onBack();
        }}
      />
    );
  }

  if (error) {
    return (
      <StoryErrorScreen 
        error={error}
        t={t}
        onBack={() => {
          audioManager.stopAll();
          onBack();
        }}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none touch-none"
      onPointerDown={controls.handlePointerDown}
      onPointerMove={controls.handlePointerMove}
      onPointerUp={controls.handlePointerUp}
      onPointerLeave={controls.handlePointerUp}
      onPointerCancel={controls.handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div 
        animate={shakeConfig ? {
          x: [-shakeConfig.x * settings.shakeIntensity, shakeConfig.x * settings.shakeIntensity, -shakeConfig.x * settings.shakeIntensity, shakeConfig.x * settings.shakeIntensity, 0],
          y: [-shakeConfig.y * settings.shakeIntensity, shakeConfig.y * settings.shakeIntensity, -shakeConfig.y * settings.shakeIntensity, shakeConfig.y * settings.shakeIntensity, 0],
        } : isShaking ? {
          x: [-5 * settings.shakeIntensity, 5 * settings.shakeIntensity, -5 * settings.shakeIntensity, 5 * settings.shakeIntensity, 0],
          y: [-2 * settings.shakeIntensity, 2 * settings.shakeIntensity, -2 * settings.shakeIntensity, 2 * settings.shakeIntensity, 0],
        } : { x: 0, y: 0 }}
        transition={(shakeConfig || isShaking) ? {
          duration: shakeConfig ? (1 / Math.max(shakeConfig.vibrato, 1)) * 5 : 0.1,
          repeat: Infinity,
        } : { duration: 0.2 }}
        className="relative w-full max-w-[177.78dvh] aspect-video bg-black shadow-2xl overflow-hidden @container"
      >
        <CssTransformBox
          x={cameraTransform?.x ?? 0}
          y={cameraTransform?.y ?? 0}
          scaleX={cameraTransform?.scale ?? 1}
          scaleY={cameraTransform?.scale ?? 1}
          duration={cameraTransform?.duration !== undefined ? cameraTransform.duration : 1.0}
          ease={cameraTransform?.ease || "easeInOut"}
          className="absolute inset-0 origin-center pointer-events-none"
        >
          <BackgroundLayer 
            bgUrl={bgUrl} 
            imageUrl={imageUrl} 
            imageTween={imageTween} 
            bgTween={state.bgTween}
          />

          <CharacterLayer 
            characterSlots={characterSlots} 
          />
          
          <CharacterCutinLayer 
            characterCutin={state.characterCutin} 
          />
        </CssTransformBox>

        <CinematicEffectsLayer 
          isFlashing={isFlashing} 
          cameraEffect={cameraEffect}
          blocker={blocker} 
          activeAnimText={processedAnimText} 
        />
        
        <StickerLayer 
          stickers={processedStickers} 
          isSkipping={isSkipping}
          shouldSkipTypewriter={shouldSkipTypewriter}
          skipSpeed={settings.skipSpeed || 4}
          fontFamily={settings.fontFamily}
          onTypewriterFinished={() => dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true })}
        />

        <DialogueUI 
          showUI={showUI && !isCinematic}
          currentIndex={currentIndex}
          currentSpeaker={currentSpeaker}
          currentText={processedCurrentText}
          dialogueKey={state.dialogueKey}
          isSkipping={isSkipping}
          skipSpeed={settings.skipSpeed || 4}
          shouldSkipTypewriter={shouldSkipTypewriter}
          currentDecision={processedDecision}
          currentSubtitle={processedSubtitle}
          activeAnimText={processedAnimText}
          fontSize={settings.fontSize}
          textSpeed={settings.textSpeed}
          fontFamily={settings.fontFamily}
          showSettings={showSettings}
          onChoice={(val) => {
            selectedChoicesRef.current.add(val);
            dispatch({ type: 'SET_DECISION', payload: null });
            processLine(currentIndexRef.current + 1);
          }}
          onTypewriterFinished={() => dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true })}
          t={t}
          className="z-50"
        />

        <AnimatePresence>
          {isSkipping && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[80] bg-black/60 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 pointer-events-none drop-shadow-xl"
            >
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-white/80 text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase">Идёт пропуск</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ControlsOverlay 
          showUI={showUI}
          isAuto={isAuto}
          isSkipping={isSkipping}
          skipSpeed={settings.skipSpeed || 4}
          isHoldingSkip={isHoldingSkip}
          forceHideUI={isCinematic || !!activeAnimText}
          isFullscreen={isFullscreen}
          currentIndex={currentIndex}
          totalLines={lines.length}
          lang={lang}
          isRead={isRead}
          onToggleRead={onToggleRead}
          onToggleAuto={() => dispatch({ type: 'TOGGLE_AUTO' })}
          onToggleSkip={() => dispatch({ type: 'SET_SKIPPING', payload: !isSkipping })}
          onBackClick={() => dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: true })}
          onSettingsClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })}
          onLogClick={() => dispatch({ type: 'SET_SHOW_LOG', payload: true })}
          onBugReportClick={() => setShowBugReport(true)}
          onToggleFullscreen={toggleFullscreen}
          setShowUI={(val) => dispatch({ type: 'SET_SHOW_UI', payload: val })}
          t={t}
          className="z-[60]"
        />

        <BugReportModal
          show={showBugReport}
          onClose={() => setShowBugReport(false)}
          context={{
            chapter: storyTxt || 'Unknown',
            line: currentIndexRef.current,
            history: processedHistory,
            translator: translator
          }}
        />

        <LogModal 
          show={showLog}
          history={processedHistory}
          fullScript={fullScriptText}
          onClose={() => dispatch({ type: 'SET_SHOW_LOG', payload: false })}
          onJumpToLine={jumpToLine}
          t={t}
        />

        <SettingsModal 
          show={showSettings}
          settings={settings}
          onUpdateSettings={(newSettings) => dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings })}
          onClose={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: false })}
          t={t}
        />

        <BackConfirmation 
          show={showBackConfirm}
          onConfirm={() => {
            audioManager.stopAll();
            onBack();
          }}
          onCancel={() => dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: false })}
          t={t}
        />

        <OrientationOverlay />
      </motion.div>
    </div>
  );
};
