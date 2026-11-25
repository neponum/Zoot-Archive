/**
 * Единый источник SEO-текстов для страниц.
 *
 * Используется и в рантайме (`usePageMeta` — обновляет `<head>` при переходах
 * по SPA), и при сборке (`scripts/generate_static_pages.ts` — печёт отдельные
 * HTML для основных разделов, чтобы поисковики видели заголовки без JS).
 *
 * Правила:
 * - русский вариант — основной, английский — для en/zh/ja/ko интерфейса;
 * - `noindex` ставим только на служебные и пустые страницы;
 * - никаких выдуманных фактов: только то, что на странице действительно есть.
 */

export interface LocalizedText {
  ru: string;
  en: string;
}

export interface RouteSeo {
  title: LocalizedText;
  description: LocalizedText;
  /** Служебная страница: не индексировать. */
  noindex?: boolean;
  /** Для sitemap.xml. */
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
  /** Подпись для хлебных крошек и статической оболочки. */
  navLabel?: LocalizedText;
}

const SITE = 'rhodes.monster';
const BRAND_SUFFIX: LocalizedText = {
  ru: `— ${SITE}`,
  en: `— ${SITE}`,
};

/** Статические разделы. Ключ — путь без хвостового слэша. */
export const STATIC_ROUTE_SEO: Record<string, RouteSeo> = {
  '/': {
    title: {
      ru: 'Читалка сюжета Arknights онлайн — главы, события и личные дела',
      en: 'Arknights Story Reader — all chapters, events and operator records',
    },
    description: {
      ru: 'Читайте сюжет Arknights онлайн: основные главы, события, интерлюдии, личные дела и записи оперативников с переводами на русский и английский. Удобная читалка с закладками, историей диалогов и архивом переводов — rhodes.monster.',
      en: 'Read the Arknights story online: main chapters, events, interludes, operator dossiers and voice records with Russian and English translations. A fast story reader with history, bookmarks and a community translation archive — rhodes.monster.',
    },
    changefreq: 'daily',
    priority: 1,
    navLabel: { ru: 'Главная', en: 'Home' },
  },
  '/terminal': {
    title: {
      ru: 'Терминал Arknights — главы, события и операции',
      en: 'Arknights Terminal — chapters, events and operations',
    },
    description: {
      ru: 'Терминал rhodes.monster: все сюжетные главы и события Arknights в одном месте. Выбирайте год, сюжетную линию или операцию и открывайте историю в читалке с переводами.',
      en: 'The rhodes.monster terminal: every Arknights story chapter and event in one place. Pick a year, storyline or operation and open it in the reader with translations.',
    },
    changefreq: 'daily',
    priority: 0.95,
    navLabel: { ru: 'Терминал', en: 'Terminal' },
  },
  '/story/map': {
    title: {
      ru: 'Карта сюжета Arknights — все главы и события по годам',
      en: 'Arknights Story Map — every chapter and event by year',
    },
    description: {
      ru: 'Карта сюжета Arknights: основные главы, события, интерлюдии и побочные истории, разложенные по годам и сюжетным линиям. Открывайте любую главу и читайте онлайн с переводом.',
      en: 'The Arknights story map: main chapters, events, interludes and side stories arranged by year and storyline. Open any chapter and read it online with a translation.',
    },
    changefreq: 'weekly',
    priority: 0.9,
    navLabel: { ru: 'Карта сюжета', en: 'Story Map' },
  },
  '/story/grid': {
    title: {
      ru: 'Сетка глав Arknights — хронология сюжета',
      en: 'Arknights Story Grid — the full story chronology',
    },
    description: {
      ru: 'Сетка глав Arknights: хронология основного сюжета и событий, связи между линиями и быстрый переход к любой главе в читалке rhodes.monster.',
      en: 'The Arknights story grid: a chronology of the main story and events, connections between storylines and a quick jump to any chapter in the rhodes.monster reader.',
    },
    changefreq: 'weekly',
    priority: 0.85,
    navLabel: { ru: 'Сетка глав', en: 'Story Grid' },
  },
  '/chapters': {
    title: {
      ru: 'Список глав и событий Arknights — читать онлайн',
      en: 'All Arknights chapters and events — read online',
    },
    description: {
      ru: 'Полный список глав и событий Arknights с поиском, фильтрацией по году и сюжетной линии, отметками о прочтении и доступными переводами.',
      en: 'The full list of Arknights chapters and events with search, year and storyline filters, read marks and available translations.',
    },
    changefreq: 'weekly',
    priority: 0.85,
    navLabel: { ru: 'Главы', en: 'Chapters' },
  },
  '/operators': {
    title: {
      ru: 'Оперативники Arknights — досье, личные дела и озвучка',
      en: 'Arknights Operators — dossiers, records and voice lines',
    },
    description: {
      ru: 'Архив оперативников Arknights: личные дела, физические данные, записи, озвучка и скины. Поиск по имени и коду, фильтры по классу и редкости, переводы досье.',
      en: 'The Arknights operator archive: personal dossiers, physical exams, records, voice lines and skins. Search by name or code, filter by class and rarity, with translated dossiers.',
    },
    changefreq: 'weekly',
    priority: 0.9,
    navLabel: { ru: 'Оперативники', en: 'Operators' },
  },
  '/translate': {
    title: {
      ru: 'Переводы сюжета Arknights — архив сообщества',
      en: 'Arknights Story Translations — community archive',
    },
    description: {
      ru: 'Открытый архив переводов сюжета Arknights: файлы по главам и событиям, авторы, языки и предпросмотр. Материалы сообщества на русском и других языках.',
      en: 'An open archive of Arknights story translations: files by chapter and event, translators, languages and previews. Community-made translations in Russian and other languages.',
    },
    changefreq: 'weekly',
    priority: 0.8,
    navLabel: { ru: 'Переводы', en: 'Translations' },
  },
  '/integrated-strategies': {
    title: {
      ru: 'Integrated Strategies в Arknights — истории режима',
      en: 'Arknights Integrated Strategies — mode stories',
    },
    description: {
      ru: 'Все темы режима Integrated Strategies в Arknights: описания, финалы и связанные сюжетные сцены, которые можно прочитать в читалке.',
      en: 'Every Arknights Integrated Strategies theme: descriptions, endings and related story scenes you can read in the reader.',
    },
    changefreq: 'monthly',
    priority: 0.7,
    navLabel: { ru: 'Integrated Strategies', en: 'Integrated Strategies' },
  },
  '/reclamation-algorithm': {
    title: {
      ru: 'Reclamation Algorithm в Arknights — истории режима',
      en: 'Arknights Reclamation Algorithm — mode stories',
    },
    description: {
      ru: 'Темы режима Reclamation Algorithm в Arknights: описания, сюжетные сцены и переходы в читалку rhodes.monster.',
      en: 'Arknights Reclamation Algorithm themes: descriptions, story scenes and links into the rhodes.monster reader.',
    },
    changefreq: 'monthly',
    priority: 0.7,
    navLabel: { ru: 'Reclamation Algorithm', en: 'Reclamation Algorithm' },
  },
  '/terra': {
    title: {
      ru: 'Терра — мир Arknights',
      en: 'Terra — the world of Arknights',
    },
    description: {
      ru: 'Раздел о мире Терры в Arknights: карта, хронология и досье регионов. Раздел ещё в разработке.',
      en: 'A section about the world of Terra in Arknights: map, timeline and region dossiers. Still under construction.',
    },
    noindex: true,
    changefreq: 'monthly',
    priority: 0.3,
    navLabel: { ru: 'Терра', en: 'Terra' },
  },
  '/storage': {
    title: {
      ru: 'Хранилище — офлайн-тексты',
      en: 'Storage — offline texts',
    },
    description: {
      ru: 'Служебная страница: выбор языков для офлайн-загрузки текстов сценариев и прогресс синхронизации.',
      en: 'Utility page: choose languages for offline story text downloads and check sync progress.',
    },
    noindex: true,
    navLabel: { ru: 'Хранилище', en: 'Storage' },
  },
  '/disclaimer': {
    title: {
      ru: 'О проекте rhodes.monster',
      en: 'About rhodes.monster',
    },
    description: {
      ru: 'rhodes.monster — некоммерческий фан-проект сообщества: читалка сюжета Arknights и архив переводов. Кто мы, что делаем и каких прав придерживаемся.',
      en: 'rhodes.monster is a non-commercial community fan project: an Arknights story reader and translation archive. Who we are and what we do.',
    },
    changefreq: 'yearly',
    priority: 0.5,
    navLabel: { ru: 'О проекте', en: 'About' },
  },
  '/privacy': {
    title: {
      ru: 'Политика конфиденциальности — rhodes.monster',
      en: 'Privacy Policy — rhodes.monster',
    },
    description: {
      ru: 'Какие данные собирает rhodes.monster, как используется локальное хранилище и что не передаётся третьим лицам.',
      en: 'What data rhodes.monster collects, how local storage is used and what is never shared with third parties.',
    },
    changefreq: 'yearly',
    priority: 0.4,
    navLabel: { ru: 'Конфиденциальность', en: 'Privacy' },
  },
  '/takedown': {
    title: {
      ru: 'Правообладателям — rhodes.monster',
      en: 'Takedown — rhodes.monster',
    },
    description: {
      ru: 'Порядок обращения правообладателей: как сообщить о нарушении прав и какие материалы будут удалены.',
      en: 'Rights holder requests: how to report an infringement and which materials will be removed.',
    },
    changefreq: 'yearly',
    priority: 0.4,
    navLabel: { ru: 'Правообладателям', en: 'Takedown' },
  },
};

/** Страницы-разделы для статической генерации (без главной — она уже есть). */
export const PRERENDER_PATHS = Object.keys(STATIC_ROUTE_SEO).filter(
  (path) => path !== '/'
);

function cleanPath(pathname: string): string {
  const path = (pathname || '/').split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.replace(/\/+$/, '');
  return path || '/';
}

/**
 * Метаданные для произвольного пути: статические разделы, досье оперативника,
 * обзор события и отдельная сцена.
 */
export function resolveRouteSeo(pathname: string): RouteSeo {
  const path = cleanPath(pathname);
  const exact = STATIC_ROUTE_SEO[path];
  if (exact) return exact;

  // /operators/char_002_amiya
  const operator = path.match(/^\/(?:operators|operator)\/([^/]+)$/);
  if (operator) {
    const code = decodeURIComponent(operator[1]);
    return {
      title: {
        ru: `Оперативник ${code} — досье и личные дела`,
        en: `Operator ${code} — dossier and records`,
      },
      description: {
        ru: `Досье оперативника ${code} в Arknights: основные данные, физический осмотр, личные записи, озвучка и скины. Читайте на rhodes.monster.`,
        en: `The ${code} operator dossier in Arknights: basic info, physical exam, personal records, voice lines and skins. Read it on rhodes.monster.`,
      },
      navLabel: { ru: 'Оперативник', en: 'Operator' },
    };
  }

  // /event/act18d3 — обзор события
  const event = path.match(/^\/event\/([^/]+)$/);
  if (event) {
    const code = decodeURIComponent(event[1]);
    return {
      title: {
        ru: `Событие ${code} — сюжет Arknights`,
        en: `Event ${code} — Arknights story`,
      },
      description: {
        ru: `Сюжет события ${code} в Arknights: список глав и сцен, доступные переводы и чтение онлайн в читалке rhodes.monster.`,
        en: `The ${code} event story in Arknights: chapters and scenes, available translations and online reading in the rhodes.monster reader.`,
      },
      navLabel: { ru: 'Событие', en: 'Event' },
    };
  }

  // /story/event/act18d3 — обзор события в читалке
  const storyEvent = path.match(/^\/story\/event\/([^/]+)$/);
  if (storyEvent) {
    const code = decodeURIComponent(storyEvent[1]);
    return {
      title: {
        ru: `Сюжет ${code} — читалка Arknights`,
        en: `${code} story — Arknights reader`,
      },
      description: {
        ru: `Главы и сцены события ${code}: выбор перевода, операции до и после боя, чтение в полноэкранной читалке.`,
        en: `Chapters and scenes of the ${code} event: pick a translation, before/after operation scenes and read in the fullscreen reader.`,
      },
      navLabel: { ru: 'Сюжет', en: 'Story' },
    };
  }

  // /story/event/act18d3/SV-6 — конкретная сцена: тонкая страница, не индексируем
  if (/^\/story\/event\/[^/]+\/[^/]+/.test(path) || /^\/story\/[^/]+\/[^/]+/.test(path)) {
    const code = decodeURIComponent(path.split('/').pop() || 'Story');
    return {
      title: {
        ru: `${code} — сцена Arknights`,
        en: `${code} — Arknights scene`,
      },
      description: {
        ru: `Сцена ${code} в читалке rhodes.monster: диалоги, фон, эффекты и доступные переводы.`,
        en: `The ${code} scene in the rhodes.monster reader: dialogue, backgrounds, effects and available translations.`,
      },
      noindex: true,
      navLabel: { ru: 'Сцена', en: 'Scene' },
    };
  }

  return {
    title: {
      ru: 'Читалка сюжета Arknights онлайн',
      en: 'Arknights Story Reader',
    },
    description: {
      ru: 'Читалка сюжета Arknights и архив переводов: главы, события, личные дела оперативников.',
      en: 'An Arknights story reader and translation archive: chapters, events and operator records.',
    },
    navLabel: { ru: 'Страница', en: 'Page' },
  };
}

export function seoTitle(route: RouteSeo, isRu: boolean): string {
  return `${isRu ? route.title.ru : route.title.en} ${isRu ? BRAND_SUFFIX.ru : BRAND_SUFFIX.en}`;
}

export function seoDescription(route: RouteSeo, isRu: boolean): string {
  return isRu ? route.description.ru : route.description.en;
}
