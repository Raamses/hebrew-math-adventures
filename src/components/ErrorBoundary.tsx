import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                        <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h2>
                            <p className="text-slate-600 mb-6">
                                We encountered an unexpected error. Please try reloading the game.
                            </p>

                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/20 active:scale-95"
                            >
                                <RefreshCw size={20} />
                                Reload Game
                            </button>
                        </div>

                        {(import.meta.env.DEV || import.meta.env.VITE_SHOW_ERRORS === 'true') && this.state.error && (
                            <div className="p-4 bg-slate-900 text-slate-300 text-xs font-mono overflow-auto max-h-48">
                                <p className="font-bold text-red-400 mb-2">{this.state.error.toString()}</p>
                                {/* Stack trace omitted for brevity in UI, check console */}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
