import { Language } from '../types';

export interface TranslationInfo {
  translators: string[];
  translatedEpisodes: string[];
  /** Mapping of episode IDs to their primary translator */
  episodeTranslatorMapping?: Record<string, string>;
}

export const TRANSLATOR_METADATA: Record<string, { displayName: string; note: string; isAI: boolean }> = {
  nep0num: {
    displayName: 'nep0num',
    note: 'Нейроперевод',
    isAI: true,
  },
  neponum: {
    displayName: 'nep0num',
    note: 'Нейроперевод',
    isAI: true,
  },
};

export function isAITranslator(translator?: string | null): boolean {
  if (!translator) return false;
  const key = translator.toLowerCase();
  return key === 'nep0num' || key === 'neponum' || TRANSLATOR_METADATA[key]?.isAI === true;
}

export function sortTranslators(translators: string[]): string[] {
  if (!translators || !Array.isArray(translators)) return [];
  const human = translators.filter(t => !isAITranslator(t));
  const ai = translators.filter(t => isAITranslator(t));
  return [...human, ...ai];
}

export function getDefaultTranslator(translators: string[]): string | undefined {
  const sorted = sortTranslators(translators);
  return sorted[0];
}

export function getTranslatorLabel(translator?: string | null): string {
  if (!translator) return '';
  const key = translator.toLowerCase();
  const meta = TRANSLATOR_METADATA[key] || TRANSLATOR_METADATA[translator];
  if (meta) {
    return `${meta.displayName} (${meta.note})`;
  }
  return translator;
}

// Реестр пользовательских переводов.
// Здесь указываются авторы перевода и список ID эпизодов (например, 'main_00', 'act17side'),
// которые уже переведены и готовы к отображению для конкретного языка.
export const TRANSLATION_REGISTRY: Partial<Record<Language, TranslationInfo>> = {
  ru_RU: {
    translators: ['neksi0762', 'frostymisery17', 'naoshka_v', 'ilarhion', 'nep0num'],
    translatedEpisodes: ['main_0', 'main_1'],
    episodeTranslatorMapping: {}
  },
};

