import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntegratedStrategiesView, type ISThemeItem } from './IntegratedStrategiesView';

interface TerminalData {
  integratedStrategies: ISThemeItem[];
}

const DATA_URL = '/data/archive/terminal.json';

/**
 * Integrated Strategies: темы, их официальные описания и реальные счётчики
 * прогресса из `roguelike_topic_table` (генерируется `npm run sync:terminal`).
 */
export const IntegratedStrategiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<ISThemeItem[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);

    fetch(DATA_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TerminalData>;
      })
      .then((payload) => {
        if (!cancelled) setThemes(payload.integratedStrategies ?? []);
      })
      .catch((reason) => {
        console.warn('Не удалось загрузить темы Integrated Strategies', reason);
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (error) {
    return (
      <section
        aria-label="Integrated Strategies Error"
        className="fixed inset-0 z-20 w-screen h-screen bg-black text-white flex flex-col items-center justify-center gap-5"
      >
        <p className="text-xs font-bold tracking-[0.22em] uppercase text-white/60">
          Архив Integrated Strategies недоступен
        </p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="px-5 py-2 border border-white/30 bg-white/[0.08] hover:bg-white/15 text-[11px] font-bold tracking-[0.16em] uppercase transition-colors cursor-pointer"
        >
          Повторить загрузку
        </button>
      </section>
    );
  }

  if (!themes || themes.length === 0) {
    return (
      <section
        aria-label="Integrated Strategies Loading"
        className="fixed inset-0 z-20 w-screen h-screen bg-black text-white flex items-center justify-center"
      >
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/70">
            Загрузка архива
          </span>
        </div>
      </section>
    );
  }

  return (
    <IntegratedStrategiesView
      themes={themes}
      onBackToTerminal={() => navigate('/terminal')}
      onBackToHome={() => navigate('/')}
    />
  );
};
