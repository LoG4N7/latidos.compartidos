import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Heart, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error in React tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#090308] text-rose-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="w-16 h-16 rounded-3xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mb-4 shadow-xl shadow-rose-950/60">
            <Heart className="w-8 h-8 text-rose-400 fill-rose-500/30 animate-pulse" />
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            Latidos Compartidos
          </h1>

          <p className="text-sm text-rose-300/80 max-w-sm mb-4">
            Demian & Verónica • La app encontró un detalle temporal al iniciar.
          </p>

          <div className="bg-black/60 p-3.5 rounded-2xl border border-rose-900/40 max-w-sm w-full text-left mb-6 text-xs text-rose-300/70 overflow-x-auto">
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Diagnóstico:</span>
            </div>
            <p className="font-mono text-[11px] text-rose-200">
              {this.state.error?.message || 'Error de sincronización inicial'}
            </p>
          </div>

          <button
            onClick={this.handleReset}
            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-950/70 active:scale-95 transition flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reiniciar App</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
