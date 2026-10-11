import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/**
 * In-app confirmation modal. Replaces window.confirm() — native confirms are
 * blocked in sandboxed iframes and violate the project invariant.
 *
 * Usage: `if (!(await confirm({ message: '...' }))) return;`
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    setPending(prev => {
      prev?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pending, settle]);

  const confirmAccent = pending?.options.danger
    ? 'bg-red-500/90 hover:bg-red-500'
    : 'bg-blue-600 hover:bg-blue-500';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => settle(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-sm shadow-2xl p-5 flex flex-col gap-4"
          >
            {pending.options.title && (
              <h2 className="text-xs font-black uppercase tracking-widest text-white/90">
                {pending.options.title}
              </h2>
            )}
            <p className="text-[11px] md:text-xs text-white/70 leading-relaxed whitespace-pre-line">
              {pending.options.message}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => settle(false)}
                className="px-3 py-1.5 border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors cursor-pointer"
              >
                {pending.options.cancelText || 'Отмена'}
              </button>
              <button
                onClick={() => settle(true)}
                className={`px-3 py-1.5 text-white text-[10px] font-black uppercase tracking-widest rounded-sm transition-colors cursor-pointer ${confirmAccent}`}
              >
                {pending.options.confirmText || 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}
