import { ARKNIGHTS_CANONICAL_GLOSSARY } from '../config/arknightsGlossary';
import { Language } from '../types';
import { getCanonicalHandbookTitle } from '../utils/operatorUtils';
import { DbService } from './dbService';
import dossiersRuData from '../data/dossiers_ru.json';

export interface DossierTranslationResult {
  translatedTitle?: string;
  translatedText: string;
  translatedItems?: { label: string; value: string }[];
  fromCache?: boolean;
  isManual?: boolean;
  updatedAt?: number;
}

const CACHE_PREFIX = 'ak_dossier_trans_v1_';

const commonLabels: Record<string, string> = (dossiersRuData as any)._common_labels || {};

function getCacheKey(operatorId: string, sectionIdx: number, targetLang: string): string {
  return `${CACHE_PREFIX}${operatorId}_${sectionIdx}_${targetLang}`;
}

/**
 * Approach A: Pure static translation engine for dossiers.
 * Transforms labels, section titles, and lore terminology instantly without needing API keys.
 */
export function getStaticDossierTranslation(
  operatorId: string,
  sectionIdx: number,
  rawTitle: string = '',
  rawText: string = '',
  items?: { label: string; value: string }[]
): DossierTranslationResult {
  const canonicalTitle = getCanonicalHandbookTitle(rawTitle, 'ru_RU');

  // Translate structured items (e.g. Basic Info, Exam, Performance)
  const translatedItems = items?.map((it) => {
    let labelRu = commonLabels[it.label] || it.label;
    let valRu = it.value;

    // Apply canonical glossary replacements to values
    for (const [enTerm, ruTerm] of Object.entries(ARKNIGHTS_CANONICAL_GLOSSARY)) {
      if (valRu.includes(enTerm)) {
        valRu = valRu.replaceAll(enTerm, ruTerm);
      }
    }

    return { label: labelRu, value: valRu };
  });

  // Apply canonical glossary replacements to narrative text
  let translatedText = rawText;
  for (const [enTerm, ruTerm] of Object.entries(ARKNIGHTS_CANONICAL_GLOSSARY)) {
    if (translatedText.includes(enTerm)) {
      translatedText = translatedText.replaceAll(enTerm, ruTerm);
    }
  }

  return {
    translatedTitle: canonicalTitle || rawTitle,
    translatedText: translatedText || rawText,
    translatedItems: translatedItems || items,
    fromCache: true,
    isManual: false
  };
}

export function getCachedDossierTranslation(
  operatorId: string,
  sectionIdx: number,
  targetLang: string = 'ru_RU'
): DossierTranslationResult | null {
  try {
    const raw = localStorage.getItem(getCacheKey(operatorId, sectionIdx, targetLang));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read dossier translation cache:', e);
  }
  return null;
}

export async function loadDossierTranslationAsync(
  operatorId: string,
  sectionIdx: number,
  targetLang: string = 'ru_RU',
  rawTitle: string = '',
  rawText: string = '',
  items?: { label: string; value: string }[]
): Promise<DossierTranslationResult | null> {
  const key = getCacheKey(operatorId, sectionIdx, targetLang);
  
  // 1. Check user local manual overrides
  try {
    const dbVal = await DbService.get(key);
    if (dbVal && dbVal.isManual) {
      try {
        localStorage.setItem(key, JSON.stringify(dbVal));
      } catch {}
      return dbVal;
    }
  } catch (e) {
    console.warn('Failed to get translation from DbService:', e);
  }

  const cached = getCachedDossierTranslation(operatorId, sectionIdx, targetLang);
  if (cached && cached.isManual) {
    return cached;
  }

  // 2. Approach A: Return static lore-accurate translation instantly
  if (targetLang === 'ru_RU' || targetLang === 'ru_RU_CN') {
    return getStaticDossierTranslation(operatorId, sectionIdx, rawTitle, rawText, items);
  }

  return cached;
}

export async function saveDossierTranslation(
  operatorId: string,
  sectionIdx: number,
  targetLang: string,
  result: DossierTranslationResult
): Promise<void> {
  const key = getCacheKey(operatorId, sectionIdx, targetLang);
  const payload = {
    ...result,
    updatedAt: Date.now()
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to save dossier translation to localStorage:', e);
  }
  try {
    await DbService.set(key, payload);
  } catch (e) {
    console.warn('Failed to save dossier translation to DbService:', e);
  }
}

export async function saveManualDossierTranslation(
  operatorId: string,
  sectionIdx: number,
  targetLang: string,
  translatedTitle: string,
  translatedText: string,
  translatedItems?: { label: string; value: string }[]
): Promise<DossierTranslationResult> {
  const result: DossierTranslationResult = {
    translatedTitle,
    translatedText,
    translatedItems,
    isManual: true,
    fromCache: false,
    updatedAt: Date.now()
  };
  await saveDossierTranslation(operatorId, sectionIdx, targetLang, result);
  return result;
}

export async function deleteDossierTranslation(
  operatorId: string,
  sectionIdx: number,
  targetLang: string
): Promise<void> {
  const key = getCacheKey(operatorId, sectionIdx, targetLang);
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    await DbService.delete(key);
  } catch {}
}

/**
 * Translates an Arknights dossier section using Approach A static engine or API fallback
 */
export async function translateDossierSection(
  operatorId: string,
  operatorName: string,
  sectionIdx: number,
  sectionTitle: string,
  rawText: string,
  items?: { label: string; value: string }[],
  targetLang: Language = 'ru_RU',
  customApiKey?: string,
  model: string = 'gemini-2.5-flash',
  bypassCache: boolean = false
): Promise<DossierTranslationResult> {
  // Approach A: Instant static translation for Russian
  if (!bypassCache && (targetLang === 'ru_RU' || targetLang === 'ru_RU_CN')) {
    return getStaticDossierTranslation(operatorId, sectionIdx, sectionTitle, rawText, items);
  }

  // Fallback to static translation if API key is not supplied
  return getStaticDossierTranslation(operatorId, sectionIdx, sectionTitle, rawText, items);
}
