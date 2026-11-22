import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryTimelineView, type StoryChapterItem, type StorylineCategory } from './StoryTimelineView';

interface StoryTimelineData {
  generatedAt: string;
  categories: StorylineCategory[];
}

const DATA_URL = '/data/archive/story/index.json';

/**
 * Таймлайн историй: настоящие Story Line игры (MS, RL, UR, LA, KJ, SI, KA, SU,
 * RH, Æ, LE, TA, ST, TS) из раздела «曲谱».
 *
 * Данные собираются из таблиц игры (`story_review_table`, `chapter_table`) и
 * разметки Story Line со страницы PRTS скриптом `npm run sync:story` в один
 * файл `/data/archive/story/index.json` — так экран открывается одним запросом.
 */
export const StoryTimelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<StoryTimelineData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);

    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<StoryTimelineData>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((reason) => {
        console.warn('Не удалось загрузить таймлайн историй', reason);
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <section
        aria-label="Story Timeline Error"
        className="fixed inset-0 z-20 w-screen h-screen bg-[#0b0e12] text-white flex flex-col items-center justify-center gap-5"
      >
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-white/60">
          Архив историй недоступен
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="px-5 py-2 border border-white/30 bg-white/[0.08] hover:bg-white/15 text-[11px] font-bold tracking-[0.16em] uppercase transition-colors cursor-pointer"
        >
          Повторить загрузку
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/45 hover:text-white transition-colors cursor-pointer"
        >
          ← На главную
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section
        aria-label="Story Timeline Loading"
        className="fixed inset-0 z-20 w-screen h-screen bg-[#0b0e12] text-white flex items-center justify-center"
      >
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/70">
            Загрузка архива историй
          </span>
        </div>
      </section>
    );
  }

  return (
    <StoryTimelineView
      storylines={data.categories}
      onBackToTerminal={() => navigate('/')}
      onOpenStory={(chapter: StoryChapterItem) => {
        if (chapter.startStoryTxt) navigate(`/story/${chapter.startStoryTxt}`);
      }}
    />
  );
};
