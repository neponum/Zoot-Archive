export type Language = 'zh_CN' | 'en_US' | 'ja_JP' | 'ko_KR' | 'ru_RU' | 'ru_RU_CN';

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
  | 'stop_voice'
  | 'delay' 
  | 'shake' 
  | 'camerashake' 
  | 'cameratween'
  | 'cameraset'
  | 'flash' 
  | 'decision' 
  | 'predicate' 
  | 'subtitle' 
  | 'subtitleclear'
  | 'blocker' 
  | 'dialog'
  | 'header' 
  | 'imagetween' 
  | 'hideimage'
  | 'clearimage'
  | 'cameraeffect' 
  | 'animtext' 
  | 'animtextclean' 
  | 'sticker'
  | 'stickerclear'
  | 'backgroundtween'
  | 'charactercutin'
  | 'charactertween'
  | 'characterlight'
  | 'characteraction'
  | 'clearchars'
  | 'playeffect'
  | 'stopeffect'
  | 'playvideo'
  | 'popup'
  | 'multiline'
  | 'largetext'
  | 'color'
  | 'soundvolume'
  | 'avgdisplay'
  | 'cgitem'
  | 'hidecgitem'
  | 'curtain'
  | 'focusout'
  | 'interlude'
  | 'unknown';

export enum CharacterSlot {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
}

export interface StoryLine {
  type: StoryLineType;
  _instanceId?: string;
  characterName?: string;
  text?: string;
  assetName?: string;
  assetName2?: string;
  actionType?: string;
  xpos?: number;
  ypos?: number;
  direction?: string;
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
  z?: number;
  scale?: number;
  color?: string;
  src?: string;
  title?: string;
  active?: boolean;
  // New fields for additional commands
  layer?: number;
  sFrom?: number;
  sTo?: number;
  sDuration?: number;
  fillFrom?: number;
  fillTo?: number;
  focusType?: string;
  from?: number;
  to?: number;
  maskid?: string;
  tsFrom?: string;
  tsTo?: string;
  tsDuration?: number;
  switch?: boolean;
  offset?: string;
  clear?: boolean;
  interludeType?: number;
  pFrom?: string;
  pTo?: string;
  interludeSize?: string;
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

export interface OperatorHandbookSection {
  titleZh: string;
  titleEn: string;
  textZh: string;
  textEn: string;
}

export interface OperatorData {
  id: string;
  nameZh: string;
  nameEn: string;
  nameRu?: string;
  rarity: number;
  profession: string;
  subProfessionId: string;
  nationId: string;
  groupId: string;
  teamId: string;
  position: string;
  displayNumber: string;
  drawName: string;
  infoName: string;
  handbook: OperatorHandbookSection[];
  chapters?: StoryChapter[];
  storyEpisode?: StoryEpisode;
}

