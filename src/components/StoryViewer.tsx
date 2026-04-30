import React, { useEffect, useCallback, useReducer, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStoryScript, parseStoryScript, getImageUrl, preloadAssets, getLanguage, getCharacterAssetInfo, clearPreloadedImages } from '../services/storyService';
import { audioManager } from '../services/audioManager';
import { StoryLine, StoryChapter } from '../types';
import { Loader2, AlertCircle, ArrowLeft, Play } from 'lucide-react';
import { UI_STRINGS } from '../translations';
import { BackgroundLayer } from './story/BackgroundLayer';
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
import { storyReducer, initialState, CharacterSlotData } from '../hooks/useStoryReducer';
import { useStoryControls } from '../hooks/useStoryControls';
import { AUTO_ADVANCE_DELAY, SKIP_SPEEDS } from '../constants';

import { OrientationOverlay } from './story/OrientationOverlay';
import { getChapterDisplayCode, getChapterFullDisplayCode } from '../lib/utils';

interface StoryViewerProps {
  storyTxt: string;
  customScript?: string;
  translator?: string;
  onBack: () => void;
  onComplete?: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ storyTxt, customScript, translator, onBack, onComplete }) => {
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
  const currentBgmRef = useRef<any>(null);
  
  // Update characterSlotsRef whenever characterSlots changes
  useEffect(() => {
    characterSlotsRef.current = characterSlots;
  }, [characterSlots]);

  const predicateMismatchRef = useRef(false);
  const isProcessing = useRef(false);
  const selectedChoicesRef = useRef<Set<string>>(new Set());
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastAdvanceTime = useRef<number>(0);
  const lastSkipTime = useRef<number>(0);
  const skipBlockerRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (isProcessing.current) return;
    const token = processToken.current;
    isProcessing.current = true;
    
    try {
      let index = startIndex;
      let localPredicateMismatch = predicateMismatchRef.current;

      const waitForCompletion = async (duration: number) => {
        // Enforce a minimum 50ms wait to ensure CSS states (like a sudden fadetime=0 blocker) 
        // have enough time to be parsed, committed by React, and painted by the browser
        // before we send the next state (which could immediately cancel it).
        const safeDuration = isNaN(duration) ? 0 : Math.max(duration, 0);
        const ms = Math.max(safeDuration * 1000, 50);
        if (ms <= 0) return true;
        
        const start = Date.now();
        
        while (Date.now() - start < ms) {
          if (skipBlockerRef.current || isSkipping) break;
          // Shorter polling interval for smoother timing resolution
          await new Promise(r => setTimeout(r, 16));
          if (processToken.current !== token) return false;
        }
        skipBlockerRef.current = false;
        return true;
      };
      
      while (index < lines.length) {
        if (processToken.current !== token) return;
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
            selectedChoicesRef.current.clear();
            dispatch({ type: 'SET_DECISION', payload: line });
            if (index !== currentIndexRef.current) dispatch({ type: 'SET_INDEX', payload: index });
            return;

          case 'subtitle':
            if (line.text) {
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
            if (line.text) {
              dispatch({ type: 'ADD_TO_HISTORY', payload: { speaker: line.characterName || null, text: line.text, lineIndex: index, audioSnapshot: currentBgmRef.current } });
            }
            dispatch({ type: 'SET_DIALOGUE', payload: { speaker: line.characterName || null, text: line.text || '', index } });
            currentIndexRef.current = index;
            return;
        
          case 'background':
            if (line.assetName) {
              const isBlack = line.assetName.toLowerCase().includes('black') || line.assetName.toLowerCase() === 'bg_black';
              if (isBlack) {
                dispatch({ type: 'SET_BG', payload: { bgUrl: 'BLACK_FALLBACK', assetName: line.assetName } });
              } else {
                const url = await getImageUrl('background', line.assetName);
                if (processToken.current !== token) return;
                dispatch({ type: 'SET_BG', payload: { bgUrl: url, assetName: line.assetName } });
              }
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
              for (const char of charsToLoad) {
                const assetInfo = await getCharacterAssetInfo(char.name);
                if (processToken.current !== token) return;

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
              }
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
            
          case 'image':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              if (processToken.current !== token) return;
              dispatch({ type: 'SET_IMAGE', payload: { url } });
            } else {
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
            dispatch({ type: 'SET_BG', payload: { bgUrl: state.bgUrl, assetName: state.currentBg, tween: line } });
            if (line.block && line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
            
          case 'imagetween':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              if (processToken.current !== token) return;
              dispatch({ 
                type: 'SET_IMAGE', 
                payload: { 
                  url, 
                  tween: {
                    xScaleFrom: line.xScaleFrom,
                    xScaleTo: line.xScaleTo,
                    yScaleFrom: line.yScaleFrom,
                    yScaleTo: line.yScaleTo,
                    duration: line.duration,
                    tiled: line.tiled
                  }
                } 
              });
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
                  setTimeout(() => {
                    if (processToken.current === token) {
                      audioManager.playBGM(url, line.volume || 0.5, 1000, introUrl, line.assetName, line.introAssetName);
                    }
                  }, line.delay * 1000);
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
                  setTimeout(() => {
                    // Check if still on same play session
                    if (processToken.current === token) {
                      audioManager.playSFX(url, line.volume || 1, line.loop || false, line.channel);
                    }
                  }, line.delay * 1000);
                } else {
                  audioManager.playSFX(url, line.volume || 1, line.loop || false, line.channel);
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
            
          case 'stop_music':
            currentBgmRef.current = null;
            audioManager.stopBGM(line.duration !== undefined ? line.duration * 1000 : 1000);
            break;
            
          case 'stop_sound':
            audioManager.stopSFX(line.channel, line.duration !== undefined ? line.duration * 1000 : 0);
            break;
            
          case 'delay':
            if (index !== currentIndexRef.current) {
               dispatch({ type: 'SET_INDEX', payload: index });
               currentIndexRef.current = index;
            }
            if (line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;

          case 'shake':
            dispatch({ type: 'SET_SHAKE', payload: { isShaking: true } });
            setTimeout(() => dispatch({ type: 'SET_SHAKE', payload: { isShaking: false } }), (line.duration || 0.5) * 1000);
            break;
          case 'camerashake':
            if (line.duration === 0) {
              dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });
            } else {
              const config = {
                x: line.xstrength ?? 5,
                y: line.ystrength ?? 5,
                vibrato: line.vibrato ?? 30
              };
              dispatch({ type: 'SET_SHAKE', payload: { isShaking: true, config } });
              if (line.duration && line.duration > 0) {
                setTimeout(() => dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } }), line.duration * 1000);
              }
              if (line.block && line.duration !== undefined && !isSkipping) {
                dispatch({ type: 'SET_BLOCKING', payload: true });
                // We keep UI visible during shake even if blocked
                if (!await waitForCompletion(line.duration)) return;
                dispatch({ type: 'SET_BLOCKING', payload: false });
              }
            }
            break;
          case 'flash':
            dispatch({ type: 'SET_FLASH', payload: { active: true, duration: line.duration || 0.5 } });
            setTimeout(() => dispatch({ type: 'SET_FLASH', payload: { active: false, duration: line.duration || 0.5 } }), (line.duration || 0.5) * 1000);
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
                duration: line.duration ?? 0
              } 
            });
            if (index !== currentIndexRef.current) {
               dispatch({ type: 'SET_INDEX', payload: index });
               currentIndexRef.current = index;
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
          case 'sticker':
            dispatch({ type: 'ADD_STICKER', payload: line });
            if (line.block && line.duration !== undefined && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              // Sticker doesn't necessarily hide the UI in base case
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;
          case 'stickerclear':
            dispatch({ type: 'CLEAR_STICKERS' });
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
  }, [lines, characterSlots, predicateMismatch, isSkipping]);

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
    
    // If we are currently in a blocking effect, signal to skip it
    if (isBlocking) {
      skipBlockerRef.current = true;
      return;
    }
    
    const now = Date.now();
    if (!isSkipping && now - lastAdvanceTime.current < 250) return;
    lastAdvanceTime.current = now;
    
    if (currentIndexRef.current >= lines.length - 1) {
      dispatch({ type: 'SET_SKIPPING', payload: false });
      dispatch({ type: 'SET_AUTO', payload: false });
      audioManager.stopAll();
      localStorage.removeItem(`ak-story-index-${storyTxt}`);
      onComplete?.();
      onBack();
      return;
    }
    
    if (!isTypewriterFinished && !isSkipping) {
      dispatch({ type: 'SET_SKIP_TYPEWRITER', payload: true });
      lastSkipTime.current = now;
      return;
    }

    // If we just skipped the typewriter, prevent immediate advance to next line
    if (now - lastSkipTime.current < 250) return;

    processLine(currentIndexRef.current + 1);
  }, [lines, processLine, isSkipping, onBack, currentDecision, isTypewriterFinished]);

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
    advance,
    setIsSkipping: (skipping) => dispatch({ type: 'SET_SKIPPING', payload: skipping }),
    setIsAuto: (auto) => dispatch({ type: 'SET_AUTO', payload: auto }),
    setIsHoldingSkip,
    setShouldSkipTypewriter: (skip) => dispatch({ type: 'SET_SKIP_TYPEWRITER', payload: skip }),
  });

  // Auto advance logic
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (isAuto && !isSkipping && !currentDecision && !showBackConfirm && !showSettings && !showLog && !showBugReport && isTypewriterFinished) {
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, settings.autoDelay);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [isAuto, isSkipping, isTypewriterFinished, advance, currentDecision, showBackConfirm, showSettings, showLog, showBugReport, settings.autoDelay]);

  // Skip logic
  useEffect(() => {
    if (isSkipping && !showSettings && !showLog && !showBugReport) {
      const delay = 100 / (settings.skipSpeed || 4);
      const timer = setTimeout(() => {
        advance();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isSkipping, currentIndex, advance, settings.skipSpeed, showSettings, showLog, showBugReport]);

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

  // Clean up audio on unmount to prevent invisible ghost tracks playing
  useEffect(() => {
    return () => {
      audioManager.stopAll();
    };
  }, []);

  useEffect(() => {
    if (lines.length > 0 && !loading && isReadyToStart) {
      if (currentIndex === 0) {
        processLine(0);
      }
    }
  }, [lines, loading, isReadyToStart, processLine, storyTxt]);

  if (loading || !isReadyToStart) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-black to-black z-0 pointer-events-none" />
        <div className="z-10 flex flex-col items-center">
          {loading ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="text-xl font-medium mb-4">{t.loading_story}</p>
              {preloadProgress.total > 0 && (
                <div className="w-64">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(preloadProgress.loaded / preloadProgress.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-white/40 text-xs mt-2 text-center">
                    {preloadProgress.loaded} / {preloadProgress.total}
                  </p>
                  {preloadProgress.currentFile && (
                    <p className="text-white/30 text-[10px] mt-1 text-center truncate" title={preloadProgress.currentFile}>
                      {preloadProgress.currentFile}
                    </p>
                  )}
                </div>
              )}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 bg-white/5 border border-white/10 px-4 py-3 rounded-xl max-w-sm"
              >
                <p className="text-sm text-white/60 text-center leading-relaxed">
                  <span className="text-yellow-500/80 mr-2">💡</span>
                  Для пропуска диалогов удерживайте <strong className="text-white/90 bg-white/10 px-1.5 py-0.5 rounded text-xs mx-1">Ctrl</strong>
                </p>
              </motion.div>
            </>
          ) : (
            <button 
              onClick={() => {
                audioManager.unlock();
                setIsReadyToStart(true);
              }}
              className="group flex flex-col items-center justify-center gap-4 pl-[48px] pt-[32px] pr-12 pb-8 rounded-xl hover:bg-white/5 transition-all duration-300"
            >
              <div className="w-16 h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/10 group-hover:border-white/40 transition-all duration-300">
                <Play className="w-6 h-6 ml-[1px] text-white/80 group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm font-black uppercase tracking-[0.3em] text-white/60 group-hover:text-white transition-colors ml-[8px] pr-0">
                {t.play || 'НАЧАТЬ'}
              </span>
            </button>
          )}

          <button 
            onClick={() => {
              audioManager.stopAll();
              onBack();
            }}
            className="mt-8 flex items-center gap-2 px-6 py-2 border border-white/20 text-white/60 rounded-full font-medium hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back_to_menu}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-2xl font-bold mb-2">{t.error}</p>
        <p className="text-gray-400 mb-6 text-center">{error}</p>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              audioManager.stopAll();
              onBack();
            }}
            className="px-6 py-2 border border-white/20 text-white rounded-full font-bold hover:bg-white/10 transition-colors"
          >
            {t.back_to_menu}
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors"
          >
            {t.retry}
          </button>
        </div>
      </div>
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

        <CinematicEffectsLayer 
          isFlashing={isFlashing} 
          cameraEffect={cameraEffect}
          blocker={blocker} 
          activeAnimText={processedAnimText} 
        />
        
        <StickerLayer 
          stickers={processedStickers} 
          isSkipping={isSkipping}
          skipSpeed={settings.skipSpeed || 4}
          fontFamily={settings.fontFamily}
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
            processLine(currentIndex + 1);
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
