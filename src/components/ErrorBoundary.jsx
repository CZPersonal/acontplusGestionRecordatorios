import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Error capturado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6">
          <div className="bg-white rounded-xl border border-red-200 p-6 max-w-lg w-full">
            <h2 className="text-lg font-bold text-red-700 mb-3">Algo salió mal</h2>
            <p className="text-sm text-slate-600 mb-4">
              Ocurrió un error inesperado. Por favor intenta de nuevo. Si el problema
              persiste, contacta al soporte.
            </p>
            {import.meta.env.DEV && (
              <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-lg overflow-auto whitespace-pre-wrap mb-4">
                {this.state.error?.toString()}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 w-full bg-red-600 text-white py-2 rounded-lg font-semibold"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}