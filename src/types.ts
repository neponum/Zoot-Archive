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
  | 'stop_sound'
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
  | 'backgroundtween'
  | 'charactercutin'
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
  width?: number;
  height?: number;
  alignment?: string;
  size?: number;
  delay?: number;
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
  xScale?: number;
  yScale?: number;
  xScaleFrom?: number;
  yScaleFrom?: number;
  xScaleTo?: number;
  yScaleTo?: number;
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
  effect?: string;
  tiled?: boolean;
  keep?: boolean;
  screenadapt?: boolean;
  channel?: string;
  ease?: string;
  loop?: boolean;
  fadestyle?: string;
  offsetx?: number;
  widgetID?: string;
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
