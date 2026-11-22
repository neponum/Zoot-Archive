import type { Language } from '../types';
import { getLanguage } from '../services/story/storyTreeService';

/**
 * Язык интерфейса выбирается в архиве и хранится отдельно от языка чтения.
 * Если пользователь ещё не выбирал UI-язык, наследуем язык историй.
 */
export function getUiLanguage(): Language {
  try {
    const saved = localStorage.getItem('arknights_ui_lang');
    if (saved) return saved as Language;
  } catch {
    /* localStorage может быть недоступен */
  }
  return getLanguage();
}
