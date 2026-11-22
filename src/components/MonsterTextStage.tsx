import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { StageHeader } from './StageHeader';
import { StageFooter } from './StageFooter';
import { useStageLanguage } from '../hooks/useStageLanguage';
import type { StageNavId } from '../config/stageCopy';
import {
  MONSTER_BG_HEX,
  MONSTER_EXACT_SVG_PATH,
  MONSTER_MASK_DATA_URI,
  MONSTER_MASK_HEIGHT,
  MONSTER_MASK_WIDTH,
} from '../monsterExactMask';

/** Куда ведёт каждый пункт меню. */
/** Карточки терминала открывают свои экраны. */
const TERMINAL_CARD_ROUTES: Record<TerminalCardConfig['id'], string> = {
  story: '/story',
  integrated_strategies: '/integrated-strategies',
  reclamation_algorithm: '/reclamation-algorithm',
};

const NAV_ROUTES: Partial<Record<StageNavId, string>> = {
  operator: '/operators',
  terminal: '/terminal',
  terra: '/terra',
  translation: '/translate',
};

/** Какой пункт меню подсвечен на текущем адресе. */
const NAV_BY_PATH: Record<string, StageNavId> = {
  '/operators': 'operator',
  '/terminal': 'terminal',
};

interface TerminalCardConfig {
  id: 'story' | 'integrated_strategies' | 'reclamation_algorithm';
  label: string;
  logoSrc: string;
  logoFilter: string;
  titleLines: [string, string];
  titleColorClass: string;
  images: string[];
}

// Background artworks and mode logos sourced directly from torappu.prts.wiki (no Chinese text)
const TERMINAL_CARDS: TerminalCardConfig[] = [
  {
    id: 'story',
    label: '//STORY',
    logoSrc: '/assets/terminal/logo_story.png',
    logoFilter:
      'brightness(0) saturate(100%) invert(63%) sepia(14%) saturate(545%) hue-rotate(162deg) brightness(92%) contrast(88%)',
    titleLines: ['MAIN THEME', 'STORYLINE'],
    titleColorClass: 'text-[#9ab0bf]/75',
    images: [
      '/assets/terminal/story_mainline_1.png',
      '/assets/terminal/story_mainline_2.png',
      '/assets/terminal/sandbox2_1.png',
    ],
  },
  {
    id: 'integrated_strategies',
    label: '//INTEGRATED STRATEGIES',
    logoSrc: '/assets/terminal/logo_integrated_strategies.png',
    logoFilter:
      'brightness(0) saturate(100%) invert(52%) sepia(35%) saturate(560%) hue-rotate(152deg) brightness(93%) contrast(89%)',
    titleLines: ['INTEGRATED', 'STRATEGIES'],
    titleColorClass: 'text-[#7ca8bd]/78',
    images: [
      '/assets/terminal/rogue6_kv1.png',
      '/assets/terminal/rogue2_kv1.png',
    ],
  },
  {
    id: 'reclamation_algorithm',
    label: '//RECLAMATION ALGORITHM',
    logoSrc: '/assets/terminal/logo_reclamation_algorithm.png',
    logoFilter:
      'brightness(0) saturate(100%) invert(64%) sepia(6%) saturate(240%) hue-rotate(12deg) brightness(92%) contrast(86%)',
    titleLines: ['RECLAMATION', 'ALGORITHM'],
    titleColorClass: 'text-[#bdbab2]/72',
    images: [
      'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/RA_2_vertical.png',
    ],
  },
];

// Full-word "MONSTER" vector outline extracted from Anton display font,
// normalized to viewBox 0 0 1000 500
const FULLSCREEN_MONSTER_OUTLINE_PATH =
  'M 18.0,477.86 L 18.0,22.14 L 90.25,22.14 L 110.19,299.97 L 130.01,22.14 L 202.93,22.14 L 202.93,477.86 L 159.53,477.86 L 159.53,149.54 L 132.3,477.86 L 89.71,477.86 L 60.86,149.54 L 60.86,477.86 Z ' +
  'M 283.94,482.0 Q 255.5,482.0 240.47,448.99 Q 225.44,415.97 225.44,353.57 L 225.44,137.11 Q 225.44,78.59 240.33,48.3 Q 255.23,18.0 283.94,18.0 Q 312.65,18.0 327.54,48.3 Q 342.43,78.59 342.43,137.11 L 342.43,353.57 Q 342.43,415.97 327.4,448.99 Q 312.38,482.0 283.94,482.0 Z ' +
  'M 284.34,398.11 Q 295.12,398.11 295.12,357.97 L 295.12,135.55 Q 295.12,101.89 284.61,101.89 Q 272.75,101.89 272.75,136.33 L 272.75,358.49 Q 272.75,379.72 275.44,388.92 Q 278.14,398.11 284.34,398.11 Z ' +
  'M 364.94,477.86 L 364.94,22.14 L 413.74,22.14 L 435.57,240.42 L 435.57,22.14 L 481.4,22.14 L 481.4,477.86 L 435.03,477.86 L 411.31,250.0 L 411.31,477.86 Z ' +
  'M 562.14,482.0 Q 529.65,482.0 515.29,450.93 Q 500.94,419.86 500.94,352.02 L 500.94,307.48 L 547.85,307.48 L 547.85,364.45 Q 547.85,380.24 550.35,389.18 Q 552.84,398.11 559.04,398.11 Q 565.51,398.11 568.0,390.86 Q 570.49,383.61 570.49,367.04 Q 570.49,346.06 568.34,331.95 Q 566.18,317.84 560.86,305.02 Q 555.53,292.21 546.1,275.12 L 524.8,236.28 Q 500.94,193.04 500.94,137.37 Q 500.94,79.11 515.02,48.55 Q 529.11,18.0 555.8,18.0 Q 588.42,18.0 602.1,51.4 Q 615.78,84.8 615.78,152.9 L 567.53,152.9 L 567.53,121.57 Q 567.53,112.25 564.76,107.07 Q 562.0,101.89 557.28,101.89 Q 551.62,101.89 549.0,107.97 Q 546.37,114.06 546.37,123.64 Q 546.37,133.22 549.07,144.36 Q 551.76,155.49 559.71,169.99 L 587.07,220.48 Q 595.29,235.5 602.16,252.2 Q 609.04,268.9 613.22,291.04 Q 617.4,313.18 617.4,345.03 Q 617.4,409.24 605.07,445.62 Q 592.73,482.0 562.14,482.0 Z ' +
  'M 656.89,477.86 L 656.89,109.66 L 628.72,109.66 L 628.72,22.14 L 732.51,22.14 L 732.51,109.66 L 704.34,109.66 L 704.34,477.86 Z ' +
  'M 749.09,477.86 L 749.09,22.14 L 843.98,22.14 L 843.98,110.18 L 797.34,110.18 L 797.34,198.99 L 842.09,198.99 L 842.09,284.7 L 797.34,284.7 L 797.34,389.04 L 847.08,389.04 L 847.08,477.86 Z ' +
  'M 866.08,477.86 L 866.08,22.14 L 938.87,22.14 Q 957.06,22.14 966.36,38.06 Q 975.66,53.99 978.83,82.6 Q 982.0,111.21 982.0,149.79 Q 982.0,187.08 977.08,209.35 Q 972.16,231.62 958.55,240.16 Q 969.73,244.56 974.25,261.52 Q 978.77,278.48 978.77,305.41 L 978.77,477.86 L 931.99,477.86 L 931.99,299.46 Q 931.99,279.52 927.75,274.73 Q 923.5,269.94 914.07,269.94 L 914.07,477.86 Z ' +
  'M 914.34,190.96 L 925.79,190.96 Q 935.63,190.96 935.63,149.79 Q 935.63,123.12 933.48,114.84 Q 931.32,106.55 925.39,106.55 L 914.34,106.55 Z';

/** Кнопка-карточка терминала: общая для горизонтальной (десктоп) и вертикальной (моб.) раскладки. */
const TerminalCardButton: React.FC<{
  card: TerminalCardConfig;
  onClick: () => void;
  className?: string;
}> = ({ card, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={card.label.replace('//', '')}
    className={`group relative overflow-hidden bg-[#14171a] shadow-[0_9px_16px_rgba(0,0,0,0.46),0_2px_6px_rgba(0,0,0,0.30)] transition-shadow duration-300 hover:shadow-[0_14px_24px_rgba(0,0,0,0.54)] cursor-pointer focus:outline-none ${className}`}
  >
    <img
      src={card.images[0]}
      alt={card.label.replace('//', '')}
      className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
      draggable={false}
    />

    <div
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-[27.6%] bg-gradient-to-b from-[#161d24]/55 via-[#141b22]/72 to-[#10161c]/88 backdrop-blur-[1.5px] border-t border-white/[0.07] flex items-center pointer-events-none"
    >
      <div className="absolute left-[2.2%] top-1/2 -translate-y-1/2 w-[17.4%] aspect-square flex items-center justify-center">
        <img
          src={card.logoSrc}
          alt=""
          draggable={false}
          style={{ filter: card.logoFilter }}
          className="w-full h-full object-contain opacity-90 select-none"
        />
      </div>

      <div className="absolute left-[18.8%] top-1/2 -translate-y-1/2 flex flex-col items-start text-left select-none">
        <span
          className={`text-[max(20px,1.58vw)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em] ${card.titleColorClass}`}
        >
          {card.titleLines[0]}
        </span>
        <span
          className={`text-[max(20px,1.58vw)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em] ${card.titleColorClass}`}
        >
          {card.titleLines[1]}
        </span>
      </div>
    </div>
  </button>
);

export const MonsterTextStage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale } = useStageLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  const activeNav = NAV_BY_PATH[location.pathname] ?? null;
  const isTerminalPage = activeNav === 'terminal';

  const handleNavSelect = (id: StageNavId) => {
    const route = NAV_ROUTES[id];
    if (!route) return;
    // Повторный клик по активному пункту возвращает на главную.
    navigate(location.pathname === route ? '/' : route);
  };

  return (
    <main
      onClick={() => {
        if (!activeNav && videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      }}
      style={{ backgroundColor: isTerminalPage ? '#d8dada' : MONSTER_BG_HEX }}
      className={`relative w-screen min-h-screen md:h-screen flex flex-col justify-center select-none transition-colors duration-300 ${
        isTerminalPage
          ? 'items-stretch overflow-hidden px-0'
          : 'items-center overflow-x-hidden md:overflow-hidden px-4 sm:px-8'
      }`}
    >
      <StageHeader
        locale={locale}
        activeNav={activeNav}
        theme={isTerminalPage ? 'light' : 'dark'}
        onNavSelect={handleNavSelect}
        onEmblemClick={() => navigate('/')}
      />

      {isTerminalPage ? (
        <>
        {/* TERMINAL (мобильный): карточки столбиком, каждая во всю ширину экрана */}
        <section
          aria-label="Terminal"
          className="relative z-20 flex w-full h-screen flex-col gap-6 overflow-y-auto overflow-x-hidden px-3 pb-10 pt-32 md:hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.38) 0%, rgba(196,199,199,0.28) 100%)',
          }}
        >
          {TERMINAL_CARDS.map((card) => (
            <div key={card.id} className="flex w-full flex-col items-center">
              <TerminalCardButton
                card={card}
                onClick={() => navigate(TERMINAL_CARD_ROUTES[card.id])}
                className="w-full aspect-[470/326] rounded-[6px]"
              />
              <span
                style={{
                  fontFamily:
                    "'Barlow Semi Condensed', 'Barlow Condensed', 'Oswald', sans-serif",
                }}
                className="mt-2 text-[10px] font-bold uppercase leading-none tracking-[0.015em] text-[#5e6060] select-none"
              >
                {card.label}
              </span>
            </div>
          ))}
        </section>

        {/* TERMINAL VIEW: Exact 1:1 block geometry & font matching image_aaacc883.png with horizontal scroll to the right */}
        <section
          aria-label="Terminal"
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="scrollbar-terminal relative hidden md:flex w-screen h-screen overflow-x-auto overflow-y-hidden items-center"
        >
          {/* Fixed viewport edge vignette matching the dark left/right borders of image_aaacc883.png */}
          <div
            className="fixed inset-0 pointer-events-none z-25"
            aria-hidden="true"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(12,14,15,0.56) 0%, rgba(12,14,15,0.16) 4.5%, transparent 12%, transparent 88%, rgba(12,14,15,0.16) 95.5%, rgba(12,14,15,0.56) 100%)',
            }}
          />

          {/* Scrollable horizontal canvas holding concrete wall + 3 exact-sized blocks */}
          <div className="relative flex items-center shrink-0 min-w-max h-full pt-14 pl-[max(175px,13.67vw)] pr-[max(155px,12.11vw)]">
            {/* Concrete slab horizontal seam lines across the entire scrollable width */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.38) 0%, rgba(196,199,199,0.28) 100%)',
              }}
            >
              <div className="absolute inset-x-0 top-[21%] h-[1px] bg-[#c2c5c5]" />
              <div className="absolute inset-x-0 top-[50%] h-[1px] bg-[#c2c5c5]" />
              <div className="absolute inset-x-0 top-[79%] h-[1px] bg-[#c2c5c5]" />

              {/* Left outer concrete seam & form-tie holes (matching x=64, x=148, x=162 in reference) */}
              <div className="absolute top-0 bottom-0 left-[max(162px,12.65vw)] w-[1px] bg-[#c2c5c5]" />
              {[24, 38, 62, 76].map((topPct) => (
                <React.Fragment key={`left-ties-${topPct}`}>
                  <span
                    style={{ top: `${topPct}%` }}
                    className="absolute left-[max(64px,5vw)] w-[7px] h-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8d9192] ring-2 ring-[#b4b7b7]"
                  />
                  <span
                    style={{ top: `${topPct}%` }}
                    className="absolute left-[max(148px,11.56vw)] w-[7px] h-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8d9192] ring-2 ring-[#b4b7b7]"
                  />
                </React.Fragment>
              ))}

              {/* Right outer concrete seam & form-tie holes */}
              <div className="absolute top-0 bottom-0 right-[max(146px,11.4vw)] w-[1px] bg-[#c2c5c5]" />
              {[24, 38, 62, 76].map((topPct) => (
                <React.Fragment key={`right-ties-${topPct}`}>
                  <span
                    style={{ top: `${topPct}%` }}
                    className="absolute right-[max(48px,3.75vw)] w-[7px] h-[7px] translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8d9192] ring-2 ring-[#b4b7b7]"
                  />
                  <span
                    style={{ top: `${topPct}%` }}
                    className="absolute right-[max(132px,10.3vw)] w-[7px] h-[7px] translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8d9192] ring-2 ring-[#b4b7b7]"
                  />
                </React.Fragment>
              ))}
            </div>

            {/* 3 Blocks Row: exact 1:1 dimensions and 17px/1.33vw card gap from image_aaacc883.png */}
            <div className="relative z-20 flex items-center gap-[max(17px,1.33vw)] shrink-0">
              {TERMINAL_CARDS.map((card, idx) => {
                return (
                  <div
                    key={card.id}
                    className="relative w-[max(470px,36.72vw)] shrink-0 flex flex-col items-center justify-center"
                  >
                    {/* Vertical concrete joint line in the gap between adjacent blocks (matching x=648 in reference) */}
                    {idx > 0 && (
                      <div
                        aria-hidden="true"
                        className="absolute top-[-30vh] bottom-[-30vh] -left-[max(8.5px,0.665vw)] w-[1px] bg-[#c2c5c5] pointer-events-none"
                      />
                    )}

                    {/* Gray architectural pedestal behind each card:
                        Exact width = 393/470 (83.62%), top overhang = 34/470 (7.23%), bottom overhang = 36/470 (7.66%) */}
                    <div className="w-[83.62%] bg-[#b8baba] pt-[7.23%] pb-[7.66%] flex flex-col items-center relative">
                      {/* Image-Button Card: 470x326 aspect ratio, overhangs pedestal equally on left & right */}
                      <TerminalCardButton
                        card={card}
                        onClick={() => navigate(TERMINAL_CARD_ROUTES[card.id])}
                        className="w-[119.59%] aspect-[470/326] rounded-[6px]"
                      />

                      {/* Bottom Pedestal Caption: exact position inside bottom overhang (36/396 = 9.09%) & condensed font matching image_aaacc883.png */}
                      <div className="absolute bottom-0 inset-x-0 h-[9.09%] flex items-center justify-center pt-[1%]">
                        <span
                          style={{
                            fontFamily:
                              "'Barlow Semi Condensed', 'Barlow Condensed', 'Oswald', sans-serif",
                          }}
                          className="text-[max(9.5px,0.74vw)] font-bold tracking-[0.015em] leading-none uppercase text-[#5e6060] select-none"
                        >
                          {card.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        </>
      ) : (
        /* HOME VIEW: Full-Screen Background "MONSTER" Outline + Foreground Video Cutout + Social Buttons */
        <>
          {/* Background "MONSTER" Outline Typography (z-10)
              Oversized horizontally (>100vw) so the outer letters bleed off the left/right edges
              and the full word is never crammed into a narrow mobile screen */}
          <div
            className="fixed inset-0 w-screen h-screen z-10 flex items-center justify-center pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 1000 500"
              preserveAspectRatio="none"
              className="w-[195vw] h-[42vh] sm:w-[155vw] sm:h-[72vh] md:w-[138vw] md:h-[92vh] shrink-0 block"
            >
              <path
                d={FULLSCREEN_MONSTER_OUTLINE_PATH}
                fill="none"
                stroke="#565a66"
                strokeWidth="1.8"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* Foreground Centerpiece (z-20): Large Full-Width Exact 1:1 MONSTER Video Cutout */}
          <div className="relative z-20 w-[86vw] max-w-[1420px] flex items-center justify-center pointer-events-none">
            <div
              className="relative w-full"
              style={{
                aspectRatio: `${MONSTER_MASK_WIDTH} / ${MONSTER_MASK_HEIGHT}`,
              }}
            >
              {/* Dark #060608 knockout halo around MONSTER so the background outline font cleanly stops at the letters */}
              <svg
                viewBox={`0 0 ${MONSTER_MASK_WIDTH} ${MONSTER_MASK_HEIGHT}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none block overflow-visible"
                aria-hidden="true"
              >
                <path
                  d={MONSTER_EXACT_SVG_PATH}
                  fill={MONSTER_BG_HEX}
                  stroke={MONSTER_BG_HEX}
                  strokeWidth="28"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Video masked strictly inside the 1:1 MONSTER grunge letters */}
              <div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{
                  WebkitMaskImage: `url("${MONSTER_MASK_DATA_URI}")`,
                  maskImage: `url("${MONSTER_MASK_DATA_URI}")`,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  // Отдельный композитный слой: маска не пересчитывается
                  // на каждом кадре видео (важнее всего для Firefox).
                  transform: 'translateZ(0)',
                }}
              >
                <video
                  ref={videoRef}
                  src="/assets/monster_loop.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onError={() => setVideoFailed(true)}
                  className="w-full h-full object-cover pointer-events-none"
                />
                {/* Если видео не проигрывается, буквы не должны растворяться
                    в фоне: под маской остаётся холодная «дымка». */}
                {videoFailed && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 35%, rgba(255,255,255,0.16), transparent 55%), radial-gradient(circle at 70% 65%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(120deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Нижний блок (z-30): соцсети, дисклеймер, правовые ссылки, языки */}
          <StageFooter
            locale={locale}
            onLocaleChange={setLocale}
            className="absolute bottom-5 sm:bottom-7 inset-x-0 z-30"
          />
        </>
      )}
    </main>
  );
};
