import { Language } from '../types';

export interface TranslationInfo {
  translators: string[];
  translatedEpisodes: string[];
  /** Mapping of episode IDs to their primary translator */
  episodeTranslatorMapping?: Record<string, string>;
}

// Реестр пользовательских переводов.
// Здесь указываются авторы перевода и список ID эпизодов (например, 'main_00', 'act17side'),
// которые уже переведены и готовы к отображению для конкретного языка.
export const TRANSLATION_REGISTRY: Partial<Record<Language, TranslationInfo>> = {
  ru_RU: {
    translators: ['nep0num', 'frostymisery17', 'naoshka_v'],
    translatedEpisodes: ['main_0', 'main_1'],
    episodeTranslatorMapping: {}
  },
  es_ES: {
    translators: [],
    translatedEpisodes: [],
  },
  de_DE: {
    translators: [],
    translatedEpisodes: [],
  },
  fr_FR: {
    translators: [],
    translatedEpisodes: [],
  },
  id_ID: {
    translators: [],
    translatedEpisodes: [],
  },
  it_IT: {
    translators: [],
    translatedEpisodes: [],
  },
  pt_PT: {
    translators: [],
    translatedEpisodes: [],
  },
};
