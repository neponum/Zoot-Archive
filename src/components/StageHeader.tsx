import React from 'react';
import { STAGE_COPY, type StageLocale, type StageNavId } from '../config/stageCopy';

/**
 * Шапка главного экрана и правовых страниц.
 *
 * Геометрия взята из макета без изменений: фиксированная полоса, три колонки,
 * эмблема Rhodes Island по центру. Переводится только текст кнопок — порядок,
 * размеры и отступы остаются прежними.
 */

const LEFT_NAV: StageNavId[] = ['operator', 'terminal'];
const RIGHT_NAV: StageNavId[] = ['terra', 'translation'];

export interface StageHeaderProps {
  locale: StageLocale;
  activeNav?: StageNavId | null;
  /** На светлом «терминале» цвета инвертируются. */
  theme?: 'dark' | 'light';
  onNavSelect: (id: StageNavId) => void;
  onEmblemClick: () => void;
}

export const StageHeader: React.FC<StageHeaderProps> = ({
  locale,
  activeNav = null,
  theme = 'dark',
  onNavSelect,
  onEmblemClick,
}) => {
  const copy = STAGE_COPY[locale];
  const light = theme === 'light';

  const navButtonClass = (id: StageNavId) => {
    const isActive = activeNav === id;

    if (light) {
      return `text-xs sm:text-sm tracking-widest uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
        isActive
          ? 'text-neutral-950 font-semibold underline underline-offset-4'
          : 'text-neutral-600 hover:text-neutral-950'
      }`;
    }

    return `text-xs sm:text-sm tracking-widest uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'text-white font-semibold underline underline-offset-4'
        : 'text-neutral-400 hover:text-white'
    }`;
  };

  return (
    <header className="fixed top-3 sm:top-4 inset-x-0 z-30 px-4 sm:px-8 pointer-events-none">
      <div className="max-w-[1360px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8 pointer-events-auto">
        <nav aria-label="Sections" className="flex items-center justify-center md:justify-end gap-5 sm:gap-8 order-2 md:order-1">
          {LEFT_NAV.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavSelect(id)}
              className={navButtonClass(id)}
            >
              {copy.nav[id]}
            </button>
          ))}
        </nav>

        {/* Эмблема Rhodes Island: знак вымышленной организации, не логотип проекта */}
        <div className="flex items-center justify-center order-1 md:order-2">
          <button
            type="button"
            onClick={onEmblemClick}
            className="cursor-pointer focus:outline-none flex items-center justify-center"
            title="Rhodes Island"
          >
            <img
              src="/assets/rhodes_island_logo.png"
              alt="Rhodes Island"
              className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain transition-all ${
                light ? 'invert opacity-85 hover:opacity-100' : 'opacity-90 hover:opacity-100'
              }`}
            />
          </button>
        </div>

        <nav aria-label="Project" className="flex items-center justify-center md:justify-start gap-5 sm:gap-8 order-3">
          {RIGHT_NAV.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavSelect(id)}
              className={navButtonClass(id)}
            >
              {copy.nav[id]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
