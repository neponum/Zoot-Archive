import { useCallback, useEffect, useState } from 'react';
import type { Language } from '../types';
import { toStageLocale, type StageLocale } from '../config/stageCopy';
import { getLanguage } from '../services/story/storyTreeService';

/**
 * Язык главного экрана и правовых страниц.
 *
 * Ключ тот же, что у остального интерфейса (`arknights_ui_lang`), поэтому выбор
 * языка здесь подхватывается читалкой, а выбор в читалке — наоборот.
 * `ru_RU_CN` и неизвестные значения сводятся к русскому: отдельного перевода
 * для этой ветки нет.
 */
const STORAGE_KEY = 'arknights_ui_lang';

const HTML_LANG: Record<StageLocale, string> = {
  ru: 'ru',
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
  ko: 'ko',
};

/** Язык сайта — база для первого визита: главная не должна расходиться с читалкой. */
function readLocale(): StageLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    // Значение вне пяти локалей главной сводится к русскому, а не ломает вёрстку.
    if (saved) return toStageLocale(saved);
  } catch {
    /* приватный режим: работаем на языке сайта по умолчанию */
  }

  return toStageLocale(getLanguage());
}

export interface StageLanguage {
  locale: StageLocale;
  setLocale: (locale: StageLocale) => void;
}

export function useStageLanguage(): StageLanguage {
  const [locale, setLocaleState] = useState<StageLocale>(readLocale);

  const setLocale = useCallback((next: StageLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, toUiLanguage(next));
    } catch {
      /* нечего сохранять — язык останется в пределах вкладки */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  return { locale, setLocale };
}

/** Обратное отображение: язык главной → язык интерфейса сайта. */
export function toUiLanguage(locale: StageLocale): Language {
  switch (locale) {
    case 'en':
      return 'en_US';
    case 'zh':
      return 'zh_CN';
    case 'ja':
      return 'ja_JP';
    case 'ko':
      return 'ko_KR';
    case 'ru':
    default:
      return 'ru_RU';
  }
}
