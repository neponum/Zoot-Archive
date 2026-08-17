import { Language } from './types';
import translationsData from './data/translations.json';

const rawUIStrings: Record<Language, any> = {} as any;

// Support both ES module default imports and raw JSON objects
let actualData = translationsData as any;
if (actualData && actualData.default) {
  actualData = actualData.default;
}

const englishData = actualData ? (actualData['en_US'] || {}) : {};

if (actualData) {
  Object.entries(actualData).forEach(([lang, strings]) => {
    if (lang === 'default') return;
    
    const langKey = lang as Language;
    rawUIStrings[langKey] = { 
      ...englishData,
      ...(strings as any)
    };
    
    // Convert year_n placeholder to function
    const yearTemplate = (strings as any).year_n || englishData.year_n;
    if (yearTemplate) {
      rawUIStrings[langKey].year_n = (n: number) => yearTemplate.replace('{{n}}', n.toString());
    }
  });
}

// Wrap UI_STRINGS in a Proxy to guarantee a safe fallback if any language code lookup fails
export const UI_STRINGS: Record<Language, any> = new Proxy(rawUIStrings, {
  get(target, prop) {
    const key = prop as Language;
    if (target[key]) {
      return target[key];
    }
    // If the requested language is missing, fallback to English or the first available language
    return target['en_US'] || target['zh_CN'] || Object.values(target)[0] || {};
  }
});
