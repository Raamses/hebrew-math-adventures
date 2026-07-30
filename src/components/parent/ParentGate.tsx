import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ParentGateProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const ParentGate: React.FC<ParentGateProps> = ({ onSuccess, onCancel }) => {
    const { t, i18n } = useTranslation();
    const [problem, setProblem] = useState<{ n1: number, n2: number }>(() => {
        // Use crypto for secure random generation (authorization gate), fallback for HTTP contexts
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(2);
            crypto.getRandomValues(array);
            return {
                n1: (array[0] % 40) + 10,
                n2: (array[1] % 40) + 10
            };
        }
        return {
            n1: Math.floor(Math.random() * 40) + 10,
            n2: Math.floor(Math.random() * 40) + 10
        };
    });
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState(false);

    const generateProblem = () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const array = new Uint32Array(2);
            crypto.getRandomValues(array);
            setProblem({
                n1: (array[0] % 40) + 10,
                n2: (array[1] % 40) + 10
            });
        } else {
            setProblem({
                n1: Math.floor(Math.random() * 40) + 10,
                n2: Math.floor(Math.random() * 40) + 10
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!problem) return;

        if (parseInt(answer, 10) === problem.n1 + problem.n2) {
            onSuccess();
        } else {
            setError(true);
            setAnswer('');
            // Regenerate problem to prevent brute force
            generateProblem();
            setTimeout(() => setError(false), 1000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative" dir={i18n.dir()}>
                <button
                    onClick={onCancel}
                    className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-center mb-6 text-slate-700">{t('parent.gateTitle')}</h2>
                <p className="text-center text-slate-500 mb-6">{t('parent.gateDesc')}</p>

                <div className="text-4xl font-bold text-center mb-8 text-primary tracking-wider">
                    {problem.n1} + {problem.n2} = ?
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={answer}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setAnswer(val.slice(0, 3));
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSubmit(e);
                            }
                        }}
                        maxLength={3}
                        aria-label={t('parent.gateDesc')}
                        className={`w-full text-center text-3xl py-3 rounded-xl border-2 mb-4 focus:outline-none ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-primary'
                            }`}
                        placeholder="?"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
                    >
                        {t('parent.enter')}
                    </button>
                </form>
            </div>
        </div>
    );
};
