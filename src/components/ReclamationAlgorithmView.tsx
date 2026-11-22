import React, { useEffect, useState } from 'react';
import { UI_STRINGS } from '../translations';
import { getLanguage } from '../services/storyService';
import type { Language } from '../types';
import { handleImageFallback } from '../lib/imageFallback';
import { StorySceneButton } from './story/StorySceneButton';

interface RAStoryScene {
  code: string;
  label: string;
  path: string;
}

interface RAThemeConfig {
  id: 'tales_within_the_sand' | 'relaunch_anchor';
  name: string;
  metricNumber: string;
  metricLabel: string;
  synopsisLines: string[];
  synopsisLinesRu: string[];
  storyScenes: RAStoryScene[];
}

const RA_THEMES: Record<RAThemeConfig['id'], RAThemeConfig> = {
  tales_within_the_sand: {
    id: 'tales_within_the_sand',
    name: 'Tales Within the Sand',
    metricNumber: '1',
    metricLabel: 'SURVIVAL DAYS',
    synopsisLines: [
      'Rhodes Island will establish an office in the Sargon-Arsalan region, along with an outpost for observing the Foehn Hotlands.',
      'Mining districts, treasures, eccentric street performers, and countless wondrous rumors...',
      'You stand amidst the boundless yellow sands, ready to face everything this unknown land holds.',
    ],
    synopsisLinesRu: [
      'Rhodes Island откроет представительство в регионе Саргон-Арсалан и станцию наблюдения за Фён-Хотлендс.',
      'Рудники, сокровища, эксцентричные уличные артисты и бесчисленные диковинные слухи...',
      'Ты стоишь среди бескрайних жёлтых песков, готовый встретить всё, что скрывает эта неведомая земля.',
    ],
    storyScenes: [
      {
        code: 'START',
        label: 'Начало',
        path: 'obt/sandboxperm/sandbox_1/sandbox_1_entry',
      },
      {
        code: 'END 1',
        label: 'Финал 1',
        path: 'obt/sandboxperm/sandbox_1/sandbox_1_ending_1',
      },
      {
        code: 'END 2',
        label: 'Финал 2',
        path: 'obt/sandboxperm/sandbox_1/sandbox_1_ending_2',
      },
      {
        code: 'END 3',
        label: 'Финал 3',
        path: 'obt/sandboxperm/sandbox_1/sandbox_1_ending_3',
      },
    ],
  },
  relaunch_anchor: {
    id: 'relaunch_anchor',
    name: 'Relaunch Anchor',
    metricNumber: '1',
    metricLabel: 'NEW BASE LEVEL',
    synopsisLines: [
      'Returning to the frontier outpost, Rhodes Island initiates the Relaunch Anchor protocol to expand the autonomous settlement.',
      'Fortify defenses, cultivate sustainable provisions, and chart routes across the shifting weather zones.',
      'Every decision at the anchor point shapes the survival of the expedition across the barren wilds.',
    ],
    synopsisLinesRu: [
      'Вернувшись на пограничный аванпост, Rhodes Island запускает протокол «Перезапуск якоря», чтобы расширить автономное поселение.',
      'Укрепи оборону, наладь снабжение и проложи маршруты через переменчивые погодные зоны.',
      'Каждое решение на якоре определяет, выживет ли экспедиция среди опустевших пустошей.',
    ],
    storyScenes: [
      {
        code: 'START',
        label: 'Начало',
        path: 'obt/sandboxperm/sandbox_2/sandbox_2_entry',
      },
      {
        code: 'END 1',
        label: 'Финал 1',
        path: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_1',
      },
      {
        code: 'END 2',
        label: 'Финал 2',
        path: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_2',
      },
      {
        code: 'END 3',
        label: 'Финал 3',
        path: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_3',
      },
      {
        code: 'END 4',
        label: 'Финал 4',
        path: 'obt/sandboxperm/sandbox_2/sandbox_2_ending_4',
      },
    ],
  },
};

/** `sandbox_1`/`sandbox_2` — id тем RA в `public/data/archive/terminal.json`. */
const RA_TOPIC_ID: Record<RAThemeConfig['id'], string> = {
  tales_within_the_sand: 'sandbox_1',
  relaunch_anchor: 'sandbox_2',
};

/**
 * Официальные баннеры RA из зеркала проекта. Нужны, если `terminal.json`
 * ещё не загрузился или недоступен: страница не должна показывать чужие арты.
 */
const RA_BANNER_FALLBACK: Record<RAThemeConfig['id'], string> = {
  tales_within_the_sand:
    'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/RA_1_vertical.png',
  relaunch_anchor:
    'https://raw.githubusercontent.com/neponum/zoot-data/main/banners/RA_2_vertical.png',
};

const HexOutpostWatermark: React.FC = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-16 h-16 sm:w-20 sm:h-20 text-white/[0.14] pointer-events-none select-none"
    fill="none"
  >
    <polygon
      points="50,6 90,28 90,72 50,94 10,72 10,28"
      stroke="currentColor"
      strokeWidth="3"
    />
    <polygon
      points="50,14 82,32 82,68 50,86 18,68 18,32"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Inner triangle + rook tower */}
    <polygon
      points="50,24 74,66 26,66"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path
      d="M44 42H56V62H44V42ZM42 36H46V40H54V36H58V42H42V36Z"
      fill="currentColor"
    />
  </svg>
);

interface ReclamationAlgorithmViewProps {
  onBackToTerminal: () => void;
  onBackToHome: () => void;
  onOpenStory: (path: string) => void;
}

export const ReclamationAlgorithmView: React.FC<
  ReclamationAlgorithmViewProps
> = ({ onBackToTerminal, onBackToHome, onOpenStory }) => {
  const [selectedId, setSelectedId] = useState<RAThemeConfig['id']>(
    'tales_within_the_sand'
  );

  const activeTheme = RA_THEMES[selectedId];

  /** Официальные баннеры тем из `terminal.json` (те же, что у Integrated Strategies). */
  const [banners, setBanners] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/data/archive/terminal.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{
          reclamation?: Array<{ id?: string; banner?: string }>;
        }>;
      })
      .then((payload) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const topic of payload.reclamation ?? []) {
          if (topic.id && topic.banner) next[topic.id] = topic.banner;
        }
        setBanners(next);
      })
      .catch((reason) => {
        console.warn('Не удалось загрузить баннеры Reclamation Algorithm', reason);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bannerFor = (id: RAThemeConfig['id']) =>
    banners[RA_TOPIC_ID[id]] || RA_BANNER_FALLBACK[id];

  const uiLang: Language =
    (typeof window !== 'undefined'
      ? (localStorage.getItem('arknights_ui_lang') as Language | null)
      : null) ?? getLanguage();
  const t = UI_STRINGS[uiLang];

  return (
    <section
      aria-label="Reclamation Algorithm"
      className="fixed inset-0 z-20 w-screen h-screen bg-[#0b0c0d] text-white overflow-x-auto overflow-y-auto select-none site-scrollbar"
    >
      {/* Диагональная карбоновая текстура на всей странице, как на референсе */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 6px)',
        }}
      />

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

      {/* Main 3-Column Layout Container matching image_ae8cfb0f.png */}
      <div className="relative mx-auto flex w-full min-w-[980px] max-w-[1500px] flex-col gap-5 px-4 pb-10 pt-20 sm:px-6 sm:pt-24">
        {/* TOP ROW: вертикальные обложки тем RA (без дат) и плитка «尚待探索» */}
        <div className="relative grid h-[clamp(430px,58vh,620px)] w-full shrink-0 grid-cols-[1fr_1fr_0.74fr] gap-3">
          {/* COLUMN 1: только баннер */}
          <div
            onClick={() => setSelectedId('tales_within_the_sand')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedId('tales_within_the_sand');
              }
            }}
            className={`group relative h-full overflow-hidden border bg-black/30 transition-all duration-300 cursor-pointer focus:outline-none ${
              selectedId === 'tales_within_the_sand'
                ? 'border-[#c8e64b]/45 ring-1 ring-[#c8e64b]/50 shadow-[0_0_46px_rgba(200,230,75,0.18)]'
                : 'border-white/10 opacity-80 hover:opacity-100'
            }`}
          >
            <img
              src={bannerFor('tales_within_the_sand')}
              alt="Tales Within The Sand"
              draggable={false}
              loading="eager"
              decoding="async"
              onError={(e) => handleImageFallback(e, bannerFor('tales_within_the_sand'))}
              className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {selectedId === 'tales_within_the_sand' && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    background:
                      'radial-gradient(ellipse 95% 75% at 0% 100%, rgba(200,230,75,0.58) 0%, rgba(200,230,75,0.18) 32%, rgba(200,230,75,0) 68%)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 z-20 h-[2px] w-1/2 bg-gradient-to-r from-[#c8e64b] via-[#c8e64b]/60 to-transparent"
                />
              </>
            )}
          </div>

          {/* COLUMN 2: только баннер */}
          <div
            onClick={() => setSelectedId('relaunch_anchor')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedId('relaunch_anchor');
              }
            }}
            className={`group relative h-full overflow-hidden border bg-black/30 transition-all duration-300 cursor-pointer focus:outline-none ${
              selectedId === 'relaunch_anchor'
                ? 'border-[#c8e64b]/45 ring-1 ring-[#c8e64b]/50 shadow-[0_0_46px_rgba(200,230,75,0.18)]'
                : 'border-white/10 opacity-85 hover:opacity-100'
            }`}
          >
            <img
              src={bannerFor('relaunch_anchor')}
              alt="Relaunch Anchor"
              draggable={false}
              loading="lazy"
              decoding="async"
              onError={(e) => handleImageFallback(e, bannerFor('relaunch_anchor'))}
              className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {selectedId === 'relaunch_anchor' && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    background:
                      'radial-gradient(ellipse 95% 75% at 0% 100%, rgba(200,230,75,0.58) 0%, rgba(200,230,75,0.18) 32%, rgba(200,230,75,0) 68%)',
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 z-20 h-[2px] w-1/2 bg-gradient-to-r from-[#c8e64b] via-[#c8e64b]/60 to-transparent"
                />
              </>
            )}
          </div>

          {/* COLUMN 3: «尚待探索...» — серый фон и тёмная X */}
          <div className="relative flex h-full items-center justify-center overflow-hidden border border-white/10 bg-[#121417]">
            <svg
              viewBox="0 0 300 430"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full pointer-events-none"
              aria-hidden="true"
            >
              {/* Тёмная буква X: две одинаковые перекрещенные полосы, чуть выше центра */}
              <g transform="translate(0 -38)">
                <polygon points="-70,-60 0,-60 370,500 300,500" fill="#0a0b0c" />
                <polygon points="370,-60 300,-60 0,500 70,500" fill="#0a0b0c" />
              </g>
            </svg>

            <span className="relative z-10 px-4 text-center text-[12px] font-medium uppercase leading-snug tracking-[0.22em] text-[#a7abad] drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] sm:text-[13px]">
              {t.to_be_explored || 'TO BE EXPLORED...'}
            </span>
          </div>
        </div>

        {/* ===================================================================
            BOTTOM LORE & DESCRIPTION BAR (~26% height)
            matching bottom section of image_ae8cfb0f.png
            =================================================================== */}
        <div className="relative w-full px-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            {activeTheme.name}
          </p>
          <div className="max-w-[820px] space-y-1.5 text-xs leading-[1.9] tracking-[0.03em] text-[#c4c8cc] sm:text-sm">
            {(activeTheme.synopsisLinesRu ?? activeTheme.synopsisLines).map(
              (line, idx) => (
                <p key={idx}>{line}</p>
              )
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {activeTheme.storyScenes.map((scene) => (
              <StorySceneButton
                key={scene.path}
                code={scene.code}
                label={scene.label}
                onClick={() => onOpenStory(scene.path)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
