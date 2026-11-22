import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  EyeOff,
  FastForward,
  History,
  Keyboard,
  Maximize,
  MousePointerClick,
  Settings,
  X,
} from 'lucide-react';

interface StoryHelpModalProps {
  show: boolean;
  onClose: () => void;
  /** Русский интерфейс; иначе — английский (для zh/ja/ko тоже). */
  isRu?: boolean;
  /** Открыть форму репорта об ошибке в переводе/тексте. */
  onReportError?: () => void;
}

interface HelpRow {
  icon: React.ReactNode;
  title: string;
  text: string;
}

const HelpSection: React.FC<{ title: string; rows: HelpRow[] }> = ({
  title,
  rows,
}) => (
  <div className="space-y-2">
    <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
      {title}
    </h3>
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.title} className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/65">
            {row.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-white/90">{row.title}</p>
            <p className="text-[11px] leading-snug text-white/50">{row.text}</p>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Памятка по читалке: как листать историю и что делает каждая кнопка.
 * Показывается только на экране загрузки истории.
 */
export const StoryHelpModal: React.FC<StoryHelpModalProps> = ({
  show,
  onClose,
  isRu = true,
  onReportError,
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isRu ? 'Как читать историю' : 'How to read the story'}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#141414]"
        >
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="flex items-center gap-2.5 text-lg font-medium text-white">
              <Keyboard className="h-5 w-5 text-white/70" />
              {isRu ? 'Как читать историю' : 'How to read the story'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={isRu ? 'Закрыть' : 'Close'}
              className="cursor-pointer p-1.5 text-white/60 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="site-scrollbar space-y-5 overflow-y-auto p-5">
            <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-white/60">
              {isRu ? (
                <>
                  Клик или тап по экрану — следующая реплика. Чтобы быстро пролистать
                  историю, <span className="text-white/90">зажмите экран</span> примерно на
                  0,4 секунды или удерживайте{' '}
                  <span className="text-white/90">Ctrl / Tab</span>.
                </>
              ) : (
                <>
                  Click or tap the screen for the next line. To fast-forward,{' '}
                  <span className="text-white/90">hold the screen</span> for about 0.4 seconds
                  or hold <span className="text-white/90">Ctrl / Tab</span>.
                </>
              )}
            </p>

            <HelpSection
              title={isRu ? 'Верхняя панель' : 'Top bar'}
              rows={[
                {
                  icon: <Settings className="h-4 w-4" />,
                  title: isRu ? 'Настройки' : 'Settings',
                  text: isRu
                    ? 'Размер шрифта, скорость текста, громкость, авто-пауза, скорость пропуска и тряска экрана.'
                    : 'Font size, text speed, volume, auto pause, skip speed and screen shake.',
                },
                {
                  icon: <History className="h-4 w-4" />,
                  title: isRu ? 'История' : 'History',
                  text: isRu
                    ? 'Журнал уже прочитанных реплик. Из него можно вернуться к нужной строке.'
                    : 'A log of the lines you have already read. Jump back to any line from there.',
                },
                {
                  icon: <AlertTriangle className="h-4 w-4" />,
                  title: isRu ? 'Ошибка в переводе или тексте' : 'Translation or text error',
                  text: isRu
                    ? 'Открывает форму репорта: глава и номер строки подставятся автоматически.'
                    : 'Opens the report form: the chapter and line number are filled in automatically.',
                },
                {
                  icon: <Maximize className="h-4 w-4" />,
                  title: isRu ? 'Полный экран' : 'Fullscreen',
                  text: isRu
                    ? 'Скрывает интерфейс браузера, чтобы читать без отвлечений.'
                    : 'Hides the browser interface so you can read without distractions.',
                },
                {
                  icon: <EyeOff className="h-4 w-4" />,
                  title: isRu ? 'Скрыть интерфейс' : 'Hide interface',
                  text: isRu
                    ? 'Убирает кнопки и подписи. Вернуть их можно кликом по экрану или клавишами H / U.'
                    : 'Hides the buttons and labels. Click the screen or press H / U to bring them back.',
                },
              ]}
            />

            <HelpSection
              title={isRu ? 'Кнопки справа' : 'Buttons on the right'}
              rows={[
                {
                  icon: <FastForward className="h-4 w-4" />,
                  title: isRu ? 'АВТО' : 'AUTO',
                  text: isRu
                    ? 'Автоматически переходит к следующей реплике после паузы. Повторное нажатие выключает режим.'
                    : 'Advances to the next line automatically after a pause. Press again to turn it off.',
                },
                {
                  icon: <FastForward className="h-4 w-4" />,
                  title: isRu ? 'ПРОПУСК' : 'SKIP',
                  text: isRu
                    ? 'Быстро пролистывает историю. Нажмите ещё раз или отпустите удержание, чтобы остановиться.'
                    : 'Fast-forwards through the story. Press again or release the hold to stop.',
                },
              ]}
            />

            <HelpSection
              title={isRu ? 'Клавиатура' : 'Keyboard'}
              rows={[
                {
                  icon: <MousePointerClick className="h-4 w-4" />,
                  title: 'Space · Enter · → · ↓',
                  text: isRu ? 'Следующая реплика.' : 'Next line.',
                },
                {
                  icon: <FastForward className="h-4 w-4" />,
                  title: 'Ctrl / Tab',
                  text: isRu
                    ? 'Ускоренный пропуск. На телефоне то же самое — зажать экран.'
                    : 'Faster skipping. On a phone, hold the screen instead.',
                },
                {
                  icon: <History className="h-4 w-4" />,
                  title: isRu ? 'L или ↑' : 'L or ↑',
                  text: isRu ? 'Открыть журнал истории.' : 'Open the story log.',
                },
                {
                  icon: <Settings className="h-4 w-4" />,
                  title: 'A · S · H/U · F · Esc',
                  text: isRu
                    ? 'Авто · настройки · скрыть интерфейс · полный экран · выход из читалки.'
                    : 'Auto · settings · hide interface · fullscreen · exit the reader.',
                },
              ]}
            />

            {onReportError && (
              <button
                type="button"
                onClick={onReportError}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-300 transition-colors hover:bg-yellow-500/15"
              >
                <AlertTriangle className="h-4 w-4" />
                {isRu ? 'Сообщить об ошибке в тексте' : 'Report a text error'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
