import { Language } from '../types';

const ZOOT_DATA_RAW_BASE = 'https://raw.githubusercontent.com/neponum/zoot-data/main';

/**
 * Куда физически кладётся CSV перевода.
 *
 * Актуальная раскладка:
 *   translation/<lang>/story/main/main_<N>/<storyBaseName>_<translator>.csv
 *   translation/<lang>/story/<episode>/<storyBaseName>_<translator>.csv
 *
 * Основная линия разложена по папкам эпизодов (`main_0`…`main_17`), включая
 * вводные и финальные сцены `level_st_*`. Старые раскладки (`story/main`
 * плоско, `story/st`, папка эпизода в корне языка) остаются фолбэками.
 */
export function getMainEpisodeFolder(baseName: string): string | null {
  const match = baseName.match(/^level_(?:main|st)_(\d{1,2})(?:-|_)/i);
  if (match) return `main_${Number(match[1])}`;
  // Единственная сцена без номера главы в имени; по метаданным CSV — EP 17.
  if (baseName.startsWith('level_main_tr28_')) return 'main_17';
  return null;
}

export function getEpisodeFolderForStory(baseName: string): string | null {
  if (!baseName) return null;

  // Основная линия: main/main_5, включая level_st_05-01 (вводная сцена).
  const mainEpisode = getMainEpisodeFolder(baseName);
  if (mainEpisode) return `main/${mainEpisode}`;

  // level_<episode>_<part...> — a001, act47side, act15d5, act10mini, spst
  if (baseName.startsWith('level_')) {
    const episode = baseName.slice('level_'.length).split('_', 1)[0];
    return episode || null;
  }

  // ui_<episode>_<screen>
  if (baseName.startsWith('ui_')) return 'ui';

  // 密录 / operator records: obt/memory/story_<operator>_<set>_<part>
  if (baseName.startsWith('story_')) return 'memory';

  // act19side_sub-1-1
  const subMatch = baseName.match(/^([a-z0-9]+?)_(?:sub-)?\d/);
  if (subMatch) return subMatch[1];

  // 0_welcome_to_guide / 2_guide_to_home
  if (baseName.includes('guide') || baseName.includes('welcome')) return 'guide';

  return null;
}

/**
 * Ключ эпизода в `episodes.json`. Для разложенной по папкам основной линии
 * это по-прежнему `main`: индексу нужен автор сцены, а не путь файла.
 */
export function getTranslationIndexKey(baseName: string): string | null {
  const folder = getEpisodeFolderForStory(baseName);
  if (!folder) return null;
  if (folder.startsWith('main/')) return 'main';
  return folder;
}

/** Suffix used by the repo for a given translator profile. */
export function getTranslatorSuffix(translator?: string | null): string {
  if (!translator) return '';
  if (translator === 'Community Translators' || translator === 'Переводчики сообщества') return '';
  const clean = translator === 'neponum' ? 'nep0num' : translator;
  return `_${clean}`;
}

/**
 * URL-ы одного конкретного файла сцены (`<base><suffix>.csv`) по раскладкам
 * репозитория, от новой к старой. Перебора авторов здесь нет: имя файла
 * известно из `episodes.json` (карта `scenes`).
 */
function layoutCandidates(
  lang: Language,
  baseName: string,
  file: string
): string[] {
  const episode = getEpisodeFolderForStory(baseName);
  const candidates: string[] = [];

  if (episode) {
    // Актуальная раскладка: story/<episode>/ или story/main/main_<N>/.
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/story/${episode}/${file}`);
    const parent = episode.split('/')[0];
    if (parent && parent !== episode) {
      // Прежняя плоская раскладка основной линии: story/main/.
      candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/story/${parent}/${file}`);
    }
    if (baseName.startsWith('level_st_')) {
      // Прежняя отдельная папка story/st/.
      candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/story/st/${file}`);
    }
    // Раскладка до 2026-11-19: папка эпизода прямо в корне языка.
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${episode}/${file}`);
  }
  // Самый старый плоский layout — загрузки Discord-бота.
  candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${file}`);

  return candidates;
}

export function getExactTranslationCsvCandidates(
  lang: Language,
  baseName: string,
  translatorSuffix: string
): string[] {
  return layoutCandidates(lang, baseName, `${baseName}${translatorSuffix}.csv`);
}

/**
 * Все кандидаты для сцены: точный файл автора, затем (если он именованный)
 * community-файл без суффикса. Используется инструментами перевода, которым
 * нужно искать существующие файлы.
 */
export function getTranslationCsvCandidates(
  lang: Language,
  baseName: string,
  translatorSuffix: string
): string[] {
  const candidates = getExactTranslationCsvCandidates(lang, baseName, translatorSuffix);
  if (!translatorSuffix) return candidates;

  candidates.push(...layoutCandidates(lang, baseName, `${baseName}.csv`));

  return Array.from(new Set(candidates));
}