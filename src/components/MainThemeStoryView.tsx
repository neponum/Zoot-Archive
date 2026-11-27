import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  STORYMAP_DATA,
  StoryEpisodeItem,
  StoryLineData,
  StorySetData,
} from '../data/storymapData';
import {
  GalleryItem,
  RecollectionChapter,
  StoryRecollectionPage,
} from './story/StoryRecollectionPage';
import STORY_DESCRIPTIONS_RU from '../data/storyDescriptionsRu.json';
import STORY_OPERATION_DESCRIPTIONS_RU from '../data/storyOperationDescriptionsRu.json';
import STORY_TITLES_RU from '../data/storyTitlesRu.json';
import { platform } from '../platform';
import { preferGitHubRaw } from '../lib/cdn';
import { findStoryTranslator } from '../services/storyService';
import { getTranslatorDisplayName } from '../config/translationsRegistry';
import { STORY_LINE_ID_BY_NAME } from '../config/storylines';
import { UI_STRINGS } from '../translations';
import { getUiLanguage } from '../utils/uiLanguage';
import { useToast } from './ui/Toast';
import {
  fetchStoryOperations,
  resolveOperationScenes,
  type StoryOperationsPayload,
} from '../services/story/operationScenes';

const TORAPPU_MIXSTORY = 'https://torappu.prts.wiki/assets/mixstory';

const P = {
  lg: (x: string) => `${TORAPPU_MIXSTORY}/deco/storyline_${x.toLowerCase()}.png`,
  act: (x: string) => `${TORAPPU_MIXSTORY}/deco/${x.toLowerCase()}.png`,
  deco: (x: string) => `${TORAPPU_MIXSTORY}/deco/${x.toLowerCase()}.png`,
  kv: (x: string) => `${TORAPPU_MIXSTORY}/kv/${x.toLowerCase()}.png`,
  ti: (x: string) => `${TORAPPU_MIXSTORY}/title/${x.toLowerCase()}.png`,
  bg: (x: string) => `${TORAPPU_MIXSTORY}/background/${x.toLowerCase()}.png`,
  sb: (x: string) => `${TORAPPU_MIXSTORY}/retrobkg/${x.toLowerCase()}.png`,
};

/** Логотип главы: у новых глав из архива — баннер, у остальных — title-арт. */
const setLogo = (set: StorySetData): string =>
  set.logoUrl || (set.title ? P.ti(set.title) : set.artUrl || '');

/**
 * Тяжёлые арты с `media.prts.wiki` (например, «大厅差分» CN-событий) отдаём
 * через wsrv: 1.8 МБ PNG → ~130 КБ WebP.
 */
const imageCdn = (url: string, width: number): string =>
  url && /^https:\/\/(media|torappu)\.prts\.wiki\//.test(url)
    ? `https://wsrv.nl/?url=${url.replace(/^https?:\/\//, '')}&w=${width}&output=webp&q=86`
    : preferGitHubRaw(url);

/**
 * Квадратный логотип главы основной линии (`banners/main_00.png`, 192×192).
 * В сетке для main-глав нужен он, а не большой фон `storybg_*`.
 */
const mainBanner = (set: StorySetData): string => {
  const match = /^main_(\d+)$/.exec(set.group || '');
  if (!match) return '';
  return `https://raw.githubusercontent.com/neponum/zoot-data/main/banners/main_${match[1].padStart(2, '0')}.png`;
};

/** Обложка главы (kv или баннер новой главы). */
const setArt = (set: StorySetData): string =>
  set.artUrl || (set.kv ? P.kv(set.kv) : set.logoUrl || '');

/**
 * Большой фон главы.
 *
 * `mixstory/retrobkg/storybg_*` — 1660×936, `mixstory/kv/*` — всего 632×456.
 * Поэтому для глав без `bgid` выводим имя фона из `kv_time_set_forth` →
 * `storybg_time_set_forth`: на всю панель идёт резкая картинка, а не
 * растянутый маленький KV.
 */
const setCover = (set: StorySetData): string => {
  if (set.bgid) return P.sb(set.bgid);
  if (set.kv) return P.sb(set.kv.replace(/^kv_/, 'storybg_'));
  // Главы из архива приходят только с готовым `imageSrc` из `mixstory/kv/`:
  // у них нет ни `kv`, ни `bgid`, поэтому имя фона выводим из URL.
  if (set.artUrl?.includes('/mixstory/kv/')) {
    return set.artUrl.replace('/mixstory/kv/kv_', '/mixstory/retrobkg/storybg_');
  }
  return setArt(set);
};

const W: Record<string, number> = {
  set: 420,
  main: 350,
  cross: 330,
  split: 300,
};

/** Глава из `public/data/archive/story/index.json`. */interface StoryPrologueEntry {
  title: string;
  storyTxt: string;
}

interface StoryIndexChapter {
  id?: string;
  year?: number;
  logoUrl?: string;
  episodes?: Array<{ code: string; name: string; tag?: string; desc?: string }>;
  prologueStories?: StoryPrologueEntry[];
  titleMain?: string;
  subtitle?: string;
  imageSrc?: string;
  synopsisLines?: string[];
  startStoryTxt?: string;
}

interface StoryIndexPayload {
  categories?: Array<{ id?: string; chapters?: StoryIndexChapter[] }>;
}

/**
 * Добавляет в карту главы, которые уже есть в архиве, но ещё не попали в
 * сгенерированный `STORYMAP_DATA`. Новая глава появляется в конце своей
 * сюжетной линии и открывается сразу в читалке — без ручной правки данных.
 */
function mergeStoryIndex(
  base: typeof STORYMAP_DATA,
  payload: StoryIndexPayload | null
): typeof STORYMAP_DATA {
  if (!payload?.categories?.length) return base;

  const lineByAbbr = new Map<string, number>();
  base.lines.forEach((line, index) => {
    lineByAbbr.set(line.abbr.toLowerCase(), index);
  });

  const covered = new Set(
    Object.values(base.sets).map((set) => set.group)
  );
  const sets: Record<string, StorySetData> = { ...base.sets };
  const lines = base.lines.map((line) => ({
    ...line,
    items: [...line.items],
  }));
  let added = 0;

  for (const category of payload.categories) {
    const lineIndex = category.id
      ? lineByAbbr.get(category.id.toLowerCase())
      : undefined;
    if (lineIndex === undefined) continue;

    for (const chapter of category.chapters ?? []) {
      if (!chapter.id || !chapter.startStoryTxt || covered.has(chapter.id)) {
        continue;
      }
      const setId = `storyIndex_${chapter.id}`;
      if (sets[setId]) continue;

      const synopsis = (chapter.synopsisLines ?? [])
        .map((line) => String(line).trim())
        .filter(Boolean)
        .join('\n');

      sets[setId] = {
        name: chapter.subtitle || chapter.titleMain || chapter.id,
        year: chapter.year ?? 0,
        kv: '',
        title: '',
        bgid: '',
        main: lines[lineIndex].id === 'mainLine',
        group: chapter.id,
        desc: synopsis,
        tags: [],
        rewardOp: null,
        episodes: chapter.episodes ?? [],
        logoUrl: chapter.logoUrl || chapter.imageSrc,
        artUrl: chapter.imageSrc,
        startStoryTxt: chapter.startStoryTxt,
      };

      lines[lineIndex].items.push({
        t: lines[lineIndex].id === 'mainLine' ? 'main' : 'set',
        s: setId,
      });
      covered.add(chapter.id);
      added += 1;
    }
  }

  return added ? { lines, sets } : base;
}

interface StoryGallery {
  sets?: Record<string, GalleryItem[]>;
}

function kicker(L: StoryLineData, t?: Record<string, any>): string {
  return L.id === 'mainLine'
    ? t?.mainline || 'Main Story'
    : `${t?.story_line || 'Story Line'} · ${L.abbr.toUpperCase()}`;
}

/**
 * Картинка с индикатором загрузки. Пока файл не пришёл (или не загрузился
 * вообще), поверх кадра крутится лоадер — без «заглушек» и битых иконок.
 */
const ArtWork: React.FC<{
  src: string;
  alt: string;
  className: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  draggable?: boolean;
  fallbackSrc?: string;
}> = ({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  draggable = false,
  fallbackSrc,
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const lastSrcRef = useRef(src);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Не сбрасываем loaded на первом рендере: кэшированная картинка успевает
    // вызвать onLoad раньше, чем сработает этот эффект, и лоадер зависал.
    if (lastSrcRef.current !== src) {
      lastSrcRef.current = src;
      setCurrentSrc(src);
      setLoaded(false);
    }
  }, [src]);

  useEffect(() => {
    // Страховка для кэша: onLoad мог отработать до подписки React.
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [currentSrc]);

  return (
    <>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        draggable={draggable}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (fallbackSrc && currentSrc !== fallbackSrc) {
            setLoaded(false);
            setCurrentSrc(fallbackSrc);
            return;
          }
          setLoaded(false);
        }}
        className={className}
      />
      {!loaded && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#08090b]/85"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-white/60 sm:h-6 sm:w-6" />
        </span>
      )}
    </>
  );
};

interface TopLeftNavBarProps {
  onBack: () => void;
  onHome: () => void;
}

const TopLeftNavBar: React.FC<TopLeftNavBarProps> = ({ onBack, onHome }) => (
  <div className="fixed top-2.5 left-3 z-50 flex items-center bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
    {/* `<` Back Button */}
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
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

    {/* `🏠` Home Button */}
    <button
      type="button"
      onClick={onHome}
      aria-label="Home"
      className="relative w-[108px] sm:w-[128px] h-[38px] sm:h-[42px] flex items-center justify-center text-white hover:bg-white/10 transition-colors overflow-hidden cursor-pointer"
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
);

/** Данные операции, которые передаются в читалку для экрана загрузки. */
export interface StoryOperationBrief {
  code?: string;
  name?: string;
  desc?: string;
  /** Название главы для подтверждения пропуска (`《...》`). */
  chapter?: string;
  /** Пометка эпизода: «幕间», «Interlude» и т.п. */
  tag?: string;
}

interface OperationStageButtonProps {
  code: string;
  name?: string;
  active?: boolean;
  /** Глава сета уже прочитана — операция синяя, иначе серая. */
  read?: boolean;
  /** Подпись верхней чёрной планки: OPERATION или PROLOGUE. */
  kind?: 'operation' | 'prologue';
  /** Клик по шестиугольнику: отметить операцию прочитанной. */
  onToggleRead?: () => void;
  onClick?: () => void;
}

/**
 * Шестиугольная метка операции: синяя у прочитанных, серая у остальных.
 * Вынесена отдельно, потому что теперь это самостоятельная кнопка.
 */
const Hexagon: React.FC<{ read: boolean }> = ({ read }) => (
  <svg viewBox="0 0 36 40" className="w-full h-full">
    <polygon
      points="18,1.5 34,10.5 34,29.5 18,38.5 2,29.5 2,10.5"
      fill={read ? 'url(#hexCyanGrad)' : 'url(#hexGrayGrad)'}
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <polygon
      points="18,4.5 31,12 31,28 18,35.5 5,28 5,12"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="0.9"
    />
  </svg>
);

/**
 * Arknights Operation Stage Node Button (matching OPERATION 9-1 reference image):
 * Left circular 3-spoke film reel + overlapping cyan hexagon + black "OPERATION" header + white halftone plate with stage code.
 */
const OperationStageButton: React.FC<OperationStageButtonProps> = ({
  code,
  name,
  active = false,
  read = false,
  kind = 'operation',
  onToggleRead,
  onClick,
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.();
      }
    }}
    title={name ? `${code} · ${name}` : code}
    className={`group relative inline-flex items-center h-[34px] sm:h-[36px] pl-[14px] sm:pl-[16px] pr-0.5 select-none focus:outline-none cursor-pointer transition-transform duration-150 ${
      active ? 'scale-[1.03]' : 'hover:scale-[1.02]'
    }`}
  >
    {/* Left Circular White 3-Spoke Film Reel */}
    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.85)] z-10 pointer-events-none">
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="reelPlateGrad" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="68%" stopColor="#e6e9ed" />
            <stop offset="100%" stopColor="#b8bec6" />
          </radialGradient>
        </defs>
        {/* Dark outer shadow rim */}
        <circle cx="32" cy="32" r="30.5" fill="#17191c" />
        {/* Inner dark tape wind */}
        <circle cx="32" cy="32" r="26" fill="#1d2024" />
        {/* Metallic white film reel flange */}
        <circle
          cx="32"
          cy="32"
          r="28.5"
          fill="url(#reelPlateGrad)"
          stroke="#2c3036"
          strokeWidth="1.2"
        />
        {/* 3 dark radial reel cutout slots (120 deg apart matching reference image) */}
        <path
          d="M29.5 11 L34.5 11 L33.5 24 L30.5 24 Z"
          fill="#141619"
          transform="rotate(28 32 32)"
        />
        <path
          d="M29.5 11 L34.5 11 L33.5 24 L30.5 24 Z"
          fill="#141619"
          transform="rotate(155 32 32)"
        />
        <path
          d="M29.5 11 L34.5 11 L33.5 24 L30.5 24 Z"
          fill="#141619"
          transform="rotate(270 32 32)"
        />
        {/* Micro telemetry markings on the white reel flange */}
        <g transform="rotate(-24 32 32)" fill="#3b4047">
          <rect x="24" y="12" width="12" height="2.2" />
          <rect x="24" y="15.5" width="9" height="1.5" />
          <rect x="24" y="18" width="6" height="1.5" />
        </g>
        {/* Tilted grey label tag on lower-left sector */}
        <g transform="rotate(34 24 44)">
          <rect
            x="16"
            y="38"
            width="14"
            height="9"
            rx="1"
            fill="#bfc4cc"
            stroke="#8d939c"
            strokeWidth="0.7"
          />
          <text
            x="23"
            y="45"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="800"
            fill="#eef1f5"
            fontFamily="sans-serif"
          >
            4
          </text>
        </g>
        {/* Center spindle ring & hub */}
        <circle
          cx="32"
          cy="32"
          r="7.2"
          fill="#26292e"
          stroke="#6c727a"
          strokeWidth="1.2"
        />
        <circle cx="32" cy="32" r="2.6" fill="#ced3da" />
      </svg>
    </div>

    {/* Overlapping Pointy-Top Hexagon: синий у прочитанных, серый у непрочитанных.
        Отдельная кнопка: клик по кубу ставит метку, а не открывает операцию. */}
    {onToggleRead ? (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleRead();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-pressed={read}
        title={read ? 'Снять отметку о прочтении' : 'Отметить прочитанным'}
        className="relative z-20 -ml-1 w-[20px] h-[22px] sm:w-[22px] sm:h-[24px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] shrink-0 cursor-pointer focus:outline-none transition-transform hover:scale-110 active:scale-95"
      >
        <Hexagon read={read} />
      </button>
    ) : (
      <div className="relative z-20 -ml-1 w-[20px] h-[22px] sm:w-[22px] sm:h-[24px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] shrink-0 pointer-events-none">
        <Hexagon read={read} />
      </div>
    )}

    {/* Right Rectangular Plate: Black "OPERATION" Top Bar + White Halftone Code Plate */}
    <div
      className={`relative z-10 -ml-[9px] w-[80px] sm:w-[88px] h-[28px] sm:h-[30px] flex flex-col shadow-[0_3px_8px_rgba(0,0,0,0.75)] transition-all ${
        active
          ? read
            ? 'ring-2 ring-[rgba(255,255,255,0.55)] shadow-[0_0_14px_rgba(41,182,255,0.45)]'
            : 'ring-2 ring-[#a8adb5] shadow-[0_0_14px_rgba(168,173,181,0.4)]'
          : 'group-hover:brightness-105'
      }`}
    >
      {/* Top Black Strip: OPERATION */}
      <div className="h-[8px] sm:h-[9px] bg-[#111315] flex items-center justify-center pl-2 pr-0.5">
        <span className="text-[6.5px] sm:text-[7px] font-extrabold tracking-[0.12em] uppercase text-white leading-none">
          {kind === 'prologue' ? 'PROLOGUE' : 'OPERATION'}
        </span>
      </div>

      {/* Bottom White Plate with Halftone Shading + Stage Code */}
      <div className="relative flex-1 bg-[#f5f6f8] flex items-center justify-center pl-2 pr-0.5 overflow-hidden">
        {/* Diagonal halftone dot pattern on the left side matching reference image */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[56%] pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(#555a60 0.85px, transparent 0.85px)',
            backgroundSize: '2.6px 2.6px',
            WebkitMaskImage:
              'linear-gradient(105deg, #000 15%, rgba(0,0,0,0.45) 55%, transparent 95%)',
            maskImage:
              'linear-gradient(105deg, #000 15%, rgba(0,0,0,0.45) 55%, transparent 95%)',
          }}
        />
        <span
          style={{
            fontFamily:
              "'Georgia', 'Times New Roman', 'Barlow Condensed', serif",
          }}
          className="relative z-10 text-[13px] sm:text-[14px] font-bold tracking-tight text-[#2c2e32] leading-none"
        >
          {code}
        </span>
      </div>
    </div>
  </div>
);

/**
 * Сетка операций без скролла: если кнопки не помещаются по высоте, сетка
 * целиком масштабируется, чтобы все операции оставались видны одновременно.
 */
const OperationGrid: React.FC<{
  episodes: StoryEpisodeItem[];
  isRead: (ep: StoryEpisodeItem) => boolean;
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onToggleRead: (ep: StoryEpisodeItem) => void;
}> = ({ episodes, isRead, selectedIdx, onSelect, onToggleRead }) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const grid = gridRef.current;
    if (!box || !grid) return;

    const fit = () => {
      const available = box.clientHeight;
      // offsetHeight не зависит от transform — считаем по натуральному размеру.
      const natural = grid.offsetHeight;
      if (!available || !natural) return;
      // На мобильных панель прокручивается — там кнопки не уменьшаем.
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      setScale(isDesktop ? Math.min(1, available / natural) : 1);
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [episodes]);

  return (
    <div ref={boxRef} className="flex-1 min-h-0 w-full overflow-visible md:overflow-hidden">
      <div
        ref={gridRef}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        className="grid w-full grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1.5 justify-items-center py-1"
      >
        {episodes.map((ep, idx) => (
          <OperationStageButton
            key={`${ep.code}-${idx}`}
            code={ep.code || `OP-${idx + 1}`}
            name={ep.name}
            active={selectedIdx === idx}
            read={isRead(ep)}
            onClick={() => onSelect(idx)}
            onToggleRead={() => onToggleRead(ep)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Автор перевода конкретной сцены. Имя зашито в имя CSV-файла в zoot-data,
 * поэтому проверяем точные файлы из реестра переводчиков.
 */
const TranslatorBadge: React.FC<{ storyPath?: string | null }> = ({ storyPath }) => {
  const [translator, setTranslator] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTranslator(null);
    if (!storyPath) return;
    findStoryTranslator(storyPath)
      .then((name) => {
        if (!cancelled) setTranslator(name);
      })
      .catch(() => {
        if (!cancelled) setTranslator(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storyPath]);

  if (!translator) return null;

  const uiLang = getUiLanguage();
  const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';

  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-[0.16em] text-white/45">
      <span className="h-px w-3 bg-white/25" aria-hidden="true" />
      <span>{isRu ? 'Перевод' : 'Translation'}</span>
      <span className="truncate text-white/80">{getTranslatorDisplayName(translator)}</span>
      <span className="h-px w-3 bg-white/25" aria-hidden="true" />
    </div>
  );
};

/**
 * Общие градиенты для кнопок операций: один синий (глава прочитана) и один
 * серый (глава ещё не прочитана). Держим их в одном месте, чтобы SVG-id не
 * дублировались на каждой кнопке.
 */
const StoryOperationGradients: React.FC = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="0"
    height="0"
    className="absolute pointer-events-none"
  >
    <defs>
      {/* Плотный синий градиент: раньше середина была почти прозрачной,
          и отмеченный куб просвечивал сквозь катушку — выглядел «сломанным». */}
      <linearGradient id="hexCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f2fbff" stopOpacity="0.98" />
        <stop offset="45%" stopColor="#4aa8d8" stopOpacity="0.98" />
        <stop offset="100%" stopColor="#0066a8" stopOpacity="0.98" />
      </linearGradient>
      <linearGradient id="hexGrayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d8dbe0" />
        <stop offset="55%" stopColor="#a6acb5" />
        <stop offset="100%" stopColor="#757c86" />
      </linearGradient>
    </defs>
  </svg>
);

interface MainThemeStoryViewProps {
  onBackToTerminal: () => void;
  onBackToHome?: () => void;
  /** id прочитанных глав (chapter.id из /data/archive/story/index.json). */
  readChapters?: Set<string>;
  /** Поставить/снять отметку прочтения для операции (ключ `op:...`). */
  onToggleRead?: (key: string) => void;
  /** Переход в читалку: storyTxt первой сцены главы + брифинг операции. */
  onOpenChapter?: (storyTxt: string, operation?: StoryOperationBrief) => void;
  /** Открыть главу по её группе (chapter.id) при входе, например `main_9`. */
  initialChapter?: string;
  /** Стартовый режим показа: карта, сетка по годам или по линиям. */
  initialMode?: 'map' | 'year' | 'line';
  /** Пользователь переключил режим — сообщаем маршруту, чтобы сменить URL. */
  onModeChange?: (mode: 'map' | 'year' | 'line') => void;
  /** Панель главы закрыта: маршрут может вернуть адрес к карте. */
  onCloseChapter?: () => void;
  /** Пользователь открыл главу: маршрут обновляет адрес (`/story/<id>`). */
  onSelectChapter?: (chapterId: string) => void;
  /** Каноническая ссылка на операцию: `/story/event/<chapter>/<code>[/end]`. */
  onOpenEvent?: (
    chapterId: string,
    code: string,
    part: 'beg' | 'end' | undefined,
    operation?: StoryOperationBrief
  ) => void;
}

export const MainThemeStoryView: React.FC<MainThemeStoryViewProps> = ({
  onBackToTerminal,
  onBackToHome,
  readChapters,
  onToggleRead,
  onOpenChapter,
  initialChapter,
  initialMode,
  onModeChange,
  onCloseChapter,
  onSelectChapter,
  onOpenEvent,
}) => {
  const uiLang = getUiLanguage();
  const t = UI_STRINGS[uiLang];
  const toast = useToast();
  // Русские описания и названия — оверлей поверх английской базы из
  // STORYMAP_DATA/index.json. На других языках сайта он не применяется,
  // иначе английский интерфейс показывает русский текст.
  const isRussianUi = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
  const localizedLineName = (L: StoryLineData): string => {
    const lineId = STORY_LINE_ID_BY_NAME[L.name];
    return (lineId && t.story_lines?.[lineId]) || L.name;
  };
  // Главы из архива, которых ещё нет в статическом наборе (новые истории).
  const [storyIndex, setStoryIndex] = useState<StoryIndexPayload | null>(null);
  const { lines, sets } = useMemo(() => {
    const merged = mergeStoryIndex(STORYMAP_DATA, storyIndex);
    const descriptions = isRussianUi
      ? (STORY_DESCRIPTIONS_RU as Record<string, string>)
      : {};
    const operationDescriptions = isRussianUi
      ? (STORY_OPERATION_DESCRIPTIONS_RU as Record<string, string>)
      : {};
    const titles = isRussianUi
      ? (STORY_TITLES_RU as {
          chapters?: Record<string, string>;
          episodes?: Record<string, string>;
        })
      : {};
    const localizedSets: Record<string, StorySetData> = {};
    for (const [id, set] of Object.entries(merged.sets)) {
      const translated = set.group ? descriptions[set.group] : undefined;
      const episodes = set.episodes?.map((episode) => {
        const key = set.group ? `${set.group}|${episode.code}` : '';
        const operationRu = key ? operationDescriptions[key] : undefined;
        const episodeTitleRu = key ? titles.episodes?.[key] : undefined;
        return {
          ...episode,
          ...(episodeTitleRu ? { name: episodeTitleRu } : {}),
          ...(operationRu ? { desc: operationRu } : {}),
        };
      });
      const chapterTitleRu = set.group ? titles.chapters?.[set.group] : undefined;
      localizedSets[id] = {
        ...set,
        ...(chapterTitleRu ? { name: chapterTitleRu } : {}),
        desc: translated || set.desc,
        ...(episodes ? { episodes } : {}),
      };
    }
    return { lines: merged.lines, sets: localizedSets };
  }, [storyIndex, isRussianUi]);

  const [lineIdx, setLineIdx] = useState<number>(0);

  // Режим показа историй: карта-таймлайн или сетка по годам.
  // На телефоне основной режим — сетка (как в игре), на десктопе — карта.
  // Режим показа: карта-таймлайн, сетка по годам или сетка по линиям.
  // Переключается одной белой кнопкой в правом верхнем углу (как в игре).
  const [storyMode, setStoryMode] = useState<'map' | 'year' | 'line'>(() => {
    if (initialMode) return initialMode;
    if (typeof window === 'undefined') return 'map';
    return window.matchMedia('(max-width: 767px)').matches ? 'year' : 'map';
  });

  // URL задаёт режим: /story/map, /story/grid, /story/grid/lines.
  useEffect(() => {
    if (!initialMode) return;
    setStoryMode((prev) => (prev === initialMode ? prev : initialMode));
  }, [initialMode]);

  const changeMode = (next: 'map' | 'year' | 'line') => {
    setStoryMode(next);
    onModeChange?.(next);
  };

  // На телефонах карта недоступна: при узком экране всегда уходим в сетку.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => {
      if (mq.matches) {
        setStoryMode((prev) => (prev === 'map' ? 'year' : prev));
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  const [selSetId, setSelSetId] = useState<string | null>(null);
  const [selectedEpIdx, setSelectedEpIdx] = useState<number | null>(null);
  const [showRecollectionStages, setShowRecollectionStages] =
    useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Операция с двумя сценами (до и после боя) — спрашиваем, какую открыть.
  const [sceneChoice, setSceneChoice] = useState<{
    code: string;
    name: string;
    desc?: string;
    beg?: string | null;
    end?: string | null;
  } | null>(null);

  // Галерея ключевых изображений для CHAPTER RECOLLECTION (грузится лениво).
  const [gallery, setGallery] = useState<Record<string, GalleryItem[]> | null>(
    null
  );
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);

  // Карта «операция → сцены» — грузим сразу, чтобы фильтр не мигал.
  const [storyOps, setStoryOps] = useState<StoryOperationsPayload | null>(null);

  useEffect(() => {
    if (storyOps !== null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Один неудачный запрос не должен навсегда оставлять панель без карты
    // сцен: тогда показываются все операции, включая TR/ST без сюжета,
    // а клик по ним уводит обратно в главу.
    const load = (attempt: number) => {
      fetchStoryOperations()
        .then((payload) => {
          if (cancelled) return;
          if (payload) {
            setStoryOps(payload);
            return;
          }
          if (attempt < 2) {
            timer = setTimeout(() => load(attempt + 1), 1200 * (attempt + 1));
          } else {
            setStoryOps({});
          }
        })
        .catch(() => {
          if (!cancelled) setStoryOps({});
        });
    };

    load(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [storyOps]);

  useEffect(() => {
    if (!showRecollectionStages || gallery !== null) return;
    let cancelled = false;
    setGalleryLoading(true);
    fetch(platform.dataUrl('/data/archive/story/gallery.json'))
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: StoryGallery | null) => {
        if (!cancelled) setGallery(payload?.sets ?? {});
      })
      .catch(() => {
        if (!cancelled) setGallery({});
      })
      .finally(() => {
        if (!cancelled) setGalleryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showRecollectionStages, gallery]);

  // Dual background cross-fade state matching storymap.js setBg()
  const [bgState, setBgState] = useState<{
    activeSlot: 1 | 2;
    url1: string;
    url2: string;
    curUrl: string;
  }>(() => {
    const initialUrl = P.bg('bg_mainline_0');
    return {
      activeSlot: 1,
      url1: initialUrl,
      url2: '',
      curUrl: initialUrl,
    };
  });

  // Scroll & Pan UI state
  const [panOffL, setPanOffL] = useState<boolean>(true);
  const [panOffR, setPanOffR] = useState<boolean>(false);

  // chapter.id -> storyTxt первой сцены (для перехода в читалку с карты).
  const [chapterStartMap, setChapterStartMap] = useState<Record<string, string>>(
    {}
  );
  // chapter.id -> прологи/вставные сцены, не привязанные к операции.
  const [chapterPrologues, setChapterPrologues] = useState<
    Record<string, StoryPrologueEntry[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    fetch(platform.dataUrl('/data/archive/story/index.json'))
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.categories) return;
        const map: Record<string, string> = {};
        const prologues: Record<string, StoryPrologueEntry[]> = {};
        for (const category of payload.categories) {
          for (const chapter of category?.chapters ?? []) {
            if (chapter?.id && chapter?.startStoryTxt) {
              map[chapter.id] = chapter.startStoryTxt;
            }
            if (chapter?.id && chapter?.prologueStories?.length) {
              prologues[chapter.id] = chapter.prologueStories;
            }
          }
        }
        setChapterStartMap(map);
        setChapterPrologues(prologues);
        // Новые главы архива, которых ещё нет в STORYMAP_DATA, добавляем в карту.
        setStoryIndex(payload);
      })
      .catch(() => {
        /* карта откроется и без перехода в читалку */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const railRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const wheelLockUntilRef = useRef<number>(0);
  const pendingScrollRef = useRef<{
    type: 'start' | 'center';
    setId?: string;
  } | null>({ type: 'start' });

  // Precompute reverse index: setId -> list of line indices that contain this set
  const setLines = useMemo(() => {
    const map: Record<string, number[]> = {};
    lines.forEach((L, li) => {
      L.items.forEach((it) => {
        if ((it.t === 'set' || it.t === 'main') && it.s) {
          if (!map[it.s]) map[it.s] = [];
          if (!map[it.s].includes(li)) map[it.s].push(li);
        }
      });
    });
    return map;
  }, [lines]);

  // Precompute line id -> index map
  const byId = useMemo(() => {
    const map: Record<string, number> = {};
    lines.forEach((L, i) => {
      map[L.id] = i;
    });
    return map;
  }, [lines]);

  const currentLine = lines[lineIdx] || lines[0];

  // Compute positioned items and splits for the active storyline
  const layout = useMemo(() => {
    let x = 340;
    const splits: { x: number; bg: string }[] = [];
    const positionedItems: Array<{
      key: string;
      x: number;
      y: number;
      node: StoryLineData['items'][number];
    }> = [];

    currentLine.items.forEach((it, i) => {
      const isMainCard =
        (it.t === 'set' || it.t === 'main') && Boolean(sets[it.s]?.main);
      const w = isMainCard ? W.main : W[it.t] || 360;
      const cx = x + w / 2;
      const prev = currentLine.items[i - 1];
      const next = currentLine.items[i + 1];

      const y =
        it.t === 'cross'
          ? 26
          : it.t === 'split'
            ? prev && prev.t === 'cross'
              ? 60
              : next && next.t === 'cross'
                ? 53
                : 55
            : 55 + (i % 2 ? 5 : -2);

      if (it.t === 'split') {
        splits.push({
          x: cx,
          bg: `bg_mainline_${splits.length}`,
        });
      }

      positionedItems.push({
        key: `${currentLine.id}-${i}-${it.t === 'split' ? it.icon : it.s}`,
        x: cx,
        y,
        node: it,
      });

      x += w;
    });

    const totalWidth = x + 180;

    return {
      positionedItems,
      splits,
      totalWidth,
    };
  }, [currentLine, sets]);

  const setBgUrl = useCallback((url: string) => {
    if (!url) return;
    setBgState((prev) => {
      if (prev.curUrl === url) return prev;
      const nextSlot: 1 | 2 = prev.activeSlot === 1 ? 2 : 1;
      return {
        activeSlot: nextSlot,
        url1: nextSlot === 1 ? url : prev.url1,
        url2: nextSlot === 2 ? url : prev.url2,
        curUrl: url,
      };
    });
  }, []);

  // Compute current stage background URL based on active line and scroll position
  const computeCurBg = useCallback(
    (scrollLeft: number, clientWidth: number) => {
      if (lineIdx !== 0 || !layout.splits.length) {
        return P.bg(currentLine.bg);
      }
      const cx = scrollLeft + clientWidth / 2;
      let idx = -1;
      for (let i = 0; i < layout.splits.length; i++) {
        if (cx >= layout.splits[i].x) idx = i;
      }
      const key = `bg_mainline_${Math.max(0, idx)}`;
      return P.bg(key);
    },
    [lineIdx, layout.splits, currentLine.bg]
  );

  const syncScrollUI = useCallback(() => {
    const tr = trackRef.current;
    if (!tr) return;
    const max = Math.max(0, tr.scrollWidth - tr.clientWidth);
    const sl = tr.scrollLeft;

    setPanOffL(sl <= 4);
    setPanOffR(sl >= max - 4);

    const nextBg = computeCurBg(sl, tr.clientWidth);
    setBgUrl(nextBg);
  }, [computeCurBg, setBgUrl]);

  // Center a specific set card in the track
  const centerSet = useCallback((setId: string, smooth: boolean) => {
    const tr = trackRef.current;
    if (!tr) return;
    const el = tr.querySelector<HTMLElement>(`[data-set="${setId}"]`);
    if (!el) return;
    const x = parseFloat(el.style.left || '0') - tr.clientWidth / 2;
    tr.scrollTo({
      left: Math.max(0, x),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Keep active sidebar button scrolled into view and apply pending track scroll
  useEffect(() => {
    if (selSetId) return;

    if (railRef.current) {
      const activeBtn = railRef.current.querySelector<HTMLElement>(
        `[data-line="${lineIdx}"]`
      );
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    const tr = trackRef.current;
    if (tr && pendingScrollRef.current) {
      const action = pendingScrollRef.current;
      pendingScrollRef.current = null;
      if (action.type === 'start') {
        tr.scrollLeft = 0;
      } else if (action.type === 'center' && action.setId) {
        const el = tr.querySelector<HTMLElement>(
          `[data-set="${action.setId}"]`
        );
        if (el) {
          const x =
            parseFloat(el.style.left || '0') - tr.clientWidth / 2;
          tr.scrollLeft = Math.max(0, x);
        } else {
          tr.scrollLeft = 0;
        }
      }
    }

    syncScrollUI();
  }, [lineIdx, selSetId, syncScrollUI]);

  /** Главы по линиям сюжета (альтернативная группировка сетки). */
  const lineGroups = useMemo(
    () =>
      lines
        .map((line) => ({
          line,
          items: line.items
            .filter(
              (item) =>
                (item.t === 'set' || item.t === 'main') && Boolean(sets[item.s])
            )
            .map((item) => ({
              id: (item as { s: string }).s,
              set: sets[(item as { s: string }).s],
            })),
        }))
        .filter((group) => group.items.length > 0),
    [lines, sets]
  );

  /** Главы, сгруппированные по годам (для сеточного режима). */
  const yearGroups = useMemo(() => {
    const byYear = new Map<number, Array<{ id: string; set: StorySetData }>>();
    for (const [id, set] of Object.entries(sets)) {
      const year = set.year || 0;
      const bucket = byYear.get(year) ?? [];
      bucket.push({ id, set });
      byYear.set(year, bucket);
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => [year, items] as const);
  }, [sets]);

  // Switch storyline
  const pickLine = useCallback(
    (nextIdx: number, targetSetId?: string) => {
      if (nextIdx < 0 || nextIdx >= lines.length) return;
      setSelSetId(null);
      setShowRecollectionStages(false);
      if (nextIdx === lineIdx) {
        if (targetSetId) {
          pendingScrollRef.current = { type: 'center', setId: targetSetId };
          setTimeout(() => centerSet(targetSetId, true), 0);
        }
        return;
      }
      pendingScrollRef.current = targetSetId
        ? { type: 'center', setId: targetSetId }
        : { type: 'start' };
      setLineIdx(nextIdx);
    },
    [lines.length, lineIdx, centerSet]
  );

  // Open full-screen detail window for a story set
  const openSet = useCallback(
    (setId: string, fromUrl = false) => {
      const S = sets[setId];
      if (!S) return;
      // Глава может быть открыта из сетки/по ссылке, где текущая линия ещё
      // не переключена. Без этого «Chapter recollection» и соседние главы
      // считались по mainLine — то есть работали только для основной линии.
      const ownerLines = setLines[setId] ?? [];
      const ownerLineIdx = ownerLines.includes(lineIdx) ? lineIdx : ownerLines[0];
      if (typeof ownerLineIdx === 'number') setLineIdx(ownerLineIdx);
      // Даже если операции ещё не собраны, открываем страницу главы:
      // историю можно запустить кнопкой внутри неё.
      pendingScrollRef.current = { type: 'center', setId };
      setShowRecollectionStages(false);
      setSelectedEpIdx(null);
      setSelSetId(setId);
      // Адрес должен отражать открытую главу (`/story/main_0`), но переход
      // по deep link не переписываем повторно.
      if (!fromUrl && S.group) onSelectChapter?.(S.group);
    },
    [sets, setLines, lineIdx, onOpenChapter, onSelectChapter]
  );

  // Открытие главы по id из URL (`/event/main_9` → `/story?chapter=main_9`).
  useEffect(() => {
    if (!initialChapter) return;
    const entry = Object.entries(sets).find(
      ([, set]) => set.group === initialChapter
    );
    if (entry) openSet(entry[0], true);
  }, [initialChapter, sets, openSet]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (selSetId) {
        // Открыта страница галереи — клавиши обрабатывает она сама.
        if (showRecollectionStages) return;
        if (e.key === 'Escape') {
          setSelSetId(null);
          setShowRecollectionStages(false);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const lineSetIds = currentLine.items
            .filter(
              (it): it is { t: 'set' | 'main'; s: string } =>
                (it.t === 'set' || it.t === 'main') && Boolean(sets[it.s])
            )
            .map((it) => it.s);
          const idx = lineSetIds.indexOf(selSetId);
          if (idx !== -1) {
            const nextIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
            if (nextIdx >= 0 && nextIdx < lineSetIds.length) {
              e.preventDefault();
              openSet(lineSetIds[nextIdx]);
            }
          }
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        pickLine(Math.min(lines.length - 1, lineIdx + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        pickLine(Math.max(0, lineIdx - 1));
      } else if (e.key === 'ArrowRight' && trackRef.current) {
        trackRef.current.scrollBy({ left: 420, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft' && trackRef.current) {
        trackRef.current.scrollBy({ left: -420, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selSetId,
    showRecollectionStages,
    currentLine.items,
    sets,
    openSet,
    pickLine,
    lines.length,
    lineIdx,
  ]);

  // Pointer drag state on .sm-track
  const dragRef = useRef<{
    pointerId: number;
    sx: number;
    sy: number;
    sl: number;
    moved: boolean;
    vSwitched: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const tr = trackRef.current;
    if (!tr) return;
    dragRef.current = {
      pointerId: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      sl: tr.scrollLeft,
      moved: false,
      vSwitched: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const tr = trackRef.current;
    if (!d || !tr) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;

    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      try {
        tr.setPointerCapture(d.pointerId);
      } catch {
        // Ignore
      }
    }

    if (d.moved) {
      tr.scrollLeft = d.sl - dx;
      if (
        !d.vSwitched &&
        Math.abs(dy) > 70 &&
        Math.abs(dy) > Math.abs(dx) * 1.4
      ) {
        d.vSwitched = true;
        const next = Math.max(
          0,
          Math.min(lines.length - 1, lineIdx + (dy < 0 ? 1 : -1))
        );
        if (next !== lineIdx) {
          pickLine(next);
        }
      }
    }
  };

  const handlePointerUpOrCancel = () => {
    if (!dragRef.current) return;
    const wasMoved = dragRef.current.moved;
    dragRef.current = null;
    setIsDragging(false);
    if (wasMoved) {
      wheelLockUntilRef.current = Date.now() + 60;
    }
  };

  // Wheel handler on track: horizontal wheel or vertical wheel pans timeline smoothly
  const handleTrackWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const tr = trackRef.current;
    if (!tr) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      tr.scrollLeft += e.deltaX;
    } else {
      tr.scrollLeft += e.deltaY;
    }
  };

  const handleHomeClick = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      onBackToTerminal();
    }
  };

  const selectedSet: StorySetData | null = selSetId
    ? sets[selSetId] || null
    : null;

  // ============================================================================
  // VIEW 2: FULL-SCREEN STORY BANNER DETAIL WINDOW (matching image_4ad02105.png)
  // ============================================================================
  if (selectedSet && selSetId) {
    const synopsisLines = selectedSet.desc
      ? selectedSet.desc.split('\n').filter((line) => line.trim().length > 0)
      : [];

    // Новые главы из архива получают технический id `storyIndex_<chapter>`,
    // а галерея в stage_table сгруппирована как `setId_ssLine_<chapter>`.
    // Поэтому для recollection ищем и прямой ключ, и ключ по group.
    const galleryFor = (id: string, group?: string) => {
      const direct = gallery?.[id];
      if (direct?.length) return direct;
      const chapterGroup = group ?? sets[id]?.group;
      if (!chapterGroup) return direct ?? [];
      return (
        gallery?.[`setId_ssLine_${chapterGroup}`] ??
        gallery?.[`setId_${chapterGroup}`] ??
        direct ??
        []
      );
    };

    const galleryItems = (selSetId && galleryFor(selSetId, selectedSet.group)) || [];

    // Счётчик в шапке галереи — все изображения сюжетной линии.
    const lineGalleryTotal = currentLine.items.reduce(
      (sum, item) =>
        item.t === 'set' || item.t === 'main'
          ? sum + galleryFor(item.s).length
          : sum,
      0
    );

    // Compute previous and next chapters within the current storyline
    const lineSetIds = currentLine.items
      .filter(
        (it): it is { t: 'set' | 'main'; s: string } =>
          (it.t === 'set' || it.t === 'main') && Boolean(sets[it.s])
      )
      .map((it) => it.s);
    const curSetIdx = lineSetIds.indexOf(selSetId);
    const prevSetId = curSetIdx > 0 ? lineSetIds[curSetIdx - 1] : null;
    const nextSetId =
      curSetIdx >= 0 && curSetIdx < lineSetIds.length - 1
        ? lineSetIds[curSetIdx + 1]
        : null;
    const prevSet = prevSetId ? sets[prevSetId] : null;
    const nextSet = nextSetId ? sets[nextSetId] : null;

    // Все главы линии с изображениями — для общей ленты «Story recollection».
    const recollectionChapters = lineSetIds
      .map((id) => {
        const lineSet = sets[id];
        const setGallery = galleryFor(id, lineSet?.group);
        if (!lineSet || setGallery.length === 0) return null;
        return {
          id,
          name: lineSet.name,
          group: lineSet.group,
          logo: setLogo(lineSet),
          items: setGallery,
        } satisfies RecollectionChapter;
      })
      .filter((chapter): chapter is NonNullable<typeof chapter> => chapter !== null);

    // Прочитана ли глава, к которой привязан сет (StorySetData.group = chapter.id).
    const chapterRead = Boolean(
      selectedSet.group && readChapters?.has(selectedSet.group)
    );

    /** Ключ отметки конкретной операции (глава + код + «до/после боя»). */
    const operationReadKey = (ep: StoryEpisodeItem) =>
      `op:${selectedSet.group ?? ''}:${ep.code}:${ep.tag ?? ''}`;
    const isOperationRead = (ep: StoryEpisodeItem) => {
      if (readChapters?.has(operationReadKey(ep))) return true;
      // Старые отметки глав «прочитано» красят все операции, пока пользователь
      // не начал отмечать их поштучно.
      const hasExplicit = visibleEpisodes.some((item) =>
        readChapters?.has(operationReadKey(item))
      );
      return !hasExplicit && chapterRead;
    };
    const toggleOperationRead = (ep: StoryEpisodeItem) => {
      onToggleRead?.(operationReadKey(ep));
    };
    const chapterStoryTxt = selectedSet.group
      ? chapterStartMap[selectedSet.group]
      : undefined;
    /** Прологи главы (например, «序章·上/下» у main_0): отдельных плиток у них нет. */
    const prologueStories = selectedSet.group
      ? chapterPrologues[selectedSet.group] ?? []
      : [];

    // Показываем только операции со сценой. У учебных (TR-*), снабженческих
    // (S*-*) и части обычных операций сюжета нет — их плитки открывали пустой
    // экран. Интерлюдии тоже проверяем: у мини-событий код `ST-N` не
    // уникален, поэтому сцена ищется сначала по главе.
    // Если карта не загрузилась вовсе, фильтровать нечем — показываем всё,
    // как раньше: пустой список операций хуже, чем плитка, которая вернёт
    // пользователя обратно в главу.
    const opsLoaded = Boolean(
      storyOps &&
        (Object.keys(storyOps.operations ?? {}).length ||
          Object.keys(storyOps.chapterOperations ?? {}).length)
    );
    const visibleEpisodes = !opsLoaded
      ? selectedSet.episodes
      : selectedSet.episodes.filter((ep) =>
          Boolean(
            resolveOperationScenes(storyOps, selectedSet.group, ep.code)
          )
        );

    /** Сцена, по которой определяем автора перевода для плитки операции. */
    const storyPathForEpisode = (
      ep: (typeof visibleEpisodes)[number] | undefined
    ): string | undefined => {
      if (!ep) return selectedSet.startStoryTxt;
      const scenes = resolveOperationScenes(
        storyOps,
        selectedSet.group,
        ep.code
      );
      return (
        (ep.tag === 'end' ? scenes?.end : scenes?.beg) ??
        scenes?.beg ??
        scenes?.end ??
        selectedSet.startStoryTxt
      );
    };

    // В обзоре главы нет выбранной операции — показываем переводчика её
    // первой сцены. Раньше здесь был только startStoryTxt, которого у глав
    // из статического набора нет, поэтому подпись вообще не появлялась.
    const overviewStoryPath = storyPathForEpisode(visibleEpisodes[0]);

    const openOperation = async (
      ep: (typeof selectedSet.episodes)[number],
      idx: number
    ) => {
      setSelectedEpIdx(idx);
      if (!onOpenChapter) return;

      let scenes = resolveOperationScenes(
        storyOps,
        selectedSet.group,
        ep.code
      );

      // Карта сцен ещё не загрузилась или первый запрос сорвался — пробуем
      // ещё раз прямо по клику. Иначе маршрут читалки не находит сцену и
      // молча возвращает пользователя в главу.
      if (!scenes) {
        const payload = await fetchStoryOperations().catch(() => null);
        if (payload) {
          setStoryOps(payload);
          scenes = resolveOperationScenes(payload, selectedSet.group, ep.code);
        }
      }
      if (!scenes) {
        toast.info(
          isRussianUi
            ? 'У этой операции нет сюжетной сцены — открывать нечего.'
            : 'This operation has no story scene to open.'
        );
        return;
      }

      // Без тега и с двумя сценами — даём выбрать «до боя» или «после боя».
      if (!ep.tag && scenes?.beg && scenes?.end && !onOpenEvent) {
        setSceneChoice({
          code: ep.code,
          name: ep.name,
          desc: ep.desc,
          beg: scenes.beg,
          end: scenes.end,
        });
        return;
      }

      const brief = {
        code: ep.code,
        name: ep.name,
        desc: ep.desc,
        chapter: selectedSet.name,
        tag: ep.tag,
      };
      // Канонические ссылки: /story/event/<chapter>/<code>[/end].
      // Ведём по коду операции, не дожидаясь operations.json: сцену и её
      // существование проверит StoryEventRoute. Иначе клик сразу после
      // возврата из читалки мог молча ничего не сделать.
      if (onOpenEvent && selectedSet.group) {
        const part = ep.tag === 'After Operation' ? 'end' : undefined;
        onOpenEvent(selectedSet.group, ep.code, part, brief);
        return;
      }

      const byTag =
        ep.tag === 'After Operation'
          ? scenes?.end
          : ep.tag === 'Before Operation'
            ? scenes?.beg
            : scenes?.beg || scenes?.end;
      const storyTxt = byTag || scenes?.beg || scenes?.end || chapterStoryTxt;
      if (!storyTxt) return;

      onOpenChapter(storyTxt, brief);
    };

    return (
      <section
        aria-label={selectedSet.name}
        className="site-scrollbar fixed inset-0 z-50 w-screen h-screen bg-[#020305] text-white overflow-y-auto md:overflow-hidden flex flex-col md:flex-row select-none"
      >
        {/* Full-bleed art: только для десктопа; на телефоне картинка остаётся
            отдельным горизонтальным блоком сверху. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden md:block"
        >
          <ArtWork
            src={imageCdn(setCover(selectedSet), 1800)}
            alt=""
            loading="eager"
            fetchPriority="high"
            fallbackSrc={setArt(selectedSet)}
            className="w-full h-full object-cover object-[65%_center] md:object-right"
          />
        </div>

        {/* Top-Left Back + Home Bar (matching Operator page) */}
        <TopLeftNavBar
          onBack={() => {
            setSelSetId(null);
            setShowRecollectionStages(false);
            onCloseChapter?.();
          }}
          onHome={handleHomeClick}
        />

        {/* Left Artwork Area - Flush against the screen's left edge (zero black strip) */}
        <div className="relative z-10 w-full h-[45vh] md:flex-1 md:h-full overflow-hidden bg-[#020305] md:bg-transparent shrink-0">
          <ArtWork
            src={imageCdn(setCover(selectedSet), 1500)}
            alt={selectedSet.name}
            loading="eager"
            fetchPriority="high"
            fallbackSrc={setArt(selectedSet)}
            className="md:hidden w-full h-full object-cover object-center pointer-events-none"
          />

          {/* Как раньше на телефоне: картинка растворяется в чёрном фоне панели. */}
          <div
            aria-hidden="true"
            className="md:hidden absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(2,3,5,0.28) 0%, transparent 16%, transparent 74%, rgba(2,3,5,0.55) 92%, #020305 100%)',
            }}
          />

          {/* White Rounded CHAPTER RECOLLECTION Pill Button below the top-left nav bar */}
          <div className="absolute top-2.5 left-[216px] right-3 z-30 flex items-center justify-start gap-3 sm:inset-x-auto sm:left-6 sm:top-18 sm:right-auto sm:px-0">
            <button
              type="button"
              onClick={() => setShowRecollectionStages(true)}
              className="inline-flex h-[38px] max-w-full items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-white/95 px-3 text-[#141618] shadow-[0_6px_24px_rgba(0,0,0,0.65)] transition-transform hover:bg-white active:scale-95 cursor-pointer sm:h-auto sm:gap-2.5 sm:overflow-visible sm:px-5 sm:py-2"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#181a1c] shrink-0"
                aria-hidden="true"
              >
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z" />
              </svg>
              <span className="min-w-0 truncate whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.04em] sm:text-sm sm:tracking-[0.06em]">
                <span className="sm:hidden">{t.recollection || 'RECOLLECTION'}</span>
                <span className="hidden sm:inline">{t.chapter_recollection || 'CHAPTER RECOLLECTION'}</span>
              </span>
            </button>
          </div>

          {/* BOTTOM-LEFT STORYLINE CHAPTER SWITCHER: prev / current / next (3 slots) */}
          <div
            hidden={showRecollectionStages}
            onWheel={(e) => {
              const delta =
                Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
              if (Math.abs(delta) < 10) return;
              if (delta > 0 && nextSetId) {
                openSet(nextSetId);
              } else if (delta < 0 && prevSetId) {
                openSet(prevSetId);
              }
            }}
            className="absolute inset-x-0 sm:inset-x-auto sm:left-8 bottom-12 sm:bottom-14 z-40 flex flex-col items-center sm:items-start px-4 sm:px-0 pointer-events-auto select-none"
          >
            {/* Ряд логотипов: показываем только реально существующие главы. */}
            <div className="relative z-10 flex items-end gap-3 sm:gap-4 md:gap-5 pb-1">
              {/* Previous Chapter */}
              {prevSet && prevSetId && (
                <button
                  type="button"
                  onClick={() => openSet(prevSetId)}
                  title={prevSet.name}
                  className="group relative flex items-center justify-center focus:outline-none cursor-pointer w-[72px] sm:w-[92px] h-8 sm:h-9"
                >
                  <img
                    src={setLogo(prevSet)}
                    alt={prevSet.name}
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    className="max-h-7 sm:max-h-9 w-auto object-contain opacity-40 group-hover:opacity-85 scale-90 group-hover:scale-95 transition-all duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                  />
                </button>
              )}

              {/* Current Active Chapter */}
              <div className="flex items-center justify-center w-[92px] sm:w-[116px] h-9 sm:h-11">
                <img
                  src={setLogo(selectedSet)}
                  alt={selectedSet.name}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  className="max-h-10 sm:max-h-13 w-auto object-contain opacity-100 scale-100 drop-shadow-[0_2px_14px_rgba(255,255,255,0.4)]"
                />
              </div>

              {/* Next Chapter */}
              {nextSet && nextSetId && (
                <button
                  type="button"
                  onClick={() => openSet(nextSetId)}
                  title={nextSet.name}
                  className="group relative flex items-center justify-center focus:outline-none cursor-pointer w-[72px] sm:w-[92px] h-8 sm:h-9"
                >
                  <img
                    src={setLogo(nextSet)}
                    alt={nextSet.name}
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    className="max-h-7 sm:max-h-9 w-auto object-contain opacity-40 group-hover:opacity-85 scale-90 group-hover:scale-95 transition-all duration-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                  />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* CHAPTER RECOLLECTION: отдельная страница ключевых изображений главы */}
        {showRecollectionStages && (
          <StoryRecollectionPage
            set={{ id: selSetId, name: selectedSet.name, group: selectedSet.group }}
            art={setArt(selectedSet)}
            lineLabel={kicker(currentLine, t)}
            lineName={localizedLineName(currentLine)}
            lineIcon={P.lg(currentLine.abbr)}
            totalCount={lineGalleryTotal}
            items={galleryItems}
            chapters={recollectionChapters}
            loading={galleryLoading}
            lang={uiLang}
            onClose={() => setShowRecollectionStages(false)}
            onOpenScene={onOpenChapter}
            prevSet={
              prevSet && prevSetId
                ? { id: prevSetId, name: prevSet.name, group: prevSet.group }
                : null
            }
            nextSet={
              nextSet && nextSetId
                ? { id: nextSetId, name: nextSet.name, group: nextSet.group }
                : null
            }
            onOpenSet={(setId) => {
              const target = sets[setId];
              if (!target) return;
              setSelectedEpIdx(null);
              setSelSetId(setId);
            }}
          />
        )}
        {/* Right Lore & Operations Panel */}
        <div className="relative w-full md:w-[380px] lg:w-[440px] xl:w-[480px] shrink-0 h-auto md:h-full bg-[#020305] md:bg-transparent flex flex-col items-center px-5 sm:px-8 lg:px-10 py-6 md:py-8 z-20 overflow-visible md:overflow-hidden no-scrollbar text-center">
          <StoryOperationGradients />
          <div className="relative z-10 w-full max-w-[420px] flex-1 min-h-0 flex flex-col items-center">
            {/* Real Episode / Event Title Logo - centered with the synopsis */}
            <div className="mb-3 sm:mb-4 flex w-full items-center justify-center shrink-0">
              <img
                src={setLogo(selectedSet)}
                alt={selectedSet.name}
                draggable={false}
                loading="eager"
                decoding="async"
                className="max-w-[240px] sm:max-w-[280px] max-h-[84px] sm:max-h-[100px] w-auto h-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* Atmospheric Synopsis Paragraph - centered */}
            {selectedEpIdx !== null && visibleEpisodes[selectedEpIdx] ? (
              <div className="mb-3 w-full flex flex-col items-center text-center shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedEpIdx(null)}
                  className="mb-1 text-[10px] font-mono uppercase tracking-wider text-white/55 hover:text-white cursor-pointer"
                >
                  ← OVERVIEW
                </button>
                <div className="flex items-center justify-center gap-2 max-w-full min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {visibleEpisodes[selectedEpIdx].name}
                  </span>
                  <span className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.12)]/20 border border-[rgba(255,255,255,0.55)]/50 text-[rgba(255,255,255,0.9)] font-mono text-[11px] font-bold shrink-0">
                    {visibleEpisodes[selectedEpIdx].code}
                  </span>
                </div>
                <div className="mt-2 w-full max-w-[360px] px-1 space-y-1 text-[11px] sm:text-xs leading-[1.7] tracking-[0.02em] text-[#b8bcc2] font-normal text-center whitespace-pre-line">
                  {visibleEpisodes[selectedEpIdx].desc ||
                    synopsisLines.join('\n') ||
                    'Operation record synchronized with PRTS terminal.'}
                </div>
                <TranslatorBadge
                  storyPath={storyPathForEpisode(visibleEpisodes[selectedEpIdx])}
                />
              </div>
            ) : (
              synopsisLines.length > 0 && (
                <div className="mb-3 w-full max-w-[360px] px-1 space-y-1 text-[11px] sm:text-xs leading-[1.7] tracking-[0.02em] text-[#b8bcc2] font-normal text-center shrink-0">
                  {synopsisLines.map((line, index) => (
                    <p key={index} className="m-0">
                      {line}
                    </p>
                  ))}
                </div>
              )
            )}
            {!(selectedEpIdx !== null && visibleEpisodes[selectedEpIdx]) && (
              <TranslatorBadge storyPath={overviewStoryPath} />
            )}

            {/* Прологи и вставные сцены, которых нет среди операций */}
            {prologueStories.length > 0 && onOpenChapter && (
              <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-2 pb-3">
                {prologueStories.map((story) => {
                  const part = /part\s*(\d+)/i.exec(story.title)?.[1];
                  const code = part
                    ? `PART ${part}`
                    : story.title.replace(/^prologue[,\s]*/i, '').toUpperCase() ||
                      'PROLOGUE';
                  return (
                    <OperationStageButton
                      key={story.storyTxt}
                      code={code}
                      name={story.title}
                      kind="prologue"
                      onClick={() =>
                        onOpenChapter(story.storyTxt, {
                          name: story.title,
                          desc: '',
                          chapter: selectedSet.name,
                        })
                      }
                    />
                  );
                })}
              </div>
            )}

            {/* Operation Stage Buttons - сетка всегда видна целиком, без скролла */}
            {visibleEpisodes.length > 0 && (
              <div className="pt-3 border-t border-white/12 w-full flex-1 min-h-0 flex flex-col items-center">
                <OperationGrid
                  episodes={visibleEpisodes}
                  isRead={isOperationRead}
                  selectedIdx={selectedEpIdx}
                  onSelect={(idx) => openOperation(visibleEpisodes[idx], idx)}
                  onToggleRead={toggleOperationRead}
                />
              </div>
            )}

            {visibleEpisodes.length === 0 && selectedSet.startStoryTxt && onOpenChapter && (
              <div className="w-full border-t border-white/12 pt-4 flex flex-col items-center shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onOpenChapter(selectedSet.startStoryTxt as string, {
                      name: selectedSet.name,
                      desc: selectedSet.desc,
                      chapter: selectedSet.name,
                    })
                  }
                  className="group flex w-full max-w-[300px] items-center justify-center gap-2.5 rounded-md border border-[#e6e6e6]/50 bg-[#141416]/80 px-4 py-2.5 transition-colors hover:border-[#e6e6e6]/80 hover:bg-[#1c1c1e] cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-[rgba(255,255,255,0.92)]" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-[11px] font-black uppercase tracking-[0.24em] text-white/85 group-hover:text-white">
                    Read story
                  </span>
                </button>
                <p className="mt-2 max-w-[300px] text-center text-[10px] leading-snug text-white/40">
                  Operations for this chapter haven't been collected yet — the story starts from its first scene.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Полоса-«висп» на всю ширину экрана (под логотипами глав) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[55%] md:bottom-0 z-30 h-10 sm:h-12 pointer-events-none overflow-hidden"
        >
          <div
            className="w-full h-full"
            style={{
              background:
                "url('/assets/storymap/fx_curve_story.webp') repeat-x left center / auto 100%",
              opacity: 0.85,
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.45))',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "url('/assets/storymap/fx_curve_story_3.webp') repeat-x left center / auto 100%",
              opacity: 0.5,
            }}
          />
        </div>

        {/* Выбор сцены операции: до боя / после боя */}
        {sceneChoice && onOpenChapter && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSceneChoice(null)}
          >
            <div
              className="w-full max-w-[360px] border border-white/20 bg-[#0b0c10] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="shrink-0 border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/85">
                  {sceneChoice.code}
                </span>
                <span className="truncate text-xs font-bold uppercase tracking-[0.1em] text-white/85">
                  {sceneChoice.name}
                </span>
              </div>
              <p className="m-0 mb-3 text-[10px] leading-snug text-white/40">
                {isRussianUi
                  ? 'У этой операции две сцены. Какую открыть?'
                  : 'This operation has two scenes. Which one do you want to open?'}
              </p>
              <div className="flex flex-col gap-1.5">
                {sceneChoice.beg && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = sceneChoice.beg as string;
                      const info = sceneChoice;
                      setSceneChoice(null);
                      onOpenChapter(target, {
                        code: info.code,
                        name: info.name,
                        desc: info.desc,
                        chapter: selectedSet.name,
                      });
                    }}
                    className="w-full cursor-pointer border border-white/20 bg-white/[0.04] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-white/50 hover:text-white"
                  >
                    {isRussianUi ? 'До боя' : 'Before operation'}
                  </button>
                )}
                {sceneChoice.end && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = sceneChoice.end as string;
                      const info = sceneChoice;
                      setSceneChoice(null);
                      onOpenChapter(target, {
                        code: info.code,
                        name: info.name,
                        desc: info.desc,
                      });
                    }}
                    className="w-full cursor-pointer border border-white/20 bg-white/[0.04] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-white/50 hover:text-white"
                  >
                    {isRussianUi ? 'После боя' : 'After operation'}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSceneChoice(null)}
                className="mt-3 w-full cursor-pointer text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/35 transition-colors hover:text-white"
              >
                {isRussianUi ? 'Отмена' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // ============================================================================
  // VIEW 1: STORY MAP TIMELINE VIEW
  // ============================================================================
  /** Плитки глав для сеточного режима (общие для группировок по годам и линиям). */
  const renderGridTiles = (items: Array<{ id: string; set: StorySetData }>) => (
    <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-5">
      {items.map(({ id, set }) => {
        const rawLogo = set.title ? P.ti(set.title) : set.logoUrl || '';
        // Заглушка-баннер терминала — не логотип главы: показываем название.
        const logo = rawLogo.startsWith('/assets/terminal/') ? '' : rawLogo;
        // У глав основной линии — квадратный логотип, а не большой арт.
        const banner = set.main ? mainBanner(set) : '';
        const art = banner || imageCdn(setCover(set), 640);

        return (
          <button
            key={id}
            type="button"
            onClick={() => openSet(id)}
            title={set.name}
            className={`sm-tile group ${set.main ? 'main' : 'set'} relative cursor-pointer bg-transparent focus:outline-none`}
          >
            <span className="sm-card">
              <ArtWork
                src={art}
                alt={set.name}
                fallbackSrc={setArt(set)}
                className="sm-art"
              />
              {!set.main && logo && (
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="sm-ti"
                />
              )}
              {!set.main && !logo && (
                <span className="absolute inset-x-0 bottom-1 px-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">
                  {set.name}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="smap" role="region" aria-label="Arknights Story Map">
      <div className="sm-stage">
        {/* Top-Left Back + Home Bar (matching Operator page) */}
        <TopLeftNavBar onBack={onBackToTerminal} onHome={handleHomeClick} />

        {/* Dual Cross-Fading Background Layers (.sm-bgl) from torappu.prts.wiki */}
        <div
          className={`sm-bgl${bgState.activeSlot === 1 ? ' on' : ''}`}
          data-n="1"
          style={{
            backgroundImage: bgState.url1 ? `url("${bgState.url1}")` : undefined,
          }}
        />
        <div
          className={`sm-bgl${bgState.activeSlot === 2 ? ' on' : ''}`}
          data-n="2"
          style={{
            backgroundImage: bgState.url2 ? `url("${bgState.url2}")` : undefined,
          }}
        />

        {storyMode === 'map' && (
        <>
        {/* LEFT VERTICAL STORYLINE SWITCHER SIDEBAR */}
        <aside
          aria-label="Storyline Switcher"
          className="fixed left-0 top-0 bottom-2 z-30 w-[240px] sm:w-[305px] flex flex-col justify-center pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(6,8,11,0.96) 0%, rgba(6,8,11,0.84) 64%, rgba(6,8,11,0) 100%)',
          }}
        >
          {/* Vertical Axis Line on the far left */}
          <div
            aria-hidden="true"
            className="absolute top-14 bottom-4 left-[34px] sm:left-[48px] w-[1px] bg-gradient-to-b from-white/10 via-white/40 to-white/10"
          />

          <div
            ref={railRef}
            className="relative flex flex-col gap-6 sm:gap-7 pt-16 pb-10 max-h-full overflow-y-auto pointer-events-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {lines.map((L, idx) => {
              const isActive = idx === lineIdx;
              return (
                <button
                  key={L.id}
                  type="button"
                  data-line={idx}
                  onClick={() => pickLine(idx)}
                  className="group relative flex items-center text-left pl-[14px] sm:pl-[26px] pr-4 py-1 focus:outline-none cursor-pointer shrink-0"
                >
                  {/* Node Circle on Vertical Axis */}
                  <div className="relative flex items-center justify-center w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] shrink-0">
                    {isActive ? (
                      <>
                        <span className="absolute inset-0 rounded-full bg-[#090c10]/90 border border-white/45 shadow-[0_0_20px_rgba(255,255,255,0.7),inset_0_0_10px_rgba(255,255,255,0.25)]" />
                        <span className="relative w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
                      </>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/25 group-hover:border-white/55 transition-colors flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/75 group-hover:bg-white" />
                      </span>
                    )}
                  </div>

                  {/* Horizontal Connector Tick from Node to Emblem */}
                  <div
                    aria-hidden="true"
                    className={`h-[1px] transition-all duration-300 shrink-0 ${
                      isActive
                        ? 'w-5 sm:w-6 bg-white/80'
                        : 'w-3 sm:w-4 bg-white/25 group-hover:bg-white/50'
                    }`}
                  />

                  {/* Storyline Mode Emblem Icon from torappu.prts.wiki */}
                  <div
                    className={`shrink-0 flex items-center justify-center transition-all duration-300 mr-2.5 sm:mr-3 ${
                      isActive
                        ? 'w-9 h-9 sm:w-11 sm:h-11 opacity-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]'
                        : 'w-7 h-7 sm:w-8 sm:h-8 opacity-60 group-hover:opacity-95'
                    }`}
                  >
                    <img
                      src={P.lg(L.abbr)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Storyline Title Block */}
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-[10px] sm:text-[11px] tracking-[0.06em] leading-tight transition-colors ${
                        isActive
                          ? 'text-white/90 font-semibold'
                          : 'text-white/45 group-hover:text-white/75'
                      }`}
                    >
                      {kicker(L, t)}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Barlow Condensed', 'Oswald', sans-serif",
                      }}
                      className={`uppercase tracking-[0.04em] leading-none mt-0.5 transition-all truncate ${
                        isActive
                          ? 'text-lg sm:text-2xl font-extrabold text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]'
                          : 'text-sm sm:text-base font-bold text-white/45 group-hover:text-white/80'
                      }`}
                    >
                      {localizedLineName(L)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Timeline Track with Styled Bottom Scrollbar (.sm-view) */}
        <div className="sm-view">
          <div
            ref={trackRef}
            className={`sm-track${isDragging ? ' drag' : ''}`}
            onScroll={() => syncScrollUI()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onWheel={handleTrackWheel}
          >
            <div
              className="sm-row"
              style={{ width: `${layout.totalWidth}px` }}
            >
              {/* Dual Glowing Curve Wisps (.sm-wisp) */}
              <div className="sm-wisp" />
              <div className="sm-wisp w2" />

              {/* Positioned Timeline Nodes (.sm-it) */}
              {layout.positionedItems.map(({ key, x, y, node }) => {
                if (node.t === 'split') {
                  return (
                    <div
                      key={key}
                      className="sm-it split"
                      style={{ left: `${x}px`, top: `${y}%` }}
                    >
                      <div className="sm-split">
                        <img
                          src={P.act(node.icon)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                        <b>{node.sub}</b>
                      </div>
                    </div>
                  );
                }

                if (node.t === 'cross') {
                  const S = sets[node.s];
                  if (!S) return null;
                  const targetIdx =
                    typeof node.to === 'number'
                      ? node.to
                      : byId[String(node.to)];
                  const targetLine =
                    targetIdx !== undefined ? lines[targetIdx] : null;
                  const lbl = targetLine ? kicker(targetLine, t) : '';

                  return (
                    <div
                      key={key}
                      className="sm-it cross"
                      style={{ left: `${x}px`, top: `${y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (Date.now() < wheelLockUntilRef.current) return;
                        if (targetIdx !== undefined) {
                          pickLine(targetIdx, node.s);
                        }
                      }}
                    >
                      <div className="sm-cross">
                        <span className="sm-kick">{lbl} ›</span>
                        <img
                          className="sm-ti"
                          src={setLogo(S)}
                          alt={S.name}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                        <i className="sm-drop" />
                      </div>
                    </div>
                  );
                }

                // node.t === 'main' | 'set'
                const S = sets[node.s];
                if (!S) return null;
                // Check S.main from sets table so all Main Story chapters render as unmasked square banners
                const isMain = Boolean(S.main);

                return (
                  <div
                    key={key}
                    className={`sm-it ${isMain ? 'main' : 'set'}`}
                    data-set={node.s}
                    style={{ left: `${x}px`, top: `${y}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (Date.now() < wheelLockUntilRef.current) return;
                      openSet(node.s);
                    }}
                  >
                    {isMain ? (
                      /* MAIN STORY: Pure square banner image without circular/oval mask or duplicate title */
                      <div className="sm-card">
                        <ArtWork
                          className="sm-art"
                          src={mainBanner(S) || setArt(S)}
                          alt={S.name}
                          fallbackSrc={setArt(S)}
                        />
                      </div>
                    ) : (
                      /* SIDE STORY: Oval Vignette Card + Title Logo Overlay */
                      <div className="sm-card">
                        <ArtWork
                          className="sm-art"
                          src={setArt(S)}
                          alt={S.name}
                          fallbackSrc={setCover(S)}
                        />
                        <img
                          className="sm-ti"
                          src={setLogo(S)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </>
        )}

        {/* GRID: главы по годам или по линиям сюжета (как в игре) */}
        {storyMode !== 'map' && (
          <div className="absolute inset-0 z-20 overflow-y-auto no-scrollbar bg-[#080a0d]/72 px-4 pb-24 pt-16 sm:px-10 sm:pt-20">
            <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.12]" aria-hidden="true">
              <div
                className="h-full w-full"
                style={{
                  backgroundImage:
                    'repeating-conic-gradient(from 0deg at 50% 42%, rgba(255,255,255,0.35) 0deg 0.35deg, transparent 0.35deg 7.5deg)',
                  maskImage:
                    'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0.9) 0%, transparent 72%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0.9) 0%, transparent 72%)',
                }}
              />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[1500px]">
              <div className="relative pl-7 sm:pl-10">
                {/* Вертикальная ось с узлами */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-2 left-[7px] top-1 w-px bg-gradient-to-b from-white/10 via-white/45 to-white/10 sm:left-[9px]"
                />

                {storyMode === 'year'
                  ? yearGroups.map(([year, items]) => (
                      <section key={`year-${year}`} className="relative mb-9 sm:mb-12">
                        <div className="relative mb-3 flex items-center gap-3 sm:mb-4">
                          <span
                            aria-hidden="true"
                            className="absolute -left-7 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/55 bg-[#090b0f] sm:-left-10"
                          >
                            <span className="h-1 w-1 rounded-full bg-white/90" />
                          </span>
                          <span
                            style={{ fontFamily: "'Barlow Condensed', 'Oswald', sans-serif" }}
                            className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-white/85 sm:text-[15px]"
                          >
                            Year-{year || 8}
                          </span>
                        </div>
                        {renderGridTiles(items)}
                      </section>
                    ))
                  : lineGroups.map(({ line, items }) => (
                      <section key={`line-${line.id}`} className="relative mb-9 sm:mb-12">
                        <div className="relative mb-3 flex items-center gap-2.5 sm:mb-4">
                          <span
                            aria-hidden="true"
                            className="absolute -left-7 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/55 bg-[#090b0f] sm:-left-10"
                          >
                            <span className="h-1 w-1 rounded-full bg-white/90" />
                          </span>
                          <img
                            src={P.lg(line.abbr)}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            className="h-5 w-5 shrink-0 object-contain opacity-80 sm:h-6 sm:w-6"
                          />
                          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45 sm:text-[10px]">
                            {kicker(line, t)}
                          </span>
                          <span
                            style={{ fontFamily: "'Barlow Condensed', 'Oswald', sans-serif" }}
                            className="truncate text-[13px] font-extrabold uppercase tracking-[0.16em] text-white/85 sm:text-[15px]"
                          >
                            {localizedLineName(line)}
                          </span>
                        </div>
                        {renderGridTiles(items)}
                      </section>
                    ))}
              </div>
            </div>
          </div>
        )}

        {/* Верхний правый блок: кнопка карты + переключатель группировки */}
        <div className="absolute right-3 top-3 z-40 flex items-center gap-2 sm:right-6 sm:top-4">
          <button
            type="button"
            onClick={() => changeMode(storyMode === 'map' ? 'year' : 'map')}
            aria-label={storyMode === 'map' ? 'Show chapter grid' : 'Show story map'}
            title={storyMode === 'map' ? 'Grid' : 'Map'}
            className={`hidden h-9 w-9 items-center justify-center rounded-full border transition-colors cursor-pointer sm:flex ${
              storyMode === 'map'
                ? 'border-white/70 bg-white text-[#141618] shadow-[0_6px_20px_rgba(0,0,0,0.6)]'
                : 'border-white/20 bg-black/55 text-white/70 backdrop-blur-sm hover:border-white/50 hover:text-white'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4" aria-hidden="true">
              <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" strokeLinejoin="round" />
              <path d="M9 4v13M15 7v13" />
            </svg>
          </button>

          {/* Тумблер группировки виден только в сеточном режиме */}
          {storyMode !== 'map' && (
          <div
            className="relative flex h-9 items-center rounded-full bg-white/95 p-0.5 text-[#141618] shadow-[0_6px_20px_rgba(0,0,0,0.6)]"
            role="tablist"
            aria-label="Chapter grouping"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-[#141618] transition-transform duration-200 ease-out"
              style={{ transform: storyMode === 'line' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              role="tab"
              aria-selected={storyMode !== 'line'}
              onClick={() => changeMode('year')}
              className={`relative z-10 w-[54px] cursor-pointer text-center text-[10px] font-bold uppercase tracking-[0.06em] transition-colors sm:w-[92px] sm:text-[11px] sm:tracking-[0.08em] ${
                storyMode !== 'line' ? 'text-white' : 'text-[#141618]/70 hover:text-[#141618]'
              }`}
            >
              Years
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={storyMode === 'line'}
              onClick={() => changeMode('line')}
              className={`relative z-10 w-[54px] cursor-pointer text-center text-[10px] font-bold uppercase tracking-[0.06em] transition-colors sm:w-[92px] sm:text-[11px] sm:tracking-[0.08em] ${
                storyMode === 'line' ? 'text-white' : 'text-[#141618]/70 hover:text-[#141618]'
              }`}
            >
              <span className="sm:hidden">Lines</span>
              <span className="hidden sm:inline">Storylines</span>
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
