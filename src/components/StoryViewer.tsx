import React, { useEffect, useCallback, useReducer, useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStoryScript, parseStoryScript, getImageUrl, preloadAssets, prefetchStoryImages, prefetchStoryAudio, getLanguage, setLanguage, getCharacterAssetInfo, warmCharacterData, clearPreloadedImages, releasePreloadedMedia, clearUrlCache, AudioSnapshot, checkScriptExists } from '../services/storyService';
import { audioManager } from '../services/audioManager';
import { CacheService } from '../services/cacheService';
import { StoryLine, StoryChapter, Language } from '../types';
import { UI_STRINGS } from '../translations';
import { BackgroundLayer, normalizeCoordX, normalizeCoordY } from './story/BackgroundLayer';
import { CssTransformBox } from './story/CssTransformBox';
import { CharacterLayer } from './story/CharacterLayer';
import { CharacterCutinLayer } from './story/CharacterCutinLayer';
import { DialogueUI } from './story/DialogueUI';
import { ControlsOverlay } from './story/ControlsOverlay';
import { CinematicEffectsLayer } from './story/CinematicEffectsLayer';
import { StickerLayer } from './story/StickerLayer';
import { BackConfirmation } from './story/BackConfirmation';
import { SkipConfirmation } from './story/SkipConfirmation';
import { AssetPreloadDialog } from './story/AssetPreloadDialog';
import { prioritizeStoryText } from '../services/storyTextSync';
import { onImageFailure } from '../lib/imageFallback';
import type { PreloadFailure } from '../services/story/storyAssetService';
import { SettingsModal } from './story/SettingsModal';
import { LogModal } from './story/LogModal';
import { BugReportModal } from './story/BugReportModal';
import { StoryHelpModal } from './story/StoryHelpModal';
import { StoryLoadingScreen } from './story/StoryLoadingScreen';
import { StoryBgEffectLayer } from './story/StoryBgEffectLayer';
import { ensureStoryFx, prefetchStoryFx } from '../services/story/storyFxAssets';
import type { StoryOperationBrief } from './MainThemeStoryView';
import { StoryErrorScreen } from './story/StoryErrorScreen';
import { useToast } from './ui/Toast';
import {
  storyReducer,
  initialState,
  CharacterSlotData,
  StoryActiveEffect,
} from '../hooks/useStoryReducer';
import { useStoryControls } from '../hooks/useStoryControls';
import { AUTO_ADVANCE_DELAY, SKIP_SPEEDS } from '../constants';

/** Сколько первых строк главы грузим до старта (остальное — по мере чтения). */
const PRELOAD_LINE_LIMIT = 12;

/** Имена эффектов из строк сценария (`[bgeffect]`, `[effect]`). */
const effectNames = (lines: StoryLine[]): string[] =>
  lines
    .map((line) => {
      if (line.type === 'bgeffect') return line.assetName || '';
      if (line.type === 'playeffect') return line.effect || '';
      return '';
    })
    .filter(Boolean);

import { OrientationOverlay } from './story/OrientationOverlay';
import { getChapterDisplayCode, getChapterFullDisplayCode } from '../lib/utils';

interface StoryViewerProps {
  storyTxt: string;
  customScript?: string;
  translator?: string;
  /** Брифинг операции, из которой открыта глава (показывается на загрузке). */
  operation?: StoryOperationBrief;
  isRead?: boolean;
  onToggleRead?: () => void;
  onBack: () => void;
  onComplete?: () => void;
  /** Сцены операции «до боя» / «после боя» — выбор на стартовом экране. */
  sceneOptions?: { beg?: string | null; end?: string | null };
  /** Начальное состояние переключателей (из URL). */
  scenePart?: 'beg' | 'end' | 'both';
  /** Сразу начать загрузку (переход «обе сцены» → после боя). */
  autoStart?: boolean;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  storyTxt,
  customScript,
  translator,
  operation,
  isRead,
  onToggleRead,
  onBack,
  onComplete,
  sceneOptions,
  scenePart,
  autoStart = false,
}) => {
  // Язык чтения выбирается на экране загрузки и сохраняется в localStorage.
  const [lang, setLangState] = useState<Language>(() => getLanguage());
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const t = UI_STRINGS[lang];

  /** Смена языка до старта: перезагружаем сцену в новом языке. */
  const handleSelectLang = useCallback((next: Language) => {
    if (next === getLanguage()) return;
    setLanguage(next);
    setLangState(next);
    setIsReadyToStart(false);
  }, []);

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
    bgEffects,
    activeEffects,
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

  // Переключатели сцен: можно включить обе, одну или ни одной.
  const [sceneSelection, setSceneSelection] = React.useState(() => ({
    beg: scenePart === 'beg' || scenePart === 'both' || !sceneOptions?.end,
    end: scenePart === 'end' || scenePart === 'both' || !sceneOptions?.beg,
  }));
  const [activeStoryTxt, setActiveStoryTxt] = React.useState(storyTxt);

  // Загрузка сцены начинается только после нажатия «Загрузить историю».
  const [started, setStarted] = React.useState(autoStart);
  const [loading, setLoading] = React.useState(false);
  const [isReadyToStart, setIsReadyToStart] = React.useState(false);
  const [preloadProgress, setPreloadProgress] = React.useState({ loaded: 0, total: 0, currentFile: '' });
  const [preloadFailures, setPreloadFailures] = React.useState<PreloadFailure[]>([]);
  const toast = useToast();
  const audioWarningShownRef = React.useRef(false);
  const backgroundWarningShownRef = React.useRef(false);

  // Картинка, у которой не сработал ни один источник, раньше просто исчезала
  // без ошибки. Показываем один сводный тост, чтобы читатель понимал, что
  // часть сцены недоступна, а не думал, что так и задумано.
  useEffect(() => {
    let pending = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = onImageFailure(() => {
      pending += 1;
      if (timer) return;
      timer = setTimeout(() => {
        const isRu = getLanguage() === 'ru_RU' || getLanguage() === 'ru_RU_CN';
        toast.info(
          isRu
            ? `Не удалось загрузить ${pending} изображени(й). Проверьте соединение или сообщите об ошибке.`
            : `${pending} image(s) could not be loaded. Check your connection or report the issue.`
        );
        pending = 0;
        timer = null;
      }, 1200);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [toast]);
  const prefetchWindowRef = React.useRef<AbortController | null>(null);
  const parsedLinesRef = useRef<StoryLine[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptContent, setScriptContent] = React.useState<string | null>(null);
  /** Русского перевода главы нет — показываем оригинал и честно об этом говорим. */
  const [isOriginalScript, setIsOriginalScript] = React.useState(false);
  const [isHoldingSkip, setIsHoldingSkip] = React.useState(false);
  const [activeVideo, setActiveVideo] = React.useState<string | null>(null);
  const [videoPaused, setVideoPaused] = React.useState(false);
  const [videoProgress, setVideoProgress] = React.useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoNextIndexRef = useRef(0);

  const processToken = useRef({});
  const currentIndexRef = useRef(0);
  /** Прерывает повторную предзагрузку при уходе из читалки. */
  const retryControllerRef = useRef<AbortController | null>(null);
  const characterSlotsRef = useRef(characterSlots);
  const currentBgmRef = useRef<AudioSnapshot | null>(null);

  // Update characterSlotsRef whenever characterSlots changes
  useEffect(() => {
    characterSlotsRef.current = characterSlots;
  }, [characterSlots]);

  // A slot that fades out must be removed once its animation ends, otherwise it stays
  // in state as an invisible sprite (and would block a re-entry of the same character).
  const characterExitTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const prevCharacterSlotsRef = useRef(characterSlots);

  useEffect(() => {
    const prevSlots = prevCharacterSlotsRef.current;
    prevCharacterSlotsRef.current = characterSlots;

    Object.entries(characterSlots).forEach(([slot, slotData]) => {
      const pendingTimer = characterExitTimersRef.current.get(slot);
      if (slotData?.isExiting && prevSlots[slot] !== slotData) {
        // Fade-out (re)started for this slot: (re)arm the removal timer
        if (pendingTimer) clearTimeout(pendingTimer);
        characterExitTimersRef.current.set(slot, setTimeout(() => {
          characterExitTimersRef.current.delete(slot);
          // Guard against a re-entry that happened in the same tick as the timer
          if (characterSlotsRef.current[slot]?.isExiting) {
            dispatch({ type: 'CLEAR_CHARACTER_SLOTS', payload: { slot, duration: 0 } });
          }
        }, Math.ceil((slotData.animation?.duration ?? 0) * 1000) + 100));
      } else if (!slotData?.isExiting && pendingTimer) {
        // Character re-entered (or the slot was cleared) before the fade finished
        clearTimeout(pendingTimer);
        characterExitTimersRef.current.delete(slot);
      }
    });
  }, [characterSlots]);

  useEffect(() => () => {
    characterExitTimersRef.current.forEach(timer => clearTimeout(timer));
    characterExitTimersRef.current.clear();
  }, []);

  const bgUrlRef = useRef<string | null>(null);
  const currentBgRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const currentBgStateRef = useRef<{ x: number; y: number; scaleX: number; scaleY: number }>({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
  const currentImageStateRef = useRef<{ x: number; y: number; scaleX: number; scaleY: number }>({ x: 0, y: 0, scaleX: 1, scaleY: 1 });

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
  /** Памятка «как читать»: открывается с экрана загрузки и из верхней панели. */
  const [showHelp, setShowHelp] = React.useState(false);

  // Effective nickname resolution: checks settings, localStorage, and language default
  const effectiveNickname = useMemo(() => {
    if (settings.nickname && settings.nickname !== '{@nickname}' && settings.nickname.trim() !== '') {
      return settings.nickname.trim();
    }
    const savedDocName = typeof localStorage !== 'undefined' ? localStorage.getItem('ak-doc-name') : null;
    if (savedDocName && savedDocName !== 'NUM' && savedDocName.trim() !== '') {
      return savedDocName.trim();
    }
    return lang === 'ru_RU' ? 'Доктор' : lang === 'zh_CN' ? '博士' : lang === 'ja_JP' ? 'ドクター' : 'Doctor';
  }, [settings.nickname, lang]);

  // Replacement logic for user nickname
  const replaceNickname = useCallback((text: string | null | undefined): string => {
    if (!text) return '';
    let result = text;
    // Replace all variations of Arknights player nickname tags ({nickname}, {@nickname}, {$nickname}, {@player_name}, etc.)
    result = result.replace(/\{[@\$]?(?:nickname|player_name)(?::[^}]+)?\}/gi, effectiveNickname);
    // If user specified custom name, also replace literal "Dr. Doctor" or "Доктор Doctor"
    if (effectiveNickname !== 'Doctor' && effectiveNickname !== 'Доктор' && effectiveNickname !== '博士' && effectiveNickname !== 'ドクター') {
      result = result.replace(/\bDr\.\s*Doctor\b/g, `Dr. ${effectiveNickname}`);
      result = result.replace(/\bДоктор\s+Doctor\b/g, `Доктор ${effectiveNickname}`);
    }
    return result;
  }, [effectiveNickname]);

  const processedCurrentText = useMemo(() => replaceNickname(currentText), [currentText, replaceNickname]);
  const processedSpeaker = useMemo(() => replaceNickname(currentSpeaker), [currentSpeaker, replaceNickname]);
  const processedHistory = useMemo(() => history.map(h => ({
    ...h,
    speaker: replaceNickname(h.speaker),
    text: replaceNickname(h.text)
  })), [history, replaceNickname]);
  const fullScriptText = useMemo(() => {
    return lines
      .map((l, i) => ({ ...l, originalIndex: i }))
      .filter(l => (l.type === 'subtitle' || l.type === 'dialogue') && l.text)
      .map(l => ({
        speaker: replaceNickname(l.characterName || null),
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
    if (settings.nickname && settings.nickname !== '{@nickname}') {
      localStorage.setItem('ak-doc-name', settings.nickname.trim());
    }
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
          case 'playvideo': {
            if (!line.src || isSkipping) break;
            const src = /^https?:\/\//i.test(line.src)
              ? line.src
              : `https://torappu.prts.wiki/assets/${line.src.replace(/^\/+/, '')}`;
            videoNextIndexRef.current = index + 1;
            dispatch({ type: 'SET_CINEMATIC', payload: true });
            setActiveVideo(src);
            return;
          }

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

          case 'popup':
            if (line.text && line.text.trim().length > 0) {
              skipBlockerRef.current = false;
              dispatch({ type: 'ADD_TO_HISTORY', payload: { speaker: line.title || null, text: line.text, lineIndex: index, audioSnapshot: currentBgmRef.current } });
              dispatch({ type: 'SET_DIALOGUE', payload: { speaker: line.title || null, text: line.text, index, isSubtitle: true, line } });
              currentIndexRef.current = index;
              return;
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
              currentBgStateRef.current = {
                x: line.x ?? 0,
                y: line.y ?? 0,
                scaleX: line.xScale ?? 1,
                scaleY: line.yScale ?? 1
              };
              if (isBlack) {
                bgUrlRef.current = 'BLACK_FALLBACK';
                currentBgRef.current = line.assetName;
                dispatch({ type: 'SET_BG', payload: { bgUrl: 'BLACK_FALLBACK', assetName: line.assetName, tween: { ...line, tweenId: `${index}-${Date.now()}` } } });
              } else {
                const url = await getImageUrl('background', line.assetName);
                if (processToken.current !== token) return;
                bgUrlRef.current = url;
                currentBgRef.current = line.assetName;
                dispatch({ type: 'SET_BG', payload: { bgUrl: url, assetName: line.assetName, tween: { ...line, tweenId: `${index}-${Date.now()}` } } });
              }
            } else {
              // Clearing background (e.g. [Background] without image attribute)
              bgUrlRef.current = null;
              currentBgRef.current = null;
              currentBgStateRef.current = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
              dispatch({ type: 'SET_BG', payload: { bgUrl: null, assetName: null } });
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
                  } : (existingSlot && !existingSlot.isExiting ? existingSlot.animation : undefined)
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
              currentImageStateRef.current = {
                x: line.x ?? 0,
                y: line.y ?? 0,
                scaleX: line.xScale ?? 1,
                scaleY: line.yScale ?? 1
              };
              dispatch({
                type: 'SET_IMAGE',
                payload: {
                  url,
                  tween: {
                    ...line,
                    tweenId: `${index}-${Date.now()}`
                  }
                }
              });
            } else {
              imageUrlRef.current = null;
              currentImageStateRef.current = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
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
            {
              const prevBg = { ...currentBgStateRef.current };
              const targetScaleX = line.xScaleTo !== undefined ? line.xScaleTo : (line.xScale !== undefined ? line.xScale : prevBg.scaleX);
              const targetScaleY = line.yScaleTo !== undefined ? line.yScaleTo : (line.yScale !== undefined ? line.yScale : prevBg.scaleY);
              const targetX = line.xTo !== undefined ? line.xTo : (line.x !== undefined ? line.x : prevBg.x);
              const targetY = line.yTo !== undefined ? line.yTo : (line.y !== undefined ? line.y : prevBg.y);

              const fromScaleX = line.xScaleFrom !== undefined ? line.xScaleFrom : prevBg.scaleX;
              const fromScaleY = line.yScaleFrom !== undefined ? line.yScaleFrom : prevBg.scaleY;
              const fromX = line.xFrom !== undefined ? line.xFrom : prevBg.x;
              const fromY = line.yFrom !== undefined ? line.yFrom : prevBg.y;

              currentBgStateRef.current = { x: targetX, y: targetY, scaleX: targetScaleX, scaleY: targetScaleY };

              dispatch({
                type: 'SET_BG',
                payload: {
                  bgUrl: bgUrlRef.current,
                  assetName: currentBgRef.current,
                  tween: {
                    ...line,
                    xScale: targetScaleX,
                    yScale: targetScaleY,
                    xScaleTo: targetScaleX,
                    yScaleTo: targetScaleY,
                    xScaleFrom: fromScaleX,
                    yScaleFrom: fromScaleY,
                    x: targetX,
                    y: targetY,
                    xTo: targetX,
                    yTo: targetY,
                    xFrom: fromX,
                    yFrom: fromY,
                    tweenId: `${index}-${Date.now()}`
                  }
                }
              });
            }
            if (line.block && line.duration && !isSkipping) {
              dispatch({ type: 'SET_BLOCKING', payload: true });
              if (!await waitForCompletion(line.duration)) return;
              dispatch({ type: 'SET_BLOCKING', payload: false });
            }
            break;

          case 'imagetween':
            {
              const prevImg = { ...currentImageStateRef.current };
              const targetScaleX = line.xScaleTo !== undefined ? line.xScaleTo : (line.xScale !== undefined ? line.xScale : prevImg.scaleX);
              const targetScaleY = line.yScaleTo !== undefined ? line.yScaleTo : (line.yScale !== undefined ? line.yScale : prevImg.scaleY);
              const targetX = line.xTo !== undefined ? line.xTo : (line.x !== undefined ? line.x : prevImg.x);
              const targetY = line.yTo !== undefined ? line.yTo : (line.y !== undefined ? line.y : prevImg.y);

              const fromScaleX = line.xScaleFrom !== undefined ? line.xScaleFrom : prevImg.scaleX;
              const fromScaleY = line.yScaleFrom !== undefined ? line.yScaleFrom : prevImg.scaleY;
              const fromX = line.xFrom !== undefined ? line.xFrom : prevImg.x;
              const fromY = line.yFrom !== undefined ? line.yFrom : prevImg.y;

              currentImageStateRef.current = { x: targetX, y: targetY, scaleX: targetScaleX, scaleY: targetScaleY };

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
                      xScale: targetScaleX,
                      yScale: targetScaleY,
                      xScaleFrom: fromScaleX,
                      xScaleTo: targetScaleX,
                      yScaleFrom: fromScaleY,
                      yScaleTo: targetScaleY,
                      x: targetX,
                      y: targetY,
                      xFrom: fromX,
                      xTo: targetX,
                      yFrom: fromY,
                      yTo: targetY,
                      duration: line.duration,
                      tiled: line.tiled,
                      ease: line.ease,
                      type: 'imagetween',
                      tweenId: `${index}-${Date.now()}`
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
            currentImageStateRef.current = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
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
                ease: line.ease,
                tweenId: `${index}-${Date.now()}`
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
            if (line.channel === 'music') {
              const fadetime = line.duration !== undefined ? line.duration * 1000 : 0;
              audioManager.setBGMVolume(line.volume ?? 1, fadetime);
            } else if (line.channel) {
              const fadetime = line.duration !== undefined ? line.duration * 1000 : 0;
              audioManager.setSFXVolume(line.channel, line.volume ?? 1, fadetime);
            }
            break;

          case 'avgdisplay':
            break;

          case 'playeffect': {
            const rawName = (line.effect || '').trim();
            // `[effect]` без имени снимает все наложенные эффекты.
            if (!rawName) {
              dispatch({ type: 'CLEAR_EFFECTS' });
              break;
            }
            // Часть переменных `$e_*` — это звуки (`Sound_Beta_2/...`),
            // а не префабы: рисовать для них нечего.
            if (rawName.includes('/') || /^sound_/i.test(rawName)) break;
            dispatch({
              type: 'ADD_EFFECT',
              payload: {
                id: `${rawName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: rawName.replace(/^\$/, ''),
                layer: line.layer ?? 1,
                x: line.x,
                y: line.y,
                xto: line.xTo,
                yto: line.yTo,
                moveTime: line.moveTime,
              },
            });
            break;
          }

          case 'stopeffect': {
            const rawName = (line.effect || '').trim();
            if (rawName) {
              dispatch({
                type: 'REMOVE_EFFECT',
                payload: rawName.replace(/^\$/, ''),
              });
            } else {
              dispatch({ type: 'CLEAR_EFFECTS' });
            }
            break;
          }

          case 'bgeffect': {
            const rawName = (line.assetName || '').trim();
            if (!rawName) {
              dispatch({ type: 'SET_BG_EFFECT', payload: null });
              break;
            }
            // `$eb_snow` → `eb_snow`: префикс — синтаксис скрипта, не имя файла.
            dispatch({
              type: 'SET_BG_EFFECT',
              payload: {
                id: `${rawName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: rawName.replace(/^\$/, ''),
                layer: line.layer ?? 1,
                x: line.x,
                y: line.y,
              },
            });
            break;
          }

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

    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = null;
    }
    dispatch({ type: 'SET_SHAKE', payload: { isShaking: false, config: null } });

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
    currentBgStateRef.current = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    currentImageStateRef.current = { x: 0, y: 0, scaleX: 1, scaleY: 1 };

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
      localStorage.removeItem(`ak-story-index-${activeStoryTxt}`);

      // Выбраны обе сцены: после «до боя» автоматически идёт «после боя».
      const nextScene =
        sceneSelection.beg &&
        sceneSelection.end &&
        sceneOptions?.beg &&
        sceneOptions?.end &&
        activeStoryTxt === sceneOptions.beg
          ? sceneOptions.end
          : null;

      if (nextScene) {
        setIsReadyToStart(false);
        setStarted(true);
        setActiveStoryTxt(nextScene);
        return;
      }

      onComplete?.();
      onBack();
      return;
    }

    // If we just skipped the typewriter, prevent immediate advance to next line unless skipping whole story
    if (!isSkipping && now - lastSkipTime.current < 250) return;

    processLine(currentIndexRef.current + 1);
  }, [
    lines,
    processLine,
    isSkipping,
    onBack,
    currentDecision,
    isTypewriterFinished,
    isBlocking,
    clearAudioTimeouts,
    activeStoryTxt,
    onComplete,
    sceneSelection.beg,
    sceneSelection.end,
    sceneOptions?.beg,
    sceneOptions?.end,
  ]);

  const controls = useStoryControls({
    isAuto,
    isSkipping,
    isHoldingSkip,
    currentDecision,
    showBackConfirm,
    showSettings,
    showLog,
    showBugReport,
    showHelp,
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
      if (showHelp) setShowHelp(false);
      if (showBackConfirm) dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: false });
    },
    onOpenBackConfirm: () => dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: true }),
  });

  // Auto advance logic
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (isAuto && showUI && !isSkipping && !currentDecision && !showBackConfirm && !showSettings && !showLog && !showBugReport && !showHelp && isTypewriterFinished) {
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, settings.autoDelay);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [isAuto, showUI, isSkipping, isTypewriterFinished, advance, currentDecision, showBackConfirm, showSettings, showLog, showBugReport, showHelp, settings.autoDelay]);

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
    if (isSkipping && !showSettings && !showLog && !showBugReport && !showHelp && !showBackConfirm && !currentDecision) {
      const delay = 100 / (settings.skipSpeed || 4);
      const timer = setTimeout(() => {
        advance();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isSkipping, currentIndex, advance, settings.skipSpeed, showSettings, showLog, showBugReport, showHelp, showBackConfirm, currentDecision]);

  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    // Уход из читалки (в т.ч. «Назад в меню») должен обрывать докачку:
    // иначе она конкурирует с загрузкой следующей операции.
    const controller = new AbortController();
    const loadStory = async () => {
      try {
        setLoading(true);
        setError(null);
        clearPreloadedImages();
        // character.json (1.7 МБ) грузим параллельно со сценарием: иначе
        // первый спрайт ждёт его уже во время сцены.
        warmCharacterData();
        selectedChoicesRef.current.clear();
        predicateMismatchRef.current = false;

        // Full state reset
        dispatch({ type: 'RESET_STATE' });
        currentIndexRef.current = 0;

        processToken.current = {};
        isProcessing.current = false;

        const script = customScript || await fetchStoryScript(activeStoryTxt, undefined, false, translator);
        if (cancelled) return;
        setScriptContent(script);

        // Если русского перевода нет, а показать пришлось оригинал — предупреждаем.
        if (!customScript) {
          const currentLang = getLanguage();
          if (currentLang === 'ru_RU' || currentLang === 'ru_RU_CN') {
            try {
              const hasRu = await checkScriptExists(activeStoryTxt, 'ru_RU', translator);
              setIsOriginalScript(!hasRu);
            } catch {
              setIsOriginalScript(false);
            }
          } else {
            setIsOriginalScript(false);
          }
        } else {
          setIsOriginalScript(false);
        }

        const parsed = parseStoryScript(script);
        parsedLinesRef.current = parsed;

        // --- Inject end of chapter dialog ---
        parsed.push({
          type: 'dialogue',
          characterName: undefined,
          text: `— ${t.chapter_end || 'КОНЕЦ ГЛАВЫ'} —`
        });

        dispatch({ type: 'SET_LINES', payload: parsed });

        // К старту грузим начало главы: спрайты, фоны и звук первых сцен
        // не должны появляться с задержкой посреди реплики.
        setPreloadFailures([]);
        // Эффекты первых сцен грузим параллельно с картинками: к экрану
        // старта они должны быть готовы, иначе `[bgeffect]` догоняет сцену
        // через несколько секунд (в TL-ST-1 их два подряд).
        const fxReady = ensureStoryFx(effectNames(parsed.slice(0, PRELOAD_LINE_LIMIT)));
        // Перед стартом грузим только начало главы: у больших событий
        // (например, act55side — 136 файлов) полная предзагрузка упирается
        // в бюджет и выглядит как «история не запускается». Остальное
        // догружается prefetchStoryImages по мере чтения.
        // Стартуем, как только готовы картинки первой сцены. Поиск музыки в
        // манифесте PRTS иногда занимает 10–20 секунд: держать из-за него
        // экран загрузки нельзя. Музыку догружаем параллельно, к моменту
        // первой команды `[Music]` она уже готова.
        const imagePreload = preloadAssets(
          parsed.slice(0, PRELOAD_LINE_LIMIT),
          (loaded, total, currentFile) => {
            setPreloadProgress({ loaded, total, currentFile: currentFile || '' });
          },
          controller.signal,
          45000,
          { images: true, audio: 'none' }
        );
        const musicWarm = preloadAssets(
          parsed.slice(0, PRELOAD_LINE_LIMIT),
          undefined,
          controller.signal,
          20000,
          { images: false, audio: 'music' }
        );
        const failures = await imagePreload;
        if (cancelled) return;
        // Медиаплееры предзагрузки больше не нужны: Chrome лимитирует их
        // число, и без освобождения следующая история остаётся без звука.
        // Освобождаем после того, как музыка первой сцены догрузится сама.
        void musicWarm
          .then((audioFailures) => {
            const missing = audioFailures.filter((failure) => failure.type === 'audio');
            if (missing.length === 0 || audioWarningShownRef.current) return;
            audioWarningShownRef.current = true;
            const isRu = getLanguage() === 'ru_RU' || getLanguage() === 'ru_RU_CN';
            toast.info(
              isRu
                ? `Аудио недоступно: ${missing.length}. Музыка или звуки в начале главы могут отсутствовать.`
                : `Audio unavailable: ${missing.length}. Some music or sounds at the start may be missing.`
            );
          })
          .catch(() => undefined)
          .finally(() => releasePreloadedMedia());
        // Аудио на PRTS часто отсутствует (BGM/звуки 404). Это не повод
        // держать историю на экране загрузки: картинки важнее, а звук
        // просто не заиграет. Диалог показываем только по изображениям.
        const blocking = failures.filter((failure) => failure.type !== 'audio');
        if (failures.length > blocking.length) {
          console.warn(
            `[preload] без аудио: ${failures.length - blocking.length} файл(ов)`
          );
        }
        if (blocking.length > 0) {
          setPreloadFailures(blocking);
          return;
        }
        // Ждём эффекты первых сцен до экрана старта: иначе сцена начинается,
        // а `[bgeffect]` догоняет её через несколько секунд (в TL-ST-1 их два
        // подряд, и они должны появиться вместе с картинкой).
        await fxReady;
        setLoading(false);
        setIsReadyToStart(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load story');
        setLoading(false);
      }
    };

    loadStory();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeStoryTxt, customScript, translator, lang, started]);

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
      retryControllerRef.current?.abort();
      clearAudioTimeouts();
      audioManager.stopAll();
      releasePreloadedMedia();
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

  // Подгружаем картинки ближайших строк, чтобы следующие сцены открывались
  // без ожидания (фон, CG, персонажи). Окно в 30 строк: при обычном темпе
  // чтения этого хватает с запасом даже на быстрые клики.
  useEffect(() => {
    if (loading || !isReadyToStart || lines.length === 0) return;
    const upcoming = lines.slice(currentIndex + 1, currentIndex + 31);
    prefetchStoryImages(upcoming);
    // Звук следующей сцены (музыка/реплики) тоже должен быть в кэше.
    prefetchStoryAudio(upcoming);
    // Эффекты тяжелее картинок (index.json + десяток текстур), поэтому берём
    // окно шире: к моменту `[bgeffect]` они уже лежат в кэше.
    prefetchStoryFx(effectNames(lines.slice(currentIndex + 1, currentIndex + 81)));
  }, [currentIndex, lines, loading, isReadyToStart]);

  // Окно предзагрузки впереди текущей реплики: 100 строк. Не тянем всю
  // главу целиком — на больших событиях это сотни мегабайт и лишняя
  // память/трафик на телефоне. Сдвигаем чаще (каждые 10 строк), чтобы при
  // быстром чтении окно не отставало и картинки не догружались на глазах.
  useEffect(() => {
    if (loading || !isReadyToStart) return;
    if (currentIndex !== 0 && currentIndex % 10 !== 0) return;
    const all = parsedLinesRef.current;
    if (!all || all.length <= PRELOAD_LINE_LIMIT) return;

    prefetchWindowRef.current?.abort();
    const controller = new AbortController();
    prefetchWindowRef.current = controller;
    const start = Math.min(all.length, currentIndex + 1);
    const end = Math.min(all.length, start + 100);

    const timer = setTimeout(() => {
      void preloadAssets(
        all.slice(start, end),
        undefined,
        controller.signal,
        30000,
        { images: true, audio: 'none' }
      )
        .then((chunkFailures) => {
          const missingImages = chunkFailures.filter((failure) => failure.type !== 'audio');
          if (missingImages.length === 0 || backgroundWarningShownRef.current) return;
          backgroundWarningShownRef.current = true;
          const isRu = getLanguage() === 'ru_RU' || getLanguage() === 'ru_RU_CN';
          toast.info(
            isRu
              ? `Не удалось загрузить ${missingImages.length} материал(ов) главы. Они могут не появиться в отдельных сценах.`
              : `${missingImages.length} chapter asset(s) could not be loaded and may be missing in some scenes.`
          );
        })
        .catch(() => undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentIndex, loading, isReadyToStart, storyTxt]);

  useEffect(
    () => () => {
      prefetchWindowRef.current?.abort();
    },
    []
  );

  // Если выбраны обе сцены операции, заранее тянем начало второй. Переход
  // «до боя → после боя» не должен показывать экран загрузки посреди чтения.
  useEffect(() => {
    if (loading || !isReadyToStart) return;
    if (!sceneSelection.end || !sceneOptions?.beg || !sceneOptions?.end) return;
    if (activeStoryTxt !== sceneOptions.beg) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const nextScript = await fetchStoryScript(
          sceneOptions.end!,
          undefined,
          false,
          translator
        );
        if (controller.signal.aborted) return;
        const nextLines = parseStoryScript(nextScript);
        await preloadAssets(
          nextLines.slice(0, PRELOAD_LINE_LIMIT),
          undefined,
          controller.signal,
          30000,
          { images: true, audio: 'none' }
        );
        await preloadAssets(
          nextLines.slice(0, PRELOAD_LINE_LIMIT),
          undefined,
          controller.signal,
          20000,
          { images: false, audio: 'music' }
        );
      } catch {
        /* вторая сцена догрузится при переходе */
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    loading,
    isReadyToStart,
    activeStoryTxt,
    sceneOptions?.beg,
    sceneOptions?.end,
    sceneSelection.end,
    translator,
  ]);

  // Текущая глава получает приоритет в фоновой синхронизации текста.
  useEffect(() => {
    if (!activeStoryTxt) return;
    prioritizeStoryText(activeStoryTxt);
  }, [activeStoryTxt]);

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

  const retryPreload = async () => {
    const parsed = parsedLinesRef.current;
    if (!parsed) return;
    retryControllerRef.current?.abort();
    const controller = new AbortController();
    retryControllerRef.current = controller;
    setPreloadFailures([]);
    setPreloadProgress({ loaded: 0, total: 0, currentFile: '' });
    const failures = await preloadAssets(
      parsed.slice(0, PRELOAD_LINE_LIMIT),
      (loaded, total, currentFile) => {
        setPreloadProgress({ loaded, total, currentFile: currentFile || '' });
      },
      controller.signal,
      45000,
      { images: true, audio: 'none' }
    );
    if (controller.signal.aborted) return;
    releasePreloadedMedia();
    void preloadAssets(
      parsed.slice(0, PRELOAD_LINE_LIMIT),
      undefined,
      controller.signal,
      20000,
      { images: false, audio: 'music' }
    ).catch(() => []);
    const blocking = failures.filter((failure) => failure.type !== 'audio');
    if (blocking.length > 0) {
      setPreloadFailures(blocking);
      return;
    }
    setLoading(false);
    setIsReadyToStart(true);
  };

  const continueWithoutFailures = () => {
    setPreloadFailures([]);
    setLoading(false);
    setIsReadyToStart(true);
  };

  // Первый запуск истории: короткая подсказка больше не всплывает поверх сцены;
  // текст остаётся только на экране загрузки и в памятке «Как читать».

  if (loading || !isReadyToStart) {
    return (
      <>
      <StoryLoadingScreen
        loading={loading}
        started={started}
        preloadProgress={preloadProgress}
        lang={lang}
        t={t}
        isOriginalScript={isOriginalScript}
        operation={operation}
        onSelectLang={handleSelectLang}
        settings={settings}
        sceneOptions={sceneOptions}
        sceneSelection={sceneSelection}
        onToggleScene={(part) =>
          setSceneSelection((prev) => ({ ...prev, [part]: !prev[part] }))
        }
        onUpdateSettings={(newSettings) => dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings })}
        onStartLoading={() => {
          audioManager.unlock();
          // Первая выбранная сцена: до боя, иначе — после боя.
          const first = sceneSelection.beg
            ? sceneOptions?.beg
            : sceneOptions?.end;
          if (first && first !== activeStoryTxt) {
            setActiveStoryTxt(first);
          }
          setStarted(true);
        }}
        onBack={() => {
          audioManager.stopAll();
          onBack();
        }}
        onShowHelp={() => setShowHelp(true)}
      />
      <StoryHelpModal
        show={showHelp}
        onClose={() => setShowHelp(false)}
      />
      {preloadFailures.length > 0 && (
        <AssetPreloadDialog
          failures={preloadFailures}
          isRu={lang === 'ru_RU' || lang === 'ru_RU_CN'}
          onRetry={retryPreload}
          onContinue={continueWithoutFailures}
        />
      )}
      </>
    );
  }

  const finishVideo = () => {
    const nextIndex = videoNextIndexRef.current;
    if (nextIndex < 0) return;
    videoNextIndexRef.current = -1;
    setActiveVideo(null);
    setVideoPaused(false);
    setVideoProgress(0);
    dispatch({ type: 'SET_CINEMATIC', payload: false });
    processLine(nextIndex);
  };

  const isAnyModalOpen = showSettings || showBackConfirm || showLog || showBugReport || showHelp;
  const shouldShake = isShaking && !isAnyModalOpen && (settings.shakeIntensity ?? 1) > 0;

  const renderBgEffect = (effect: {
    id: string;
    name: string;
    layer: number;
    x?: number;
    y?: number;
  }) => (
    <div
      key={effect.id}
      // Эффект всегда выше картинок: у CG-слоя `z-24`, поэтому слой эффекта
      // стоит на том же уровне и выигрывает по порядку в DOM. Ниже блокера
      // кадра (`z-25`) и интерфейса.
      className="pointer-events-none absolute inset-0 z-[24]"
      style={{
        transform: `translate(${((effect.x ?? 0) / 1280) * 100}%, ${(-(effect.y ?? 0) / 720) * 100}%)`,
      }}
    >
      <StoryBgEffectLayer
        effect={{ name: effect.name, layer: effect.layer }}
      />
    </div>
  );

  const renderActiveEffect = (effect: StoryActiveEffect) => (
    <motion.div
      key={effect.id}
      className="pointer-events-none absolute inset-0 z-[24]"
      initial={{
        x: `${((effect.x ?? 0) / 1280) * 100}%`,
        y: `${(-(effect.y ?? 0) / 720) * 100}%`,
      }}
      animate={{
        x: `${((effect.xto ?? effect.x ?? 0) / 1280) * 100}%`,
        y: `${(-(effect.yto ?? effect.y ?? 0) / 720) * 100}%`,
      }}
      transition={{ duration: Math.max(0, effect.moveTime ?? 0), ease: 'linear' }}
    >
      <StoryBgEffectLayer
        effect={{ name: effect.name, layer: effect.layer }}
      />
    </motion.div>
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center select-none touch-none"
      onPointerDownCapture={() => audioManager.unlock()}
      onPointerDown={controls.handlePointerDown}
      onPointerMove={controls.handlePointerMove}
      onPointerUp={controls.handlePointerUp}
      onPointerLeave={controls.handlePointerUp}
      onPointerCancel={controls.handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        animate={shouldShake ? (shakeConfig ? {
          x: [-shakeConfig.x * (settings.shakeIntensity ?? 1), shakeConfig.x * (settings.shakeIntensity ?? 1), -shakeConfig.x * (settings.shakeIntensity ?? 1), shakeConfig.x * (settings.shakeIntensity ?? 1), 0],
          y: [-shakeConfig.y * (settings.shakeIntensity ?? 1), shakeConfig.y * (settings.shakeIntensity ?? 1), -shakeConfig.y * (settings.shakeIntensity ?? 1), shakeConfig.y * (settings.shakeIntensity ?? 1), 0],
        } : {
          x: [-5 * (settings.shakeIntensity ?? 1), 5 * (settings.shakeIntensity ?? 1), -5 * (settings.shakeIntensity ?? 1), 5 * (settings.shakeIntensity ?? 1), 0],
          y: [-2 * (settings.shakeIntensity ?? 1), 2 * (settings.shakeIntensity ?? 1), -2 * (settings.shakeIntensity ?? 1), 2 * (settings.shakeIntensity ?? 1), 0],
        }) : { x: 0, y: 0 }}
        transition={shouldShake ? {
          duration: shakeConfig ? (1 / Math.max(shakeConfig.vibrato, 1)) * 5 : 0.1,
          repeat: Infinity,
        } : { duration: 0.2 }}
        className="relative w-full max-w-[177.78dvh] aspect-video bg-black shadow-2xl overflow-hidden @container"
      >
        <CssTransformBox
          x={normalizeCoordX(cameraTransform?.x ?? 0)}
          y={normalizeCoordY(cameraTransform?.y ?? 0)}
          scaleX={cameraTransform?.scale ?? 1}
          scaleY={cameraTransform?.scale ?? 1}
          duration={cameraTransform?.duration !== undefined ? cameraTransform.duration : 1.0}
          ease={cameraTransform?.ease || "easeInOut"}
          unit="%"
          className="absolute inset-0 origin-center pointer-events-none"
        >
          <BackgroundLayer
            bgUrl={bgUrl}
            imageUrl={imageUrl}
            imageTween={imageTween}
            bgTween={state.bgTween}
          />

          {bgEffects
            .filter((effect) => effect.layer <= 1)
            .map(renderBgEffect)}

          {activeEffects
            .filter((effect) => effect.layer <= 2)
            .map(renderActiveEffect)}

          <CharacterLayer
            characterSlots={characterSlots}
          />

          {bgEffects
            .filter((effect) => effect.layer >= 2)
            .map(renderBgEffect)}

          {activeEffects
            .filter((effect) => effect.layer === 3)
            .map(renderActiveEffect)}

          <CharacterCutinLayer
            characterCutin={state.characterCutin}
          />

          {activeEffects
            .filter((effect) => effect.layer >= 4)
            .map(renderActiveEffect)}
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

        {activeVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
            <video
              key={activeVideo}
              ref={videoRef}
              src={activeVideo}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (video.paused) video.play().catch(() => {});
                else video.pause();
              }}
              onPlay={() => setVideoPaused(false)}
              onPause={() => setVideoPaused(true)}
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                if (video.duration > 0) {
                  setVideoProgress((video.currentTime / video.duration) * 100);
                }
              }}
              onEnded={finishVideo}
              onError={finishVideo}
            />

            {videoPaused && (
              <button
                type="button"
                onClick={() => videoRef.current?.play().catch(() => {})}
                aria-label="Play"
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-white/80"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/35 text-2xl backdrop-blur-xs">
                  ▶
                </span>
              </button>
            )}

            {/* Та же SKIP-кнопка, что в читалке: сверху справа, без рамки */}
            <button
              type="button"
              onClick={finishVideo}
              className="absolute right-3 top-3 z-20 p-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 drop-shadow-lg transition-colors hover:text-white sm:right-6 sm:top-5 sm:p-2 sm:text-sm md:text-base"
            >
              SKIP
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.06]">
              <div className="h-full bg-white/25 transition-[width]" style={{ width: `${videoProgress}%` }} />
            </div>
          </div>
        )}

        <DialogueUI
          showUI={showUI && !isCinematic}
          currentIndex={currentIndex}
          currentSpeaker={processedSpeaker}
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
          onToggleSkip={() => {
            if (isSkipping) {
              dispatch({ type: 'SET_SKIPPING', payload: false });
              return;
            }
            setShowSkipConfirm(true);
          }}
          onBackClick={() => dispatch({ type: 'SET_SHOW_BACK_CONFIRM', payload: true })}
          onSettingsClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: true })}
          onLogClick={() => dispatch({ type: 'SET_SHOW_LOG', payload: true })}
          onBugReportClick={() => setShowBugReport(true)}
          onToggleFullscreen={toggleFullscreen}
          setShowUI={(val) => dispatch({ type: 'SET_SHOW_UI', payload: val })}
          t={t}
          className="z-[60]"
        />
      </motion.div>

      {/* Modals placed outside motion.div to prevent modal shake and ensure crisp, stable dialogs */}
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

      <SkipConfirmation
        show={showSkipConfirm}
        operation={operation}
        lang={lang}
        onCancel={() => setShowSkipConfirm(false)}
        onConfirm={() => {
          setShowSkipConfirm(false);
          // «Пропустить историю» = выйти из сцены в список глав.
          audioManager.stopAll();
          onBack();
        }}
      />

      <OrientationOverlay lang={lang} />
    </div>
  );
};
