import { useState, useRef, useCallback, useEffect } from 'react';
import { StoryLine } from '../types';
import { getImageUrl, getCharacterAssetInfo } from '../services/storyService';
import { AudioManager } from '../utils/audioManager';

export function useStoryEngine(lines: StoryLine[], onBack: () => void) {
  const [currentIndex, _setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const setCurrentIndex = (val: number) => {
    currentIndexRef.current = val;
    _setCurrentIndex(val);
  };

  const [isAuto, setIsAuto] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipSpeed, setSkipSpeed] = useState(2);
  const [showUI, setShowUI] = useState(true);

  const [currentBg, setCurrentBg] = useState<string | null>('BLACK_FALLBACK');
  const [currentCharacter, setCurrentCharacter] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');
  
  const [isTyping, setIsTyping] = useState(false);
  const [forceComplete, setForceComplete] = useState(false);

  const selectedChoicesRef = useRef<Set<string>>(new Set());
  const [currentDecision, setCurrentDecision] = useState<StoryLine | null>(null);
  const isProcessing = useRef(false);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageTween, setImageTween] = useState<any>(null);

  const [characterSlots, setCharacterSlots] = useState<Record<string, { 
    url: string | null, 
    focus: boolean, 
    name: string | null,
    animation?: any
  }>>({
    left: { url: null, focus: false, name: null },
    center: { url: null, focus: false, name: null },
    right: { url: null, focus: false, name: null }
  });

  const [isShaking, setIsShaking] = useState(false);
  const [shakeConfig, setShakeConfig] = useState<{ x: number; y: number; vibrato: number } | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [blocker, setBlocker] = useState<{ a: number, r: number, g: number, b: number, duration: number } | null>(null);

  const [activeAnimText, setActiveAnimText] = useState<StoryLine | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<StoryLine | null>(null);

  const audioManager = useRef(AudioManager.getInstance()).current;

  useEffect(() => {
    return () => {
      audioManager.stopAll();
    };
  }, [audioManager]);

  const processLine = useCallback(async (startIndex: number) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    try {
      let index = startIndex;
      let localPredicateMismatch = false;
      
      while (index < lines.length) {
        const line = lines[index];
        
        if (line.type === 'predicate') {
          if (line.references && line.references.length > 0) {
            localPredicateMismatch = !line.references.some(ref => selectedChoicesRef.current.has(ref));
          } else {
            localPredicateMismatch = false;
          }
          index++;
          continue;
        }

        if (localPredicateMismatch && line.type !== 'decision') {
          index++;
          continue;
        }

        switch (line.type) {
          case 'decision':
            setCurrentDecision(line);
            if (index !== currentIndexRef.current) setCurrentIndex(index);
            return;

          case 'subtitle':
            if (line.text) {
              setCurrentSubtitle(line);
              setCurrentSpeaker(null);
              setCurrentText(line.text);
              setIsTyping(true);
              setForceComplete(false);
              if (index !== currentIndexRef.current) setCurrentIndex(index);
              return;
            } else {
              setCurrentSubtitle(null);
              setCurrentText('');
              setIsTyping(false);
            }
            break;

          case 'dialogue':
            setCurrentSubtitle(null);
            setCurrentSpeaker(line.characterName || null);
            setCurrentText(line.text || '');
            setIsTyping(!!line.text);
            setForceComplete(false);

            // Rule: Auto-focus on speaker if they are on stage
            if (line.characterName) {
              setCharacterSlots(prev => {
                const next = { ...prev };
                let found = false;
                const speakerLower = line.characterName!.toLowerCase();
                
                // Try to find the speaker in slots
                Object.keys(next).forEach(slot => {
                  const charName = next[slot].name?.toLowerCase();
                  if (charName && (charName.includes(speakerLower) || speakerLower.includes(charName))) {
                    found = true;
                  }
                });

                if (found) {
                  Object.keys(next).forEach(slot => {
                    const charName = next[slot].name?.toLowerCase();
                    next[slot] = { 
                      ...next[slot], 
                      focus: charName && (charName.includes(speakerLower) || speakerLower.includes(charName)) 
                    };
                  });
                }
                return next;
              });
            }

            if (index !== currentIndexRef.current) setCurrentIndex(index);
            return;
        
          case 'background':
            if (line.assetName) {
              const isBlack = line.assetName.toLowerCase().includes('black') || line.assetName.toLowerCase() === 'bg_black';
              if (isBlack) {
                setCurrentBg('BLACK_FALLBACK');
              } else {
                const url = await getImageUrl('background', line.assetName);
                if (url) setCurrentBg(url);
              }
            }
            break;
            
          case 'character':
            if (line.assetName || line.assetName2) {
              const getSlot = (rawSlot: string | undefined) => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l' || s === 'left') return 'left';
                if (s === '2' || s === 'c' || s === 'm' || s === 'center') return 'center';
                if (s === '3' || s === 'r' || s === 'right') return 'right';
                if (s === '4' || s === 'rf' || s === 'right_far') return 'right_far';
                if (s === '0' || s === 'lf' || s === 'left_far') return 'left_far';
                return s;
              };

              const slot1 = getSlot(line.slot);
              const charsToLoad: { name: string, slot: string, focus: boolean }[] = [];
              
              if (line.assetName) {
                charsToLoad.push({ name: line.assetName, slot: slot1, focus: line.focus === 1 });
              }
              
              if (line.assetName2) {
                const slot2 = slot1 === 'left' ? 'right' : slot1 === 'right' ? 'left' : 'right';
                charsToLoad.push({ name: line.assetName2, slot: slot2, focus: line.focus === 2 });
              }

              // Rule: If two characters are loaded and one is center, split them to sides
              if (charsToLoad.length > 1) {
                if (charsToLoad[0].slot === 'center') charsToLoad[0].slot = 'left';
                if (charsToLoad[1].slot === 'center') charsToLoad[1].slot = 'right';
              }

              const newSlotData: Record<string, any> = {};
              // Fetch character asset info (body, face, rects) from the asset service
              for (const char of charsToLoad) {
                const assetInfo = await getCharacterAssetInfo(char.name);
                newSlotData[char.slot] = { 
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

              setCharacterSlots(prev => {
                let next = { ...prev };
                
                // Arknights Logic: Center clears sides, Sides clear center
                for (const [slot, data] of Object.entries(newSlotData)) {
                  if (slot === 'center' && data.url) {
                    next.left = { url: null, focus: false, name: null };
                    next.right = { url: null, focus: false, name: null };
                    next.left_far = { url: null, focus: false, name: null };
                    next.right_far = { url: null, focus: false, name: null };
                  } else if ((slot === 'left' || slot === 'right' || slot === 'left_far' || slot === 'right_far') && data.url) {
                    next.center = { url: null, focus: false, name: null };
                  }
                  next[slot] = data;
                }
                return next;
              });
            } else if (line.posFrom || line.posTo || line.aFrom !== undefined || line.aTo !== undefined) {
              const getSlot = (rawSlot: string | undefined) => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l' || s === 'left') return 'left';
                if (s === '2' || s === 'c' || s === 'm' || s === 'center') return 'center';
                if (s === '3' || s === 'r' || s === 'right') return 'right';
                if (s === '4' || s === 'rf' || s === 'right_far') return 'right_far';
                if (s === '0' || s === 'lf' || s === 'left_far') return 'left_far';
                return s;
              };
              const targetSlot = getSlot(line.slot);
              setCharacterSlots(prev => {
                if (!prev[targetSlot].url) return prev;
                return {
                  ...prev,
                  [targetSlot]: {
                    ...prev[targetSlot],
                    animation: {
                      posFrom: line.posFrom,
                      posTo: line.posTo,
                      aFrom: line.aFrom,
                      aTo: line.aTo,
                      duration: line.duration
                    }
                  }
                };
              });
            } else if (line.focus !== undefined) {
              const slotMap: Record<number, string> = { 1: 'left', 2: 'center', 3: 'right' };
              const targetSlot = slotMap[line.focus];
              if (targetSlot) {
                setCharacterSlots(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(slot => {
                    next[slot] = { ...next[slot], focus: slot === targetSlot };
                  });
                  return next;
                });
              } else if (line.focus === 0) {
                setCharacterSlots(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(slot => {
                    next[slot] = { ...next[slot], focus: false };
                  });
                  return next;
                });
              }
            } else if (line.slot) {
              const getSlot = (rawSlot: string | undefined) => {
                let s = (rawSlot || 'center').toLowerCase();
                if (s === '1' || s === 'l' || s === 'left') return 'left';
                if (s === '2' || s === 'c' || s === 'm' || s === 'center') return 'center';
                if (s === '3' || s === 'r' || s === 'right') return 'right';
                if (s === '4' || s === 'rf' || s === 'right_far') return 'right_far';
                if (s === '0' || s === 'lf' || s === 'left_far') return 'left_far';
                return s;
              };
              const slotToClear = getSlot(line.slot);
              setCharacterSlots(prev => ({
                ...prev,
                [slotToClear]: { url: null, focus: false, name: null }
              }));
            } else {
              setCharacterSlots({
                left_far: { url: null, focus: false, name: null },
                left: { url: null, focus: false, name: null },
                center: { url: null, focus: false, name: null },
                right: { url: null, focus: false, name: null },
                right_far: { url: null, focus: false, name: null }
              });
            }
            break;
            
          case 'image':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              setImageUrl(url);
            } else {
              setImageUrl(null);
              setImageTween(null);
            }
            break;

          case 'imagetween':
            if (line.assetName) {
              const url = await getImageUrl('image', line.assetName);
              setImageUrl(url);
            }
            
            setImageTween({
              xScaleFrom: line.xScaleFrom,
              xScaleTo: line.xScaleTo,
              yScaleFrom: line.yScaleFrom,
              yScaleTo: line.yScaleTo,
              duration: line.duration,
              tiled: line.tiled
            });
            
            if (line.block && line.duration) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;
            
          case 'music':
            if (line.assetName) {
              const url = await getImageUrl('music', line.assetName);
              if (url) audioManager.playBGM(url, line.volume || 0.5);
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
            if (line.duration) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;

          case 'shake':
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), (line.duration || 0.5) * 1000);
            break;
          case 'camerashake':
            if (line.duration === 0) {
              setShakeConfig(null);
            } else {
              setShakeConfig({
                x: line.xstrength ?? 5,
                y: line.ystrength ?? 5,
                vibrato: line.vibrato ?? 30
              });
              if (line.duration && line.duration > 0) {
                setTimeout(() => setShakeConfig(null), line.duration * 1000);
              }
              if (line.block && line.duration && line.duration > 0) {
                await new Promise(resolve => setTimeout(resolve, line.duration * 1000));
              }
            }
            break;
          case 'flash':
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), (line.duration || 0.5) * 1000);
            break;
          case 'blocker':
            setBlocker({
              a: line.a ?? 1,
              r: line.r ?? 0,
              g: line.g ?? 0,
              b: line.b ?? 0,
              duration: line.duration ?? 0
            });
            if (line.block && line.duration) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;
          case 'animtext':
            setActiveAnimText(line);
            if (line.block && line.duration) {
              await new Promise(resolve => setTimeout(resolve, line.duration! * 1000));
            }
            break;
          case 'animtextclean':
            setActiveAnimText(null);
            break;
        }
        
        index++;
        if (index >= lines.length) {
          setCurrentIndex(lines.length - 1);
          break;
        }
      }
    } finally {
      isProcessing.current = false;
    }
  }, [lines, audioManager]);

  const lastAdvanceTime = useRef<number>(0);

  const advance = useCallback(() => {
    if (currentDecision) return;
    
    const now = Date.now();
    if (!isSkipping && now - lastAdvanceTime.current < 150) return;
    lastAdvanceTime.current = now;
    
    if (currentIndexRef.current >= lines.length - 1) {
      setIsSkipping(false);
      setIsAuto(false);
      onBack();
      return;
    }
    
    if (isTyping && !isSkipping) {
      setForceComplete(true);
      return;
    }

    processLine(currentIndexRef.current + 1);
  }, [lines, processLine, isTyping, isSkipping, onBack, currentDecision]);

  const handleChoice = (idx: number) => {
    if (!currentDecision) return;
    const val = currentDecision.values?.[idx] || String(idx + 1);
    selectedChoicesRef.current.add(val);
    setCurrentDecision(null);
    processLine(currentIndexRef.current + 1);
  };

  return {
    state: {
      currentIndex,
      isAuto,
      isSkipping,
      skipSpeed,
      showUI,
      currentBg,
      currentCharacter,
      currentSpeaker,
      currentText,
      isTyping,
      forceComplete,
      currentDecision,
      imageUrl,
      imageTween,
      characterSlots,
      isShaking,
      shakeConfig,
      isFlashing,
      blocker,
      activeAnimText,
      currentSubtitle
    },
    actions: {
      setIsAuto,
      setIsSkipping,
      setSkipSpeed,
      setShowUI,
      setIsTyping,
      setForceComplete,
      advance,
      processLine,
      handleChoice
    }
  };
}
