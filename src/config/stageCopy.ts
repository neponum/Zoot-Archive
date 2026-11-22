import type { Language } from '../types';

/**
 * Тексты главного экрана и правовых страниц на пяти языках.
 *
 * Ключи навигации (operator, terminal, terra, translation) — это идентификаторы, а не подписи: по ним строится маршрут.
 * Переводится только значение в `nav`.
 */

export type StageNavId = 'operator' | 'terminal' | 'terra' | 'translation';

export type StageLocale = 'ru' | 'en' | 'zh' | 'ja' | 'ko';

export interface StageCopy {
  /** Подписи в меню */
  nav: Record<StageNavId, string>;
  /** Дисклеймер: каждое предложение — отдельная строка */
  disclaimer: [string, string, string];
  /** Правовые ссылки в подвале */
  legal: {
    about: string;
    privacy: string;
    takedown: string;
  };
}

export interface StageLocaleOption {
  id: StageLocale;
  /** Как язык подписан в переключателе */
  short: string;
  /** Язык для атрибута lang */
  htmlLang: string;
  /** Какому языку интерфейса сайта соответствует */
  uiLang: Language;
}

export const STAGE_LOCALES: StageLocaleOption[] = [
  { id: 'ru', short: 'RU', htmlLang: 'ru', uiLang: 'ru_RU' },
  { id: 'en', short: 'EN', htmlLang: 'en', uiLang: 'en_US' },
  { id: 'zh', short: '中文', htmlLang: 'zh-CN', uiLang: 'zh_CN' },
  { id: 'ja', short: '日本語', htmlLang: 'ja', uiLang: 'ja_JP' },
  { id: 'ko', short: '한국어', htmlLang: 'ko', uiLang: 'ko_KR' },
];

export const STAGE_COPY: Record<StageLocale, StageCopy> = {
  ru: {
    nav: {
      operator: 'оперативники',
      terminal: 'терминал',
      terra: 'терра',
      translation: 'перевод',
    },
    disclaimer: [
      'Неофициальный фан-архив Arknights.',
      'Права на игру, персонажей и материалы принадлежат Hypergryph и Yostar.',
      'Проект не связан с правообладателями.',
    ],
    legal: {
      about: 'О нас',
      privacy: 'Конфиденциальность',
      takedown: 'Правообладателям',
    },
  },

  en: {
    nav: {
      operator: 'operators',
      terminal: 'terminal',
      terra: 'terra',
      translation: 'translation',
    },
    disclaimer: [
      'An unofficial Arknights fan archive.',
      'All rights to the game, characters and materials belong to Hypergryph and Yostar.',
      'This project is not affiliated with the rights holders.',
    ],
    legal: {
      about: 'About',
      privacy: 'Privacy',
      takedown: 'Takedown',
    },
  },

  zh: {
    nav: {
      operator: '干员',
      terminal: '终端',
      terra: '泰拉',
      translation: '翻译',
    },
    disclaimer: [
      '《明日方舟》非官方粉丝档案库。',
      '游戏、角色与素材的权利归 Hypergryph 与 Yostar 所有。',
      '本项目与权利方没有任何关联。',
    ],
    legal: {
      about: '关于我们',
      privacy: '隐私政策',
      takedown: '版权申诉',
    },
  },

  ja: {
    nav: {
      operator: 'オペレーター',
      terminal: 'ターミナル',
      terra: 'テラ',
      translation: '翻訳',
    },
    disclaimer: [
      '『アークナイツ』の非公式ファンアーカイブです。',
      'ゲーム・キャラクター・素材の権利は Hypergryph および Yostar に帰属します。',
      '本プロジェクトは権利者と一切関係ありません。',
    ],
    legal: {
      about: '運営について',
      privacy: 'プライバシー',
      takedown: '権利者の方へ',
    },
  },

  ko: {
    nav: {
      operator: '오퍼레이터',
      terminal: '터미널',
      terra: '테라',
      translation: '번역',
    },
    disclaimer: [
      '명일방주 비공식 팬 아카이브입니다.',
      '게임, 캐릭터, 소재에 대한 권리는 Hypergryph와 Yostar에 있습니다.',
      '본 프로젝트는 권리자와 무관합니다.',
    ],
    legal: {
      about: '소개',
      privacy: '개인정보',
      takedown: '권리자 요청',
    },
  },
};

/** Язык сайта → язык главного экрана. */
export function toStageLocale(lang: Language | string | null | undefined): StageLocale {
  switch (lang) {
    case 'en_US':
      return 'en';
    case 'zh_CN':
      return 'zh';
    case 'ja_JP':
      return 'ja';
    case 'ko_KR':
      return 'ko';
    case 'ru_RU':
    case 'ru_RU_CN':
    default:
      return 'ru';
  }
}
