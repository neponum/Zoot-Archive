import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getUiLanguage } from '../utils/uiLanguage';
import {
  resolveRouteSeo,
  seoDescription,
  seoTitle,
  STATIC_ROUTE_SEO,
  type RouteSeo,
} from '../config/seo';
import OPERATOR_NAMES from '../data/operatorNames.json';
import STORY_TITLES from '../data/storyTitlesRu.json';
import STORY_CHAPTER_NAMES from '../data/storyChapterNames.json';

const RU_CHAPTERS = (STORY_TITLES as { chapters?: Record<string, string> }).chapters ?? {};
const RU_EPISODES = (STORY_TITLES as { episodes?: Record<string, string> }).episodes ?? {};
const EN_CHAPTERS = STORY_CHAPTER_NAMES as Record<string, string>;

const SITE_ORIGIN = 'https://rhodes.monster';

function setMeta(selector: string, attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/** Хлебные крошки для текущего раздела — помогают поисковикам понять структуру. */
function breadcrumbs(path: string, isRu: boolean) {
  const items: Array<{ name: string; url: string }> = [
    { name: isRu ? 'Главная' : 'Home', url: `${SITE_ORIGIN}/` },
  ];
  if (path === '/' || path === '') return items;

  const section = `/${path.split('/')[1] || ''}`;
  const meta = STATIC_ROUTE_SEO[section] ?? resolveRouteSeo(path);
  const label = isRu ? meta.navLabel?.ru : meta.navLabel?.en;
  const sectionPath = STATIC_ROUTE_SEO[section] ? section : path;
  if (label) {
    items.push({ name: label, url: `${SITE_ORIGIN}${sectionPath}` });
  }
  if (sectionPath !== path) {
    const route = resolveRouteSeo(path);
    const tail = isRu ? route.navLabel?.ru : route.navLabel?.en;
    if (tail) items.push({ name: tail, url: `${SITE_ORIGIN}${path}` });
  }
  return items;
}

/**
 * Подставляет человеческие имена вместо внутренних кодов:
 * `char_002_amiya` → «Amiya», `act18d3` → «Под волнами».
 * Это заметно улучшает сниппет в поиске.
 */
function withHumanNames(route: RouteSeo, path: string, isRu: boolean): RouteSeo {
  const operator = path.match(/^\/(?:operators|operator)\/([^/]+)$/);
  if (operator) {
    const id = decodeURIComponent(operator[1]);
    const name = (OPERATOR_NAMES as Record<string, string>)[id];
    if (!name) return route;
    return {
      ...route,
      title: {
        ru: `${name} — досье оперативника Arknights`,
        en: `${name} — Arknights operator dossier`,
      },
      description: {
        ru: `Личное дело ${name} в Arknights: основные данные, физический осмотр, записи, озвучка и скины. Читайте досье на rhodes.monster.`,
        en: `${name}'s dossier in Arknights: basic info, physical exam, records, voice lines and skins. Read it on rhodes.monster.`,
      },
    };
  }

  const event = path.match(/^\/(?:story\/event|event)\/([^/]+)$/);
  if (event) {
    const code = decodeURIComponent(event[1]);
    const ruName = RU_CHAPTERS[code];
    const enName = EN_CHAPTERS[code];
    // У части новых событий есть только китайское название — тогда честнее
    // показать код, чем русскую подпись с китайским текстом.
    const ruLabel = ruName || enName;
    const enLabel = enName;
    if (isRu ? Boolean(ruLabel) : Boolean(enLabel)) {
      return {
        ...route,
        title: {
          ru: `«${ruLabel || code}» — сюжет события Arknights`,
          en: `“${enLabel || code}” — Arknights event story`,
        },
        description: {
          ru: `Сюжет события «${ruLabel || code}» (${code}) в Arknights: список глав и сцен, доступные переводы и чтение онлайн в читалке rhodes.monster.`,
          en: `The “${enLabel || code}” (${code}) event story in Arknights: chapters, scenes, translations and online reading on rhodes.monster.`,
        },
      };
    }
  }

  const scene = path.match(/^\/story\/event\/([^/]+)\/([^/]+)/);
  if (scene) {
    const code = decodeURIComponent(scene[2]);
    const ruName = RU_EPISODES[`${scene[1]}|${code}`];
    if (isRu && ruName) {
      return {
        ...route,
        title: {
          ru: `«${ruName}» (${code}) — сцена Arknights`,
          en: `“${ruName}” (${code}) — Arknights scene`,
        },
        description: {
          ru: `Сцена «${ruName}» (${code}) в читалке rhodes.monster: диалоги, фон, эффекты и доступные переводы.`,
          en: `The “${ruName}” (${code}) scene in the rhodes.monster reader: dialogue, backgrounds, effects and translations.`,
        },
      };
    }
  }

  return route;
}

/** Обновляет title, description, canonical, Open Graph, Twitter и JSON-LD. */
export function applyRouteMeta(pathname: string) {
  const isRu = (() => {
    const uiLang = getUiLanguage();
    return uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';
  })();
  const path = pathname || '/';
  const route = withHumanNames(resolveRouteSeo(path), path, isRu);
  const title = seoTitle(route, isRu);
  const description = seoDescription(route, isRu);
  const canonical = `${SITE_ORIGIN}${path === '/' ? '/' : path.replace(/\/+$/, '')}`;

  document.title = title;
  document.documentElement.lang = isRu ? 'ru' : 'en';

  setMeta('meta[name="description"]', 'name', 'description', description);
  setMeta(
    'meta[name="robots"]',
    'name',
    'robots',
    route.noindex
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  );
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
  setMeta('meta[property="og:locale"]', 'property', 'og:locale', isRu ? 'ru_RU' : 'en_US');
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  setLink('canonical', canonical);

  // JSON-LD: сайт + хлебные крошки. Перезаписываем только свой блок,
  // чтобы не плодить дубликаты при переходах по SPA.
  const items = breadcrumbs(path, isRu);
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: 'rhodes.monster',
        inLanguage: isRu ? 'ru' : 'en',
        description,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      },
    ],
  };

  let script = document.getElementById('route-structured-data');
  if (!script) {
    script = document.createElement('script');
    script.id = 'route-structured-data';
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(structured);
}

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    applyRouteMeta(location.pathname);
  }, [location.pathname]);
}
