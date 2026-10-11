import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_DURATION_MS = 5000;

const VARIANT_STYLES: Record<ToastVariant, { border: string; icon: ReactNode; iconColor: string }> = {
  success: {
    border: 'border-emerald-500/40',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    iconColor: 'text-emerald-400',
  },
  error: {
    border: 'border-red-500/40',
    icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    iconColor: 'text-red-400',
  },
  info: {
    border: 'border-blue-500/40',
    icon: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    iconColor: 'text-blue-400',
  },
};

/**
 * In-app toast notifications. Replaces alert() everywhere — alerts are blocked
 * in sandboxed iframes and violate the "no window.alert" project invariant.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = nextId.current++;
    setToasts(prev => [...prev.slice(-2), { id, variant, message }]);
    window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  const api: ToastApi = {
    success: useCallback((m: string) => push('success', m), [push]),
    error: useCallback((m: string) => push('error', m), [push]),
    info: useCallback((m: string) => push('info', m), [push]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 w-[92vw] max-w-md pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map(toast => {
          const style = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full flex items-start gap-2.5 px-3.5 py-3 bg-zinc-950/95 border ${style.border} rounded-sm shadow-2xl backdrop-blur-sm`}
            >
              {style.icon}
              <span className="text-[11px] font-medium text-white/85 leading-relaxed whitespace-pre-line break-words">
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Закрыть / Dismiss"
                className="ml-auto p-0.5 text-white/40 hover:text-white/80 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
