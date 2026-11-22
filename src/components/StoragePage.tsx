import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStageLanguage } from '../hooks/useStageLanguage';
import { platform } from '../platform';
import { CacheService } from '../services/cacheService';
import {
  OFFLINE_TEXT_LANGUAGES,
  getOfflineTextLanguages,
  getStoryTextSyncState,
  isOfflineTextAutostartEnabled,
  pauseStoryTextSync,
  preloadStoryTextManifest,
  resetOfflineTextProgress,
  restartStoryTextSync,
  resumeStoryTextSync,
  setOfflineTextAutostart,
  setOfflineTextLanguages,
  startStoryTextSync,
  subscribeStoryTextSync,
  type OfflineTextLanguage,
  type StoryTextSyncState,
} from '../services/storyTextSync';

/**
 * «Хранилище»: языки офлайн-текста, прогресс фоновой докачки и размер кэша.
 *
 * Текст сценариев — единственное, что приложение качает целиком. Картинки,
 * музыка и голос идут в кэш только при открытии главы/оперативника, поэтому
 * здесь их нет: они не «настройка», а побочный эффект чтения.
 */

const LANGUAGE_LABEL: Record<OfflineTextLanguage, string> = {
  ru_RU: 'Русский',
  en_US: 'English',
  zh_CN: '中文',
  ja_JP: '日本語',
  ko_KR: '한국어',
};

const LANGUAGE_NOTE: Record<OfflineTextLanguage, string> = {
  ru_RU: 'zh + перевод',
  en_US: 'официальный',
  zh_CN: 'официальный',
  ja_JP: 'официальный',
  ko_KR: 'официальный',
};

const RELEASES_URL = 'https://github.com/neponum/zoot-archive/releases/latest';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

const PLATFORM_LABEL: Record<string, string> = {
  capacitor: 'Android',
  web: 'Веб',
};

export const StoragePage: React.FC = () => {
  const navigate = useNavigate();
  const { locale } = useStageLanguage();
  const isRu = locale === 'ru';

  const [sync, setSync] = useState<StoryTextSyncState>(() => getStoryTextSyncState());
  const [languages, setLanguages] = useState<OfflineTextLanguage[]>(() =>
    getOfflineTextLanguages()
  );
  const [autostart, setAutostart] = useState(() => isOfflineTextAutostartEnabled());
  const [cache, setCache] = useState<{ entries: number; bytes: number } | null>(null);
  const [cacheBusy, setCacheBusy] = useState(false);

  useEffect(() => subscribeStoryTextSync(setSync), []);

  const refreshCache = useCallback(async () => {
    setCacheBusy(true);
    try {
      setCache(await CacheService.getStats());
    } finally {
      setCacheBusy(false);
    }
  }, []);

  useEffect(() => {
    void preloadStoryTextManifest();
    void refreshCache();
  }, [refreshCache]);

  const toggleLanguage = (lang: OfflineTextLanguage) => {
    const next = languages.includes(lang)
      ? languages.filter((item) => item !== lang)
      : [...languages, lang];
    // Хотя бы один язык нужен: пустой выбор = ничего не качаем и не читаем офлайн.
    if (next.length === 0) return;
    setLanguages(next);
    setOfflineTextLanguages(next);
    if (platform.kind !== 'web') restartStoryTextSync();
  };

  const progress = sync.total > 0 ? Math.min(100, (sync.done / sync.total) * 100) : 0;
  const isNative = platform.kind !== 'web';

  return (
    <section
      aria-label="Storage and offline settings"
      className="fixed inset-0 z-20 h-screen w-screen select-none overflow-x-hidden overflow-y-auto bg-[#0b0c0d] text-white site-scrollbar"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 7px)',
        }}
      />

      <div className="fixed left-3 top-2.5 z-50 flex items-center bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
        <button
          type="button"
          onClick={() => navigate('/terminal')}
          aria-label="Back to terminal"
          className="flex h-[38px] w-[88px] cursor-pointer items-center border-r border-white/15 pl-4 text-white transition-colors hover:bg-white/10 sm:h-[42px] sm:w-[104px]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Home"
          title="Home"
          className="flex h-[38px] cursor-pointer items-center justify-center px-3.5 text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:h-[42px]"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>
      </div>

      <div className="relative mx-auto w-full max-w-[1020px] px-4 pb-16 pt-20 sm:px-6 sm:pt-24">
        <header className="border-b border-white/10 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/35">
            // {isRu ? 'приложение' : 'application'}
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.12em] text-white sm:text-4xl">
            {isRu ? 'Хранилище' : 'Storage'}
          </h1>
          <p className="mt-2 max-w-[620px] text-xs leading-relaxed text-white/55 sm:text-[13px]">
            {isRu
              ? 'Текст сценариев качается целиком и читается без сети. Картинки, музыка и голос попадают в кэш при открытии главы или оперативника.'
              : 'Story text is downloaded in full and reads offline. Images, music and voice are cached when you open a chapter or an operator.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
            <span className="border border-white/15 bg-white/[0.03] px-2 py-1">
              {PLATFORM_LABEL[platform.kind] ?? platform.kind}
            </span>
            <span className="border border-white/15 bg-white/[0.03] px-2 py-1">
              {platform.kind === 'web' ? 'web' : `v${platform.getVersion()}`}
            </span>
          </div>
        </header>

        {/* Языки офлайн-текста */}
        <section className="mt-6 border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              {isRu ? 'Языки текста' : 'Text languages'}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              {isRu ? 'скачивается всё сразу' : 'download everything'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {OFFLINE_TEXT_LANGUAGES.map((lang) => {
              const active = languages.includes(lang);
              const progressForLang = sync.byLanguage.find((item) => item.lang === lang);
              const done = progressForLang?.done ?? 0;
              const total = progressForLang?.total ?? 0;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  aria-pressed={active}
                  className={`flex min-w-[130px] flex-col items-start gap-0.5 border px-3 py-2 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-white/70 bg-white text-black'
                      : 'border-white/15 bg-white/[0.02] text-white/60 hover:border-white/35 hover:text-white'
                  }`}
                >
                  <span className="text-[12px] font-semibold leading-tight">
                    {LANGUAGE_LABEL[lang]}
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                      active ? 'text-black/55' : 'text-white/35'
                    }`}
                  >
                    {LANGUAGE_NOTE[lang]}
                    {total > 0 ? ` · ${done}/${total}` : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {!isNative && (
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              {isRu
                ? 'На сайте фоновая докачка отключена: она запускается только в приложении.'
                : 'Background download is disabled on the website; it starts only in the app.'}
            </p>
          )}
        </section>

        {/* Прогресс */}
        <section className="mt-4 border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              {isRu ? 'Загрузка текста' : 'Text download'}
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {sync.done} / {sync.total || sync.filesTotal || '—'}
              {sync.errors > 0 && (
                <span className="ml-2 text-amber-300/80">
                  {isRu ? 'ошибок' : 'errors'}: {sync.errors}
                </span>
              )}
            </span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden bg-white/10">
            <div
              className="h-full bg-white/70 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 h-4 truncate font-mono text-[10px] text-white/35">
            {sync.current ??
              (sync.running
                ? isRu
                  ? 'готовим очередь...'
                  : 'preparing queue...'
                : isRu
                  ? 'ожидание'
                  : 'idle')}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (sync.running && !sync.paused) {
                  pauseStoryTextSync();
                  return;
                }
                if (sync.running) {
                  resumeStoryTextSync();
                  return;
                }
                void startStoryTextSync().catch(() => {});
              }}
              disabled={!isNative}
              className="h-8 cursor-pointer border border-white/25 bg-white/[0.04] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 transition-colors hover:border-white/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sync.running && !sync.paused
                ? isRu
                  ? 'Пауза'
                  : 'Pause'
                : isRu
                  ? 'Продолжить'
                  : 'Resume'}
            </button>

            <button
              type="button"
              onClick={() => restartStoryTextSync()}
              disabled={!isNative}
              className="h-8 cursor-pointer border border-white/15 bg-transparent px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50 transition-colors hover:border-white/40 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRu ? 'Пересобрать очередь' : 'Rebuild queue'}
            </button>

            <button
              type="button"
              onClick={() => resetOfflineTextProgress()}
              className="h-8 cursor-pointer border border-amber-300/25 bg-transparent px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/70 transition-colors hover:border-amber-300/60 hover:text-amber-100"
            >
              {isRu ? 'Сбросить прогресс' : 'Reset progress'}
            </button>

            <label className="ml-auto flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
              <input
                type="checkbox"
                checked={autostart}
                onChange={(event) => {
                  const next = event.target.checked;
                  setAutostart(next);
                  setOfflineTextAutostart(next);
                }}
                className="h-3.5 w-3.5 cursor-pointer accent-white"
              />
              {isRu ? 'Качать при запуске' : 'Download on launch'}
            </label>
          </div>
        </section>

        {/* Кэш */}
        <section className="mt-4 border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              {isRu ? 'Кэш контента' : 'Content cache'}
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-white/60">
              {cache ? `${cache.entries} ${isRu ? 'файлов' : 'files'} · ${formatBytes(cache.bytes)}` : '—'}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/40">
            {isRu
              ? 'Кэш общий для текста, картинок, музыки и голоса. Его можно очистить в любой момент — скачается заново при чтении.'
              : 'The cache holds text, images, music and voice. Clear it at any time; it will be downloaded again on demand.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshCache()}
              disabled={cacheBusy}
              className="h-8 cursor-pointer border border-white/15 bg-transparent px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
            >
              {isRu ? 'Обновить' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm(
                  isRu
                    ? 'Очистить весь кэш? Скачанное придётся загрузить снова.'
                    : 'Clear the whole cache? Everything will be downloaded again.'
                );
                if (!confirmed) return;
                await CacheService.clear();
                await refreshCache();
              }}
              className="h-8 cursor-pointer border border-white/15 bg-transparent px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 transition-colors hover:border-red-400/50 hover:text-red-300"
            >
              {isRu ? 'Очистить' : 'Clear'}
            </button>
          </div>
        </section>

        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-white/[0.02] px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {isRu ? 'Обновления' : 'Updates'}
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              {isRu
                ? 'Новые версии выходят в GitHub Releases.'
                : 'New versions are published in GitHub Releases.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void platform.openExternal(RELEASES_URL)}
            className="h-8 cursor-pointer border border-white/25 bg-white/[0.04] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 transition-colors hover:border-white/60 hover:text-white"
          >
            {isRu ? 'Открыть релизы' : 'Open releases'}
          </button>
        </section>
      </div>
    </section>
  );
};
