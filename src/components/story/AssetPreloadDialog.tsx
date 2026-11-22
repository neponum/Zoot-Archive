import React from 'react';
import type { PreloadFailure } from '../../services/story/storyAssetService';

interface AssetPreloadDialogProps {
  failures: PreloadFailure[];
  isRu: boolean;
  onRetry: () => void;
  onContinue: () => void;
}

function fileName(url: string): string {
  try {
    const raw = decodeURIComponent(url.split('/').pop() || url);
    return raw.split('?')[0] || url;
  } catch {
    return url.split('/').pop() || url;
  }
}

function reasonText(reason: PreloadFailure['reason'], isRu: boolean): string {
  if (reason === 'timeout') {
    return isRu ? 'слишком долго не отвечает' : 'took too long to answer';
  }
  if (reason === 'network') {
    return isRu ? 'ошибка запроса' : 'request failed';
  }
  if (reason === 'unavailable') {
    return isRu
      ? 'источник не отдаёт файл, попробуйте позже'
      : 'source is not serving the file, try again later';
  }
  return isRu
    ? 'сетевая ошибка или файл недоступен'
    : 'network error or file unavailable';
}

const VISIBLE_LIMIT = 8;

/**
 * Диалог после предзагрузки главы: показывает, какие файлы не загрузились,
 * и предлагает повторить загрузку или продолжить без них.
 */
export const AssetPreloadDialog: React.FC<AssetPreloadDialogProps> = ({
  failures,
  isRu,
  onRetry,
  onContinue,
}) => {
  const visible = failures.slice(0, VISIBLE_LIMIT);
  const rest = failures.length - visible.length;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={isRu ? 'Ошибка загрузки материалов' : 'Asset loading error'}
    >
      <div className="w-full max-w-[560px] border border-white/15 bg-[#121416] text-white shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e8c07a]">
            {isRu ? '// Не всё загрузилось' : '// Some assets failed'}
          </p>
          <h2 className="mt-1 text-lg font-bold leading-tight">
            {isRu
              ? 'Часть материалов не загрузилась'
              : 'Some assets could not be loaded'}
          </h2>
          <p className="mt-1 text-xs text-white/55">
            {isRu
              ? `Не загружено файлов: ${failures.length}. Можно повторить попытку или продолжить без них.`
              : `${failures.length} file(s) failed. You can retry or continue without them.`}
          </p>
        </div>

        <div className="max-h-[42vh] overflow-y-auto px-5 py-3 site-scrollbar">
          <ul className="space-y-2">
            {visible.map((failure, index) => (
              <li
                key={`${failure.url}-${index}`}
                className="border border-white/10 bg-black/25 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 border border-white/15 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/55">
                    {failure.type === 'audio' ? 'AUDIO' : 'IMAGE'}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/85">
                    {fileName(failure.url)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#e07a7a]">
                  {reasonText(failure.reason, isRu)}
                </p>
              </li>
            ))}
          </ul>
          {rest > 0 && (
            <p className="mt-2 text-[11px] text-white/40">
              {isRu ? `и ещё ${rest}…` : `and ${rest} more…`}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="h-9 cursor-pointer border border-white/20 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/45 hover:text-white"
          >
            {isRu ? 'Продолжить без них' : 'Continue without them'}
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="h-9 cursor-pointer bg-white px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-white/85"
          >
            {isRu ? 'Повторить загрузку' : 'Retry loading'}
          </button>
        </div>
      </div>
    </div>
  );
};
