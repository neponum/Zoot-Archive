import { Language } from '../types';

const ZOOT_DATA_RAW_BASE = 'https://raw.githubusercontent.com/neponum/zoot-data/main';

/**
 * Translation CSVs live in the zoot-data repo grouped by episode:
 *   translation/<lang>/<episode>/<storyBaseName>_<translator>.csv
 * Older revisions of the repo kept every CSV flat in `translation/<lang>/`,
 * so that layout stays as a fallback — the Discord bot still uploads new
 * translations there.
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
 * Candidate URLs for a translated story chapter, most specific layout first.
 * Callers must treat a 404 as "try the next candidate".
 */
export function getTranslationCsvCandidates(
  lang: Language,
  baseName: string,
  translatorSuffix: string
): string[] {
  const episode = getEpisodeFolderForStory(baseName);
  const file = `${baseName}${translatorSuffix}.csv`;
  const candidates: string[] = [];

  if (episode) {
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${episode}/${file}`);
  }
  candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${file}`);

  // Community translations have no translator suffix at all.
  if (translatorSuffix) {
    const communityFile = `${baseName}.csv`;
    if (episode) {
      candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${episode}/${communityFile}`);
    }
    candidates.push(`${ZOOT_DATA_RAW_BASE}/translation/${lang}/${communityFile}`);
  }

  return candidates;
}