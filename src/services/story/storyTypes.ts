import { StoryLine, StoryChapter, StoryEpisode, Language } from '../../types';

export interface CharacterFaceItem {
  name: string;
  alias?: string;
  group?: number;
  image?: string;
  rect?: [number, number, number, number];
}

export interface CharacterEntry {
  size?: { x: number; y: number };
  pos?: { x: number; y: number };
  array?: CharacterFaceItem[];
}

export type CharacterDataMap = Record<string, CharacterEntry>;

export interface CharacterAssetInfo {
  bodyUrl: string;
  faceUrl?: string;
  faceRect?: { x: number; y: number; w: number; h: number };
  size?: { x: number; y: number };
  pos?: { x: number; y: number };
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  currentFile: string;
}

export interface TweenConfig {
  name?: string;
  duration?: number;
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
  alphaFrom?: number;
  alphaTo?: number;
  scaleXFrom?: number;
  scaleXTo?: number;
  scaleYFrom?: number;
  scaleYTo?: number;
  ease?: string;
}

export interface AudioStateSnapshot {
  currentBgm?: string | null;
  bgmTime?: number;
  activeAmbience?: string | null;
}

export interface HistoryItem {
  speaker: string | null;
  text: string;
  lineIndex: number;
  stateSnapshot?: string;
  audioSnapshot?: AudioStateSnapshot;
}

export interface AudioSnapshot {
  introUrl?: string;
  loopUrl?: string;
  volume?: number;
  introName?: string;
  loopName?: string;
  [key: string]: unknown;
}

export interface TranslationRow {
  ID?: string;
  Character?: string;
  'Original Text'?: string;
  Translation?: string;
  [key: string]: string | undefined;
}

export interface EditorDialogueItem {
  id: string;
  chapterTitle: string;
  charOriginal: string;
  charTranslated: string;
  textOriginal: string;
  textTranslated: string;
}

export interface CsvTranslationRow {
  id?: string;
  key?: string;
  index?: number | string;
  speaker?: string;
  characterName?: string;
  originalText?: string;
  text?: string;
  translation?: string;
  ru?: string;
  en?: string;
  zh?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface EpisodeProgressData {
  total: number;
  translated: number;
  progressMap?: Record<string, { total: number; translated: number; percent: number }>;
}
