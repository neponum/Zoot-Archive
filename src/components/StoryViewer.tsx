import React, { useEffect, useCallback, useReducer, useRef } from 'react';
import { motion } from 'motion/react';
import { fetchStoryScript, parseStoryScript, getImageUrl, preloadAssets, getLanguage, getCharacterAssetInfo, clearPreloadedImages } from '../services/storyService';
import { audioManager } from '../services/audioManager';
import { StoryLine } from '../types';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { UI_STRINGS } from '../translations';
import { BackgroundLayer } from './story/BackgroundLayer';
import { CharacterLayer } from './story/CharacterLayer';
import { DialogueUI } from './story/DialogueUI';
import { ControlsOverlay } from './story/ControlsOverlay';
import { CinematicEffectsLayer } from './story/CinematicEffectsLayer';
import { StickerLayer } from './story/StickerLayer';
import { BackConfirmation } from './story/BackConfirmation';
import { SettingsModal } from './story/SettingsModal';
import { LogModal } from './story/LogModal';
import { storyReducer, initialState, CharacterSlotData } from '../hooks/useStoryReducer';
import { useStoryControls } from '../hooks/useStoryControls';
import { AUTO_ADVANCE_DELAY, SKIP_SPEEDS } from '../constants';

import { OrientationOverlay } from './story/OrientationOverlay';

interface StoryViewerProps {
  storyTxt: string;
  customScript?: string;
  translator?: string;
  onBack: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ storyTxt, customScript, translator, onBack }) => {
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
    skipSpeed,
    showUI,
    showBackConfirm,
    showSettings,
    showLog,
    predicateMismatch,
    history,
    settings
  } = state;

  const [loading, setLoading] = React.useState(true);
  const [preloadProgress, setPreloadProgress] = React.useState({ loaded: 0, total: 0, currentFile: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [scriptContent, setScriptContent] = React.useState<string | null>(null);
  const [isHoldingSkip, setIsHoldingSkip] = React.useState(false);

  const currentIndexRef = useRef(0);
  const predicateMismatchRef = useRef(false);
  const isProcessing = useRef(false);
  const selectedChoicesRef = useRef<Set<string>>(new Set());
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastAdvanceTime = useRef<number>(0);
  const lastSkipTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

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

  // Sync ref with state for callbacks
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const processLine = useCallback(async (startIndex: number) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    
    try {
      let index = startIndex;
      let localPredicateMismatch = predicateMismatchRef.current;
      
      while (index < lines.length) {
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
              dispatch({ type: 'ADD_TO_HISTORY', payload: { speaker: null, text: line.text } });
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: null, text: line.text, isSubtitle: true, line } });
              if (index !== currentIndexRef.current) dispatch({ type: 'SET_INDEX', payload: index });
              return;
            } else {
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: null, text: '', isSubtitle: true, line: null } });
              dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true });
            }
            break;

          case 'dialogue':
            if (line.text) {
              dispatch({ type: 'ADD_TO_HISTORY', payload: { speaker: line.characterName || null, text: line.text } });
            }
            dispatch({ type: 'SET_DIALOGUE', payload: { speaker: line.characterName || null, text: line.text || '' } });
            if (index !== currentIndexRef.current) dispatch({ type: 'SET_INDEX', payload: index });
            return;
        
          case 'background':
            if (line.assetName) {
              const isBlack = line.assetName.toLowerCase().includes('black') || line.assetName.toLowerCase() === 'bg_black';
              if (isBlack) {
                dispatch({ type: 'SET_BG', payload: { bgUrl: 'BLACK_FALLBACK', assetName: line.assetName } });
              } else {
                const url = await getImageUrl('background', line.assetName);
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

                slotUpdates[char.slot] = { 
                  url: assetInfo.bodyUrl,
                  faceUrl: assetInfo.faceUrl,
                  faceRect: assetInfo.faceRect,
                  size: assetInfo.size,
                  focus: char.focus, 
                  name: char.name,
                  animation: line.posFrom || line.posTo || line.aFrom !== undefined || line.aTo !== undefined ? {
                    posFrom: line.posFrom,
                    posTo: line.posTo,
                    aFrom: line.aFrom,
                    aTo: line.aTo,
                    duration: line.duration
                  } : undefined
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
              const currentSlot = characterSlots[targetSlot];
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
              dispatch({ type: 'CLEAR_CHARACTER_SLOTS', payload: getSlotName(line.slot) });
            } else {
              dispatch({ type: 'CLEAR_CHARACTER_SLOTS' });
            }
            break;
            
          case 'image':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              dispatch({ type: 'SET_IMAGE', payload: { url } });
            } else {
              dispatch({ type: 'SET_IMAGE', payload: { url: null } });
            }
            break;

          case 'imagetween':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
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
            if (line.block && line.duration && !isSkipping) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;
            
          case 'music':
            if (line.assetName) {
              const url = await getImageUrl('music', line.assetName);
              let introUrl: string | undefined = undefined;
              if (line.introAssetName) {
                introUrl = await getImageUrl('music', line.introAssetName);
              }
              if (url) audioManager.playBGM(url, line.volume || 0.5, 1000, introUrl);
            }
            break;
            
          case 'sound':
            if (line.assetName) {
              const url = await getImageUrl('sound', line.assetName);
              if (url) audioManager.playSFX(url, line.volume || 1);
            }
            break;
            
          case 'voice':
            if (line.assetName) {
              const url = await getImageUrl('voice', line.assetName);
              if (url) audioManager.playVoice(url, line.volume || 1);
            }
            break;
            
          case 'stop_music':
            audioManager.stopBGM();
            break;
            
          case 'delay':
            if (line.duration && !isSkipping) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
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
              if (line.block && line.duration && line.duration > 0 && !isSkipping) {
                await new Promise(resolve => setTimeout(resolve, line.duration * 1000));
              }
            }
            break;
          case 'flash':
            dispatch({ type: 'SET_FLASH', payload: true });
            setTimeout(() => dispatch({ type: 'SET_FLASH', payload: false }), (line.duration || 0.5) * 1000);
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
            }
            if (line.block && line.duration && !isSkipping) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
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
                duration: line.duration ?? 0
              } 
            });
            if (line.block && line.duration && !isSkipping) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;
          case 'animtext':
            dispatch({ type: 'SET_ANIM_TEXT', payload: line });
            if (line.block && line.duration && !isSkipping) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;
          case 'animtextclean':
            dispatch({ type: 'SET_ANIM_TEXT', payload: null });
            break;
          case 'sticker':
            dispatch({ type: 'ADD_STICKER', payload: line });
            if (line.block && line.duration && !isSkipping) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
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
    }
  }, [lines, characterSlots, predicateMismatch]);

  const advance = useCallback(() => {
    if (currentDecision) return;
    
    const now = Date.now();
    if (!isSkipping && now - lastAdvanceTime.current < 150) return;
    lastAdvanceTime.current = now;
    
    if (currentIndexRef.current >= lines.length - 1) {
      dispatch({ type: 'SET_SKIPPING', payload: false });
      audioManager.stopAll();
      localStorage.removeItem(`ak-story-index-${storyTxt}`);
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
    showUI,
    isTypewriterFinished,
    advance,
    setSkipSpeed: (speed) => dispatch({ type: 'SET_SKIP_SPEED', payload: speed }),
    setIsSkipping: (skipping) => dispatch({ type: 'SET_SKIPPING', payload: skipping }),
    setIsAuto: (auto) => dispatch({ type: 'SET_AUTO', payload: auto }),
    setIsHoldingSkip,
    setShouldSkipTypewriter: (skip) => dispatch({ type: 'SET_SKIP_TYPEWRITER', payload: skip }),
  });

  // Auto advance logic
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (isAuto && !isSkipping && !currentDecision && !showBackConfirm && !showSettings && !showLog && isTypewriterFinished) {
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, AUTO_ADVANCE_DELAY);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [isAuto, isSkipping, isTypewriterFinished, advance, currentDecision, showBackConfirm, showSettings, showLog]);

  // Skip logic
  useEffect(() => {
    if (isSkipping && !showSettings && !showLog) {
      const delay = 100 / skipSpeed;
      const timer = setTimeout(() => {
        advance();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isSkipping, currentIndex, advance, skipSpeed, showSettings, showLog]);

  useEffect(() => {
    const loadStory = async () => {
      try {
        setLoading(true);
        setError(null);
        clearPreloadedImages();
        selectedChoicesRef.current.clear();
        predicateMismatchRef.current = false;
        dispatch({ type: 'SET_PREDICATE_MISMATCH', payload: false });
        dispatch({ type: 'CLEAR_STICKERS' });
        dispatch({ type: 'SET_INDEX', payload: 0 });
        
        const script = customScript || await fetchStoryScript(storyTxt, undefined, false, translator);
        setScriptContent(script);
        const parsed = parseStoryScript(script);
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

  useEffect(() => {
    if (lines.length > 0 && !loading) {
      const savedIndex = localStorage.getItem(`ak-story-index-${storyTxt}`);
      const startIndex = savedIndex ? parseInt(savedIndex) : 0;
      
      if (currentIndex === 0 && startIndex > 0 && startIndex < lines.length) {
        dispatch({ type: 'SET_INDEX', payload: startIndex });
        processLine(startIndex);
      } else if (currentIndex === 0) {
        processLine(0);
      }
    }
  }, [lines, loading, processLine, storyTxt]);

  useEffect(() => {
    if (currentIndex > 0) {
      localStorage.setItem(`ak-story-index-${storyTxt}`, currentIndex.toString());
    }
  }, [currentIndex, storyTxt]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-white">
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
          x: [-shakeConfig.x, shakeConfig.x, -shakeConfig.x, shakeConfig.x, 0],
          y: [-shakeConfig.y, shakeConfig.y, -shakeConfig.y, shakeConfig.y, 0],
        } : isShaking ? {
          x: [-5, 5, -5, 5, 0],
          y: [-2, 2, -2, 2, 0],
        } : { x: 0, y: 0 }}
        transition={(shakeConfig || isShaking) ? {
          duration: shakeConfig ? (1 / Math.max(shakeConfig.vibrato, 1)) * 5 : 0.1,
          repeat: Infinity,
        } : { duration: 0.2 }}
        className="relative w-full max-w-[177.78vh] aspect-video bg-black shadow-2xl overflow-hidden @container"
      >
        <BackgroundLayer 
          bgUrl={bgUrl} 
          imageUrl={imageUrl} 
          imageTween={imageTween} 
        />

        <CharacterLayer 
          characterSlots={characterSlots} 
        />

        <CinematicEffectsLayer 
          isFlashing={isFlashing} 
          cameraEffect={cameraEffect}
          blocker={blocker} 
          activeAnimText={activeAnimText} 
        />
        
        <StickerLayer 
          stickers={state.stickers} 
          isSkipping={isSkipping}
          skipSpeed={skipSpeed}
        />

        <DialogueUI 
          showUI={showUI}
          currentIndex={currentIndex}
          currentSpeaker={currentSpeaker}
          currentText={currentText}
          isSkipping={isSkipping}
          skipSpeed={skipSpeed}
          shouldSkipTypewriter={shouldSkipTypewriter}
          currentDecision={currentDecision}
          currentSubtitle={currentSubtitle}
          activeAnimText={activeAnimText}
          fontSize={settings.fontSize}
          showSettings={showSettings}
          onChoice={(val) => {
            selectedChoicesRef.current.add(val);
            dispatch({ type: 'SET_DECISION', payload: null });
            processLine(currentIndex + 1);
          }}
          onTypewriterFinished={() => dispatch({ type: 'SET_TYPEWRITER_FINISHED', payload: true })}
          t={t}
        />

        <ControlsOverlay 
          showUI={showUI}
          isAuto={isAuto}
          isSkipping={isSkipping}
          skipSpeed={skipSpeed}
          isHoldingSkip={isHoldingSkip}
          activeAnimText={activeAnimText}
          isFullscreen={isFullscreen}
          onToggleAuto={() => dispatch({ type: 'TOGGLE_AUTO' })}
          onToggleSkip={() => {}}
          onBackClick={() => dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: true })}
          onSettingsClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })}
          onLogClick={() => dispatch({ type: 'SET_SHOW_LOG', payload: true })}
          onToggleFullscreen={toggleFullscreen}
          setShowUI={(val) => dispatch({ type: 'SET_SHOW_UI', payload: val })}
          t={t}
        />

        <LogModal 
          show={showLog}
          history={history}
          onClose={() => dispatch({ type: 'SET_SHOW_LOG', payload: false })}
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
            localStorage.removeItem(`ak-story-index-${storyTxt}`);
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
