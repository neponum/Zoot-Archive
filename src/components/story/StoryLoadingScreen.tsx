import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Volume2,
  Type,
  User,
  Gauge,
  Languages,
} from 'lucide-react';
import { Language } from '../../types';
import type { StoryOperationBrief } from '../MainThemeStoryView';
import { SettingsOptionRow, type StorySettingsShape } from './SettingsModal';
import { audioManager } from '../../services/audioManager';

interface StoryLoadingScreenProps {
  loading: boolean;
  /** Загрузка началась (нажата кнопка «Загрузить историю»). */
  started?: boolean;
  preloadProgress: { loaded: number; total: number; currentFile: string };
  lang: Language;
  t: Record<string, string>;
  /** Скрипт показан в оригинале: русского перевода главы нет. */
  isOriginalScript?: boolean;
  /** Брифинг операции, из которой открыта глава. */
  operation?: StoryOperationBrief;
  /** Выбор языка чтения до старта. */
  onSelectLang?: (lang: Language) => void;
  /** Настройки читалки показываются сразу, без отдельной кнопки. */
  settings?: StorySettingsShape;
  onUpdateSettings?: (settings: any) => void;
  /** Сцены операции: до боя / после боя. */
  sceneOptions?: { beg?: string | null; end?: string | null };
  /** Какие сцены включены (можно обе, одну или ни одной). */
  sceneSelection?: { beg: boolean; end: boolean };
  onToggleScene?: (part: 'beg' | 'end') => void;
  onStartLoading?: () => void;
  /** Открыть памятку по кнопкам и управлению читалкой. */
  onShowHelp?: () => void;
  onBack: () => void;
}

/** Языки, на которых можно читать историю. */
const STORY_LANGS: { id: Language; label: string; short: string }[] = [
  { id: 'ru_RU', label: 'Русский', short: 'RU' },
  { id: 'en_US', label: 'English', short: 'EN' },
  { id: 'zh_CN', label: '中文', short: 'ZH' },
  { id: 'ja_JP', label: '日本語', short: 'JP' },
];

/** Заголовок группы настроек. */
const GroupTitle: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
    {icon}
    {children}
  </div>
);

/**
 * Стартовый экран главы: выбор языка, настройки и запуск — одной панелью,
 * в стиле остальных экранов читалки. Все настройки — дискретные варианты.
 */
export const StoryLoadingScreen: React.FC<StoryLoadingScreenProps> = ({
  loading,
  started = false,
  preloadProgress,
  lang,
  t,
  isOriginalScript,
  operation,
  onSelectLang,
  settings,
  sceneOptions,
  sceneSelection,
  onToggleScene,
  onUpdateSettings,
  onStartLoading,
  onShowHelp,
  onBack
}) => {
  const isRu = lang === 'ru_RU' || lang === 'ru_RU_CN';
  const progress = preloadProgress.total
    ? Math.round((preloadProgress.loaded / preloadProgress.total) * 100)
    : 0;

  // Кнопка нажата: держим поле загрузки даже в кадр до setLoading(true).
  const [startRequested, setStartRequested] = React.useState(started);
  const sawLoadingRef = React.useRef(loading);

  React.useEffect(() => {
    if (loading) {
      sawLoadingRef.current = true;
    } else if (startRequested && sawLoadingRef.current) {
      sawLoadingRef.current = false;
      setStartRequested(false);
    }
  }, [startRequested, loading]);

  const isPreloading = started && (loading || startRequested);

  /** Только имя файла из полного URL — подпись под прогрессом. */
  const currentFileName = React.useMemo(() => {
    const raw = preloadProgress.currentFile || '';
    if (!raw) return '';
    const clean = raw.split('?')[0].split('#')[0];
    const parts = clean.split('/');
    const name = parts[parts.length - 1] || clean;
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  }, [preloadProgress.currentFile]);

  // После нажатия «Загрузить историю» экран превращается в одно поле загрузки:
  // прогресс, счётчик и имя текущего файла. Никаких настроек и предпросмотра.
  if (isPreloading) {
    return (
      <div className="relative flex h-full items-center justify-center overflow-hidden bg-black px-4 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07)_0%,rgba(0,0,0,0.92)_55%,#000_100%)]" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-[420px] border border-white/12 bg-white/[0.03] px-5 py-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
              {t.loading_story || (isRu ? 'Загрузка истории' : 'Loading story')}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-white/70">{progress}%</span>
          </div>
          <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-[#e6e6e6]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] text-white/35">
            <span className="shrink-0 tabular-nums">
              {preloadProgress.loaded} / {preloadProgress.total || '—'}
            </span>
            <span className="truncate text-right" title={preloadProgress.currentFile || ''}>
              {currentFileName || '…'}
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  const update = (patch: Record<string, unknown>) => {
    if (!onUpdateSettings) return;
    onUpdateSettings(patch);
  };

  const resetSettings = () => {
    onUpdateSettings?.({
      fontSize: 100,
      bgmVolume: 1,
      sfxVolume: 1,
      voiceVolume: 1,
      textSpeed: 30,
      autoDelay: 2000,
      fontFamily: 'sans-serif',
      nickname: '',
      shakeIntensity: 1,
    });
    audioManager.setVolumes(1, 1, 1);
  };

  return (
    <div className="site-scrollbar relative flex h-full flex-col overflow-y-auto overflow-x-hidden bg-black px-3 py-4 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0.9)_55%,#000_100%)]" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 mx-auto my-auto flex w-full max-w-[520px] flex-col gap-3 py-1"
      >
        {/* Шапка: операция и глава */}
        {(operation?.code || operation?.name) && (
          <div className="flex items-center gap-2 px-1">
            {operation?.code && (
              <span className="shrink-0 border border-[rgba(255,255,255,0.55)]/50 bg-[rgba(255,255,255,0.12)]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[rgba(255,255,255,0.9)]">
                {operation.code}
              </span>
            )}
            <span className="truncate text-xs font-bold uppercase tracking-[0.14em] text-white/80">
              {operation?.name}
            </span>
          </div>
        )}

        {/* Язык — как на панели-образце */}
        <div className="px-1">
          <GroupTitle icon={<Languages className="h-3 w-3" />}>
            {isRu ? 'Язык чтения' : 'Reading language'}
          </GroupTitle>
          <div className="grid grid-cols-4 gap-1">
            {STORY_LANGS.map((option) => {
              const selected = option.id === lang;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectLang?.(option.id)}
                  aria-label={option.label}
                  className={`border px-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
                    selected
                      ? 'border-white bg-white text-black'
                      : 'border-white/15 bg-white/[0.02] text-white/55 hover:border-white/40 hover:text-white'
                  }`}
                >
                  <span className="hidden sm:inline">{option.label}</span>
                  <span className="sm:hidden">{option.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Настройки: подпись сверху + четыре варианта */}
        {settings && onUpdateSettings && (
          <div className="flex flex-col gap-2.5 px-1">
            <SettingsOptionRow
              stacked
              compact
              icon={<Volume2 className="h-3 w-3" />}
              label={isRu ? 'Громкость' : 'Volume'}
              options={[
                { value: 0, short: '0%', label: isRu ? 'Выкл' : 'Off' },
                { value: 0.33, short: '33%', label: '33%' },
                { value: 0.66, short: '66%', label: '66%' },
                { value: 1, short: '100%', label: '100%' },
              ]}
              current={settings.bgmVolume}
              onSelect={(value) => {
                if (!onUpdateSettings) return;
                onUpdateSettings({
                  ...settings,
                  bgmVolume: value,
                  sfxVolume: value,
                  voiceVolume: value,
                });
                audioManager.setVolumes(value, value, value);
              }}
            />

            <SettingsOptionRow
              stacked
              compact
              icon={<Gauge className="h-3 w-3" />}
              label={isRu ? 'Появление текста' : 'Text speed'}
              options={[
                { value: 0, short: '0ms', label: isRu ? 'Мгновенно' : 'Instant' },
                { value: 30, short: '30ms', label: '30ms' },
                { value: 60, short: '60ms', label: '60ms' },
                { value: 100, short: '100ms', label: '100ms' },
              ]}
              current={settings.textSpeed}
              onSelect={(value) => update({ textSpeed: value })}
            />

            <SettingsOptionRow
              stacked
              compact
              icon={<Gauge className="h-3 w-3" />}
              label={isRu ? 'Пауза авто-режима' : 'Auto pause'}
              options={[
                { value: 1000, short: '1s', label: '1s' },
                { value: 2000, short: '2s', label: '2s' },
                { value: 4000, short: '4s', label: '4s' },
                { value: 6000, short: '6s', label: '6s' },
              ]}
              current={settings.autoDelay}
              onSelect={(value) => update({ autoDelay: value })}
            />

            <SettingsOptionRow
              stacked
              compact
              icon={<Gauge className="h-3 w-3" />}
              label={isRu ? 'Скорость пропуска' : 'Skip speed'}
              options={[
                { value: 2, short: 'x2', label: 'x2' },
                { value: 4, short: 'x4', label: 'x4' },
                { value: 8, short: 'x8', label: 'x8' },
                { value: 16, short: 'x16', label: 'x16' },
              ]}
              current={settings.skipSpeed || 4}
              onSelect={(value) => update({ skipSpeed: value })}
            />

            <SettingsOptionRow
              stacked
              compact
              icon={<Type className="h-3 w-3" />}
              label={isRu ? 'Размер шрифта' : 'Font size'}
              options={[
                { value: 85, short: '85%', label: '85%' },
                { value: 100, short: '100%', label: '100%' },
                { value: 115, short: '115%', label: '115%' },
                { value: 130, short: '130%', label: '130%' },
              ]}
              current={settings.fontSize}
              onSelect={(value) => update({ fontSize: value })}
            />

            <SettingsOptionRow
              stacked
              compact
              icon={<Type className="h-3 w-3" />}
              label={isRu ? 'Тряска экрана' : 'Screen shake'}
              options={[
                { value: 0, short: '0%', label: isRu ? 'Нет' : 'Off' },
                { value: 0.33, short: '33%', label: '33%' },
                { value: 0.66, short: '66%', label: '66%' },
                { value: 1, short: '100%', label: '100%' },
              ]}
              current={settings.shakeIntensity ?? 1}
              onSelect={(value) => update({ shakeIntensity: value })}
            />

            <SettingsOptionRow
              stacked
              compact
              icon={<Type className="h-3 w-3" />}
              label={isRu ? 'Гарнитура' : 'Font family'}
              options={[
                { value: 'sans-serif', short: 'Sans', label: 'Sans' },
                { value: 'serif', short: 'Serif', label: 'Serif' },
                { value: 'monospace', short: 'Mono', label: 'Mono' },
                { value: 'system-ui', short: 'System', label: 'System' },
              ]}
              current={settings.fontFamily || 'sans-serif'}
              onSelect={(value) => update({ fontFamily: value })}
            />

            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                <User className="h-3 w-3" />
                {isRu ? 'Имя' : 'Name'}
              </div>
              <input
                type="text"
                value={settings.nickname === '{@nickname}' ? '' : settings.nickname}
                onChange={(event) => update({ nickname: event.target.value })}
                placeholder={isRu ? 'Доктор' : 'Doctor'}
                className="w-full border border-white/12 bg-white/[0.03] px-2 py-1.5 text-[11px] text-white transition-colors focus:border-[#e6e6e6]/70 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={resetSettings}
                className="flex cursor-pointer items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 transition-colors hover:text-white"
              >
                <RotateCcw className="h-3 w-3" />
                {t.reset_settings || (isRu ? 'Сбросить' : 'Reset')}
              </button>
            </div>
          </div>
        )}

        {/* Предпросмотр шрифта: как будет выглядеть текст в читалке */}
        {settings && (
          <div className="px-1">
            <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
              Предпросмотр шрифта
            </div>
            <div className="border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <p
                className="m-0 leading-relaxed text-white/80"
                style={{
                  fontFamily: settings.fontFamily || 'sans-serif',
                  fontSize: `${(settings.fontSize / 100) * 13}px`,
                }}
              >
                Съешь же ещё этих мягких французских булок, да выпей чаю.
              </p>
              <p
                className="m-0 mt-1 leading-snug text-white/35"
                style={{
                  fontFamily: settings.fontFamily || 'sans-serif',
                  fontSize: `${(settings.fontSize / 100) * 10}px`,
                }}
              >
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>
        )}

        {/* Выбор сцены операции до загрузки */}
        {!started && sceneOptions?.beg && sceneOptions?.end && onToggleScene && (
          <div className="px-1">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                Сцены операции
              </span>
              {sceneSelection && !sceneSelection.beg && !sceneSelection.end && (
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-amber-300/90">
                  Выберите хотя бы одну
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(['beg', 'end'] as const).map((part) => {
                const selected = sceneSelection?.[part] ?? false;
                return (
                  <button
                    key={part}
                    type="button"
                    onClick={() => onToggleScene(part)}
                    aria-pressed={selected}
                    className={`border px-1 py-2 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
                      selected
                        ? 'border-white bg-white text-black'
                        : 'border-white/15 bg-white/[0.02] text-white/55 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {part === 'beg' ? 'До боя' : 'После боя'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* До старта — кнопка запуска загрузки; дальше история играет сама */}
        {!started ? (
          <button
            type="button"
            onClick={() => {
              setStartRequested(true);
              onStartLoading?.();
            }}
            disabled={sceneSelection ? !sceneSelection.beg && !sceneSelection.end : false}
            className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-white/25 bg-white/[0.06] px-4 py-2.5 transition-colors hover:border-white/60 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-white/30"
          >
            <Play className="h-4 w-4 text-white/80 transition-transform group-hover:scale-110" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-white/85 group-hover:text-white">
              Загрузить историю
            </span>
          </button>
        ) : null}

        {isOriginalScript && (
          <p className="px-1 text-center text-[10px] leading-snug text-amber-200/80">
            {isRu
              ? 'Русского перевода этой главы пока нет — показан оригинал (китайский).'
              : 'There is no Russian translation for this chapter yet — the original (Chinese) is shown.'}
          </p>
        )}

        {/* Короткая подсказка + полная памятка по кнопкам читалки */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-1 text-center text-[10px] leading-snug text-white/45">
          <span>
            {isRu
              ? 'Пролистать историю: удерживайте экран или Ctrl.'
              : 'To fast-forward: hold the screen or Ctrl.'}
          </span>
          {onShowHelp && (
            <button
              type="button"
              onClick={onShowHelp}
              className="cursor-pointer font-semibold text-white/70 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white"
            >
              {isRu ? 'Что делают кнопки?' : 'What do the buttons do?'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mx-auto flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          {t.back_to_menu || (isRu ? 'Назад в меню' : 'Back to Menu')}
        </button>
      </motion.div>
    </div>
  );
};
