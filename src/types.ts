export type Language = 'zh_CN' | 'zh_TW' | 'de_DE' | 'en_US' | 'es_ES' | 'fr_FR' | 'id_ID' | 'it_IT' | 'ja_JP' | 'ko_KR' | 'pt_PT' | 'ru_RU';

export interface StoryReview {
  [key: string]: {
    id: string;
    name: string;
    entryType: string;
    info: string;
    storyTxt: string;
    iconId?: string;
  };
}

export interface StoryReviewTable {
  [key: string]: {
    id: string;
    name: string;
    entryType: string;
    info: string;
    storyTxt: string;
    iconId?: string;
  };
}

// The actual structure of story_review_table.json is slightly different
// It's usually a map of IDs to objects.

export type StoryLineType = 
  | 'dialogue' 
  | 'character' 
  | 'background' 
  | 'image' 
  | 'music' 
  | 'sound' 
  | 'voice' 
  | 'stop_music' 
  | 'delay' 
  | 'shake' 
  | 'camerashake' 
  | 'flash' 
  | 'decision' 
  | 'predicate' 
  | 'subtitle' 
  | 'blocker' 
  | 'dialog'
  | 'header' 
  | 'imagetween' 
  | 'cameraeffect' 
  | 'animtext' 
  | 'animtextclean' 
  | 'sticker'
  | 'stickerclear'
  | 'unknown';

export enum CharacterSlot {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

export interface StoryLine {
  type: StoryLineType;
  characterName?: string;
  text?: string;
  assetName?: string;
  assetName2?: string;
  introAssetName?: string;
  slot?: string;
  focus?: number;
  volume?: number;
  duration?: number;
  posFrom?: string;
  posTo?: string;
  aFrom?: number;
  aTo?: number;
  originalTag?: string;
  options?: string[];
  values?: string[];
  references?: string[];
  x?: number;
  y?: number;
  alignment?: string;
  size?: number;
  delay?: number;
  width?: number;
  r?: number;
  g?: number;
  b?: number;
  a?: number;
  block?: boolean;
  xstrength?: number;
  ystrength?: number;
  vibrato?: number;
  randomness?: number;
  fadeout?: boolean;
  initr?: number;
  initg?: number;
  initb?: number;
  inita?: number;
  // New fields for ImageTween and CameraEffect
  xScaleFrom?: number;
  yScaleFrom?: number;
  xScaleTo?: number;
  yScaleTo?: number;
  effect?: string;
  tiled?: boolean;
  // New fields for animtext
  id?: string;
  style?: string;
  pos?: string;
  // New fields for sticker
  multi?: boolean;
  isExiting?: boolean;
  exitDuration?: number;
}

export interface StoryChapter {
  id: string;
  code: string;
  name: string;
  storyTxt: string;
  iconId?: string;
  storyPic?: string | null;
}

export interface StoryEpisode {
  id: string;
  name: string;
  chineseName?: string;
  englishName?: string;
  entryType: string;
  storyEntryPicId?: string;
  startTime?: number;
  year?: number;
  chapters: StoryChapter[];
}
