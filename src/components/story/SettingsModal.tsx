import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Type, RotateCcw, User, Play } from 'lucide-react';
import { audioManager } from '../../services/audioManager';

export interface StorySettingsShape {
  fontSize: number;
  bgmVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  textSpeed: number;
  autoDelay: number;
  fontFamily: string;
  nickname: string;
  shakeIntensity: number;
  skipSpeed: number;
}

export type SettingsOption = { value: string | number; short?: string; label?: string };

/** Ряд из четырёх вариантов настройки (без ползунков). */
export const SettingsOptionRow: React.FC<{
  label: string;
  options: SettingsOption[];
  current: string | number;
  onSelect: (value: any) => void;
  compact?: boolean;
  /** Подпись сверху, кнопки во всю ширину (без боковой колонки). */
  stacked?: boolean;
  icon?: React.ReactNode;
}> = ({ label, options, current, onSelect, compact = false, stacked = false, icon }) => {
  const numeric = typeof current === 'number';
  const active = numeric
    ? options.reduce((best, option) =>
        Math.abs(Number(option.value) - (current as number)) <
        Math.abs(Number(best.value) - (current as number))
          ? option
          : best
      , options[0])
    : options.find((option) => option.value === current) ?? options[0];

  const buttons = (
      <div className={`grid min-w-0 grid-cols-4 gap-1 ${stacked ? 'w-full' : 'flex-1'}`}>
        {options.map((option) => {
          const selected = option === active;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-label={option.label ?? String(option.value)}
              title={option.label ?? String(option.value)}
              className={`border font-bold uppercase transition-colors cursor-pointer ${
                compact ? 'px-0.5 py-1.5 text-[9px] tracking-[0.04em]' : 'px-2 py-2 text-[11px] tracking-[0.06em]'
              } ${
                selected
                  ? 'border-white bg-white text-black'
                  : 'border-white/15 bg-white/[0.02] text-white/55 hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{option.label ?? option.short ?? option.value}</span>
              <span className="sm:hidden">{option.short ?? option.label ?? option.value}</span>
            </button>
          );
        })}
      </div>
  );

  if (stacked) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
          {icon}
          {label}
        </div>
        {buttons}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`shrink-0 truncate uppercase tracking-[0.1em] text-white/50 ${
          compact ? 'w-[86px] text-[10px]' : 'w-[150px] text-[11px]'
        }`}
      >
        {label}
      </span>
      {buttons}
    </div>
  );
};

interface SettingsPanelProps {
  settings: StorySettingsShape;
  onUpdateSettings: (settings: any) => void;
  t: any;
  /** Компактный вариант — для встроенного показа на экране загрузки. */
  compact?: boolean;
}

/**
 * Сами настройки читалки. Используются и в полноэкранной модалке,
 * и встроенно на экране загрузки главы.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  t,
}) => {
  const handleNicknameChange = (value: string) => {
    onUpdateSettings({ nickname: value });
    try {
      localStorage.setItem('ak-doc-name', value);
    } catch {}
  };

  const setVolume = (value: number) => {
    onUpdateSettings({
      ...settings,
      bgmVolume: value,
      sfxVolume: value,
      voiceVolume: value,
    });
    audioManager.setVolumes(value, value, value);
  };

  const resetSettings = () => {
    onUpdateSettings({
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

  const sectionTitle =
    'text-xs md:text-sm font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/10 pb-4';

  return (
    <div className="space-y-10">
      {/* Sound Settings */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>
          <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
          {t.sound_settings || 'Sound Settings'}
        </h3>
        <SettingsOptionRow
          label={t.sound_volume || 'Volume'}
          options={[
            { value: 0, short: '0%', label: '0%' },
            { value: 0.33, short: '33%', label: '33%' },
            { value: 0.66, short: '66%', label: '66%' },
            { value: 1, short: '100%', label: '100%' },
          ]}
          current={settings.bgmVolume}
          onSelect={setVolume}
        />
        <p className="text-[11px] leading-snug text-white/35">
          {t.volume_hint || 'Общий уровень: музыка, эффекты и голоса'}
        </p>
      </section>

      {/* Profile Settings */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>
          <User className="w-4 h-4 md:w-5 md:h-5" />
          {t.profile_settings || 'Profile Settings'}
        </h3>
        <SettingsOptionRow
          label={t.nickname || 'Nickname'}
          options={[
            { value: '', short: '—', label: '—' },
          ]}
          current=""
          onSelect={() => {}}
        />
        <input
          type="text"
          value={settings.nickname === '{@nickname}' ? '' : settings.nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          placeholder={t.enter_nickname || 'Введите ваше имя...'}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/25 transition-colors"
        />
        <p className="text-xs text-white/40 italic">
          {t.nickname_hint || 'Это имя будет отображаться в диалогах вместо Доктора'}
        </p>
      </section>

      {/* Auto Play Settings */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>
          <Play className="w-4 h-4 md:w-5 md:h-5" />
          {t.auto_play_settings || 'Auto Play Settings'}
        </h3>
        <SettingsOptionRow
          label={t.text_speed || 'Text Appearance'}
          options={[
            { value: 0, short: '0ms', label: t.instant || 'Мгновенно' },
            { value: 30, short: '30ms', label: '30ms' },
            { value: 60, short: '60ms', label: '60ms' },
            { value: 100, short: '100ms', label: '100ms' },
          ]}
          current={settings.textSpeed}
          onSelect={(value) => onUpdateSettings({ textSpeed: value })}
        />
        <SettingsOptionRow
          label={t.auto_delay || 'Auto Pause'}
          options={[
            { value: 1000, short: '1s', label: '1s' },
            { value: 2000, short: '2s', label: '2s' },
            { value: 4000, short: '4s', label: '4s' },
            { value: 6000, short: '6s', label: '6s' },
          ]}
          current={settings.autoDelay}
          onSelect={(value) => onUpdateSettings({ autoDelay: value })}
        />
        <SettingsOptionRow
          label={t.skip_speed || 'Skip Speed'}
          options={[
            { value: 2, short: 'x2', label: 'x2' },
            { value: 4, short: 'x4', label: 'x4' },
            { value: 8, short: 'x8', label: 'x8' },
            { value: 16, short: 'x16', label: 'x16' },
          ]}
          current={settings.skipSpeed || 4}
          onSelect={(value) => onUpdateSettings({ skipSpeed: value })}
        />
      </section>

      {/* Display Settings */}
      <section className="space-y-4">
        <h3 className={sectionTitle}>
          <Type className="w-4 h-4 md:w-5 md:h-5" />
          {t.display_settings || 'Display Settings'}
        </h3>
        <SettingsOptionRow
          label={t.font_size || 'Font Size'}
          options={[
            { value: 85, short: '85%', label: '85%' },
            { value: 100, short: '100%', label: '100%' },
            { value: 115, short: '115%', label: '115%' },
            { value: 130, short: '130%', label: '130%' },
          ]}
          current={settings.fontSize}
          onSelect={(value) => onUpdateSettings({ fontSize: value })}
        />
        <SettingsOptionRow
          label={t.shake_intensity || 'Screen Shake'}
          options={[
            { value: 0, short: '0%', label: t.off || 'Нет' },
            { value: 0.33, short: '33%', label: '33%' },
            { value: 0.66, short: '66%', label: '66%' },
            { value: 1, short: '100%', label: '100%' },
          ]}
          current={settings.shakeIntensity ?? 1}
          onSelect={(value) => onUpdateSettings({ shakeIntensity: value })}
        />
        <SettingsOptionRow
          label={t.font_family || 'Font Family'}
          options={[
            { value: 'sans-serif', short: 'Sans', label: 'Sans' },
            { value: 'serif', short: 'Serif', label: 'Serif' },
            { value: 'monospace', short: 'Mono', label: 'Mono' },
            { value: 'system-ui', short: 'System', label: 'System' },
          ]}
          current={settings.fontFamily || 'sans-serif'}
          onSelect={(value) => onUpdateSettings({ fontFamily: value })}
        />

        <div className="p-6 bg-white/5 rounded-lg border border-white/10">
          <p
            className="text-white/80 leading-relaxed transition-all duration-200"
            style={{
              fontSize: `${(settings.fontSize / 100) * 1.25}rem`,
              fontFamily: settings.fontFamily || 'sans-serif'
            }}
          >
            {t.font_preview || 'The quick brown fox jumps over the lazy dog.'}
          </p>
        </div>
      </section>

      {/* Reset Button */}
      <div className="pt-2 flex justify-center">
        <button
          onClick={resetSettings}
          className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest px-6 py-3 rounded-full hover:bg-white/5"
        >
          <RotateCcw className="w-5 h-5" />
          {t.reset_settings || 'Reset to Default'}
        </button>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  show: boolean;
  settings: StorySettingsShape;
  onUpdateSettings: (settings: any) => void;
  onClose: () => void;
  t: any;
}

/** Полноэкранная модалка настроек читалки. */
export const SettingsModal: React.FC<SettingsModalProps> = ({
  show,
  settings,
  onUpdateSettings,
  onClose,
  t
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black flex flex-col"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="p-8 flex items-center justify-between">
            <button
              onClick={onClose}
              className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-8 h-8 md:w-10 md:h-10" />
            </button>
            <h2 className="text-lg md:text-2xl font-bold text-white tracking-wider uppercase">
              {t.settings || 'Settings'}
            </h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto custom-scrollbar px-6 pb-24">
            <div className="max-w-3xl mx-auto pt-8">
              <SettingsPanel
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                t={t}
              />
            </div>
          </div>

          {/* Bottom Gradient for readability */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
