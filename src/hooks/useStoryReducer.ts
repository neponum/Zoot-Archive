import { StoryLine } from '../types';

/**
 * Data structure for a character slot in the story viewer.
 * Includes positioning and asset URLs for body and face.
 */
export interface CharacterSlotData {
  url: string | null;
  faceUrl?: string | null;
  faceRect?: { x: number; y: number; w: number; h: number };
  size?: { x: number; y: number };
  pos?: { x: number; y: number };
  focus: boolean;
  name: string | null;
  animation?: {
    posFrom?: string;
    posTo?: string;
    aFrom?: number;
    aTo?: number;
    duration?: number;
  };
}

export interface StoryState {
  lines: StoryLine[];
  currentIndex: number;
  currentBg: string | null;
  bgUrl: string | null;
  bgTween: any | null;
  characterSlots: Record<string, CharacterSlotData>;
  currentSpeaker: string | null;
  currentText: string;
  isTypewriterFinished: boolean;
  shouldSkipTypewriter: boolean;
  currentDecision: StoryLine | null;
  currentSubtitle: StoryLine | null;
  activeAnimText: StoryLine | null;
  stickers: StoryLine[];
  imageUrl: string | null;
  imageTween: any | null;
  isShaking: boolean;
  shakeConfig: { x: number; y: number; vibrato: number } | null;
  isFlashing: { active: boolean, duration: number };
  cameraEffect: { effect: string; duration: number; amount: number } | null;
  cameraTransform: { x: number; y: number; scale: number; duration?: number; ease?: string } | null;
  characterCutin: { bodyUrl: string; faceUrl?: string; line: StoryLine } | null;
  blocker: { a: number; r: number; g: number; b: number; duration: number; initr?: number; initg?: number; initb?: number; inita?: number; ease?: string; } | null;
  isAuto: boolean;
  isSkipping: boolean;
  showUI: boolean;
  isBlocking: boolean;
  isCinematic: boolean;
  showBackConfirm: boolean;
  showSettings: boolean;
  showLog: boolean;
  predicateMismatch: boolean;
  dialogueKey: number;
  history: { speaker: string | null; text: string; lineIndex: number; stateSnapshot?: string; audioSnapshot?: any }[];
  settings: {
    fontSize: number;
    bgmVolume: number;
    sfxVolume: number;
    voiceVolume: number;
    textSpeed: number;
    autoDelay: number;
    fontFamily: string;
    nickname: string;
    shakeIntensity: number;
    skipSpeed: number;
  };
}

export type StoryAction =
  | { type: 'SET_LINES'; payload: StoryLine[] }
  | { type: 'SET_INDEX'; payload: number }
  | { type: 'SET_BG'; payload: { bgUrl: string | null; assetName: string | null; tween?: any } }
  | { type: 'UPDATE_CHARACTER_SLOT'; payload: { slot: string; data: CharacterSlotData } }
  | { type: 'UPDATE_CHARACTER_SLOTS'; payload: Record<string, CharacterSlotData> }
  | { type: 'CLEAR_CHARACTER_SLOTS'; payload?: string | { slot?: string; duration?: number } } // Optional slot to clear
  | { type: 'SET_FOCUS'; payload: number }
  | { type: 'SET_DIALOGUE'; payload: { speaker: string | null; text: string; index?: number; isSubtitle?: boolean; line?: StoryLine } }
  | { type: 'SET_SUBTITLE'; payload: StoryLine | null }
  | { type: 'SET_TYPEWRITER_FINISHED'; payload: boolean }
  | { type: 'SET_SKIP_TYPEWRITER'; payload: boolean }
  | { type: 'SET_DECISION'; payload: StoryLine | null }
  | { type: 'SET_IMAGE'; payload: { url: string | null; tween?: any } }
  | { type: 'SET_CHARACTER_CUTIN'; payload: { bodyUrl: string; faceUrl?: string; line: StoryLine } | null }
  | { type: 'SET_SHAKE'; payload: { isShaking: boolean; config?: { x: number; y: number; vibrato: number } | null; duration?: number } }
  | { type: 'SET_FLASH'; payload: { active: boolean, duration: number } }
  | { type: 'SET_CAMERA_EFFECT'; payload: { effect: string; duration: number; amount: number } | null }
  | { type: 'SET_CAMERA_TRANSFORM'; payload: { x?: number; y?: number; scale?: number; duration?: number; ease?: string } | null }
  | { type: 'SET_BLOCKER'; payload: { a: number; r: number; g: number; b: number; duration: number; initr?: number; initg?: number; initb?: number; inita?: number; ease?: string; } | null }
  | { type: 'SET_ANIM_TEXT'; payload: StoryLine | null }
  | { type: 'ADD_STICKER'; payload: StoryLine }
  | { type: 'CLEAR_STICKERS' }
  | { type: 'TOGGLE_AUTO' }
  | { type: 'SET_AUTO'; payload: boolean }
  | { type: 'SET_SKIPPING'; payload: boolean }
  | { type: 'SET_SHOW_UI'; payload: boolean }
  | { type: 'SET_BLOCKING'; payload: boolean }
  | { type: 'SET_CINEMATIC'; payload: boolean }
  | { type: 'SET_SHOW_BACK_CONFIRM'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_SHOW_LOG'; payload: boolean }
  | { type: 'SET_PREDICATE_MISMATCH'; payload: boolean }
  | { type: 'ADD_TO_HISTORY'; payload: { speaker: string | null; text: string; lineIndex: number; stateSnapshot?: string; audioSnapshot?: any } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<StoryState['settings']> }
  | { type: 'RESTORE_STATE'; payload: Omit<StoryState, 'history' | 'settings'> & { historyIndex?: number } }
  | { type: 'RESET_STATE' };

const getInitialSettings = () => {
  const defaultSettings = {
    fontSize: 100, // Percentage
    bgmVolume: 1.0,
    sfxVolume: 1.0,
    voiceVolume: 1.0,
    textSpeed: 30, // ms per character
    autoDelay: 2000, // ms delay after typing
    fontFamily: 'sans-serif',
    nickname: '{@nickname}',
    shakeIntensity: 1.0,
    skipSpeed: 4,
  };

  try {
    const saved = localStorage.getItem('ak-story-settings');
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return defaultSettings;
};

export const initialState: StoryState = {
  lines: [],
  currentIndex: 0,
  currentBg: null,
  bgUrl: 'BLACK_FALLBACK',
  bgTween: null,
  characterSlots: {
    left: { url: null, focus: false, name: null },
    center: { url: null, focus: false, name: null },
    right: { url: null, focus: false, name: null },
  },
  currentSpeaker: null,
  currentText: '',
  isTypewriterFinished: true,
  shouldSkipTypewriter: false,
  currentDecision: null,
  currentSubtitle: null,
  activeAnimText: null,
  stickers: [],
  imageUrl: null,
  imageTween: null,
  isShaking: false,
  shakeConfig: null,
  isFlashing: { active: false, duration: 0.5 },
  cameraEffect: null,
  cameraTransform: null,
  characterCutin: null,
  blocker: null,
  isAuto: false,
  isSkipping: false,
  showUI: true,
  isBlocking: false,
  isCinematic: false,
  showBackConfirm: false,
  showSettings: false,
  showLog: false,
  predicateMismatch: false,
  dialogueKey: 0,
  history: [],
  settings: getInitialSettings(),
};

export function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'RESET_STATE':
      return { 
        ...initialState, 
        settings: state.settings,
        // Make sure we keep the audio manager settings from the current state
      };
    case 'SET_LINES':
      return { ...state, lines: action.payload };
    case 'SET_INDEX':
      const safeIndex = isNaN(action.payload) ? 0 : Math.max(0, action.payload);
      return { ...state, currentIndex: safeIndex };
    case 'SET_BG':
      return { 
        ...state, 
        bgUrl: action.payload.bgUrl, 
        currentBg: action.payload.assetName,
        bgTween: action.payload.tween || null
      };
    case 'UPDATE_CHARACTER_SLOT': {
      const { slot, data } = action.payload;
      const nextSlots = { ...state.characterSlots };
      
      // If character is already in this slot and no animation, skip update to avoid re-renders
      if (!data.animation && 
          nextSlots[slot]?.name === data.name && 
          nextSlots[slot]?.url === data.url && 
          nextSlots[slot]?.faceUrl === data.faceUrl && 
          nextSlots[slot]?.focus === data.focus) {
        return state;
      }

      // Logic for slot clearing when center is used
      if (slot === 'center' && data.url) {
        nextSlots.left = { url: null, focus: false, name: null };
        nextSlots.right = { url: null, focus: false, name: null };
      } else if ((slot === 'left' || slot === 'right') && data.url) {
        nextSlots.center = { url: null, focus: false, name: null };
      }
      
      nextSlots[slot] = data;
      return { ...state, characterSlots: nextSlots };
    }
    case 'UPDATE_CHARACTER_SLOTS': {
      const updates = action.payload;
      const nextSlots = { ...state.characterSlots };
      let hasChanges = false;

      Object.entries(updates).forEach(([slot, data]) => {
        if (data.animation || 
            nextSlots[slot]?.name !== data.name || 
            nextSlots[slot]?.url !== data.url || 
            nextSlots[slot]?.faceUrl !== data.faceUrl || 
            nextSlots[slot]?.focus !== data.focus) {
          
          // Logic for slot clearing when center is used
          if (slot === 'center' && data.url) {
            nextSlots.left = { url: null, focus: false, name: null };
            nextSlots.right = { url: null, focus: false, name: null };
          } else if ((slot === 'left' || slot === 'right') && data.url) {
            nextSlots.center = { url: null, focus: false, name: null };
          }

          nextSlots[slot] = data;
          hasChanges = true;
        }
      });

      return hasChanges ? { ...state, characterSlots: nextSlots } : state;
    }
    case 'CLEAR_CHARACTER_SLOTS': {
      let targetSlot: string | undefined = undefined;
      let duration: number | undefined = undefined;
      
      if (typeof action.payload === 'string') {
        targetSlot = action.payload;
      } else if (action.payload) {
        targetSlot = action.payload.slot;
        duration = action.payload.duration;
      }

      if (duration && duration > 0) {
        const nextSlots = { ...state.characterSlots };
        const doFade = (s: string) => {
          if (nextSlots[s]?.url) {
            nextSlots[s] = { ...nextSlots[s], animation: { ...(nextSlots[s].animation || {}), aTo: 0, duration } };
          }
        };
        
        if (targetSlot) {
          doFade(targetSlot);
        } else {
          Object.keys(nextSlots).forEach(doFade);
        }
        return { ...state, characterSlots: nextSlots };
      }

      if (targetSlot) {
        return {
          ...state,
          characterSlots: {
            ...state.characterSlots,
            [targetSlot]: { url: null, focus: false, name: null },
          },
        };
      }
      return {
        ...state,
        characterSlots: {
          left: { url: null, focus: false, name: null },
          center: { url: null, focus: false, name: null },
          right: { url: null, focus: false, name: null },
        },
      };
    }
    case 'SET_FOCUS': {
      const slotMap: Record<number, string> = { 1: 'left', 2: 'center', 3: 'right' };
      const targetSlot = slotMap[action.payload];
      const nextSlots = { ...state.characterSlots };
      Object.keys(nextSlots).forEach((slot) => {
        nextSlots[slot] = { ...nextSlots[slot], focus: slot === targetSlot };
      });
      return { ...state, characterSlots: nextSlots };
    }
    case 'SET_DIALOGUE': {
      const nextKey = action.payload.index !== undefined ? action.payload.index : state.dialogueKey + 1;
      const isEmpty = !action.payload.text || action.payload.text.trim().length === 0;
      if (action.payload.isSubtitle) {
        return {
          ...state,
          currentSubtitle: action.payload.line || null,
          currentSpeaker: null,
          currentText: action.payload.text,
          currentIndex: action.payload.index !== undefined ? action.payload.index : state.currentIndex,
          dialogueKey: nextKey,
          isTypewriterFinished: isEmpty,
          shouldSkipTypewriter: false,
        };
      }
      return {
        ...state,
        currentSubtitle: null,
        currentSpeaker: action.payload.speaker,
        currentText: action.payload.text,
        currentIndex: action.payload.index !== undefined ? action.payload.index : state.currentIndex,
        dialogueKey: nextKey,
        isTypewriterFinished: isEmpty,
        shouldSkipTypewriter: false,
      };
    }
    case 'SET_SUBTITLE':
      return {
        ...state,
        currentSubtitle: action.payload,
        currentText: action.payload ? state.currentText : '',
      };
    case 'SET_TYPEWRITER_FINISHED':
      return { ...state, isTypewriterFinished: action.payload };
    case 'SET_SKIP_TYPEWRITER':
      return { ...state, shouldSkipTypewriter: action.payload };
    case 'SET_DECISION':
      return { ...state, currentDecision: action.payload };
    case 'SET_IMAGE':
      return { ...state, imageUrl: action.payload.url, imageTween: action.payload.tween || null };
    case 'SET_CHARACTER_CUTIN':
      return { ...state, characterCutin: action.payload };
    case 'SET_SHAKE':
      return {
        ...state,
        shakeConfig: action.payload.config !== undefined ? action.payload.config : state.shakeConfig,
        isShaking: action.payload.isShaking !== undefined ? action.payload.isShaking : state.isShaking
      };
    case 'SET_FLASH':
      return { ...state, isFlashing: action.payload };
    case 'SET_CAMERA_EFFECT':
      return { ...state, cameraEffect: action.payload };
    case 'SET_CAMERA_TRANSFORM':
      return {
        ...state,
        cameraTransform: action.payload ? {
          x: action.payload.x ?? state.cameraTransform?.x ?? 0,
          y: action.payload.y ?? state.cameraTransform?.y ?? 0,
          scale: action.payload.scale ?? state.cameraTransform?.scale ?? 1,
          duration: action.payload.duration,
          ease: action.payload.ease
        } : null
      };
    case 'SET_BLOCKER':
      return { ...state, blocker: action.payload };
    case 'SET_ANIM_TEXT':
      return { ...state, activeAnimText: action.payload };
    case 'ADD_STICKER': {
      let newStickers = [...state.stickers];
      
      if (action.payload.text === undefined) {
        // If text is not provided, it's a command to clear this specific sticker
        // We must only clear the one that is currently active (not already exiting)
        const existingIndex = newStickers.findLastIndex(s => s.id === action.payload.id && !s.isExiting);
        if (existingIndex >= 0) {
          newStickers[existingIndex] = { ...newStickers[existingIndex], isExiting: true, exitDuration: action.payload.duration };
        }
      } else {
        // If multi is false, mark existing stickers as exiting
        if (!action.payload.multi) {
          newStickers = newStickers.map(s => ({ ...s, isExiting: true, exitDuration: 0.5 }));
        }
        
        // If a sticker with the same id exists, replace it, otherwise add it
        const existingIndex = newStickers.findLastIndex(s => s.id === action.payload.id && !s.isExiting);
        if (existingIndex >= 0) {
          const existing = newStickers[existingIndex];
          const shouldAppend = !!(existing.text && action.payload.text && action.payload.multi);
          const nextText = shouldAppend
            ? existing.text + action.payload.text
            : (action.payload.text !== undefined ? action.payload.text : existing.text);
          
          newStickers[existingIndex] = {
            ...existing,
            ...action.payload,
            _instanceId: shouldAppend 
              ? existing._instanceId 
              : (nextText !== existing.text ? Date.now().toString() + Math.random().toString() : existing._instanceId),
            text: nextText
          };
        } else {
          newStickers.push({ ...action.payload, _instanceId: Date.now().toString() + Math.random().toString() });
        }
      }
      return { 
        ...state, 
        stickers: newStickers,
        shouldSkipTypewriter: action.payload.text !== undefined ? false : state.shouldSkipTypewriter,
        isTypewriterFinished: action.payload.text !== undefined ? false : state.isTypewriterFinished
      };
    }
    case 'CLEAR_STICKERS':
      return { ...state, stickers: state.stickers.map(s => ({ ...s, isExiting: true, exitDuration: 0.5 })) };
    case 'TOGGLE_AUTO':
      return { ...state, isAuto: !state.isAuto, isSkipping: false };
    case 'SET_AUTO':
      return { ...state, isAuto: action.payload, isSkipping: action.payload ? false : state.isSkipping };
    case 'SET_SKIPPING':
      return { ...state, isSkipping: action.payload, isAuto: action.payload ? false : state.isAuto };
    case 'SET_SHOW_UI':
      return { ...state, showUI: action.payload };
    case 'SET_BLOCKING':
      return { ...state, isBlocking: action.payload };
    case 'SET_CINEMATIC':
      return { ...state, isCinematic: action.payload };
    case 'SET_SHOW_BACK_CONFIRM':
      return { ...state, showBackConfirm: action.payload };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_SHOW_LOG':
      return { ...state, showLog: action.payload };
    case 'SET_PREDICATE_MISMATCH':
      return { ...state, predicateMismatch: action.payload };
    case 'ADD_TO_HISTORY':
      const { speaker, text, lineIndex, audioSnapshot } = action.payload;
      // Use structuredClone-like parsing via JSON stringify/parse to deeply copy without react refs
      const snapshot = {
        currentIndex: state.currentIndex,
        currentBg: state.currentBg,
        bgUrl: state.bgUrl,
        bgTween: state.bgTween,
        characterSlots: state.characterSlots,
        currentSpeaker: state.currentSpeaker,
        currentText: state.currentText,
        isTypewriterFinished: state.isTypewriterFinished,
        shouldSkipTypewriter: state.shouldSkipTypewriter,
        currentDecision: state.currentDecision,
        currentSubtitle: state.currentSubtitle,
        activeAnimText: state.activeAnimText,
        stickers: state.stickers,
        imageUrl: state.imageUrl,
        imageTween: state.imageTween,
        isShaking: state.isShaking,
        shakeConfig: state.shakeConfig,
        isFlashing: state.isFlashing,
        cameraEffect: state.cameraEffect,
        cameraTransform: state.cameraTransform,
        characterCutin: state.characterCutin,
        blocker: state.blocker,
        isAuto: state.isAuto,
        isSkipping: state.isSkipping,
        showUI: state.showUI,
        isBlocking: state.isBlocking,
        isCinematic: state.isCinematic,
        showBackConfirm: state.showBackConfirm,
        showSettings: state.showSettings,
        showLog: state.showLog,
        predicateMismatch: state.predicateMismatch,
        dialogueKey: state.dialogueKey
      };
      
      return { 
        ...state, 
        history: [...state.history, { 
          speaker, 
          text, 
          lineIndex, 
          audioSnapshot,
          stateSnapshot: JSON.stringify(snapshot)
        }] 
      };
    case 'RESTORE_STATE':
      return { 
        ...state, 
        ...action.payload,
        // Make sure we keep lines, history and settings from the current state!
        lines: state.lines,
        history: typeof action.payload.historyIndex === 'number' 
          ? state.history.slice(0, action.payload.historyIndex) 
          : state.history,
        settings: state.settings
      };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}
