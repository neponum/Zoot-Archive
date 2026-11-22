import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveImage } from './ArchiveImage';
import { ChibiSpine } from './ChibiSpine';
import { SkinArtwork } from './SkinArtwork';
import {
  formatBirthday,
  getBirthdayOperatorIds,
  getMonthDay,
  OPERATOR_BIRTHDAYS,
} from '../utils/operatorBirthdays';
import { NEW_OPERATOR_IDS } from '../utils/newOperators';
import type { StageLocale } from '../config/stageCopy';
import {
  DOSSIER_LANGS,
  VOICE_DUBS,
  getVoiceAudioUrl,
  loadOperatorMemoryStories,
  type DossierLang,
  type OperatorMemoryStory,
} from '../services/operatorArchiveService';

export interface OperatorSkin {
  id: string;
  tabType: 'default_1' | 'default_2' | 'skin';
  topBadgeSmall: string;
  topBadgeMain: string;
  brandName: string;
  /** `brandId` коллекции из `skinGroupId` (`2023#boc` → `boc`). */
  brandId?: string;
  /** `spDynIllustId`, если у образа есть анимированная Spine-версия. */
  dynIllust?: string;
  /** Официальный логотип коллекции из `zoot-data/brands`. */
  brandLogo?: string;
  skinTitle: string;
  illustrator: string;
  description: string;
  fullArtSrc: string;
  portraitSrc: string;
  avatarSrc: string;
  previewOnly?: boolean;
  accentColor: string;
  secondaryBracketColor: string;
  artScaleClass?: string;
}

export interface OperatorVoiceLine {
  id: string;
  /** Имя файла озвучки на CDN (`CN_001`) — из него строятся ссылки на mp3. */
  voiceId?: string;
  title: string;
  transcript: string;
}

export type OperatorClassType =
  | 'SPECIALIST'
  | 'CASTER'
  | 'MEDIC'
  | 'SNIPER'
  | 'VANGUARD'
  | 'GUARD'
  | 'DEFENDER'
  | 'SUPPORTER';

export interface OperatorRecord {
  id: string;
  dataNo: string;
  name: string;
  codename: string;
  faction: string;
  campLogoSrc: string;
  classLabel: OperatorClassType;
  subClassLabel: string;
  illustrator: string;
  voiceActor: string;
  defaultSkinIndex: number;
  accentColor: string;
  basicFile: {
    gender: string;
    combatExp: string;
    birthplace: string;
    birthday: string;
    race: string;
    height: string;
    oripathyStatus: string;
  };
  physicalExam: {
    strength: string;
    mobility: string;
    endurance: string;
    tactical: string;
    combatSkill: string;
    originiumArts: string;
  };
  operatorRecordTitle: string;
  operatorRecordSynopsis: string;
  operatorRecordFullStory: string[];
  /** Все остальные разделы досье (Profile, Clinical Analysis, Archive File 1–4, …). */
  dossierSections?: Array<{ title: string; text: string }>;
  /** Имя оперативника на языке досье (RU/中文 — из переводов, иначе EN). */
  localizedName?: Partial<Record<DossierLang, string>>;
  voiceLines: OperatorVoiceLine[];
  skins: OperatorSkin[];
  /** Имена CV по языкам дубляжа (`JP`, `CN_MANDARIN`, `EN`, `KR`). */
  voiceActors?: Record<string, string>;
  /** Языки, на которых у оперативника реально записана озвучка (`voiceLangDict`). */
  voiceLangs?: string[];
  /** Языки, в которых реально есть текст досье: `false` — язык недоступен. */
  dossierLangs?: Partial<Record<DossierLang, boolean>>;
  /** Язык, с которого реально показан текст досье (может отличаться от выбранного). */
  dossierContentLang?: DossierLang;
  /** Досье, реплики и скины уже подгружены с сервера. */
  detailLoaded?: boolean;
}

export const CLASS_ICON_MAP: Record<OperatorClassType, string> = {
  SPECIALIST: '/assets/operators/classes/icon_profession_special_large.png',
  CASTER: '/assets/operators/classes/icon_profession_caster_large.png',
  MEDIC: '/assets/operators/classes/icon_profession_medic_large.png',
  SNIPER: '/assets/operators/classes/icon_profession_sniper_large.png',
  VANGUARD: '/assets/operators/classes/icon_profession_pioneer_large.png',
  GUARD: '/assets/operators/classes/icon_profession_warrior_large.png',
  DEFENDER: '/assets/operators/classes/icon_profession_tank_large.png',
  SUPPORTER: '/assets/operators/classes/icon_profession_support_large.png',
};


/** Подписи классов оперативников на языке досье (официальные термины игры). */
const CLASS_LABELS_BY_LANG: Record<
  DossierLang,
  Record<OperatorClassType, string>
> = {
  ru: {
    SPECIALIST: 'Специалист',
    CASTER: 'Заклинатель',
    MEDIC: 'Медик',
    SNIPER: 'Снайпер',
    VANGUARD: 'Авангард',
    GUARD: 'Гвардеец',
    DEFENDER: 'Защитник',
    SUPPORTER: 'Поддержка',
  },
  en: {
    SPECIALIST: 'Specialist',
    CASTER: 'Caster',
    MEDIC: 'Medic',
    SNIPER: 'Sniper',
    VANGUARD: 'Vanguard',
    GUARD: 'Guard',
    DEFENDER: 'Defender',
    SUPPORTER: 'Supporter',
  },
  zh: {
    SPECIALIST: '特种',
    CASTER: '术师',
    MEDIC: '医疗',
    SNIPER: '狙击',
    VANGUARD: '先锋',
    GUARD: '近卫',
    DEFENDER: '重装',
    SUPPORTER: '辅助',
  },
  ja: {
    SPECIALIST: '特殊',
    CASTER: '術師',
    MEDIC: '医療',
    SNIPER: '狙撃',
    VANGUARD: '先鋒',
    GUARD: '前衛',
    DEFENDER: '重装',
    SUPPORTER: '補助',
  },
  ko: {
    SPECIALIST: '스페셜리스트',
    CASTER: '캐스터',
    MEDIC: '메딕',
    SNIPER: '스나이퍼',
    VANGUARD: '뱅가드',
    GUARD: '가드',
    DEFENDER: '디펜더',
    SUPPORTER: '서포터',
  },
};

type ArchiveTab = 'hub' | 'file' | 'voice' | 'records' | 'skins';

/** Сколько поляроидов показываем за раз: меньше сетевых запросов при открытии. */
const GRID_PAGE_SIZE = 48;

/** Реальные игровые изображения модулей досье (media.prts.wiki / torappu.prts.wiki). */
/** Подписи интерфейса архива. Тексты досье приходят из игры/перевода. */
const ARCHIVE_TEXT = {
  ru: {
    directory: 'АРХИВ ОПЕРАТИВНИКОВ',
    search: 'ПОИСК ОПЕРАТИВНИКА / КОДА…',
    newBadge: 'НОВЫЕ',
    birthdayBadge: 'ДЕНЬ РОЖДЕНИЯ',
    backHome: 'На главную',
    moduleFile: 'ЛИЧНОЕ ДЕЛО',
    moduleVoice: 'ГОЛОСОВЫЕ ЗАПИСИ',
    moduleRecords: 'ЗАПИСИ ОПЕРАТИВНИКА',
    moduleSkins: 'ГАРДЕРОБ',
    basicFile: 'ОСНОВНЫЕ ДАННЫЕ',
    physicalExam: 'ФИЗИЧЕСКИЙ ОСМОТР',
    codename: 'ПОЗЫВНОЙ',
    gender: 'ПОЛ',
    combatExp: 'БОЕВОЙ ОПЫТ',
    birthplace: 'МЕСТО РОЖДЕНИЯ',
    birthday: 'ДАТА РОЖДЕНИЯ',
    race: 'РАСА',
    height: 'РОСТ',
    oripathy: 'СТАТУС ОРИПАТИИ',
    strength: 'ФИЗИЧЕСКАЯ СИЛА',
    mobility: 'ПОДВИЖНОСТЬ',
    endurance: 'ВЫНОСЛИВОСТЬ',
    tactical: 'ТАКТИЧЕСКОЕ МЫШЛЕНИЕ',
    combatSkill: 'БОЕВЫЕ НАВЫКИ',
    arts: 'СОВМЕСТИМОСТЬ С ИСКУССТВОМ',
    cv: 'ОЗВУЧКА',
    play: 'СЛУШАТЬ',
    pause: 'ПАУЗА',
    rec: 'ЗАПИСЬ',
    loading: 'ЗАГРУЗКА',
    equip: 'НАДЕТЬ',
    equipped: 'НАДЕТО',
    equipPreview: 'ПРИМЕРИТЬ',
    previewEquipped: 'ПРИМЕРЕНО',
    previewOnly: 'ЭТОТ ОБРАЗ ДОСТУПЕН ТОЛЬКО ДЛЯ ПРОСМОТРА',
    defaultOutfit: 'БАЗОВЫЙ',
    outfitWord: 'ОБРАЗ',
    outfitOfDay: 'ОБРАЗ ДНЯ',
    operatorOutfit: 'ОБРАЗ',
    backToArchive: 'Назад в архив',
    backToHub: 'К модулям досье',
    prevOutfit: 'Предыдущий образ',
    nextOutfit: 'Следующий образ',
    allClasses: 'ВСЕ',
    classes: {
      VANGUARD: 'АВАНГАРД',
      GUARD: 'ГВАРДЕЕЦ',
      DEFENDER: 'ЗАЩИТНИК',
      SNIPER: 'СНАЙПЕР',
      CASTER: 'КАСТЕР',
      MEDIC: 'МЕДИК',
      SUPPORTER: 'САППОРТ',
      SPECIALIST: 'СПЕЦИАЛИСТ',
    } as Record<string, string>,
    storyUnavailable: 'Запись истории недоступна',
    storyOpen: 'Запустить историю оперативника',
  },
  en: {
    directory: 'OPERATOR DIRECTORY',
    search: 'SEARCH OPERATOR / CODE…',
    newBadge: 'NEW',
    birthdayBadge: 'BIRTHDAY TODAY',
    backHome: 'Home',
    moduleFile: 'PERSONNEL FILE',
    moduleVoice: 'VOICE RECORDS',
    moduleRecords: 'OPERATOR RECORDS',
    moduleSkins: 'OUTFIT WARDROBE',
    basicFile: 'BASIC FILE',
    physicalExam: 'PHYSICAL EXAM',
    codename: 'CODENAME',
    gender: 'GENDER',
    combatExp: 'COMBAT EXPERIENCE',
    birthplace: 'PLACE OF BIRTH',
    birthday: 'DATE OF BIRTH',
    race: 'RACE',
    height: 'HEIGHT',
    oripathy: 'ORIPATHY INFECTION STATUS',
    strength: 'PHYSICAL STRENGTH',
    mobility: 'MOBILITY',
    endurance: 'PHYSIOLOGICAL ENDURANCE',
    tactical: 'TACTICAL ACUMEN',
    combatSkill: 'COMBAT SKILL',
    arts: 'ORIGINIUM ARTS ASSIMILATION',
    cv: 'CV',
    play: 'PLAY',
    pause: 'PAUSE',
    rec: 'REC',
    loading: 'Loading',
    equip: 'EQUIP',
    equipped: 'EQUIPPED',
    equipPreview: 'EQUIP PREVIEW',
    previewEquipped: 'PREVIEW EQUIPPED',
    previewOnly: 'THIS OUTFIT IS FOR PREVIEW ONLY',
    defaultOutfit: 'DEFAULT',
    outfitWord: 'OUTFIT',
    outfitOfDay: '#OUTFIT OF THE DAY',
    operatorOutfit: 'OUTFIT',
    backToArchive: 'Back to Operator Archive',
    backToHub: 'Return to Dossier Hub',
    prevOutfit: 'Previous Outfit',
    nextOutfit: 'Next Outfit',
    allClasses: 'ALL',
    classes: {
      VANGUARD: 'VANGUARD',
      GUARD: 'GUARD',
      DEFENDER: 'DEFENDER',
      SNIPER: 'SNIPER',
      CASTER: 'CASTER',
      MEDIC: 'MEDIC',
      SUPPORTER: 'SUPPORTER',
      SPECIALIST: 'SPECIALIST',
    } as Record<string, string>,
    storyUnavailable: 'Story record unavailable',
    storyOpen: 'Play operator story',
  },
} as const;

const DOSSIER_MODULE_ART: Record<Exclude<ArchiveTab, 'hub'>, string> = {
  file: '/assets/dossier/file.png',
  voice: '/assets/dossier/voice.png',
  records: '/assets/dossier/records.png',
  skins: '/assets/dossier/outfits.png',
};

/**
 * Маленькие одноцветные иконки модулей в тёмных полосах — белые глифы
 * (`currentColor`), как в игровом UI. Большие игровые PNG остаются только
 * в центре карточек/шапки модуля.
 */
const DossierModuleIcon: React.FC<{
  tab: Exclude<ArchiveTab, 'hub'>;
}> = ({ tab }) => {
  if (tab === 'file') {
    // Папка с документом: игровой стикер досье — это папка с бумагами,
    // поэтому вместо карточки-контакта рисуем папку.
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6 text-white"
        aria-hidden="true"
      >
        {/* Документ: лист с загнутым углом и строками — досье оперативника. */}
        <path d="M6.6 2.8h6.9L19 8.2v11.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 19.6V4.4a1.6 1.6 0 0 1 1.6-1.6z" />
        <path d="M13.2 2.9v5.4h5.5" />
        <path d="M8.4 12.1h7.2M8.4 15.2h7.2M8.4 18.3h4.4" />
      </svg>
    );
  }
  if (tab === 'voice') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-6 h-6 text-white"
        aria-hidden="true"
      >
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5.3-3a1 1 0 0 0-2 0 3.3 3.3 0 0 1-6.6 0 1 1 0 0 0-2 0 5.3 5.3 0 0 0 4.3 5.1V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.9a5.3 5.3 0 0 0 4.3-5.1z" />
      </svg>
    );
  }
  if (tab === 'records') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-6 h-6 text-white"
        aria-hidden="true"
      >
        <path d="M6 2h12c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm3 4v4h6V6H9zm3 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
      </svg>
    );
  }
  // OUTFITS: одноцветный глиф «вешалка» (игровой UI-иконки в открытом доступе нет).
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6 text-white"
      aria-hidden="true"
    >
      <path d="M12 8.6V7.2a2.5 2.5 0 1 1 2.6-2.5" />
      <path d="M12 8.6 3.2 14.6a1.7 1.7 0 0 0 1 3.1h15.6a1.7 1.7 0 0 0 1-3.1L12 8.6z" />
    </svg>
  );
};

/** Белый одноцветный глиф торта для фильтра дней рождения и карточек. */
const CakeGlyph: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
    <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
    <path d="M2 21h20" />
    <path d="M7 8v3M12 8v3M17 8v3" />
    <path d="M7 4h.01M12 4h.01M17 4h.01" />
  </svg>
);

const DossierObjectGraphic: React.FC<{
  tab: Exclude<ArchiveTab, 'hub'>;
  scale?: number;
}> = ({ tab, scale = 1 }) => (
  <img
    src={DOSSIER_MODULE_ART[tab]}
    alt=""
    aria-hidden="true"
    draggable={false}
    loading="lazy"
    decoding="async"
    style={{ transform: `scale(${scale})` }}
    className="max-w-[clamp(70px,20vh,126px)] max-h-[clamp(40px,12vh,80px)] w-auto h-auto object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.42)] select-none pointer-events-none"
  />
);

const OutfitInfoCard: React.FC<{
  skin: OperatorSkin;
  codename: string;
  isSpecial: boolean;
  t: any;
  className?: string;
}> = ({ skin, codename, isSpecial, t, className = '' }) => (
  <div
    className={`relative pr-4 p-2.5 sm:p-3 shadow-[0_12px_26px_rgba(0,0,0,0.38)] pointer-events-auto ${
      isSpecial ? 'bg-[#202225] text-white' : 'bg-white text-[#1a1c1e]'
    } ${className}`}
  >
    {isSpecial ? (
      skin.brandLogo ? (
        <img
          src={skin.brandLogo}
          alt={skin.brandName}
          draggable={false}
          className="mb-2 h-8 sm:h-9 w-auto max-w-full object-contain object-left"
        />
      ) : (
        <div className="border-[2px] border-white/90 rounded-full px-2 py-0.5 text-center mb-2">
          <span className="font-serif text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-white block truncate">
            {skin.brandName}
          </span>
        </div>
      )
    ) : (
      <div className="mb-1.5">
        <div className="text-[20px] sm:text-[22px] font-light tracking-[0.12em] uppercase leading-none text-[#202225]">
          {t.defaultOutfit}
        </div>
        <div className="bg-[#18191b] text-white text-[8px] font-bold tracking-[0.38em] uppercase text-center py-0.5 mt-0.5">
          {t.outfitWord}
        </div>
      </div>
    )}

    <div
      className={`px-2 py-1 text-[10px] sm:text-[11px] font-bold leading-tight space-y-0.5 ${
        isSpecial ? 'bg-[#a82846] text-white' : 'bg-[#121315] text-white'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span>♟</span>
        <span>{codename}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>✒</span>
        <span className="select-text">{skin.illustrator}</span>
      </div>
    </div>

    <p
      className={`mt-1.5 text-[9px] sm:text-[9.5px] leading-[1.38] whitespace-pre-line select-text ${
        isSpecial ? 'text-white/85' : 'text-[#333639]'
      }`}
    >
      {skin.description}
    </p>

    {/* Right Edge Dark Barcode + CMYK Vertical Strip */}
    <div className="absolute top-0 bottom-0 right-0 w-3 flex">
      <div className="flex-1 bg-[#222426] opacity-90" />
      <div className="w-[3px] flex flex-col h-full">
        <span className="flex-1 bg-[#00ffff]" />
        <span className="flex-1 bg-[#ff00ff]" />
        <span className="flex-1 bg-[#eab308]" />
        <span className="flex-1 bg-[#111111]" />
      </div>
    </div>
  </div>
);

export interface OperatorArchiveViewProps {
  operators: OperatorRecord[];
  initialOperatorId?: string | null;
  onBackToHome?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onRequestOperator?: (operatorId: string, lang?: DossierLang) => void;
  /** Язык текстов досье (официальные языки игры + RU-перевод). */
  dossierLanguage?: DossierLang;
  onDossierLanguageChange?: (lang: DossierLang) => void;
  /** Идёт загрузка таблиц игры для выбранного языка. */
  detailLoading?: boolean;
  /** Язык интерфейса архива: русский при `ru`, иначе английский. */
  locale?: StageLocale;
}

export const OperatorArchiveView: React.FC<OperatorArchiveViewProps> = ({
  operators,
  initialOperatorId = null,
  onBackToHome,
  onFullscreenChange,
  onRequestOperator,
  dossierLanguage = 'en',
  onDossierLanguageChange,
  detailLoading = false,
  locale = 'ru',
}) => {
  const isRu = locale === 'ru';
  const t = ARCHIVE_TEXT[isRu ? 'ru' : 'en'];
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(
    initialOperatorId
  );
  const [activeTab, setActiveTab] = useState<ArchiveTab>('hub');
  const [activeVoiceId, setActiveVoiceId] = useState<string>('v-assistant');
  const [selectedSkinIndex, setSelectedSkinIndex] = useState<number>(0);
  const [equippedSkinByOp, setEquippedSkinByOp] = useState<
    Record<string, number>
  >({});
  /** Интерактивный просмотр арта в OUTFITS: включается кнопкой-лупой. */
  const [artInspect, setArtInspect] = useState<boolean>(false);
  const [artView, setArtView] = useState({ scale: 1, x: 0, y: 0, rotation: 0 });
  const artStageRef = useRef<HTMLDivElement | null>(null);
  /** Лента образов: у оперативников с десятком скинов она скроллится. */
  const skinStripRef = useRef<HTMLDivElement | null>(null);
  const artDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    mode: 'pan' | 'rotate';
    origin: { scale: number; x: number; y: number; rotation: number };
  } | null>(null);
  /** Активные касания: два пальца включают щипковый зум. */
  const artPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const artPinchRef = useRef<{
    distance: number;
    centerX: number;
    centerY: number;
    origin: { scale: number; x: number; y: number; rotation: number };
  } | null>(null);
  /** Оперативные истории (密录) текущего оперативника; `null` — ещё не загружены. */
  const [memoryStories, setMemoryStories] = useState<OperatorMemoryStory[] | null>(
    null
  );
  const [memoryStoriesLoading, setMemoryStoriesLoading] = useState(false);
  const navigate = useNavigate();
  const [classFilter, setClassFilter] = useState<OperatorClassType | 'ALL'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(GRID_PAGE_SIZE);
  /** Только те оперативники, у кого сегодня день рождения. */
  const [birthdayOnly, setBirthdayOnly] = useState<boolean>(false);
  /** Только оперативники последних релизов. */
  const [newOnly, setNewOnly] = useState<boolean>(false);
  const [voiceLang, setVoiceLang] = useState<string>('JP');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectedOperator =
    operators.find((o) => o.id === selectedOperatorId) ?? null;

  // Локальная дата: после полуночи фильтр сам начнёт показывать новых
  // именинников (пересчёт зависит только от строки `MM-DD`).
  const todayKey = getMonthDay();
  const todayBirthdayIds = useMemo(
    () => getBirthdayOperatorIds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey]
  );

  // Deep link (`/operators/:operatorId`): открываем оперативника и догружаем досье.
  // Работает и при переходах внутри страницы (открытие/закрытие досье).
  useEffect(() => {
    setSelectedOperatorId(initialOperatorId ?? null);
    if (!initialOperatorId) {
      setActiveTab('hub');
    } else {
      onRequestOperator?.(initialOperatorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOperatorId]);

  // Реплики приходят вместе с досье: пока их нет, `activeVoiceId` указывает
  // на заглушку, поэтому после подгрузки переводим выделение на первую строку.
  useEffect(() => {
    if (!selectedOperator?.voiceLines.length) return;
    const exists = selectedOperator.voiceLines.some((line) => line.id === activeVoiceId);
    if (!exists) setActiveVoiceId(selectedOperator.voiceLines[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOperator?.id, selectedOperator?.voiceLines]);

  // Фильтр/поиск меняют выборку — пачка оперативников начинается заново.
  useEffect(() => {
    setVisibleCount(GRID_PAGE_SIZE);
  }, [classFilter, searchQuery, birthdayOnly, newOnly]);

  // Языки озвучки конкретного оперативника: показываем только реально
  // записанные дубли (`voiceLangDict`), иначе — базовые четыре.
  const availableVoiceDubs = useMemo(() => {
    const langs = selectedOperator?.voiceLangs ?? [];
    if (!langs.length) return VOICE_DUBS.slice(0, 4);
    return VOICE_DUBS.filter((dub) => langs.includes(dub.id));
  }, [selectedOperator?.id, selectedOperator?.voiceLangs]);

  useEffect(() => {
    if (!availableVoiceDubs.length) return;
    if (availableVoiceDubs.some((dub) => dub.id === voiceLang)) return;
    setVoiceLang(availableVoiceDubs[0].id);
  }, [availableVoiceDubs, voiceLang]);

  // При смене оперативника истории ещё не знаем — сбрасываем список.
  useEffect(() => {
    setMemoryStories(null);
  }, [selectedOperator?.id]);

  // Записи (密录) подтягиваем при открытии вкладки OPERATOR RECORDS:
  // таблица `story_review_table` кэшируется в браузере.
  useEffect(() => {
    if (!selectedOperator || activeTab !== 'records' || memoryStories !== null) {
      return;
    }
    let alive = true;
    setMemoryStoriesLoading(true);
    loadOperatorMemoryStories(selectedOperator.id)
      .then((stories) => {
        if (alive) setMemoryStories(stories);
      })
      .catch(() => {
        if (alive) setMemoryStories([]);
      })
      .finally(() => {
        if (alive) setMemoryStoriesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedOperator?.id, activeTab, memoryStories]);

  const currentDubLabel =
    availableVoiceDubs.find((dub) => dub.id === voiceLang)?.label ?? voiceLang;

  // Если выбранного языка у досье нет — переключаемся на тот, в котором текст
  // реально есть (RU → EN и т.п.), а недоступные языки блокируем в шапке.
  useEffect(() => {
    if (!selectedOperator?.detailLoaded) return;
    const langs = selectedOperator.dossierLangs;
    if (!langs || langs[dossierLanguage] !== false) return;
    const priority: DossierLang[] = ['ru', 'en', 'zh', 'ja', 'ko'];
    const content = selectedOperator.dossierContentLang;
    const fallback =
      (content && langs[content] !== false ? content : undefined) ??
      priority.find((lang) => langs[lang] !== false);
    if (!fallback || fallback === dossierLanguage) return;
    onDossierLanguageChange?.(fallback);
    onRequestOperator?.(selectedOperator.id, fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedOperator?.id,
    selectedOperator?.detailLoaded,
    selectedOperator?.dossierLangs,
    selectedOperator?.dossierContentLang,
    dossierLanguage,
  ]);

  const activeCvName =
    selectedOperator?.voiceActors?.[voiceLang] ||
    selectedOperator?.voiceActor ||
    '';

  const stopVoice = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingVoiceId(null);
  };

  const playVoiceLine = (line: OperatorVoiceLine) => {
    if (!selectedOperator) return;
    setActiveVoiceId(line.id);
    const audio = audioRef.current;
    const url = getVoiceAudioUrl(selectedOperator.id, line.voiceId, voiceLang);
    if (!audio || !url) return;
    if (playingVoiceId === line.id) {
      stopVoice();
      return;
    }
    audio.src = url;
    audio
      .play()
      .then(() => setPlayingVoiceId(line.id))
      .catch(() => setPlayingVoiceId(null));
  };

  /** Клик по REC-карточке запускает сцену истории оперативника. */
  const openMemoryStory = async () => {
    if (!selectedOperator) return;
    let stories = memoryStories;
    if (stories === null) {
      setMemoryStoriesLoading(true);
      try {
        stories = await loadOperatorMemoryStories(selectedOperator.id);
      } catch {
        stories = [];
      }
      setMemoryStories(stories);
      setMemoryStoriesLoading(false);
    }
    const first = stories?.[0];
    if (first) {
      // Возврат из читалки — в это же досье, а не в терминал историй.
      navigate(`/story/${first.storyTxt}`, {
        state: { backTo: `/operators/${encodeURIComponent(selectedOperator.id)}` },
      });
    }
  };

  const getEquippedSkinIndex = (op: OperatorRecord) =>
    equippedSkinByOp[op.id] ?? op.defaultSkinIndex;

  const handleOpenOperator = (op: OperatorRecord) => {
    const eqIdx = getEquippedSkinIndex(op);
    setSelectedOperatorId(op.id);
    // Свой адрес у каждого досье: /operators/<id>.
    navigate(`/operators/${encodeURIComponent(op.id)}`);
    setActiveTab('hub');
    setActiveVoiceId(op.voiceLines[0]?.id ?? 'v-assistant');
    onRequestOperator?.(op.id);
    setSelectedSkinIndex(eqIdx);
    setArtInspect(false);
    setArtView({ scale: 1, x: 0, y: 0, rotation: 0 });
    setMemoryStories(null);
    onFullscreenChange?.(true);
  };

  // ---------------------------------------------------------------------------
  // Интерактивный просмотр арта в OUTFITS: колесо — масштаб, ЛКМ — сдвиг,
  // ПКМ/Shift — поворот, двойной клик — сброс. Работает только в режиме 🔍.
  // ---------------------------------------------------------------------------
  const resetArtView = () => {
    artPointersRef.current.clear();
    artPinchRef.current = null;
    artDragRef.current = null;
    setArtView({ scale: 1, x: 0, y: 0, rotation: 0 });
  };

  useEffect(() => {
    const stage = artStageRef.current;
    if (!stage || !artInspect) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const pointerX = event.clientX - rect.left - rect.width / 2;
      const pointerY = event.clientY - rect.top - rect.height / 2;
      setArtView((prev) => {
        const nextScale = Math.min(
          8,
          Math.max(0.4, prev.scale * Math.exp(-event.deltaY * 0.0015))
        );
        const ratio = nextScale / prev.scale;
        return {
          ...prev,
          scale: nextScale,
          x: pointerX - (pointerX - prev.x) * ratio,
          y: pointerY - (pointerY - prev.y) * ratio,
        };
      });
    };

    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [artInspect]);

  // У оперативников с десятком образов лента шире панели: держим выбранный
  // образ в центре видимой части, иначе после стрелок он уезжает за край.
  // Важно: прокручиваем только горизонтальную ленту, а не всю страницу —
  // иначе на телефоне экран «прыгает» вниз и прячет кнопку «назад».
  useEffect(() => {
    if (activeTab !== 'skins') return;
    const strip = skinStripRef.current;
    const scroller = strip?.parentElement;
    if (!strip || !scroller) return;
    const target = strip.querySelector<HTMLElement>(
      `[data-skin-index="${selectedSkinIndex}"]`
    );
    if (!target) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta =
      targetRect.left -
      scrollerRect.left -
      (scroller.clientWidth - targetRect.width) / 2;
    scroller.scrollBy({ left: delta, behavior: 'smooth' });
  }, [selectedSkinIndex, activeTab]);

  // Смена оперативника или скина возвращает арт в исходное положение.
  useEffect(() => {
    resetArtView();
  }, [selectedOperatorId, selectedSkinIndex]);

  const handleArtPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!artInspect || event.button > 2) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Синтетические события/старые браузеры могут не поддерживать capture.
    }

    artPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    // Второй палец — начало щипкового зума. Одиночное перетаскивание
    // отключаем, иначе картинка «дёргается» под пальцами.
    if (artPointersRef.current.size >= 2) {
      const [a, b] = Array.from(artPointersRef.current.values()).slice(0, 2);
      const rect = event.currentTarget.getBoundingClientRect();
      artPinchRef.current = {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        centerX: (a.x + b.x) / 2 - rect.left - rect.width / 2,
        centerY: (a.y + b.y) / 2 - rect.top - rect.height / 2,
        origin: { ...artView },
      };
      artDragRef.current = null;
      return;
    }

    artDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      mode: event.button === 2 || event.shiftKey ? 'rotate' : 'pan',
      origin: { ...artView },
    };
  };

  const handleArtPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!artPointersRef.current.has(event.pointerId)) return;
    artPointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const pinch = artPinchRef.current;
    if (pinch && artPointersRef.current.size >= 2) {
      const [a, b] = Array.from(artPointersRef.current.values()).slice(0, 2);
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = (a.x + b.x) / 2 - rect.left - rect.width / 2;
      const centerY = (a.y + b.y) / 2 - rect.top - rect.height / 2;
      const scale = Math.min(
        8,
        Math.max(0.4, pinch.origin.scale * (distance / pinch.distance))
      );
      const ratio = scale / pinch.origin.scale;
      setArtView({
        ...pinch.origin,
        scale,
        x: centerX - (pinch.centerX - pinch.origin.x) * ratio,
        y: centerY - (pinch.centerY - pinch.origin.y) * ratio,
      });
      return;
    }

    const drag = artDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === 'rotate') {
      setArtView({
        ...drag.origin,
        rotation: drag.origin.rotation + dx * 0.4,
      });
    } else {
      setArtView({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy });
    }
  };

  const handleArtPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    artPointersRef.current.delete(event.pointerId);
    if (artPointersRef.current.size < 2) {
      artPinchRef.current = null;
    }
    if (artDragRef.current?.pointerId === event.pointerId) {
      artDragRef.current = null;
    }
  };

  /** Кнопки ± для телефона: колесо мыши на тач-экране недоступно. */
  const hasTouchInput =
    typeof navigator !== 'undefined' &&
    ((navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window);

  /** Кнопки ± для телефона: на тач-экране нет колеса мыши. */
  const zoomArtBy = (factor: number) => {
    setArtView((prev) => ({
      ...prev,
      scale: Math.min(8, Math.max(0.4, prev.scale * factor)),
    }));
  };

  const toggleArtInspect = () => {
    setArtInspect((prev) => {
      if (prev) resetArtView();
      return !prev;
    });
  };

  const handleCloseOperator = () => {
    setSelectedOperatorId(null);
    setActiveTab('hub');
    onFullscreenChange?.(false);
  };

  // ==========================================================================
  // VIEW 3: FULL-SCREEN OUTFIT / SKIN WARDROBE VIEW (Screenshots 5 & 6)
  // Always horizontal split-screen (`flex-row`) so it never collapses on <1024px
  // ==========================================================================
  if (selectedOperator && activeTab === 'skins') {
    const skins = selectedOperator.skins;
    const currentSkin = skins[selectedSkinIndex] ?? skins[0];
    const equippedIdx = getEquippedSkinIndex(selectedOperator);
    const isEquipped = equippedIdx === selectedSkinIndex;
    const isSpecialSkin = currentSkin.tabType === 'skin';

    const handleCycleSkin = (dir: -1 | 1) => {
      setSelectedSkinIndex((prev) => (prev + dir + skins.length) % skins.length);
    };

    return (
      <section
        aria-label={`${selectedOperator.name} Outfit Wardrobe`}
        className="fixed inset-0 z-50 w-screen h-screen bg-[#cfd1d4] text-[#1c1e21] overflow-y-auto lg:overflow-hidden select-none flex flex-col lg:flex-row"
      >
        {/* ===================================================================
            LEFT STUDIO STAGE (62% width) — Matches Screenshots 5 & 6 1:1
            =================================================================== */}
        <div
          className="relative w-full h-[54vh] min-h-[320px] overflow-hidden shrink-0 border-b border-black/15 lg:w-[62%] lg:h-full lg:min-h-0 lg:border-b-0 lg:border-r"
          style={{
            background: isSpecialSkin
              ? 'linear-gradient(135deg, #8e8a5e 0%, #c5c6c8 40%, #dedfe1 100%)'
              : 'linear-gradient(135deg, #b7b9bc 0%, #d8d9dc 48%, #ececee 100%)',
          }}
        >
          {/* Subtle architectural studio diagonal grid lines */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(-30deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 42px)',
            }}
          />

          {/* Top-Left Back Button (`<`) returning to Operator Archive Dossier */}
          <div className="absolute top-3 left-3 z-40">
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              aria-label={t.backToArchive}
              className="w-[96px] sm:w-[110px] h-[38px] sm:h-[42px] bg-[#2b2d30]/92 hover:bg-[#18191b] text-white flex items-center pl-4 shadow-[0_6px_16px_rgba(0,0,0,0.35)] border border-white/10 transition-colors cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="w-6 h-6"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          {/* Top-Right Crosshair Target Symbol (`⊕`) */}
          <div
            aria-hidden="true"
            className="absolute top-3 right-3 z-20 text-black/55 pointer-events-none"
          >
            <svg
              viewBox="0 0 32 32"
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <circle cx="16" cy="16" r="8" />
              <line x1="16" y1="2" x2="16" y2="30" />
              <line x1="2" y1="16" x2="30" y2="16" />
            </svg>
          </div>

          {/* Large White Brand Watermark on the Upper-Left when viewing Special Skin (Screenshot 6) */}
          {isSpecialSkin && (
            <div className="absolute left-4 sm:left-6 top-16 sm:top-20 z-10 pointer-events-none flex flex-col items-start gap-1">
              {currentSkin.brandLogo ? (
                // Логотип в атласе белый: на светлой сцене инвертируем в чёрный.
                <img
                  src={currentSkin.brandLogo}
                  alt={currentSkin.brandName}
                  draggable={false}
                  className="h-9 sm:h-11 w-auto max-w-[150px] object-contain brightness-0 opacity-55"
                />
              ) : (
                <span className="font-serif text-[11px] sm:text-xs font-bold tracking-[0.14em] text-white uppercase drop-shadow">
                  {currentSkin.brandName}
                </span>
              )}
            </div>
          )}

          {/* FULL-BODY TRANSPARENT CHARACTER ARTWORK (`fullArtSrc`, 2048x2048).
              В режиме 🔍 картинку можно двигать, масштабировать и вращать мышью. */}
          <div
            ref={artStageRef}
            onPointerDown={handleArtPointerDown}
            onPointerMove={handleArtPointerMove}
            onPointerUp={handleArtPointerUp}
            onPointerCancel={handleArtPointerUp}
            onPointerLeave={handleArtPointerUp}
            onDoubleClick={() => artInspect && resetArtView()}
            onContextMenu={(event) => {
              if (artInspect) event.preventDefault();
            }}
            className={`absolute inset-y-0 left-0 right-0 lg:right-[150px] z-10 flex items-center justify-center overflow-visible ${
              artInspect
                ? 'pointer-events-auto cursor-grab active:cursor-grabbing touch-none'
                : 'pointer-events-none'
            }`}
          >
            {/* Без `translate3d`/`will-change`: они заставляют Chrome держать
                готовую текстуру слоя в 1×, и при приближении арт (2048×2048)
                выглядел мыльным — браузер растягивал уже отрисованный растр
                вместо того, чтобы пересэмплировать исходник. */}
            <div
              className="w-full h-full"
              style={{
                transform: `translate(${artView.x}px, ${artView.y}px) rotate(${artView.rotation}deg) scale(${artView.scale})`,
                transformOrigin: 'center center',
                transition: artDragRef.current ? 'none' : 'transform 120ms ease-out',
              }}
            >
              {/* В режиме просмотра тень убираем: `filter` тоже заставляет
                  браузер держать растр слоя в 1× и мылит увеличенный арт. */}
              <SkinArtwork
                src={currentSkin.fullArtSrc}
                dynIllust={currentSkin.dynIllust}
                alt={currentSkin.skinTitle}
                shadow={!artInspect}
                renderScale={artInspect ? Math.min(artView.scale, 3) : 1}
              />
            </div>
          </div>

          {/* Bottom-Left Chibi SD Preview Frame with Colored L-Brackets (Screenshots 5 & 6) */}
          <div className="absolute left-4 sm:left-6 bottom-14 sm:bottom-16 z-30 w-[92px] h-[92px] sm:w-[112px] sm:h-[112px] flex items-center justify-center pointer-events-none">
            <div
              className="absolute inset-2 border border-black/15 shadow-xs"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(-45deg, rgba(255,255,255,0.65) 0px, rgba(255,255,255,0.65) 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 6px)',
              }}
            />
            <div
              className="absolute top-0 left-0 w-8 h-8 sm:w-10 sm:h-10 border-t-[9px] border-l-[9px]"
              style={{ borderColor: currentSkin.accentColor }}
            />
            <div
              className="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 border-b-[9px] border-r-[9px]"
              style={{ borderColor: currentSkin.secondaryBracketColor }}
            />
            {/* Игровой SD-чибик оперативника: Spine-модель с idle-анимацией */}
            <ChibiSpine
              operatorId={selectedOperator.id}
              skinId={currentSkin.id}
              fallbackSrc={currentSkin.fullArtSrc}
              className="w-[86%] h-[86%] drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            />
          </div>

          {/* Bottom-Left Zoom Magnifier Button: включает полноценный просмотр
              (колесо — масштаб, ЛКМ — перенос, ПКМ/Shift — поворот, 2× клик — сброс) */}
          <button
            type="button"
            onClick={toggleArtInspect}
            aria-pressed={artInspect}
            title={
              artInspect
                ? (isRu ? 'Выключить просмотр арта' : 'Exit art inspection')
                : (isRu
                    ? 'Просмотр арта: колесо — масштаб, ЛКМ — перенос, ПКМ — поворот'
                    : 'Art inspection: wheel to zoom, drag to pan, right-click to rotate')
            }
            className={`absolute bottom-3 left-3 z-40 w-8 h-8 sm:w-9 sm:h-9 border border-black/25 shadow-md flex items-center justify-center cursor-pointer transition-colors ${
              artInspect
                ? 'bg-[#f5b400] hover:bg-[#ffc31a] text-[#121315]'
                : 'bg-white/95 hover:bg-white text-[#1e2022]'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          {/* Кнопки масштаба для тач-экрана: колеса мыши на телефоне нет. */}
          {artInspect && hasTouchInput && (
            <div className="absolute right-3 bottom-3 z-40 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => zoomArtBy(1.25)}
                aria-label={isRu ? 'Приблизить' : 'Zoom in'}
                title={isRu ? 'Приблизить' : 'Zoom in'}
                className="w-9 h-9 bg-white/95 hover:bg-white text-[#1e2022] border border-black/25 shadow-md flex items-center justify-center text-xl font-bold cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => zoomArtBy(0.8)}
                aria-label={isRu ? 'Отдалить' : 'Zoom out'}
                title={isRu ? 'Отдалить' : 'Zoom out'}
                className="w-9 h-9 bg-white/95 hover:bg-white text-[#1e2022] border border-black/25 shadow-md flex items-center justify-center text-xl font-bold cursor-pointer"
              >
                −
              </button>
            </div>
          )}

          {artInspect && (
            <div className="absolute bottom-3 left-14 right-14 sm:right-auto sm:left-15 z-40 px-2 py-1 bg-[#202225]/90 text-white/90 text-[9px] font-bold tracking-[0.12em] uppercase pointer-events-none leading-snug">
              {isRu ? 'Щипок/колесо — масштаб · перетаскивание — сдвиг · 2× — сброс' : 'Pinch/wheel to zoom · drag to pan · double-click to reset'}
            </div>
          )}

          {/* Right Column of Left Stage:
              1. Top Square Avatar Frame (`avatarSrc`, 180x180)
              2. Bottom Vertical Half-Body Portrait Frame (`portraitSrc`, 180x360)
              3. Bottom Outfit Brand & Description Card with CMYK Right Strip */}
          <div className="hidden lg:flex flex-col items-end justify-between absolute right-3 sm:right-5 top-10 bottom-3 z-30 pointer-events-none">
            <div className="flex flex-col gap-2.5 items-end">
              {/* 1:1 Square Avatar Preview */}
              <div className="w-[82px] h-[82px] sm:w-[98px] sm:h-[98px] bg-white p-[3.5px] shadow-[0_8px_18px_rgba(0,0,0,0.3)] overflow-hidden">
                <ArchiveImage
                  src={currentSkin.avatarSrc}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover bg-[#2b2d30]"
                />
              </div>

              {/* 1:2 Vertical Half-Body Portrait Preview */}
              <div className="w-[82px] h-[146px] sm:w-[98px] sm:h-[174px] bg-white p-[3.5px] shadow-[0_8px_18px_rgba(0,0,0,0.3)] overflow-hidden">
                <ArchiveImage
                  src={currentSkin.portraitSrc}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover object-top bg-[#d5d7da]"
                />
              </div>
            </div>

            {/* Bottom Outfit Brand & Description Card with Barcode + CMYK Strip */}
            <OutfitInfoCard
              skin={currentSkin}
              codename={selectedOperator.codename}
              isSpecial={isSpecialSkin}
              t={t}
              className="w-[196px] sm:w-[228px]"
            />
          </div>
        </div>

        {/* ===================================================================
            RIGHT WARDROBE CAROUSEL PANEL (38% width) — Matches Screenshots 5 & 6
            =================================================================== */}
        <div
          className="relative w-full lg:w-[38%] lg:h-full flex flex-col items-center justify-between gap-3 lg:gap-0 py-3 lg:py-0 px-4 sm:px-6"
          style={{
            background:
              'linear-gradient(180deg, #b6b8bb 0%, #c8cacd 52%, #e4e5e7 100%)',
          }}
        >
          {/* Mobile: описание образа отдельной карточкой под артом */}
          <div className="w-full lg:hidden">
            <OutfitInfoCard
              skin={currentSkin}
              codename={selectedOperator.codename}
              isSpecial={isSpecialSkin}
              t={t}
              className="w-full"
            />
          </div>

          {/* Top Hanging Pentagon Ribbon Badge */}
          <div
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 74%, 50% 100%, 0 74%)',
            }}
            className={`w-[124px] sm:w-[134px] pt-2 pb-4 sm:pb-5 px-2 flex flex-col items-center text-center shadow-md shrink-0 ${
              isSpecialSkin
                ? 'bg-[#8e8b65] text-white'
                : 'bg-white text-[#1e2022]'
            }`}
          >
            <span className="text-[7px] sm:text-[7.5px] font-bold tracking-[0.08em] uppercase opacity-75">
              {isSpecialSkin ? t.outfitOfDay : `${t.defaultOutfit} ${t.outfitWord}`}
            </span>
            {isSpecialSkin && currentSkin.brandLogo ? (
              <img
                src={currentSkin.brandLogo}
                alt={currentSkin.brandName}
                draggable={false}
                className="mt-1 h-6 sm:h-7 w-auto max-w-[112px] object-contain"
              />
            ) : (
              <span className="mt-0.5 text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase">
                {currentSkin.topBadgeMain}
              </span>
            )}
          </div>

          {/* Center 3-Slice Vertical Accordion Portrait Strip Carousel (`portraitSrc`, 180x360) */}
          <div className="relative flex w-full min-w-0 items-center justify-center gap-2 sm:gap-3 my-auto">
            {skins.length > 1 && (
              <button
                type="button"
                onClick={() => handleCycleSkin(-1)}
                aria-label={t.prevOutfit}
                className="w-8 h-8 flex items-center justify-center text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <polygon points="16,4 6,12 16,20" />
                </svg>
              </button>
            )}

            <div className="min-w-0 flex-1 overflow-x-auto site-scrollbar pb-1">
            <div
              ref={skinStripRef}
              className="flex items-stretch h-[clamp(150px,26vh,240px)] lg:h-[340px] w-max mx-auto shadow-[0_14px_32px_rgba(0,0,0,0.34)]"
            >
              {skins.map((skin, idx) => {
                const isSelected = idx === selectedSkinIndex;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    data-skin-index={idx}
                    onClick={() => setSelectedSkinIndex(idx)}
                    className={`relative h-full shrink-0 overflow-hidden transition-all duration-300 cursor-pointer focus:outline-none ${
                      isSelected
                        ? 'w-[96px] sm:w-[144px] bg-[#141619] z-10'
                        : 'w-[32px] sm:w-[48px] bg-[#2a2d31] opacity-55 hover:opacity-85'
                    }`}
                  >
                    <ArchiveImage
                      src={skin.portraitSrc}
                      alt={skin.skinTitle}
                      draggable={false}
                      className="w-full h-full object-cover object-top"
                    />
                    <div
                      aria-hidden="true"
                      className={`absolute inset-0 transition-opacity ${
                        isSelected
                          ? 'bg-gradient-to-t from-black/80 via-transparent to-black/15'
                          : 'bg-black/35'
                      }`}
                    />

                    {isSelected && skin.tabType === 'skin' && (
                      <div className="absolute inset-x-1.5 bottom-3 flex flex-col items-center text-center pointer-events-none">
                        {skin.brandLogo ? (
                          <img
                            src={skin.brandLogo}
                            alt={skin.brandName}
                            draggable={false}
                            className="h-3.5 w-auto max-w-[74px] object-contain mb-1 drop-shadow"
                          />
                        ) : (
                          <div className="border-2 border-white/90 rounded-full px-2 py-0.5 text-[6.5px] font-serif font-bold tracking-widest uppercase text-white mb-1 shadow">
                            {skin.brandName.split(' ')[0]}
                          </div>
                        )}
                        <span className="text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-white leading-tight drop-shadow">
                          {skin.skinTitle}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            </div>

            {skins.length > 1 && (
              <button
                type="button"
                onClick={() => handleCycleSkin(1)}
                aria-label={t.nextOutfit}
                className="w-8 h-8 flex items-center justify-center text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <polygon points="8,4 18,12 8,20" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom Equip Button & Outfit Caption (Matches Screenshots 5 & 6) */}
          <div className="w-full flex flex-col items-center text-center pb-5 sm:pb-7 shrink-0">
            <div className="text-[#0284c7] text-xs leading-none mb-1">▲</div>

            <div className="text-xs sm:text-sm font-bold tracking-[0.06em] uppercase text-[#3b3e42] mb-2">
              {t.operatorOutfit}{' '}
              <span className="text-[#0284c7] font-extrabold">
                {selectedOperator.name}
              </span>
            </div>

            {currentSkin.previewOnly ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-xs sm:text-sm font-bold tracking-[0.08em] uppercase text-[#43464a]">
                  {t.previewOnly}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEquippedSkinByOp((prev) => ({
                      ...prev,
                      [selectedOperator.id]: selectedSkinIndex,
                    }))
                  }
                  className={`px-3 py-1 text-[9.5px] font-bold tracking-[0.12em] uppercase border transition-colors cursor-pointer ${
                    isEquipped
                      ? 'bg-[#232528] text-[#f5b400] border-[#f5b400]/50'
                      : 'bg-black/10 hover:bg-[#232528] text-[#333] hover:text-white border-black/25'
                  }`}
                >
                  {isEquipped ? `✓ ${t.previewEquipped}` : t.equipPreview}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setEquippedSkinByOp((prev) => ({
                      ...prev,
                      [selectedOperator.id]: selectedSkinIndex,
                    }))
                  }
                  className={`w-[180px] sm:w-[210px] h-[42px] flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold tracking-[0.14em] uppercase shadow-[0_6px_16px_rgba(0,0,0,0.28)] border border-white/25 transition-colors cursor-pointer ${
                    isEquipped
                      ? 'bg-[#3b3e42] text-[#f5b400]'
                      : 'bg-[#232528] hover:bg-[#141517] text-white'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M12 3.5c-1.38 0-2.5 1.12-2.5 2.5h1.75c0-.41.34-.75.75-.75s.75.34.75.75c0 .37-.27.68-.62.74L11 7v1.38L3.4 13.6c-.57.39-.9 1.04-.9 1.73C2.5 16.53 3.47 17.5 4.67 17.5h14.66c1.2 0 2.17-.97 2.17-2.17 0-.69-.33-1.34-.9-1.73L13 8.38V7.85c1.16-.41 2-1.51 2-2.85 0-1.38-1.12-2.5-2.5-2.5zm0 6.82l7.12 4.89H4.88L12 10.32z" />
                  </svg>
                  <span>{isEquipped ? t.equipped : t.equip}</span>
                </button>
                <span className="mt-1.5 text-[9.5px] sm:text-[10.5px] text-[#55585c]">
                  {locale === 'ru'
                    ? 'Образ меняется и в остальных разделах архива'
                    : 'Changing the outfit also updates the operator’s default appearance'}
                </span>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ==========================================================================
  // VIEW 2: FULL-SCREEN OPERATOR ARCHIVE DOSSIER VIEW (Screenshots 1, 2, 3, 4)
  // Always horizontal landscape (`w-screen h-screen overflow-hidden`), never stacked!
  // ==========================================================================
  if (selectedOperator) {
    const equippedIdx = getEquippedSkinIndex(selectedOperator);
    const activeSkin =
      selectedOperator.skins[equippedIdx] ?? selectedOperator.skins[0];
    const activeVoice =
      selectedOperator.voiceLines.find((v) => v.id === activeVoiceId) ??
      selectedOperator.voiceLines[0];

    // Подпись класса и имя оперативника — на языке открытого досье.
    const contentLang: DossierLang =
      selectedOperator.dossierContentLang ?? dossierLanguage;
    const displayName =
      selectedOperator.localizedName?.[contentLang] ?? selectedOperator.name;
    const displayClass =
      CLASS_LABELS_BY_LANG[contentLang][selectedOperator.classLabel];

    const sideTabs: Array<Exclude<ArchiveTab, 'hub'>> = (
      ['file', 'voice', 'records', 'skins'] as const
    ).filter((t) => t !== activeTab);

    // In Arknights Archive View, Elite 2 2048x2048 splashes have a huge aura around the character,
    // so we zoom to 165% height so the character's head is near the top and thighs reach the bottom edge (matching Screenshot 1 & 2 1:1).
    // Сплэш с CDN — квадрат 2048×2048 с прозрачными полями. Вписываем его
    // в левую сцену целиком (`object-contain`), иначе фигура либо обрезается
    // по правому краю, либо уезжает под панель досье.
    const archiveArtScale = activeSkin.tabType === 'default_2' ? 'scale-100' : 'scale-[0.97]';

    return (
      <section
        aria-label={`${selectedOperator.name} Archive`}
        className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto overflow-x-hidden select-none text-[#1e2022] sm:overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 60% 50%, #d3d5d8 0%, #b5b8bc 54%, #82868b 100%)',
        }}
      >
        {/* Subtle Halftone Square Matrix Pattern across center-right matching Screenshots 1-4 */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(rgba(105,109,114,0.48) 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* ===================================================================
            TOP-LEFT NAVIGATION BAR (`<` Back + `🏠` Home with Wireframe Mesh)
            Matches Screenshots 1-4 1:1 (only the 2 authentic buttons!)
            =================================================================== */}
        <div className="fixed top-2.5 left-3 z-50 flex items-center bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
          {/* `<` Back Button */}
          <button
            type="button"
            onClick={() => {
              if (activeTab !== 'hub') {
                setActiveTab('hub');
              } else {
                handleCloseOperator();
                // Возврат к каталогу, а не «назад» в историю браузера:
                // адрес снова /operators.
                navigate('/operators', { replace: true });
              }
            }}
            aria-label="Back"
            className="w-[60px] sm:w-[104px] h-[38px] sm:h-[42px] flex items-center pl-4 border-r border-white/15 text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="w-6 h-6"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* `🏠` Home Button (clean icon, no wireframe lines) */}
          <button
            type="button"
            onClick={() => {
              handleCloseOperator();
              onBackToHome?.();
            }}
            aria-label="Home"
            className="relative w-[56px] sm:w-[128px] h-[38px] sm:h-[42px] flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="relative z-10 w-5 h-5 drop-shadow"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>
        </div>

        {/* Переключатель языка досье: таблицы игры качаются в кэш браузера по требованию */}
        <div
          role="group"
          aria-label="Dossier language"
          className="fixed top-[54px] left-3 sm:top-2.5 sm:left-[248px] z-50 h-[38px] sm:h-[42px] flex items-stretch bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]"
        >
          {DOSSIER_LANGS.map((lang) => {
            const active = dossierLanguage === lang.id;
            // Язык, для которого досье не переведено, показываем неактивным.
            const unavailable = selectedOperator?.dossierLangs?.[lang.id] === false;
            return (
              <button
                key={lang.id}
                type="button"
                disabled={unavailable}
                title={
                  unavailable
                    ? (isRu ? `Досье: ${lang.title} — перевода нет` : `Dossier: ${lang.title} — no translation`)
                    : (isRu ? `Досье: ${lang.title}` : `Dossier: ${lang.title}`)
                }
                onClick={() => {
                  if (active || unavailable) return;
                  onDossierLanguageChange?.(lang.id);
                  if (selectedOperatorId) onRequestOperator?.(selectedOperatorId, lang.id);
                }}
                className={`min-w-[34px] sm:min-w-[38px] px-1.5 text-[10px] sm:text-[11px] font-bold tracking-[0.06em] uppercase border-r border-white/10 last:border-r-0 transition-colors ${
                  unavailable
                    ? 'text-white/25 cursor-not-allowed line-through decoration-white/30'
                    : active
                      ? 'bg-[#f5b400] text-[#1b1d20] cursor-pointer'
                      : 'text-white/65 hover:text-white hover:bg-white/10 cursor-pointer'
                }`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>

        {/* Состояние загрузки досье: таблицы игры берутся из кэша или скачиваются */}
        {(!selectedOperator.detailLoaded || detailLoading) && (
          <div className="fixed top-[100px] left-3 sm:top-2.5 sm:left-auto sm:right-3 z-40 h-[32px] px-3.5 flex items-center gap-2 bg-[#202225]/92 text-white text-[10px] font-bold tracking-[0.18em] uppercase shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
            <span className="w-3 h-3 rounded-full border-2 border-white/25 border-t-[#f5b400] animate-spin" />
            {isRu ? 'Загрузка архива' : 'Loading archive'}
          </div>
        )}

        {/* ===================================================================
            LEFT CHARACTER STAGE (Full-Height `inset-y-0 left-0 w-[62%]`)
            The square CDN splash (2048x2048) is wider than the stage, so the
            stage clips it at the right edge. Otherwise the art would sit under
            the dossier modules and make the text unreadable.
            =================================================================== */}
        <div className="relative z-10 mt-[100px] h-[42vh] min-h-[240px] w-full overflow-hidden pointer-events-none sm:absolute sm:inset-y-0 sm:left-0 sm:mt-0 sm:h-full sm:min-h-0 sm:w-[54%] xl:w-[62%]">
          {/* Official Faction Emblem Watermark in Upper-Left (`/assets/operators/camps/logo_*.png`) */}
          <div
            aria-hidden="true"
            className="absolute top-[5%] left-[2%] w-[260px] h-[260px] sm:w-[330px] sm:h-[330px] opacity-22 pointer-events-none select-none flex items-center justify-center"
          >
            <img
              src={selectedOperator.campLogoSrc}
              alt=""
              draggable={false}
              className="w-full h-full object-contain filter brightness-0"
            />
          </div>

          {/* FULL-BODY 2048x2048 TRANSPARENT CHARACTER ART (`activeSkin.fullArtSrc`) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
            <ArchiveImage
              src={activeSkin.fullArtSrc}
              alt={selectedOperator.name}
              draggable={false}
              fetchPriority="high"
              decoding="async"
              className={`w-full h-full object-contain object-bottom drop-shadow-[0_14px_32px_rgba(0,0,0,0.45)] transition-all duration-300 ${archiveArtScale}`}
            />
          </div>
        </div>

        {/* ===================================================================
            BOTTOM-LEFT OPERATOR IDENTITY & CV OVERLAY (`fixed left-3.5 bottom-3 z-30`)
            Pinned cleanly to the bottom-left corner matching Screenshots 1-4 1:1
            =================================================================== */}
        <div className="relative z-30 mx-4 mt-3 mb-4 flex flex-col items-start pointer-events-none sm:fixed sm:left-5 sm:bottom-3.5 sm:mx-0 sm:mt-0 sm:mb-0">
          {/* Class Title + Official Black Square Class Icon */}
          <div className="flex items-end gap-2 mb-1">
            <div className="flex flex-col leading-none">
              {/* Мелкая подпись — всегда английская (как в игре). */}
              <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.06em] uppercase text-[#141517] drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                {selectedOperator.classLabel}
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', 'Oswald', sans-serif",
                }}
                className="text-2xl sm:text-[28px] font-black tracking-[0.04em] uppercase text-[#0e0f11] leading-[0.95] drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]"
              >
                {displayClass}
              </span>
            </div>

            <div className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] bg-[#0a0b0d] border border-white/20 shadow-md flex items-center justify-center p-1.5">
              <img
                src={CLASS_ICON_MAP[selectedOperator.classLabel]}
                alt={selectedOperator.classLabel}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Codename & Large Operator Name: мелкая строка — английская,
              крупная — на языке выбранного досье */}
          <span className="text-base sm:text-[19px] font-medium text-[#2b2d30] sm:text-white sm:drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight">
            {selectedOperator.codename}
          </span>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', 'Oswald', sans-serif",
            }}
            className="text-[30px] sm:text-[52px] font-black tracking-[0.02em] uppercase text-[#141517] sm:text-white leading-[0.92] sm:drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] mb-2"
          >
            {displayName}
          </h1>

          {/* Bottom 2 Dark Translucent Bars: Illustrator (`Cenm0`) & Voice Actor (`Miki Nagasawa`) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Illustrator Bar */}
            <div className="h-[28px] w-[132px] sm:w-[182px] bg-[#222427]/85 flex items-center shadow-md">
              <div className="w-[28px] h-full bg-[#16181a]/90 flex items-center justify-center text-white/80 shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z" />
                </svg>
              </div>
              <span className="flex-1 text-center text-xs font-medium text-white truncate px-2 select-text">
                {selectedOperator.illustrator}
              </span>
            </div>

            {/* Voice Actor Bar — скрыт, пока в данных игры нет имени CV */}
            {selectedOperator.voiceActor && (
            /* Не `<button>`: в Chrome текст внутри кнопки выделить нельзя,
               а имя озвучника нужно копировать. */
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab('voice')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveTab('voice');
                }
              }}
              title="Open Voice Records"
              className="h-[28px] w-[142px] sm:w-[192px] bg-[#222427]/85 hover:bg-[#2e3135] flex items-center justify-between shadow-md transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
            >
              <div className="w-[28px] h-full bg-[#16181a]/90 flex items-center justify-center text-white/80 shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20H8v2h8v-2h-3v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                </svg>
              </div>
              <span className="flex-1 text-center text-xs font-medium text-white truncate px-2 select-text">
                {activeCvName}
              </span>
              <span className="pr-2 text-xs text-white/65">+</span>
            </div>
            )}
          </div>
        </div>

        {/* ===================================================================
            RIGHT HALF DOSSIER MODULES (Hub State vs Expanded State)
            Matches Screenshots 1, 2, 3, 4 1:1
            =================================================================== */}
        {activeTab === 'hub' ? (
          /* -------------------------------------------------------------------
             STATE A: 4 STACKED METALLIC MODULE CARDS ON THE RIGHT (Screenshot 1)
             No extra text clutter inside the cards — just left icon strip + 3D object!
             ------------------------------------------------------------------- */
          <div className="relative z-20 mx-4 mt-2 flex w-auto flex-col gap-3 pb-4 sm:fixed sm:right-[5.5%] sm:top-1/2 sm:-translate-y-1/2 sm:mx-0 sm:mt-0 sm:w-[clamp(260px,38vw,340px)] sm:gap-[clamp(10px,2vh,20px)] sm:pb-0">
            {(['file', 'voice', 'records', 'skins'] as const).map((modId) => (
              <button
                key={modId}
                type="button"
                onClick={() => setActiveTab(modId)}
                aria-label={modId}
                className="group relative w-full h-[76px] sm:h-[clamp(60px,15vh,102px)] border border-[#3a3d41] bg-gradient-to-r from-[#a6a9ae]/88 via-[#cfd2d6]/92 to-[#b6b9be]/88 hover:from-[#b6b9be] hover:via-[#dfe1e4] hover:to-[#c4c7cc] shadow-[0_8px_20px_rgba(0,0,0,0.22)] flex items-center transition-all duration-200 cursor-pointer focus:outline-none"
              >
                {/* Left Dark Vertical Icon Strip (`w-[42px]`) */}
                <div className="w-[40px] sm:w-[42px] h-full bg-[#45484c] group-hover:bg-[#2f3135] flex flex-col items-center justify-between py-2 shrink-0 transition-colors">
                  <div className="my-auto">
                    <DossierModuleIcon tab={modId} />
                  </div>
                  <span className="text-xs font-bold text-white/80 leading-none">
                    +
                  </span>
                </div>

                {/* Center 3D Object Graphic */}
                <div className="flex-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <DossierObjectGraphic tab={modId} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* -------------------------------------------------------------------
             STATE B: EXPANDED MODULE VIEW ON THE RIGHT (Screenshots 2, 3, 4)
             ------------------------------------------------------------------- */
          <div className="relative z-20 mx-4 mt-2 mb-6 flex w-auto flex-col sm:fixed sm:right-[2.5%] sm:top-[6%] sm:bottom-[4%] sm:mx-0 sm:mt-0 sm:mb-0 sm:w-[42%] sm:min-w-[320px] sm:max-w-[520px]">
            {/* Top Dark Metallic Module Banner (Click to collapse back to 4-card hub) */}
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              title={t.backToHub}
              className="group relative w-full h-[80px] sm:h-[clamp(58px,12vh,92px)] bg-gradient-to-r from-[#45484c] via-[#2d2f33] to-[#1e2023] border border-[#151618] shadow-[0_8px_22px_rgba(0,0,0,0.4)] flex items-center justify-between pr-5 mb-3 shrink-0 cursor-pointer focus:outline-none"
            >
              {/* Left Icon + `+` */}
              <div className="w-[40px] sm:w-[42px] h-full flex flex-col items-center justify-between py-2 shrink-0">
                <div className="my-auto">
                  <DossierModuleIcon tab={activeTab} />
                </div>
                <span className="text-xs font-bold text-white/75 leading-none">
                  +
                </span>
              </div>

              {/* Center 3D Object Graphic */}
              <div className="flex-1 flex items-center justify-center">
                <DossierObjectGraphic tab={activeTab} scale={1.05} />
              </div>

              {/* Right Horizontal Line + Module Title */}
              <div className="flex items-center gap-2.5">
                <span className="w-10 sm:w-14 h-[1px] bg-white/55" />
                <span className="text-xs sm:text-[15px] font-semibold tracking-[0.06em] uppercase text-white/90">
                  {activeTab === 'file'
                    ? t.moduleFile
                    : activeTab === 'voice'
                      ? t.moduleVoice
                      : t.moduleRecords}
                </span>
              </div>
            </button>

            {/* Lower Area: Scrollable Content on the Left + 3 Vertical Switcher Tabs on Far Right */}
            <div className="flex-1 min-h-0 flex items-stretch gap-3">
              {/* Scrollable Content Area */}
              {/* `select-text` перебивает `select-none` корня: текст досье,
                  реплик и записей можно выделять и копировать. */}
              <div className="scrollbar-terminal flex-1 min-h-0 overflow-y-auto pr-1.5 select-text">
                {activeTab === 'file' && (
                  /* ===========================================================
                     MODULE 1: PERSONNEL FILE (Screenshot 2 1:1)
                     =========================================================== */
                  <div className="space-y-3 text-xs sm:text-[13px] text-[#18191b]">
                    <div>
                      <div className="bg-[#5a5d62]/90 text-white px-2.5 py-0.5 text-xs sm:text-[13px] font-bold tracking-[0.04em] uppercase mb-1.5">
                        {t.basicFile}
                      </div>
                      <div className="space-y-0.5 leading-[1.62] font-medium bg-[#eef0f2]/90 border border-black/10 px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
                        <p>[{t.codename}] {selectedOperator.codename}</p>
                        <p>[{t.gender}] {selectedOperator.basicFile.gender}</p>
                        <p>
                          [{t.combatExp}]{' '}
                          {selectedOperator.basicFile.combatExp}
                        </p>
                        <p>
                          [{t.birthplace}]{' '}
                          {selectedOperator.basicFile.birthplace}
                        </p>
                        <p>
                          [{t.birthday}] {selectedOperator.basicFile.birthday}
                        </p>
                        <p>[{t.race}] {selectedOperator.basicFile.race}</p>
                        <p>[{t.height}] {selectedOperator.basicFile.height}</p>
                        <p>[{t.oripathy}]</p>
                        <p className="leading-[1.5]">
                          {selectedOperator.basicFile.oripathyStatus}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="bg-[#5a5d62]/90 text-white px-2.5 py-0.5 text-xs sm:text-[13px] font-bold tracking-[0.04em] uppercase mb-1.5">
                        {t.physicalExam}
                      </div>
                      <div className="space-y-0.5 leading-[1.62] font-medium bg-[#eef0f2]/90 border border-black/10 px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
                        <p>
                          [{t.strength}]{' '}
                          {selectedOperator.physicalExam.strength}
                        </p>
                        <p>
                          [{t.mobility}] {selectedOperator.physicalExam.mobility}
                        </p>
                        <p>
                          [{t.endurance}]{' '}
                          {selectedOperator.physicalExam.endurance}
                        </p>
                        <p>
                          [{t.tactical}]{' '}
                          {selectedOperator.physicalExam.tactical}
                        </p>
                        <p>
                          [{t.combatSkill}]{' '}
                          {selectedOperator.physicalExam.combatSkill}
                        </p>
                        <p>
                          [{t.arts}]{' '}
                          {selectedOperator.physicalExam.originiumArts}
                        </p>
                      </div>
                    </div>

                    {/* Остальные разделы досье из таблиц игры (Profile,
                        Clinical Analysis, Archive File 1–4, Promotion Record) */}
                    {(selectedOperator.dossierSections ?? []).map((section) => (
                      <div key={section.title}>
                        <div className="bg-[#5a5d62]/90 text-white px-2.5 py-0.5 text-xs sm:text-[13px] font-bold tracking-[0.04em] uppercase mb-1.5">
                          {section.title}
                        </div>
                        <p className="leading-[1.62] font-medium whitespace-pre-line bg-[#eef0f2]/90 border border-black/10 px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
                          {section.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'voice' && (
                  /* ===========================================================
                     MODULE 2: VOICE RECORDS (Screenshot 3 1:1)
                     =========================================================== */
                  <div className="space-y-2.5">
                    {/* Переключатель дубляжа: подписи берутся из mp3 на CDN */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {availableVoiceDubs.map((dub) => {
                        const active = voiceLang === dub.id;
                        const cvName = selectedOperator.voiceActors?.[dub.id];
                        return (
                          <button
                            key={dub.id}
                            type="button"
                            onClick={() => {
                              stopVoice();
                              setVoiceLang(dub.id);
                            }}
                            title={
                              cvName ? `${dub.title} — ${cvName}` : dub.title
                            }
                            className={`h-7 px-2.5 text-[10px] font-bold tracking-[0.12em] uppercase border transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#f5b400] text-[#121315] border-[#f5b400]'
                                : 'bg-[#2c2f33] text-white/85 hover:bg-[#3a3e44] border-black/30'
                            }`}
                          >
                            {dub.label}
                          </button>
                        );
                      })}
                      {activeCvName && (
                        <span className="ml-auto text-[10px] font-bold tracking-widest uppercase text-[#3b3e42] truncate max-w-[60%]">
                          {t.cv}: {activeCvName}
                        </span>
                      )}
                    </div>

                    {activeVoice && (
                      <div className="bg-[#202225]/92 text-white p-2.5 border-l-4 border-[#f5b400] text-xs leading-relaxed mb-2 shadow-md">
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-[#f5b400] mb-0.5">
                          <span className="truncate pr-2">{activeVoice.title}</span>
                          <button
                            type="button"
                            onClick={() => playVoiceLine(activeVoice)}
                            className="shrink-0 flex items-center gap-1 text-[#f5b400] hover:text-white transition-colors cursor-pointer"
                          >
                            <span className="text-[9px] tracking-[0.18em]">
                              {playingVoiceId === activeVoice.id ? t.pause : t.play}
                            </span>
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                              {playingVoiceId === activeVoice.id ? (
                                <rect x="7" y="6" width="3.5" height="12" />
                              ) : (
                                <polygon points="7,5 19,12 7,19" />
                              )}
                            </svg>
                          </button>
                        </div>
                        <p className="text-white/95">
                          “{activeVoice.transcript}”
                        </p>
                      </div>
                    )}

                    {selectedOperator.voiceLines.map((line) => {
                      const isPlaying = line.id === activeVoiceId;
                      return (
                        <button
                          key={line.id}
                          type="button"
                          onClick={() => playVoiceLine(line)}
                          className={`w-full h-[44px] sm:h-[46px] border flex items-center text-left transition-colors cursor-pointer ${
                            isPlaying
                              ? 'border-[#202225] bg-[#e2e4e7] shadow-xs'
                              : 'border-[#7c7f84] bg-[#c8cacd]/65 hover:bg-[#d6d8db]'
                          }`}
                        >
                          <div
                            className={`w-[44px] sm:w-[46px] h-full flex items-center justify-center shrink-0 ${
                              isPlaying
                                ? 'bg-[#202225] text-[#f5b400]'
                                : 'bg-[#434548] text-white'
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              {playingVoiceId === line.id ? (
                                <rect x="7" y="6" width="3.5" height="12" />
                              ) : (
                                <polygon points="7,5 19,12 7,19" />
                              )}
                            </svg>
                          </div>

                          <span className="px-3.5 text-xs sm:text-[13px] font-bold text-[#202225] truncate">
                            {line.title}
                          </span>
                          {isPlaying && (
                            <span className="ml-auto pr-3 text-[9px] font-bold tracking-[0.14em] uppercase text-[#5a5d62]">
                              {currentDubLabel}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <audio
                      ref={audioRef}
                      onEnded={() => setPlayingVoiceId(null)}
                      onError={() => setPlayingVoiceId(null)}
                      preload="none"
                      className="hidden"
                    />
                  </div>
                )}

                {activeTab === 'records' && (
                  /* ===========================================================
                     MODULE 3: OPERATOR RECORDS (Screenshot 4 1:1)
                     =========================================================== */
                  <div className="space-y-3">
                    <div className="bg-[#313337] text-white text-center py-1 text-xs sm:text-[13px] font-bold tracking-[0.1em] uppercase shadow-xs">
                      {selectedOperator.operatorRecordTitle}
                    </div>

                    <button
                      type="button"
                      onClick={() => void openMemoryStory()}
                      disabled={memoryStoriesLoading || memoryStories?.length === 0}
                      title={
                        memoryStories?.length === 0
                          ? t.storyUnavailable
                          : t.storyOpen
                      }
                      aria-label={
                        memoryStories?.length === 0
                          ? t.storyUnavailable
                          : t.storyOpen
                      }
                      className="w-full text-left border border-[#6d7074] bg-[#c8cacd]/60 hover:bg-[#d4d6d9]/80 disabled:hover:bg-[#c8cacd]/60 disabled:opacity-70 disabled:cursor-not-allowed p-3 flex items-center gap-3.5 transition-colors cursor-pointer"
                    >
                      <div className="relative w-[82px] h-[82px] sm:w-[90px] sm:h-[90px] bg-[#36383c] border border-white/20 shadow-md flex items-center justify-center shrink-0">
                        <div className="absolute top-1.5 left-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                          <span className="text-[8px] font-mono font-bold text-white/85">
                            {t.rec}
                          </span>
                        </div>
                        {memoryStoriesLoading ? (
                          <span className="text-[9px] font-mono font-bold tracking-[0.16em] text-white/80 uppercase">
                            {t.loading}
                          </span>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-8 h-8 text-white"
                          >
                            <polygon points="8,5 19,12 8,19" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-xs sm:text-[13px] text-[#1e2022] leading-relaxed font-medium">
                          {selectedOperator.operatorRecordSynopsis}
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Far-Right Vertical Switcher Column for the other 3 modules */}
              <div className="w-[40px] sm:w-[42px] flex flex-col gap-3 shrink-0">
                {sideTabs.map((tabId) => (
                  <button
                    key={tabId}
                    type="button"
                    onClick={() => setActiveTab(tabId)}
                    title={
                      tabId === 'file'
                        ? t.moduleFile
                        : tabId === 'voice'
                          ? t.moduleVoice
                          : tabId === 'records'
                            ? t.moduleRecords
                            : t.moduleSkins
                    }
                    className="w-full h-[88px] sm:h-[clamp(52px,11vh,98px)] bg-[#3a3d41] hover:bg-[#26282b] border border-[#1d1e20] shadow-md flex flex-col items-center justify-between py-2 text-white transition-colors cursor-pointer"
                  >
                    <div className="my-auto">
                      <DossierModuleIcon tab={tabId} />
                    </div>
                    <span className="text-xs font-bold text-white/75 leading-none">
                      +
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ==========================================================================
  // VIEW 1: OPERATOR POLAROID DIRECTORY GRID (image_4cfc720a.png)
  // ==========================================================================
  const filteredOperators = operators.filter((op) => {
    const matchesClass =
      classFilter === 'ALL' || op.classLabel === classFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      op.name.toLowerCase().includes(q) ||
      op.codename.toLowerCase().includes(q) ||
      op.dataNo.toLowerCase().includes(q) ||
      op.faction.toLowerCase().includes(q);
    const matchesBirthday = !birthdayOnly || todayBirthdayIds.has(op.id);
    const matchesNew = !newOnly || NEW_OPERATOR_IDS.has(op.id);
    return matchesClass && matchesQuery && matchesBirthday && matchesNew;
  });

  const CLASS_FILTERS: Array<OperatorClassType | 'ALL'> = [
    'ALL',
    'SPECIALIST',
    'CASTER',
    'MEDIC',
    'SNIPER',
    'VANGUARD',
    'GUARD',
    'DEFENDER',
    'SUPPORTER',
  ];

  /** Сколько оперативников каталога родились сегодня (для счётчика на кнопке). */
  const todayBirthdaysCount = operators.reduce(
    (total, op) => total + (todayBirthdayIds.has(op.id) ? 1 : 0),
    0
  );

  /** Сколько оперативников последних релизов реально есть в каталоге. */
  const newOperatorsCount = operators.reduce(
    (total, op) => total + (NEW_OPERATOR_IDS.has(op.id) ? 1 : 0),
    0
  );

  return (
    <section
      aria-label={t.directory}
      className="scrollbar-terminal relative w-screen h-screen overflow-y-auto overflow-x-hidden select-none"
      style={{
        background:
          'linear-gradient(128deg, #c6cacd 0%, #b5b9bd 48%, #9fa4a9 100%)',
      }}
    >
      {/* Fixed top-left navigation back to the landing screen */}
      <div className="fixed top-2.5 left-3 z-50 flex items-center bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
        <button
          type="button"
          onClick={() => onBackToHome?.()}
          aria-label={t.backHome}
          className="w-[88px] sm:w-[104px] h-[38px] sm:h-[42px] flex items-center pl-4 border-r border-white/15 text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="w-6 h-6"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onBackToHome?.()}
          aria-label={t.backHome}
          title={t.backHome}
          className="px-3.5 h-[38px] sm:h-[42px] flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>
      </div>

      {/* Subtle architectural crosshair grid dots matching the light gray background of image_4cfc720a.png */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.65) 1px, transparent 1.2px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Diagonal soft shadow beam across the lower-left corner matching image_4cfc720a.png */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(28deg, rgba(60,64,68,0.22) 0%, rgba(60,64,68,0.08) 26%, transparent 45%)',
        }}
      />

      {/* Main Content Container */}
      <div className="relative z-20 max-w-[1380px] mx-auto pt-24 sm:pt-28 pb-20 px-3 sm:px-12">
        {/* Clean Tactical Filter & Search Bar for instant convenience */}
        <div className="mb-8 flex flex-col gap-2 bg-[#202225]/90 p-2.5 border border-black/25 shadow-[0_8px_20px_rgba(0,0,0,0.22)]">
          {/* Class Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-terminal pb-1">
            {CLASS_FILTERS.map((cls) => {
              const active = classFilter === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setClassFilter(cls)}
                  className={`h-8 px-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase transition-colors shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#f5b400] text-[#121315]'
                      : 'bg-[#2c2f33] text-white/80 hover:bg-[#3a3e44] hover:text-white'
                  }`}
                >
                  {cls !== 'ALL' && (
                    <img
                      src={CLASS_ICON_MAP[cls]}
                      alt=""
                      className={`w-4 h-4 object-contain ${
                        active ? 'invert' : ''
                      }`}
                    />
                  )}
                  <span>{cls === 'ALL' ? t.allClasses : t.classes[cls] ?? cls}</span>
                </button>
              );
            })}
          </div>

          {/* Вторая строка: новые оперативники + дни рождения + поиск */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Новые оперативники: последние релизы */}
            <button
              type="button"
              onClick={() => {
                setNewOnly((prev) => {
                  const next = !prev;
                  if (next) setBirthdayOnly(false);
                  return next;
                });
              }}
              aria-pressed={newOnly}
              title={`Новые оперативники — ${newOperatorsCount}`}
              className={`h-8 px-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase border transition-colors shrink-0 cursor-pointer ${
                newOnly
                  ? 'bg-[#f5b400] text-[#121315] border-[#f5b400]'
                  : 'bg-[#2c2f33] text-white/80 hover:bg-[#3a3e44] hover:text-white border-transparent'
              } ${newOperatorsCount === 0 && !newOnly ? 'opacity-60' : ''}`}
            >
              <span aria-hidden="true" className="text-[13px] leading-none">
                ✦
              </span>
              <span>{t.newBadge}</span>
              <span className="tabular-nums opacity-75">
                ({newOperatorsCount})
              </span>
            </button>
            {/* Дни рождения: «кто сегодня именинник» */}
            <button
              type="button"
              onClick={() => {
                setBirthdayOnly((prev) => {
                  const next = !prev;
                  if (next) setNewOnly(false);
                  return next;
                });
              }}
              aria-pressed={birthdayOnly}
              title={isRu ? `Оперативники, родившиеся ${formatBirthday(todayKey)} — ${todayBirthdaysCount}` : `Operators born on ${formatBirthday(todayKey)} — ${todayBirthdaysCount}`}
              className={`h-8 px-2.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase border transition-colors shrink-0 cursor-pointer ${
                birthdayOnly
                  ? 'bg-[#f5b400] text-[#121315] border-[#f5b400]'
                  : 'bg-[#2c2f33] text-white/80 hover:bg-[#3a3e44] hover:text-white border-transparent'
              } ${todayBirthdaysCount === 0 && !birthdayOnly ? 'opacity-60' : ''}`}
            >
              <span aria-hidden="true" className="inline-flex leading-none">
                <CakeGlyph className="w-4 h-4" />
              </span>
              <span>{t.birthdayBadge}</span>
              <span className="tabular-nums opacity-75">
                ({todayBirthdaysCount})
              </span>
            </button>

            {/* Search Input */}
            <div className="flex items-center gap-2 bg-[#141517] border border-white/15 px-3 h-8 min-w-[200px] flex-1">
              <span className="text-xs text-white/50">⌕</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="bg-transparent text-xs text-white placeholder-white/40 focus:outline-none w-full tracking-wider uppercase"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-white/50 hover:text-white cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Operator Polaroid Cards Grid (`image_4cfc720a.png` 1:1 design) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-9 justify-items-center">
          {filteredOperators.slice(0, visibleCount).map((op) => {
            const equippedSkinIdx = getEquippedSkinIndex(op);
            const displayAvatar =
              op.skins[equippedSkinIdx]?.avatarSrc ??
              op.skins[0]?.avatarSrc;
            const isBirthday = todayBirthdayIds.has(op.id);
            const isNew = NEW_OPERATOR_IDS.has(op.id);

            return (
              <button
                key={op.id}
                type="button"
                onClick={() => handleOpenOperator(op)}
                title={
                  isBirthday
                    ? `${t.birthdayBadge}: ${formatBirthday(OPERATOR_BIRTHDAYS[op.id])}`
                    : undefined
                }
                onMouseEnter={() => {
                  // Сплэш весит 1–4 МБ: начинаем качать его ещё до клика.
                  const art = op.skins[getEquippedSkinIndex(op)]?.fullArtSrc;
                  if (!art) return;
                  const preload = new Image();
                  preload.src = art;
                }}
                aria-label={op.name}
                className="group relative w-full max-w-[228px] bg-[#ededee] pt-[12px] px-[12px] pb-0 shadow-[-10px_14px_22px_rgba(0,0,0,0.34),-2px_4px_8px_rgba(0,0,0,0.20)] hover:shadow-[-12px_18px_28px_rgba(0,0,0,0.46)] hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer focus:outline-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.7) 0%, rgba(232,234,236,0.95) 100%)',
                }}
              >
                {/* TOP-LEFT BLACK & YELLOW DATA TAG ("DATA NO. / SW00")
                    Matches exact position & styling from image_4cfc720a.png */}
                <div className="absolute top-[12px] left-0 z-30 flex items-stretch bg-[#0b0c0e] shadow-[2px_4px_10px_rgba(0,0,0,0.45)]">
                  {/* Left Yellow Accent Strip */}
                  <span
                    aria-hidden="true"
                    className="w-[4.5px] shrink-0"
                    style={{ backgroundColor: op.accentColor }}
                  />

                  {/* Stacked "DATA / NO. /" + Code ("SW00") */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5">
                    <div className="flex flex-col text-[8px] leading-[1.02] font-extrabold tracking-[0.02em] uppercase text-[#82868c]">
                      <span>DATA</span>
                      <span>NO. /</span>
                    </div>
                    <span
                      style={{
                        fontFamily:
                          "'Barlow Semi Condensed', 'Barlow Condensed', 'Oswald', sans-serif",
                      }}
                      className="text-[15px] sm:text-[16px] font-extrabold tracking-[0.02em] text-white leading-none"
                    >
                      {op.dataNo}
                    </span>
                  </div>
                </div>

                {/* NEW: свежий релиз помечается жёлтой плашкой справа сверху */}
                {isNew && (
                  <span
                    aria-label="New operator"
                    className="absolute top-[12px] right-0 z-30 bg-[#f5b400] text-[#0b0c0e] text-[9px] font-black tracking-[0.16em] uppercase px-2 py-1 shadow-[2px_4px_10px_rgba(0,0,0,0.35)]"
                  >
                    NEW
                  </span>
                )}

                {/* INNER DARK CHARCOAL PORTRAIT SQUARE
                    Allows the top of the operator's headgear/horns to break out onto the top white border just like in image_4cfc720a.png */}
                <div
                  className="relative w-full aspect-square bg-[#313234] overflow-visible"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 55% 58%, #47484b 0%, #2a2b2d 100%)',
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 border border-black/20 pointer-events-none"
                  />

                  <div className="absolute -top-[7%] inset-x-0 bottom-0 overflow-hidden pointer-events-none">
                    <img
                      src={displayAvatar}
                      alt={op.name}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        const fallback = op.skins[0]?.avatarSrc;
                        const img = event.currentTarget;
                        if (fallback && img.src !== fallback) {
                          img.src = fallback;
                        }
                      }}
                      className="w-full h-full object-contain object-bottom group-hover:scale-[1.04] transition-transform duration-300 select-none"
                    />
                  </div>
                </div>

                {/* BOTTOM POLAROID CAPTION STRIP: Operator Name aligned bottom-left */}
                <div className="h-[44px] sm:h-[48px] flex items-center justify-between">
                  <span
                    style={{
                      fontFamily:
                        "'Barlow Condensed', 'Oswald', 'Arial Narrow', sans-serif",
                    }}
                    className="text-[19px] sm:text-[21px] font-extrabold tracking-[0.03em] uppercase text-[#313335] leading-none truncate"
                  >
                    {op.name}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isBirthday && (
                      <span
                        aria-label={`Birthday: ${formatBirthday(
                          OPERATOR_BIRTHDAYS[op.id]
                        )}`}
                        className="inline-flex items-center justify-center bg-[#2f3134] p-[3px] text-white leading-none"
                      >
                        <CakeGlyph className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <img
                      src={CLASS_ICON_MAP[op.classLabel]}
                      alt={op.classLabel}
                      className="w-4 h-4 object-contain invert opacity-45 group-hover:opacity-80 transition-opacity"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Пустая выдача: под фильтрами может не быть ни одного оперативника */}
        {filteredOperators.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-2 text-center">
            {birthdayOnly ? (
              <span className="inline-flex items-center justify-center bg-[#2f3134] p-2 text-white">
                <CakeGlyph className="w-8 h-8" />
              </span>
            ) : (
              <span className="text-3xl" aria-hidden="true">
                {newOnly ? '✦' : '⌕'}
              </span>
            )}
            <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#313335]/80">
              {birthdayOnly
                ? `No birthdays today — ${formatBirthday(todayKey)}`
                : newOnly
                  ? 'No new operators found'
                  : 'No operators found'}
            </p>
            {(birthdayOnly || newOnly) && (
              <button
                type="button"
                onClick={() => {
                  setBirthdayOnly(false);
                  setNewOnly(false);
                  setSearchQuery('');
                }}
                className="mt-2 h-8 px-4 bg-[#2c2f33] hover:bg-[#3a3e44] text-white text-[10px] font-bold tracking-[0.16em] uppercase border border-black/30 transition-colors cursor-pointer"
              >
                Show all operators
              </button>
            )}
          </div>
        )}

        {/* Пачки оперативников: показываем по GRID_PAGE_SIZE, чтобы не тянуть
            сразу 448 аватарок — остальные подгружаются по кнопке. */}
        {filteredOperators.length > visibleCount && (
          <div className="flex flex-col items-center gap-3 mt-10">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((prev) =>
                  Math.min(prev + GRID_PAGE_SIZE, filteredOperators.length)
                )
              }
              className="h-11 px-7 bg-[#2c2f33] hover:bg-[#3a3e44] text-white text-[11px] font-bold tracking-[0.18em] uppercase border border-black/30 shadow-[0_8px_20px_rgba(0,0,0,0.28)] transition-colors cursor-pointer"
            >
              Show more ({filteredOperators.length - visibleCount})
            </button>
            <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#3b3e42]/70">
              {visibleCount} / {filteredOperators.length}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
