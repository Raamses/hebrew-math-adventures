import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ParentGateProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const ParentGate: React.FC<ParentGateProps> = ({ onSuccess, onCancel }) => {
    const [problem, setProblem] = useState<{ n1: number, n2: number } | null>(null);
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        // Generate random 2-digit addition problem
        setProblem({
            n1: Math.floor(Math.random() * 40) + 10,
            n2: Math.floor(Math.random() * 40) + 10
        });
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!problem) return;

        if (parseInt(answer) === problem.n1 + problem.n2) {
            onSuccess();
        } else {
            setError(true);
            setAnswer('');
            setTimeout(() => setError(false), 1000);
        }
    };

    if (!problem) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative">
                <button
                    onClick={onCancel}
                    className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-center mb-6 text-slate-700">בקרת הורים</h2>
                <p className="text-center text-slate-500 mb-6">פתרו את התרגיל כדי להמשיך:</p>

                <div className="text-4xl font-bold text-center mb-8 text-primary tracking-wider">
                    {problem.n1} + {problem.n2} = ?
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="number"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className={`w-full text-center text-3xl py-3 rounded-xl border-2 mb-4 focus:outline-none ${error ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-primary'
                            }`}
                        placeholder="?"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
                    >
                        כניסה
                    </button>
                </form>
            </div>
        </div>
    );
};
