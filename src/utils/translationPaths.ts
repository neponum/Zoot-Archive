import { Language } from '../types';

const ZOOT_DATA_RAW_BASE = 'https://raw.githubusercontent.com/neponum/zoot-data/main';

/**
 * Translation CSVs live in the zoot-data repo grouped by episode:
 *   translation/<lang>/story/<episode>/<storyBaseName>_<translator>.csv
 * Older revisions kept episodes directly under `translation/<lang>/<episode>/`
 * and even older ones kept every CSV flat in `translation/<lang>/`, so both
 * stay as fallbacks — the Discord bot still uploads new translations there.
 */
export function getEpisodeFolderForStory(baseName: string): string | null {
  if (!baseName) return null;

  // level_<episode>_<part...> — main, a001, act47side, act15d5, act10mini, st, spst
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
export function getExactTranslationCsvCandidates(
  lang: Language,
  baseName: string,
  translatorSuffix: string
): string[] {
  const episode = getEpisodeFolderForStory(baseName);
  const file = `${baseName}${translatorSuffix}.csv`;
  const candidates: string[] = [];

  if (episode) {
    // Основной layout с 2026-11-19: эпизоды сгруппированы в `story/`.
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/story/${episode}/${file}`);
    // Старый layout: папка эпизода прямо в translation/<lang>/.
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${episode}/${file}`);
  }
  // Самый старый плоский layout — загрузки Discord-бота.
  candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${file}`);

  return candidates;
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

  const episode = getEpisodeFolderForStory(baseName);
  const communityFile = `${baseName}.csv`;
  if (episode) {
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/story/${episode}/${communityFile}`);
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${episode}/${communityFile}`);
  }
  candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${communityFile}`);

  return Array.from(new Set(candidates));
}