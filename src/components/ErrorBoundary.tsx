import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showHomeButton?: boolean;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

/**
 * Enterprise-grade ErrorBoundary with Rhodes Island / PRTS Terminal styling.
 * Prevents application white-screens by catching unhandled exceptions in UI subtrees
 * and providing resilient recovery actions.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[PRTS_SYSTEM_FAULT] Error inside [${this.props.sectionName || 'Application'}]:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('[ErrorBoundary] onReset failed:', e);
      }
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleCopyDiagnostics = async (): Promise<void> => {
    const diagnostics = [
      `== PRTS SYSTEM CRASH REPORT ==`,
      `Time: ${new Date().toISOString()}`,
      `Section: ${this.props.sectionName || 'Root'}`,
      `URL: ${window.location.href}`,
      `Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}`,
      `Stack: ${this.state.error?.stack || 'No stack trace'}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || 'No component trace'}`
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(diagnostics);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = diagnostics;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.warn('Failed to copy error diagnostics:', e);
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      const {
        sectionName = 'Компонент интерфейса',
        fallbackTitle = 'Сбой терминала PRTS',
        fallbackMessage = 'В процессе выполнения операции произошла непредвиденная ошибка.',
        showHomeButton = true,
      } = this.props;

      return (
        <div 
          id="prts-error-boundary"
          className="w-full h-full min-h-[340px] flex items-center justify-center p-4 md:p-8 bg-zinc-950 text-zinc-100 select-none overflow-y-auto"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-xl w-full bg-zinc-900/90 border border-red-500/40 rounded-xl p-6 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
            {/* Ambient Background Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header / Icon */}
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono tracking-widest uppercase px-2 py-0.5 bg-red-500/20 text-red-400 rounded border border-red-500/30">
                    ERR_SYSTEM_FAULT
                  </span>
                  <span className="text-xs text-zinc-400 font-mono truncate">
                    {sectionName}
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
                  {fallbackTitle}
                </h2>
              </div>
            </div>

            {/* User-facing description */}
            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
              {fallbackMessage} Вы можете повторить операцию, вернуться на начальный экран или перезапустить приложение.
            </p>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              <button
                id="error-boundary-retry-btn"
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs tracking-wider uppercase rounded-lg transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Повторить</span>
              </button>

              {showHomeButton && (
                <button
                  id="error-boundary-home-btn"
                  type="button"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs tracking-wider uppercase font-medium rounded-lg border border-zinc-700 transition-all active:scale-95 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Главная</span>
                </button>
              )}

              <button
                id="error-boundary-reload-btn"
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs tracking-wider uppercase font-medium rounded-lg border border-zinc-700 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Перезагрузить</span>
              </button>

              <button
                id="error-boundary-copy-btn"
                type="button"
                onClick={this.handleCopyDiagnostics}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-mono rounded-lg border border-zinc-700/80 transition-all ml-auto cursor-pointer"
                title="Скопировать лог ошибки"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Лог</span>
                  </>
                )}
              </button>
            </div>

            {/* Diagnostic Details Accordion */}
            <div className="border-t border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Технические подробности сбоя</span>
                </div>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-black/60 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 max-h-48 overflow-y-auto space-y-2 select-text">
                  <div className="text-red-400 font-semibold break-all">
                    {this.state.error?.name}: {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <div className="text-zinc-400 whitespace-pre-wrap break-all leading-normal text-[10px]">
                      {this.state.error.stack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
