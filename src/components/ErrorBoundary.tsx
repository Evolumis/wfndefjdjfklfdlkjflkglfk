import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      sessionStorage.removeItem('evasion_employee_session');
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-black text-white mb-2">Une erreur inattendue est survenue</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Une exception a été interceptée lors du rendu du tableau de bord. Vos données sont intactes.
            </p>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-left text-xs font-mono text-rose-300 mb-6 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Recharger la page</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Réinitialiser session</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
