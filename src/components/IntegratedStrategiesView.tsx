import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorySceneButton } from './story/StorySceneButton';
import { handleImageFallback } from '../lib/imageFallback';

export interface ISThemeItem {
  id: string;
  code: string;
  name: string;
  titleTop: string;
  titleCursive: string;
  /** Год запуска темы (из `startTime` таблицы). */
  year: string;
  banner: string;
  accentColor: string;
  motifType: 'seekers' | 'garden' | 'sarkaz' | 'frost';
  /** Официальное описание темы (`lineText`). */
  lines: string[];
  /** Русское описание темы. */
  linesRu?: string[];
  /** Сценарий начала IS (`obt/roguelike/..._entry`). */
  entryStory?: string;
  /** Сценарий последнего финала IS. */
  endingStory?: string;
  /** Все сюжетные сцены темы: вход и финалы. */
  storyScenes?: Array<{ code: string; label: string; path: string }>;
  /** Реальные счётчики прогресса из таблиц игры. */
  milestones: number;
  rewards: number;
  challenges: number;
  updates: number;
}

const ThemeMotifCrest: React.FC<{
  type: ISThemeItem['motifType'];
  size?: 'lg' | 'sm';
}> = ({ type, size = 'lg' }) => {
  const sizeClass = size === 'lg' ? 'w-28 h-16' : 'w-16 h-10';

  if (type === 'seekers') {
    // 4 explorer silhouettes + crimson coral/tree branch motif matching image_06be5c5d.png
    return (
      <svg
        viewBox="0 0 160 80"
        className={`${sizeClass} overflow-visible select-none`}
        fill="none"
      >
        {/* Crimson branching tree/vein silhouette behind */}
        <path
          d="M82 72V28M82 42L64 20M82 34L104 14M82 50L98 36M72 28L60 10M92 22L108 6"
          stroke="#991b1b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="82" cy="14" r="9" fill="#7f1d1d" fillOpacity="0.65" />
        {/* 4 small golden/white explorer silhouettes standing in a row */}
        {[46, 64, 96, 114].map((x, idx) => (
          <g key={idx} transform={`translate(${x}, 36)`}>
            <circle cx="0" cy="0" r="3" fill="#e5d5b5" />
            <path
              d="M-3.5 5L3.5 5L5 22L-5 22Z"
              fill="#d6c7a9"
              fillOpacity="0.9"
            />
          </g>
        ))}
      </svg>
    );
  }

  if (type === 'garden') {
    // Pink/jade lotus motif matching Sui's Garden card in image_06be5c5d.png
    return (
      <svg viewBox="0 0 120 60" className={sizeClass} fill="none">
        <path
          d="M60 10C66 22 76 28 76 38C76 46 68 50 60 50C52 50 44 46 44 38C44 28 54 22 60 10Z"
          fill="#f472b6"
          fillOpacity="0.85"
        />
        <path
          d="M60 18C72 24 88 26 92 38C82 46 70 48 60 48C50 48 38 46 28 38C32 26 48 24 60 18Z"
          stroke="#fbcfe8"
          strokeWidth="2"
          fill="#ec4899"
          fillOpacity="0.45"
        />
      </svg>
    );
  }

  if (type === 'sarkaz') {
    // Crimson/dark crown & spire motif matching Sarkaz's Furnaceside Fables card
    return (
      <svg viewBox="0 0 120 60" className={sizeClass} fill="none">
        <circle cx="60" cy="30" r="18" fill="#991b1b" fillOpacity="0.75" />
        <path
          d="M42 42L50 16L60 30L70 16L78 42H42Z"
          stroke="#fca5a5"
          strokeWidth="2.2"
          fill="#450a0a"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 60" className={sizeClass} fill="none">
      <polygon
        points="60,6 76,30 60,54 44,30"
        stroke="#bae6fd"
        strokeWidth="2.5"
        fill="#0284c7"
        fillOpacity="0.4"
      />
    </svg>
  );
};

interface IntegratedStrategiesViewProps {
  themes: ISThemeItem[];
  onBackToTerminal: () => void;
  onBackToHome: () => void;
}

export const IntegratedStrategiesView: React.FC<
  IntegratedStrategiesViewProps
> = ({ themes, onBackToTerminal, onBackToHome }) => {
  const navigate = useNavigate();
  const playableThemes = themes.filter((theme) => theme.milestones > 0);
  const latestTheme = playableThemes[playableThemes.length - 1] || themes[themes.length - 1];
  const [selectedThemeId, setSelectedThemeId] = useState<string>(latestTheme?.id ?? '');
  const selectedCardRef = useRef<HTMLDivElement | null>(null);

  const selectedTheme =
    themes.find((t) => t.id === selectedThemeId) ?? latestTheme;

  useEffect(() => {
    selectedCardRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedThemeId]);

  return (
    <section
      aria-label="Integrated Strategies"
      className="fixed inset-0 z-20 w-screen h-screen bg-black text-white overflow-hidden flex flex-col justify-between select-none"
    >
      {/* Навигация как на остальных внутренних страницах: назад + домой */}
      <div className="fixed top-2.5 left-3 z-50 flex items-center bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
        <button
          type="button"
          onClick={onBackToTerminal}
          aria-label="Back to terminal"
          className="w-[88px] sm:w-[104px] h-[38px] sm:h-[42px] flex items-center pl-4 border-r border-white/15 text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-6 h-6">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onBackToHome}
          aria-label="Home"
          title="Home"
          className="px-3.5 h-[38px] sm:h-[42px] flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>
      </div>

      {/* =====================================================================
          UPPER SHOWCASE STAGE (~56% height) matching top half of image_06be5c5d.png
          ===================================================================== */}
      <div className="relative w-full h-[55%] sm:h-[57%] overflow-hidden shrink-0">
        {/* Background Key Visual with deep teal/dark vignette */}
        <img
          src={selectedTheme.banner}
          alt={selectedTheme.titleTop}
          draggable={false}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={(e) => handleImageFallback(e, selectedTheme.banner)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 opacity-65 transition-all duration-700 pointer-events-none"
        />

        {/* Atmospheric multi-stop dark teal/black gradients matching image_06be5c5d.png */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 42% 38%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.78) 58%, #000 98%), linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 28%, rgba(0,0,0,0.92) 92%, #000 100%)',
          }}
        />

        {/* Subtle geometric gold/teal circular astrolabe rings in upper center-left */}
        <div
          aria-hidden="true"
          className="absolute left-[22%] sm:left-[28%] top-[8%] w-[260px] h-[260px] rounded-full border border-[#5ea39a]/20 pointer-events-none flex items-center justify-center"
        >
          <div className="w-[190px] h-[190px] rounded-full border border-[#eab308]/15" />
        </div>

        {/* Large Diagonal Integrated Strategies Watermark Logo on the Right */}
        <img
          src="/assets/terminal/logo_integrated_strategies.png"
          alt=""
          draggable={false}
          className="absolute right-3 top-3 z-10 w-[96px] sm:w-[128px] aspect-square object-contain opacity-30 pointer-events-none select-none"
        />

        {/* Описание темы справа сверху, сразу под логотипом */}
        <div className="relative z-20 max-w-[1440px] mx-auto w-full h-full px-6 sm:px-12">
          <div className="absolute right-4 top-32 sm:right-8 sm:top-36 z-20 w-full max-w-[360px] bg-black/25 p-4 backdrop-blur-xs md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="space-y-1 text-xs leading-[1.7] tracking-[0.02em] text-[#b4bcc4] sm:text-[13px]">
              {(selectedTheme.linesRu?.length ? selectedTheme.linesRu : selectedTheme.lines).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            {selectedTheme.storyScenes && selectedTheme.storyScenes.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {selectedTheme.storyScenes.map((scene) => (
                  <StorySceneButton
                    key={scene.path}
                    code={scene.code}
                    label={scene.label}
                    onClick={() =>
                      navigate(`/story/${scene.path}`, {
                        state: { backTo: '/integrated-strategies' },
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          LOWER HORIZONTAL THEME CAROUSEL STRIP (~43% height)
          matching bottom half of image_06be5c5d.png
          ===================================================================== */}
      <div
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="site-scrollbar relative w-full h-[46%] sm:h-[44%] bg-black overflow-x-auto overflow-y-hidden flex items-center"
      >
        {/* Subtle carbon/diagonal hatch background texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px)',
          }}
        />

        <div className="relative z-10 flex items-start gap-6 sm:gap-8 px-8 sm:px-14 min-w-max">
          {themes.map((theme) => {
            const isSelected = theme.id === selectedThemeId;

            return (
              <div
                key={theme.id}
                ref={isSelected ? selectedCardRef : undefined}
                className="flex flex-col w-[360px] sm:w-[520px] shrink-0"
              >
                {/* Top Level & Milestone Tag Bar (`LV 0 [SOURCE FLOW STACK]`) */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-white/55">
                      YEAR
                    </span>
                    <span className="text-lg sm:text-xl font-black text-white leading-none">
                      {theme.year}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">
                    {theme.code}
                  </span>

                </div>

                {/* Theme Card Box */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedThemeId(theme.id);
                  }}
                  className={`group w-full bg-transparent transition-opacity duration-300 cursor-pointer focus:outline-none ${
                    isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={theme.banner}
                    alt={theme.titleTop}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleImageFallback(e, theme.banner)}
                    className="block w-full h-auto"
                  />
                </button>
              </div>
            );
          })}

        </div>
      </div>

    </section>
  );
};
