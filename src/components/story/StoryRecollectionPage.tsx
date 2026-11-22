import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Language } from '../../types';
import { UI_STRINGS } from '../../translations';

/** Изображение из галереи главы (CHAPTER RECOLLECTION). */
export interface GalleryImage {
  id: string;
  w?: number;
  h?: number;
}

export interface GalleryItem {
  /** Подпись (EN, если есть). */
  n?: string;
  /** storyTxt сцены, в которой встречается изображение. */
  s?: string;
  /** Папка арта на torappu.prts.wiki. */
  src: 'images' | 'background';
  /** 'N' — одиночное, 'H' — склейка по горизонтали, 'V' — по вертикали. */
  t: 'N' | 'H' | 'V';
  imgs: GalleryImage[];
}

/** Глава сюжетной линии со своими ключевыми изображениями. */
export interface RecollectionChapter {
  id: string;
  name: string;
  group?: string;
  /** Логотип главы (title-арт). */
  logo?: string;
  items: GalleryItem[];
}

/** Ресайз CG через wsrv.nl: полные PNG весят ~1 МБ, превью — единицы КБ. */
const galleryUrl = (
  item: GalleryItem,
  image: GalleryImage,
  width: number,
  folder: 'images' | 'background' = item.src
): string =>
  `https://wsrv.nl/?url=torappu.prts.wiki/assets/avg/${folder}/${image.id}.png&w=${width}&output=webp&q=72`;

/** Оригинал на случай, если бесплатный ресайзер ответил 429/5xx. */
const galleryOriginalUrl = (
  image: GalleryImage,
  folder: 'images' | 'background' = 'images'
): string =>
  `https://torappu.prts.wiki/assets/avg/${folder}/${image.id}.png`;

/** Пропорции склейки: ширина/высота для контейнера. */
export function galleryAspect(item: GalleryItem): number {
  if (item.t === 'N') {
    const img = item.imgs[0];
    return img?.w && img?.h ? img.w / img.h : 16 / 9;
  }
  const totalW =
    item.t === 'H'
      ? item.imgs.reduce((sum, img) => sum + (img.w || 1), 0)
      : Math.max(...item.imgs.map((img) => img.w || 1));
  const totalH =
    item.t === 'V'
      ? item.imgs.reduce((sum, img) => sum + (img.h || 1), 0)
      : Math.max(...item.imgs.map((img) => img.h || 1));
  return totalW / totalH;
}

const preloadQueue = new Set<string>();
function preload(urls: string[]): void {
  for (const url of urls) {
    if (!url || preloadQueue.has(url)) continue;
    preloadQueue.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}

/**
 * Один файл CG с несколькими путями загрузки: wsrv (быстро, WebP),
 * соседняя папка, оригинал с PRTS. Если источник не ответил за 3 секунды,
 * переключаемся на следующий — пользователь не смотрит в чёрный экран.
 */
const GalleryImageElement: React.FC<{
  item: GalleryItem;
  image: GalleryImage;
  width: number;
  full: boolean;
}> = ({ item, image, width, full }) => {
  const otherFolder: 'images' | 'background' =
    item.src === 'images' ? 'background' : 'images';
  const sources = useMemo(
    () => [
      galleryUrl(item, image, width),
      galleryUrl(item, image, width, otherFolder),
      galleryOriginalUrl(image, item.src),
      galleryOriginalUrl(image, otherFolder),
    ],
    [item, image, width, otherFolder]
  );

  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const sourceKey = `${image.id}:${item.src}:${width}`;
  const lastSourceKeyRef = useRef(sourceKey);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Кэшированный кадр может вызвать onLoad до первого эффекта — не сбрасываем
    // загрузку на монтировании, только при реальной смене источника.
    if (lastSourceKeyRef.current === sourceKey) return;
    lastSourceKeyRef.current = sourceKey;
    setStep(0);
    setLoaded(false);
  }, [sourceKey]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [step, sourceKey]);

  // Медленный wsrv не должен держать пустой кадр: через 1.8 секунды
  // переключаемся на следующий источник. Прямые ссылки PRTS не трогаем по
  // таймеру — большой PNG может грузиться дольше, иначе мы «убежим» на 404.
  useEffect(() => {
    if (loaded || step >= 2 || step >= sources.length - 1) return;
    const timer = setTimeout(() => setStep((value) => value + 1), 1800);
    return () => clearTimeout(timer);
  }, [loaded, step, sources.length]);

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <img
        ref={imgRef}
        src={sources[Math.min(step, sources.length - 1)]}
        alt=""
        loading={full ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setStep((value) => Math.min(value + 1, sources.length))}
        className={`h-full w-full object-cover ${
          full ? '!object-contain' : ''
        } ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      />
      {!loaded && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#08090b]/85"
        >
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
        </span>
      )}
    </div>
  );
};

/** Ключевое изображение главы: одиночный CG или склейка из нескольких файлов. */
export const GalleryPicture: React.FC<{
  item: GalleryItem;
  width: number;
  full?: boolean;
}> = ({ item, width, full = false }) => {
  const aspect = galleryAspect(item);

  return (
    <div
      className={full ? 'flex shrink-0' : 'flex h-full w-full'}
      style={{
        width: full ? `min(86vw, ${(72 * aspect).toFixed(2)}vh)` : undefined,
        aspectRatio: full ? `${aspect}` : undefined,
        maxHeight: full ? '72vh' : undefined,
        flexDirection: item.t === 'V' ? 'column' : 'row',
      }}
    >
      {item.imgs.map((image, index) => (
        <GalleryImageElement
          key={`${image.id}-${index}`}
          item={item}
          image={image}
          width={width}
          full={full}
        />
      ))}
    </div>
  );
};

interface ChapterLink {
  id: string;
  name: string;
  group?: string;
}

interface StoryRecollectionPageProps {
  /** Глава, с которой открыли галерею. */
  set: { id?: string; name: string; group?: string };
  /** Арт главы (не используется в раскладке, оставлен для совместимости). */
  art?: string;
  /** «Main Story» / «Story Line · XX» — верхняя строка в шапке. */
  lineLabel: string;
  /** Название сюжетной линии («For Tomorrow»). */
  lineName: string;
  /** Эмблема сюжетной линии. */
  lineIcon: string;
  /** Всего изображений в сюжетной линии (счётчик в шапке). */
  totalCount: number;
  /** Изображения текущей главы (фолбэк, если chapters не передан). */
  items: GalleryItem[];
  /** Все главы линии с изображениями — для общей ленты. */
  chapters?: RecollectionChapter[];
  loading: boolean;
  /** Язык интерфейса для подписей галереи. */
  lang?: Language;
  onClose: () => void;
  /** Открыть сцену, в которой встречается изображение. */
  onOpenScene?: (storyTxt: string, extra?: { name?: string }) => void;
  prevSet?: ChapterLink | null;
  nextSet?: ChapterLink | null;
  onOpenSet?: (setId: string) => void;
}

interface ChapterBentoBlock {
  type: 'hero' | 'col';
  items: Array<{ item: GalleryItem; itemKey: string }>;
}

/** Ключ изображения для «избранного» и навигации. */
function itemKeyOf(chapterId: string, item: GalleryItem, index: number): string {
  const images = item.imgs.map((img) => img.id).join('+');
  return `${chapterId}::${item.s || item.n || index}::${images}`;
}

/**
 * Раскладка как в игре: каждые 7 изображений — один большой кадр (hero)
 * и две колонки по три миниатюры.
 */
function buildBentoBlocks(
  chapterId: string,
  items: GalleryItem[]
): ChapterBentoBlock[] {
  const blocks: ChapterBentoBlock[] = [];
  let i = 0;
  while (i < items.length) {
    blocks.push({
      type: 'hero',
      items: [{ item: items[i], itemKey: itemKeyOf(chapterId, items[i], i) }],
    });
    i += 1;

    const colEnd = Math.min(items.length, i + 6);
    while (i < colEnd) {
      const slice = items.slice(i, Math.min(colEnd, i + 3));
      blocks.push({
        type: 'col',
        items: slice.map((item, offset) => ({
          item,
          itemKey: itemKeyOf(chapterId, item, i + offset),
        })),
      });
      i += 3;
    }
  }
  return blocks;
}

const COLLECTED_KEY = 'rhodes_collected_recollections';

const RookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M5 3h2v2h2V3h2v2h2V3h2v2h2V3h2v4l-2 2v10h2v2H3v-2h2V9L3 7V3zm7 13.5l3.2-3.1c.9-.9.9-2.2 0-3.1-.8-.8-2.1-.8-2.9 0l-.3.3-.3-.3c-.8-.8-2.1-.8-2.9 0-.9.9-.9 2.2 0 3.1L12 16.5z" />
  </svg>
);

/** «EP 09» из group вида `main_9`; для сайд-историй — пусто. */
function episodeLabel(group?: string): string {
  const match = /^main_(\d+)$/.exec(group || '');
  return match ? `EP ${match[1].padStart(2, '0')}` : '';
}

/**
 * «Story recollection» — горизонтальная лента ключевых CG всей сюжетной
 * линии, как в игре: большие кадры + колонки миниатюр, нижняя линейка
 * логотипов глав и полноэкранный просмотр с коллекцией.
 */
export const StoryRecollectionPage: React.FC<StoryRecollectionPageProps> = ({
  set,
  lineLabel,
  lineName,
  lineIcon,
  totalCount,
  items,
  chapters,
  loading,
  lang = 'ru_RU',
  onClose,
  onOpenScene,
  onOpenSet,
}) => {
  const t = UI_STRINGS[lang];
  // ---- Коллекция (localStorage) ----
  const [collectedIds, setCollectedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(COLLECTED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [onlyCollected, setOnlyCollected] = useState(false);

  const toggleCollected = useCallback((id: string) => {
    setCollectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id];
      try {
        localStorage.setItem(COLLECTED_KEY, JSON.stringify(next));
      } catch {
        // localStorage может быть недоступен — не критично.
      }
      return next;
    });
  }, []);

  // ---- Список глав ----
  const chapterList = useMemo<RecollectionChapter[]>(() => {
    const fromProp = (chapters ?? []).filter((chapter) => chapter.items.length > 0);
    if (fromProp.length > 0) return fromProp;
    if (items.length === 0) return [];
    return [
      {
        id: set.id || set.name,
        name: set.name,
        group: set.group,
        items,
      },
    ];
  }, [chapters, items, set.id, set.name, set.group]);

  const visibleChapters = useMemo(() => {
    return chapterList
      .map((chapter) => ({
        ...chapter,
        items: onlyCollected
          ? chapter.items.filter((item, index) =>
              collectedIds.includes(itemKeyOf(chapter.id, item, index))
            )
          : chapter.items,
      }))
      .filter((chapter) => chapter.items.length > 0);
  }, [chapterList, onlyCollected, collectedIds]);

  const chapterSections = useMemo(
    () =>
      visibleChapters.map((chapter) => ({
        chapter,
        blocks: buildBentoBlocks(chapter.id, chapter.items),
      })),
    [visibleChapters]
  );

  const [activeSetId, setActiveSetId] = useState<string>(
    () => set.id || chapterList[0]?.id || ''
  );

  // Если активной главы нет в отфильтрованном списке — выбираем первую.
  useEffect(() => {
    if (visibleChapters.length === 0) return;
    if (!visibleChapters.some((chapter) => chapter.id === activeSetId)) {
      setActiveSetId(visibleChapters[0].id);
    }
  }, [visibleChapters, activeSetId]);

  // ---- Полноэкранный просмотр ----
  const flatDisplays = useMemo(() => {
    const list: Array<{
      chapter: RecollectionChapter;
      item: GalleryItem;
      itemKey: string;
    }> = [];
    for (const chapter of visibleChapters) {
      chapter.items.forEach((item, index) => {
        list.push({
          chapter,
          item,
          itemKey: itemKeyOf(chapter.id, item, index),
        });
      });
    }
    return list;
  }, [visibleChapters]);

  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);

  const currentLightboxIndex = useMemo(() => {
    if (!activeLightbox) return -1;
    return flatDisplays.findIndex((entry) => entry.itemKey === activeLightbox);
  }, [activeLightbox, flatDisplays]);

  const stepLightbox = useCallback(
    (dir: -1 | 1) => {
      if (flatDisplays.length === 0) return;
      const current = flatDisplays.findIndex(
        (entry) => entry.itemKey === activeLightbox
      );
      if (current === -1) return;
      const next =
        (current + dir + flatDisplays.length) % flatDisplays.length;
      setActiveLightbox(flatDisplays[next].itemKey);
    },
    [activeLightbox, flatDisplays]
  );

  // ---- Прокрутка ленты ----
  const stripRef = useRef<HTMLDivElement | null>(null);
  const bottomNavRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollToChapter = useCallback((targetSetId: string, smooth = true) => {
    setActiveSetId(targetSetId);
    const container = stripRef.current;
    if (!container) return;
    const sectionEl = container.querySelector<HTMLElement>(
      `[data-rec-chapter="${targetSetId}"]`
    );
    if (!sectionEl) return;

    const targetLeft = Math.max(
      0,
      sectionEl.offsetLeft - Math.min(280, window.innerWidth * 0.22)
    );
    container.scrollTo({
      left: targetLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Прокручиваем к главе, с которой открыли галерею (один раз, после загрузки).
  const didInitScroll = useRef(false);
  useEffect(() => {
    if (didInitScroll.current || !set.id || loading || visibleChapters.length === 0) {
      return;
    }
    didInitScroll.current = true;
    const timer = setTimeout(() => scrollToChapter(set.id as string, false), 40);
    return () => clearTimeout(timer);
  }, [set.id, loading, visibleChapters.length, scrollToChapter]);

  const handleStripScroll = useCallback(() => {
    const container = stripRef.current;
    if (!container) return;
    const viewportFocusX = container.scrollLeft + container.clientWidth * 0.38;
    let bestSetId = visibleChapters[0]?.id || '';
    let bestDist = Infinity;

    container
      .querySelectorAll<HTMLElement>('[data-rec-chapter]')
      .forEach((node) => {
        const id = node.getAttribute('data-rec-chapter');
        if (!id) return;
        const start = node.offsetLeft;
        const end = start + node.offsetWidth;
        const dist =
          viewportFocusX >= start && viewportFocusX <= end
            ? 0
            : Math.min(
                Math.abs(viewportFocusX - start),
                Math.abs(viewportFocusX - end)
              );
        if (dist < bestDist) {
          bestDist = dist;
          bestSetId = id;
        }
      });

    if (bestSetId && bestSetId !== activeSetId) {
      setActiveSetId(bestSetId);
    }
  }, [visibleChapters, activeSetId]);

  // Активный логотип держим по центру нижней линейки.
  useEffect(() => {
    const nav = bottomNavRef.current;
    if (!nav || !activeSetId) return;
    const btn = nav.querySelector<HTMLElement>(
      `[data-bottom-ep="${activeSetId}"]`
    );
    if (btn) {
      const target =
        btn.offsetLeft + btn.offsetWidth / 2 - nav.clientWidth / 2;
      nav.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
    }
  }, [activeSetId]);

  // Перетаскивание ленты мышью.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !stripRef.current) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: stripRef.current.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const container = stripRef.current;
    if (!drag || !container) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      setIsDragging(true);
    }
    if (drag.moved) {
      container.scrollLeft = drag.startScrollLeft - dx;
    }
  };

  const handlePointerUp = () => {
    if (!dragStateRef.current) return;
    setTimeout(() => setIsDragging(false), 40);
    dragStateRef.current = null;
  };

  // ---- Предзагрузка соседних кадров ----
  useEffect(() => {
    const index = visibleChapters.findIndex(
      (chapter) => chapter.id === activeSetId
    );
    if (index === -1) return;
    const neighbors = [
      visibleChapters[index],
      visibleChapters[index + 1],
      visibleChapters[index - 1],
    ].filter(Boolean) as RecollectionChapter[];
    const urls: string[] = [];
    for (const chapter of neighbors) {
      const hero = chapter.items[0];
      if (hero?.imgs[0]) urls.push(galleryUrl(hero, hero.imgs[0], 1100));
    }
    preload(urls);
  }, [activeSetId, visibleChapters]);

  useEffect(() => {
    if (!activeLightbox) return;
    const index = flatDisplays.findIndex(
      (entry) => entry.itemKey === activeLightbox
    );
    if (index === -1) return;
    const current = flatDisplays[index];
    const next = flatDisplays[(index + 1) % flatDisplays.length];
    const prev =
      flatDisplays[(index - 1 + flatDisplays.length) % flatDisplays.length];
    const urls: string[] = [];
    for (const entry of [current, next, prev]) {
      for (const image of entry?.item.imgs ?? []) {
        urls.push(galleryUrl(entry.item, image, 1600));
      }
    }
    preload(urls);
  }, [activeLightbox, flatDisplays]);

  // ---- Клавиатура ----
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeLightbox) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setActiveLightbox(null);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          stepLightbox(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          stepLightbox(1);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft' && stripRef.current) {
        stripRef.current.scrollBy({ left: -460, behavior: 'smooth' });
      } else if (event.key === 'ArrowRight' && stripRef.current) {
        stripRef.current.scrollBy({ left: 460, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeLightbox, stepLightbox, onClose]);

  const count = totalCount || flatDisplays.length;

  // ==========================================================================
  // VIEW B: ПОЛНОЭКРАННЫЙ ПРОСМОТР CG
  // ==========================================================================
  if (activeLightbox) {
    const entry = flatDisplays[currentLightboxIndex] ?? flatDisplays[0];
    if (entry) {
      const { chapter, item } = entry;
      const isCollected = collectedIds.includes(entry.itemKey);

      return (
        <section
          aria-label={item.n || 'Story recollection'}
          className="fixed inset-0 z-[70] flex h-screen w-screen flex-col justify-between overflow-hidden bg-[#050608] text-white select-none"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 92% 45%, rgba(120, 28, 28, 0.24) 0%, transparent 52%)',
            }}
          />

          {/* Верхняя панель */}
          <div className="relative z-30 flex items-center justify-between px-3 pt-2.5">
            <button
              type="button"
              onClick={() => setActiveLightbox(null)}
              aria-label="Back to gallery"
              className="flex h-[38px] w-[96px] cursor-pointer items-center bg-[#2b2d30]/92 pl-4 text-white shadow-[0_6px_18px_rgba(0,0,0,0.5)] transition-colors hover:bg-[#3a3d42] sm:h-[42px] sm:w-[112px]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-6 w-6"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => toggleCollected(entry.itemKey)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition-all sm:px-5 sm:text-sm ${
                isCollected
                  ? 'bg-[#f5b400] text-[#121316] shadow-[0_0_22px_rgba(245,180,0,0.65)]'
                  : 'bg-[#e8eaed] text-[#18191c] shadow-[0_0_20px_rgba(255,255,255,0.45)] hover:bg-white'
              }`}
            >
              <RookIcon className="h-4 w-4 shrink-0" />
              <span>
                {isCollected
                  ? t.in_gallery || 'COLLECTED IN GALLERY'
                  : t.collect_to_gallery || 'COLLECT TO GALLERY'}
              </span>
            </button>
          </div>

          {/* Кадр и стрелки */}
          <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-12 sm:px-20">
            <button
              type="button"
              onClick={() => stepLightbox(-1)}
              aria-label="Previous illustration"
              className="group fixed left-2 top-1/2 z-30 flex h-24 w-12 -translate-y-1/2 cursor-pointer items-center justify-center text-white/75 transition-all hover:text-white sm:left-5"
            >
              <svg
                viewBox="0 0 36 72"
                fill="none"
                className="h-16 w-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-transform group-hover:scale-110 sm:h-20 sm:w-10"
              >
                <polyline
                  points="28 8 8 36 28 64"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="32 14 16 36 32 58"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="relative flex h-full max-h-[82vh] w-full max-w-[1380px] items-center justify-center">
              <GalleryPicture
                item={item}
                width={1600}
                full
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(5,6,8,0.68) 55%, rgba(5,6,8,0.95) 100%)',
                }}
              />

              <div className="pointer-events-none absolute bottom-3 left-2 z-20 max-w-3xl pr-4 sm:bottom-5 sm:left-6">
                <h2 className="text-lg font-bold tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:text-2xl">
                  {item.n || chapter.name}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#a6adb8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] sm:text-sm">
                  {chapter.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => stepLightbox(1)}
              aria-label="Next illustration"
              className="group fixed right-2 top-1/2 z-30 flex h-24 w-12 -translate-y-1/2 cursor-pointer items-center justify-center text-white/75 transition-all hover:text-white sm:right-5"
            >
              <svg
                viewBox="0 0 36 72"
                fill="none"
                className="h-16 w-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-transform group-hover:scale-110 sm:h-20 sm:w-10"
              >
                <polyline
                  points="8 8 28 36 8 64"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="4 14 20 36 4 58"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeOpacity="0.55"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Нижняя панель: логотип главы + кнопка сцены */}
          <div className="relative z-30 flex h-16 items-center gap-5 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pb-2 sm:h-20 sm:gap-7 sm:px-20">
            {chapter.logo ? (
              <button
                type="button"
                onClick={() => {
                  setActiveLightbox(null);
                  scrollToChapter(chapter.id, true);
                }}
                title={chapter.name}
                className="flex cursor-pointer items-center justify-center transition-opacity hover:opacity-90"
              >
                <img
                  src={chapter.logo}
                  alt={chapter.name}
                  draggable={false}
                  className="h-11 w-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:h-14"
                />
              </button>
            ) : (
              <span className="text-sm font-semibold text-white/85">
                {chapter.name}
              </span>
            )}

            <div className="h-10 w-px shrink-0 bg-white/30" />

            {item.s && onOpenScene ? (
              <button
                type="button"
                onClick={() => onOpenScene(item.s as string, { name: item.n })}
                className="group relative inline-flex cursor-pointer items-center py-1 pl-5 pr-1 focus:outline-none"
              >
                <div className="relative z-20 -ml-5 h-11 w-11 shrink-0 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.9)] sm:h-12 sm:w-12">
                  <svg viewBox="0 0 64 64" className="h-full w-full">
                    <circle cx="32" cy="32" r="30.5" fill="#17191c" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28.5"
                      fill="#f0f2f5"
                      stroke="#2c3036"
                      strokeWidth="1.2"
                    />
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
                    <circle
                      cx="32"
                      cy="32"
                      r="7"
                      fill="#26292e"
                      stroke="#6c727a"
                      strokeWidth="1.2"
                    />
                    <circle cx="32" cy="32" r="2.5" fill="#ced3da" />
                  </svg>
                </div>

                <div className="relative z-10 -ml-4 flex min-w-[180px] items-center justify-between gap-5 border border-white/15 bg-[#2a2d32]/95 py-1.5 pl-6 pr-3.5 shadow-lg transition-colors group-hover:bg-[#353940] sm:min-w-[210px]">
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-extrabold leading-none tracking-tight text-white sm:text-base">
                      {t.open_scene || 'OPEN SCENE'}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-[2px] bg-[#5a5f68] px-1.5 py-0.2 text-[9px] font-semibold leading-tight text-[#e5e7eb] sm:text-[10px]">
                        {(t.story || 'STORY').toUpperCase()}
                      </span>
                      <span className="max-w-[140px] truncate text-[11px] font-medium text-[#9ca3af] sm:text-xs">
                        {item.n || chapter.name}
                      </span>
                    </div>
                  </div>
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="h-3.5 w-3.5 shrink-0 text-white/90 transition-transform group-hover:translate-x-0.5"
                  >
                    <polygon points="4,2 14,8 4,14" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="font-mono text-xs uppercase tracking-widest text-white/55">
                {chapter.name} · {t.archive_record || 'ARCHIVE RECORD'}
              </div>
            )}
          </div>
        </section>
      );
    }
  }

  // ==========================================================================
  // VIEW A: ЛЕНТА-ГАЛЕРЕЯ
  // ==========================================================================
  return (
    <section
      aria-label="Story recollection gallery"
      className="fixed inset-0 z-[55] flex h-screen w-screen select-none flex-col justify-between overflow-hidden bg-[#0c0d10] text-white"
    >
      {/* Фон: вертикальные «стеклянные» полосы + багровое свечение */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 68% 42% at 50% 78%, rgba(128, 22, 38, 0.34) 0%, rgba(12, 13, 16, 0) 70%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.008) 26px, rgba(0,0,0,0.35) 54px, rgba(0,0,0,0.5) 56px)
          `,
        }}
      />

      {/* Верхняя панель */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between px-3 pt-2.5 sm:px-5">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="flex h-[38px] w-[92px] cursor-pointer items-center bg-[#2b2d30]/90 pl-4 text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#383b40] sm:h-[42px] sm:w-[108px]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-6 w-6"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setOnlyCollected((prev) => !prev)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide transition-all sm:px-5 sm:text-sm ${
              onlyCollected
                ? 'bg-[#f5b400] text-[#141518] shadow-[0_0_24px_rgba(245,180,0,0.75)]'
                : 'bg-white text-[#141518] shadow-[0_0_22px_rgba(255,255,255,0.65)] hover:scale-[1.02]'
            }`}
          >
            <RookIcon className="h-4 w-4 shrink-0" />
            <span className="font-mono text-xs opacity-75">»</span>
            <span>
              {onlyCollected
                ? `${t.collected || 'COLLECTED'} (${collectedIds.length})`
                : t.collected_recollections || 'COLLECTED RECOLLECTIONS'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden items-center gap-2.5 sm:flex">
            {lineIcon && (
              <img
                src={lineIcon}
                alt=""
                draggable={false}
                className="h-8 w-8 object-contain opacity-80"
              />
            )}
            <div className="flex flex-col items-start leading-tight">
              <div className="flex items-center gap-1.5 text-[11px] text-white/75">
                <span className="font-serif font-semibold tracking-wide">
                  {lineLabel}
                </span>
                <span className="text-white/40">/</span>
                <span className="text-[10px] uppercase tracking-wider text-white/60">
                  {(t.story_line || 'STORY LINE').toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-bold tracking-wide text-white sm:text-base">
                {lineName}
              </span>
            </div>
          </div>

          <div className="hidden h-7 w-px bg-white/30 sm:block" />

          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/75 px-4 py-1.5 shadow-inner">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4 text-white/80 sm:h-5 sm:w-5"
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z" />
            </svg>
            <span className="font-sans text-base font-semibold tracking-wide text-white sm:text-xl">
              {count}
            </span>
          </div>
        </div>
      </header>

      {/* Центральная лента */}
      <div className="relative z-20 flex flex-1 items-center overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : visibleChapters.length === 0 ? (
          <div className="flex w-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-white/65">
              {onlyCollected
                ? t.no_collected_recollection ||
                  'No collected recollections yet. Open any illustration and press "COLLECT TO GALLERY".'
                : t.no_recollection ||
                  'No recollection illustrations found for this storyline.'}
            </p>
            {onlyCollected && (
              <button
                type="button"
                onClick={() => setOnlyCollected(false)}
                className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black"
              >
                {t.show_all_illustrations || 'Show all illustrations'}
              </button>
            )}
          </div>
        ) : (
          <div
            ref={stripRef}
            onScroll={handleStripScroll}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={(event) => {
              if (!stripRef.current) return;
              const delta =
                Math.abs(event.deltaX) > Math.abs(event.deltaY)
                  ? event.deltaX
                  : event.deltaY;
              stripRef.current.scrollLeft += delta;
            }}
            style={{ scrollbarWidth: 'none' }}
            className={`flex h-[clamp(300px,58vh,475px)] w-full items-center gap-[14px] overflow-x-auto overflow-y-hidden pl-[max(60px,18vw)] pr-[max(120px,24vw)] ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {chapterSections.map(({ chapter, blocks }) => {
              const isSectionActive = chapter.id === activeSetId;
              return (
                <div
                  key={chapter.id}
                  data-rec-chapter={chapter.id}
                  className={`flex h-full shrink-0 items-stretch gap-[8px] transition-opacity duration-300 ${
                    isSectionActive ? 'opacity-100' : 'opacity-90'
                  }`}
                >
                  {blocks.map((block, blockIndex) => {
                    if (block.type === 'hero') {
                      const entry = block.items[0];
                      return (
                        <button
                          key={`${chapter.id}-hero-${blockIndex}`}
                          type="button"
                          onClick={() => {
                            if (isDragging) return;
                            setActiveSetId(chapter.id);
                            setActiveLightbox(entry.itemKey);
                          }}
                          title={entry.item.n}
                          className="group relative h-full w-auto shrink-0 cursor-pointer overflow-hidden border-[1.5px] border-white/75 bg-[#060709] shadow-[0_10px_30px_rgba(0,0,0,0.75)] focus:outline-none hover:border-white"
                          style={{
                            aspectRatio: '16 / 9.4',
                            maxWidth: '82vw',
                          }}
                        >
                          <GalleryPicture
                            item={{ ...entry.item, t: 'N', imgs: [entry.item.imgs[0]] }}
                            width={1100}
                          />

                          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="min-w-0 text-left">
                              <div className="truncate text-xs font-bold text-white sm:text-sm">
                                {entry.item.n || chapter.name}
                              </div>
                              <div className="font-mono text-[10px] text-white/75">
                                {chapter.name}
                              </div>
                            </div>
                          </div>

                          {entry.item.imgs.length > 1 && (
                            <span className="absolute bottom-2 right-2 z-10 flex h-[22px] min-w-[28px] items-center justify-center rounded-full border border-white/35 bg-[#24272c]/90 px-2 text-xs font-semibold text-white shadow-md">
                              {entry.item.imgs.length}
                            </span>
                          )}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={`${chapter.id}-col-${blockIndex}`}
                        className="flex h-full shrink-0 flex-col justify-between gap-[8px]"
                      >
                        {block.items.map((entry) => (
                          <button
                            key={entry.itemKey}
                            type="button"
                            onClick={() => {
                              if (isDragging) return;
                              setActiveSetId(chapter.id);
                              setActiveLightbox(entry.itemKey);
                            }}
                            title={entry.item.n}
                            className="group relative w-auto shrink-0 cursor-pointer overflow-hidden border border-white/60 bg-[#060709] shadow-[0_4px_14px_rgba(0,0,0,0.65)] focus:outline-none hover:border-white"
                            style={{
                              height: 'calc((100% - 16px) / 3)',
                              aspectRatio: '16 / 9.8',
                              maxWidth: '82vw',
                            }}
                          >
                            <GalleryPicture
                              item={{ ...entry.item, t: 'N', imgs: [entry.item.imgs[0]] }}
                              width={420}
                            />

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 py-1 text-left opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="block truncate text-[10px] font-semibold text-white">
                                {entry.item.n || chapter.name}
                              </span>
                            </div>

                            {entry.item.imgs.length > 1 && (
                              <span className="absolute bottom-1.5 right-1.5 z-10 flex h-[20px] min-w-[26px] items-center justify-center rounded-full border border-white/35 bg-[#2b2e35]/90 px-1.5 text-[11px] font-semibold text-white shadow">
                                {entry.item.imgs.length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Нижняя линейка глав */}
      <footer className="relative z-30 flex h-[108px] w-full shrink-0 flex-col justify-end overflow-hidden sm:h-[118px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-2 h-16"
        >
          <div
            className="h-full w-full"
            style={{
              background:
                "url('/assets/storymap/fx_curve_story.webp') repeat-x center center / auto 100%",
              opacity: 0.85,
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "url('/assets/storymap/fx_curve_story_3.webp') repeat-x center center / auto 100%",
              opacity: 0.55,
            }}
          />
        </div>

        <div
          ref={bottomNavRef}
          onWheel={(event) => {
            if (!bottomNavRef.current) return;
            const delta =
              Math.abs(event.deltaX) > Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY;
            bottomNavRef.current.scrollLeft += delta;
          }}
          style={{ scrollbarWidth: 'none' }}
          className="relative z-10 flex h-full w-full items-end gap-5 overflow-x-auto overflow-y-hidden px-[28vw] pb-3 sm:gap-8"
        >
          {visibleChapters.map((chapter) => {
            const isActive = chapter.id === activeSetId;
            return (
              <button
                key={`bottom-ep-${chapter.id}`}
                type="button"
                data-bottom-ep={chapter.id}
                onClick={() => scrollToChapter(chapter.id, true)}
                title={chapter.name}
                className="group relative flex h-[88px] min-w-[200px] shrink-0 cursor-pointer flex-col items-center justify-end px-5 pb-1 focus:outline-none sm:h-[96px] sm:min-w-[260px]"
              >
                {chapter.logo ? (
                  <img
                    src={chapter.logo}
                    alt={chapter.name}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    className={`relative z-10 max-h-[60px] w-auto object-contain transition-all duration-300 sm:max-h-[70px] ${
                      isActive
                        ? 'scale-105 opacity-100 drop-shadow-[0_2px_16px_rgba(255,255,255,0.55)]'
                        : 'scale-90 opacity-45 group-hover:scale-95 group-hover:opacity-80'
                    }`}
                  />
                ) : (
                  <span
                    className={`relative z-10 max-w-full truncate px-2 text-center text-xs font-semibold transition-colors ${
                      isActive ? 'text-white' : 'text-white/45 group-hover:text-white/75'
                    }`}
                  >
                    {chapter.name}
                  </span>
                )}

                {episodeLabel(chapter.group) && (
                  <span className="relative z-10 mt-1 font-mono text-[8px] uppercase tracking-[0.28em] text-[#e8c07a]/70 sm:text-[10px]">
                    {episodeLabel(chapter.group)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </footer>
    </section>
  );
};
