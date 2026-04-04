import { StoryLine } from '../types';

export interface CharacterSlotData {
  url: string | null;
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
  imageUrl: string | null;
  imageTween: any | null;
  isShaking: boolean;
  shakeConfig: { x: number; y: number; vibrato: number } | null;
  isFlashing: boolean;
  blocker: { a: number; r: number; g: number; b: number; duration: number } | null;
  isAuto: boolean;
  isSkipping: boolean;
  skipSpeed: number;
  showUI: boolean;
  showBackConfirm: boolean;
}

export type StoryAction =
  | { type: 'SET_LINES'; payload: StoryLine[] }
  | { type: 'SET_INDEX'; payload: number }
  | { type: 'SET_BG'; payload: { bgUrl: string | null; assetName: string | null } }
  | { type: 'UPDATE_CHARACTER_SLOT'; payload: { slot: string; data: CharacterSlotData } }
  | { type: 'CLEAR_CHARACTER_SLOTS'; payload?: string } // Optional slot to clear
  | { type: 'SET_FOCUS'; payload: number }
  | { type: 'SET_DIALOGUE'; payload: { speaker: string | null; text: string; isSubtitle?: boolean; line?: StoryLine } }
  | { type: 'SET_TYPEWRITER_FINISHED'; payload: boolean }
  | { type: 'SET_SKIP_TYPEWRITER'; payload: boolean }
  | { type: 'SET_DECISION'; payload: StoryLine | null }
  | { type: 'SET_IMAGE'; payload: { url: string | null; tween?: any } }
  | { type: 'SET_SHAKE'; payload: { isShaking: boolean; config?: { x: number; y: number; vibrato: number } | null; duration?: number } }
  | { type: 'SET_FLASH'; payload: boolean }
  | { type: 'SET_BLOCKER'; payload: { a: number; r: number; g: number; b: number; duration: number } | null }
  | { type: 'SET_ANIM_TEXT'; payload: StoryLine | null }
  | { type: 'TOGGLE_AUTO' }
  | { type: 'SET_AUTO'; payload: boolean }
  | { type: 'SET_SKIPPING'; payload: boolean }
  | { type: 'SET_SKIP_SPEED'; payload: number }
  | { type: 'SET_SHOW_UI'; payload: boolean }
  | { type: 'SET_SHOW_BACK_CONFIRM'; payload: boolean };

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
  imageUrl: null,
  imageTween: null,
  isShaking: false,
  shakeConfig: null,
  isFlashing: false,
  blocker: null,
  isAuto: false,
  isSkipping: false,
  skipSpeed: 2,
  showUI: true,
  showBackConfirm: false,
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
    case 'SET_BLOCKER':
      return { ...state, blocker: action.payload };
    case 'SET_ANIM_TEXT':
      return { ...state, activeAnimText: action.payload };
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
    default:
      return state;
  }
}
