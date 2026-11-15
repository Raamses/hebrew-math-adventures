import type { ReactNode } from 'react';
import { usePrepT } from '../hooks/usePrepT';

interface PrepSummaryProps {
    readonly correct: number;
    readonly total: number;
    readonly onAgain: () => void;
    readonly onHome: () => void;
    readonly children?: ReactNode;
}

/** End of a session. Encouraging words only: no labels, no percentiles. */
export function PrepSummary({ correct, total, onAgain, onHome, children }: PrepSummaryProps) {
    const { t } = usePrepT();
    const ratio = total > 0 ? correct / total : 0;
    const cheer = ratio >= 0.8 ? t($ => $.prep.summary.great) : ratio >= 0.5 ? t($ => $.prep.summary.good) : t($ => $.prep.summary.keep);

    return (
        <div className="max-w-xl mx-auto px-4 py-8 text-center space-y-5" data-testid="prep-summary">
            <div className="text-6xl" aria-hidden="true">🌟</div>
            <h1 className="text-3xl font-black text-slate-800">{t($ => $.prep.summary.title)}</h1>
            <p className="text-xl text-slate-700">{t($ => $.prep.summary.score, { correct, total })}</p>
            <p className="text-lg text-teal-700 font-bold">{cheer}</p>
            {children}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                    type="button"
                    onClick={onAgain}
                    data-testid="prep-again"
                    className="rounded-2xl bg-teal-500 text-white font-bold py-3 min-h-[52px]"
                >
                    {t($ => $.prep.summary.again)}
                </button>
                <button
                    type="button"
                    onClick={onHome}
                    data-testid="prep-home"
                    className="rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold py-3 min-h-[52px]"
                >
                    {t($ => $.prep.summary.home)}
                </button>
            </div>
        </div>
    );
}
