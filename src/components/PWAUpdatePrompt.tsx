import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

type UpdateSWFn = (reloadPage?: boolean) => Promise<void>;

declare global {
  interface Window {
    __zootUpdateSW?: UpdateSWFn;
  }
}

/**
 * In-app banner for PWA updates.
 *
 * The service worker is registered in 'prompt' mode (vite.config.ts), so new
 * deployments no longer force an immediate page reload that could discard
 * unsaved translation progress. This component listens for the refresh event
 * and lets the user choose when to apply the update.
 */
export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const onNeedRefresh = () => setNeedRefresh(true);
    window.addEventListener('zoot:pwa-need-refresh', onNeedRefresh);
    return () => window.removeEventListener('zoot:pwa-need-refresh', onNeedRefresh);
  }, []);

  if (!needRefresh) return null;

  const applyUpdate = async () => {
    try {
      await window.__zootUpdateSW?.(true);
    } catch {
      // If the update flow fails, a manual reload is the guaranteed fallback
      window.location.reload();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-2.5 bg-zinc-950/95 border border-white/10 rounded-sm shadow-2xl backdrop-blur-sm max-w-[92vw]"
    >
      <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
      <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider whitespace-nowrap">
        Доступна новая версия / New version
      </span>
      <button
        onClick={applyUpdate}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors cursor-pointer"
      >
        Обновить
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Закрыть / Dismiss"
        title="Позже / Later"
        className="p-1 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
