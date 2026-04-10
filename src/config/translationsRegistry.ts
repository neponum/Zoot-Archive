import { Language } from '../types';

export interface TranslationInfo {
  translators: string[];
  translatedEpisodes: string[];
}

// Реестр пользовательских переводов.
// Здесь указываются авторы перевода и список ID эпизодов (например, 'main_00', 'act17side'),
// которые уже переведены и готовы к отображению для конкретного языка.
export const TRANSLATION_REGISTRY: Partial<Record<Language, TranslationInfo>> = {
  ru_RU: {
    translators: ['nep0num', 'Gethris'],
    translatedEpisodes: [
      // Add episode IDs here to show specific translators for them
      // Example: 'main_00', 'act17side'
    ],
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
