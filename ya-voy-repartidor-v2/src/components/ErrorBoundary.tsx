import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-xl font-black text-slate-800 mb-2">Algo salió mal</h1>
          <p className="text-slate-500 text-sm mb-6">Recarga la página para continuar.</p>
          <button onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#F107A3,#6C3CE1)" }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
