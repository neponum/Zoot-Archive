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
  isFlashing: boolean;
  cameraEffect: { effect: string; duration: number; amount: number } | null;
  blocker: { a: number; r: number; g: number; b: number; duration: number } | null;
  isAuto: boolean;
  isSkipping: boolean;
  skipSpeed: number;
  showUI: boolean;
  showBackConfirm: boolean;
  showSettings: boolean;
  showLog: boolean;
  predicateMismatch: boolean;
  history: { speaker: string | null; text: string }[];
  settings: {
    fontSize: number;
    bgmVolume: number;
    sfxVolume: number;
    voiceVolume: number;
    fontFamily: string;
  };
}

export type StoryAction =
  | { type: 'SET_LINES'; payload: StoryLine[] }
  | { type: 'SET_INDEX'; payload: number }
  | { type: 'SET_BG'; payload: { bgUrl: string | null; assetName: string | null } }
  | { type: 'UPDATE_CHARACTER_SLOT'; payload: { slot: string; data: CharacterSlotData } }
  | { type: 'UPDATE_CHARACTER_SLOTS'; payload: Record<string, CharacterSlotData> }
  | { type: 'CLEAR_CHARACTER_SLOTS'; payload?: string } // Optional slot to clear
  | { type: 'SET_FOCUS'; payload: number }
  | { type: 'SET_DIALOGUE'; payload: { speaker: string | null; text: string; isSubtitle?: boolean; line?: StoryLine } }
  | { type: 'SET_TYPEWRITER_FINISHED'; payload: boolean }
  | { type: 'SET_SKIP_TYPEWRITER'; payload: boolean }
  | { type: 'SET_DECISION'; payload: StoryLine | null }
  | { type: 'SET_IMAGE'; payload: { url: string | null; tween?: any } }
  | { type: 'SET_SHAKE'; payload: { isShaking: boolean; config?: { x: number; y: number; vibrato: number } | null; duration?: number } }
  | { type: 'SET_FLASH'; payload: boolean }
  | { type: 'SET_CAMERA_EFFECT'; payload: { effect: string; duration: number; amount: number } | null }
  | { type: 'SET_BLOCKER'; payload: { a: number; r: number; g: number; b: number; duration: number } | null }
  | { type: 'SET_ANIM_TEXT'; payload: StoryLine | null }
  | { type: 'ADD_STICKER'; payload: StoryLine }
  | { type: 'CLEAR_STICKERS' }
  | { type: 'TOGGLE_AUTO' }
  | { type: 'SET_AUTO'; payload: boolean }
  | { type: 'SET_SKIPPING'; payload: boolean }
  | { type: 'SET_SKIP_SPEED'; payload: number }
  | { type: 'SET_SHOW_UI'; payload: boolean }
  | { type: 'SET_SHOW_BACK_CONFIRM'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_SHOW_LOG'; payload: boolean }
  | { type: 'SET_PREDICATE_MISMATCH'; payload: boolean }
  | { type: 'ADD_TO_HISTORY'; payload: { speaker: string | null; text: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<StoryState['settings']> };

export const initialState: StoryState = {
  lines: [],
  currentIndex: 0,
  currentBg: null,
  bgUrl: 'BLACK_FALLBACK',
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
  isFlashing: false,
  cameraEffect: null,
  blocker: null,
  isAuto: false,
  isSkipping: false,
  skipSpeed: 2,
  showUI: true,
  showBackConfirm: false,
  showSettings: false,
  showLog: false,
  predicateMismatch: false,
  history: [],
  settings: {
    fontSize: 100, // Percentage
    bgmVolume: 1.0,
    sfxVolume: 1.0,
    voiceVolume: 1.0,
    fontFamily: 'sans-serif',
  },
};

export function storyReducer(state: StoryState, action: StoryAction): StoryState {
  switch (action.type) {
    case 'SET_LINES':
      return { ...state, lines: action.payload };
    case 'SET_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'SET_BG':
      return { ...state, bgUrl: action.payload.bgUrl, currentBg: action.payload.assetName };
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
    case 'CLEAR_CHARACTER_SLOTS':
      if (action.payload) {
        return {
          ...state,
          characterSlots: {
            ...state.characterSlots,
            [action.payload]: { url: null, focus: false, name: null },
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
    case 'SET_FOCUS': {
      const slotMap: Record<number, string> = { 1: 'left', 2: 'center', 3: 'right' };
      const targetSlot = slotMap[action.payload];
      const nextSlots = { ...state.characterSlots };
      Object.keys(nextSlots).forEach((slot) => {
        nextSlots[slot] = { ...nextSlots[slot], focus: slot === targetSlot };
      });
      return { ...state, characterSlots: nextSlots };
    }
    case 'SET_DIALOGUE':
      if (action.payload.isSubtitle) {
        return {
          ...state,
          currentSubtitle: action.payload.line || null,
          currentSpeaker: null,
          currentText: action.payload.text,
          isTypewriterFinished: false,
          shouldSkipTypewriter: false,
        };
      }
      return {
        ...state,
        currentSubtitle: null,
        currentSpeaker: action.payload.speaker,
        currentText: action.payload.text,
        isTypewriterFinished: false,
        shouldSkipTypewriter: false,
      };
    case 'SET_TYPEWRITER_FINISHED':
      return { ...state, isTypewriterFinished: action.payload };
    case 'SET_SKIP_TYPEWRITER':
      return { ...state, shouldSkipTypewriter: action.payload };
    case 'SET_DECISION':
      return { ...state, currentDecision: action.payload };
    case 'SET_IMAGE':
      return { ...state, imageUrl: action.payload.url, imageTween: action.payload.tween || null };
    case 'SET_SHAKE':
      if (action.payload.config !== undefined) {
        return { ...state, shakeConfig: action.payload.config };
      }
      return { ...state, isShaking: action.payload.isShaking };
    case 'SET_FLASH':
      return { ...state, isFlashing: action.payload };
    case 'SET_CAMERA_EFFECT':
      return { ...state, cameraEffect: action.payload };
    case 'SET_BLOCKER':
      return { ...state, blocker: action.payload };
    case 'SET_ANIM_TEXT':
      return { ...state, activeAnimText: action.payload };
    case 'ADD_STICKER': {
      let newStickers = [...state.stickers];
      
      if (action.payload.text === undefined) {
        // If text is not provided, it's a command to clear this specific sticker
        const existingIndex = newStickers.findIndex(s => s.id === action.payload.id);
        if (existingIndex >= 0) {
          newStickers[existingIndex] = { ...newStickers[existingIndex], isExiting: true, exitDuration: action.payload.duration };
        }
      } else {
        // If multi is false, mark existing stickers as exiting
        if (!action.payload.multi) {
          newStickers = newStickers.map(s => ({ ...s, isExiting: true, exitDuration: 0.5 }));
        }
        
        // If a sticker with the same id exists, replace it, otherwise add it
        const existingIndex = newStickers.findIndex(s => s.id === action.payload.id);
        if (existingIndex >= 0) {
          newStickers[existingIndex] = action.payload;
        } else {
          newStickers.push(action.payload);
        }
      }
      return { ...state, stickers: newStickers };
    }
    case 'CLEAR_STICKERS':
      return { ...state, stickers: state.stickers.map(s => ({ ...s, isExiting: true, exitDuration: 0.5 })) };
    case 'TOGGLE_AUTO':
      return { ...state, isAuto: !state.isAuto, isSkipping: false };
    case 'SET_AUTO':
      return { ...state, isAuto: action.payload, isSkipping: action.payload ? false : state.isSkipping };
    case 'SET_SKIPPING':
      return { ...state, isSkipping: action.payload, isAuto: action.payload ? false : state.isAuto };
    case 'SET_SKIP_SPEED':
      return { ...state, skipSpeed: action.payload };
    case 'SET_SHOW_UI':
      return { ...state, showUI: action.payload };
    case 'SET_SHOW_BACK_CONFIRM':
      return { ...state, showBackConfirm: action.payload };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_SHOW_LOG':
      return { ...state, showLog: action.payload };
    case 'SET_PREDICATE_MISMATCH':
      return { ...state, predicateMismatch: action.payload };
    case 'ADD_TO_HISTORY':
      return { ...state, history: [...state.history, action.payload] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}
