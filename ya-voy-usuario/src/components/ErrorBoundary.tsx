import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-xl font-black text-slate-800 mb-2">Algo salió mal</h1>
          <p className="text-slate-500 text-sm mb-4">Recarga la página para continuar.</p>
          {this.state.error.message && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 max-w-sm mb-6 font-mono text-left break-all">
              {this.state.error.message}
            </p>
          )}
          <button onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#9C0D38,#9C0D38)" }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ErrorBoundary ligero para tabs — no tira toda la app
export class TabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <p className="text-3xl mb-3">😵</p>
          <p className="font-black text-slate-700 mb-1">Esta sección falló</p>
          <p className="text-xs text-slate-400 mb-4">Toca para reintentar</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#9C0D38,#9C0D38)" }}>
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
