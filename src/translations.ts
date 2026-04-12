import { Language } from './types';
import translationsData from './data/translations.json';

export const UI_STRINGS: Record<Language, any> = {} as any;

// Initialize UI_STRINGS from JSON data
const englishData = (translationsData as any)['en_US'];

Object.entries(translationsData).forEach(([lang, strings]) => {
  const langKey = lang as Language;
  UI_STRINGS[langKey] = { 
    ...englishData,
    ...strings 
  };
  
  // Convert year_n placeholder to function
  const yearTemplate = strings.year_n || englishData.year_n;
  if (yearTemplate) {
    UI_STRINGS[langKey].year_n = (n: number) => yearTemplate.replace('{{n}}', n.toString());
  }
});
