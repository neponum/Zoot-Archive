import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { StoryOperationBrief } from '../MainThemeStoryView';

const TAG_LABEL: Record<string, Record<string, string>> = {
  Interlude: { ru: 'Интерлюдия', en: 'Interlude', zh: '幕间', ja: '幕間' },
  'After Operation': { ru: 'После операции', en: 'After Operation', zh: '行动后', ja: '作戦後' },
};

interface SkipConfirmationProps {
  show: boolean;
  operation?: StoryOperationBrief;
  lang: string;
  /** Русский интерфейс; иначе — английский. */
  isRu?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Подтверждение пропуска — как в игре: название главы, код и имя эпизода,
 * описание и две круглые кнопки «отмена» / «пропустить».
 */
export const SkipConfirmation: React.FC<SkipConfirmationProps> = ({
  show,
  operation,
  lang,
  isRu = true,
  onConfirm,
  onCancel,
}) => {
  const prompt = isRu ? 'Пропустить историю?' : 'Skip the story?';
  const chapter = operation?.chapter;
  const code = operation?.code;
  const name = operation?.name;
  const tag = operation?.tag
    ? TAG_LABEL[operation.tag]?.[isRu ? 'ru' : 'en'] ?? operation.tag
    : undefined;
  const desc = operation?.desc;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-[110] flex items-center justify-center"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="absolute inset-0 bg-black/35" />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative flex w-full flex-col items-center bg-black/65 px-10 py-9 text-center text-white/90 md:py-12"
          >
            {(chapter || code || name) && (
              <div className="mb-6 text-[13px] tracking-[0.12em] text-white/85 md:text-[15px]">
                {chapter ? <span className="text-white/95">《{chapter}》</span> : null}{' '}
                {code ? <span className="font-semibold">{code}</span> : null}{' '}
                {name ? <span>{name}</span> : null}{' '}
                {tag ? <span className="text-white/45">{tag}</span> : null}
              </div>
            )}

            {desc ? (
              <p className="mb-10 max-w-xl whitespace-pre-line text-[11px] leading-relaxed text-white/70 md:text-[13px]">
                {desc}
              </p>
            ) : null}

            <div className="flex w-full items-center gap-5">
              <span className="h-px flex-1 bg-white/15" />

              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 text-white/75 transition-colors hover:border-white/70 hover:text-white md:h-10 md:w-10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>

              <span className="text-[12px] tracking-[0.08em] text-white/80 md:text-[14px]">
                {prompt}
              </span>

              <button
                type="button"
                onClick={onConfirm}
                aria-label="Skip"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/35 text-white/75 transition-colors hover:border-white/70 hover:text-white md:h-10 md:w-10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <span className="h-px flex-1 bg-white/15" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
