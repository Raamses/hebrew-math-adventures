import { Lightbulb, Timer } from 'lucide-react';
import type { PrepSection } from '../types';
import type { MockPart } from '../engine/mock';
import { usePrepT } from '../hooks/usePrepT';

interface MockIntroProps {
    readonly parts: readonly MockPart[];
    readonly onStart: () => void;
    readonly onBack: () => void;
}

/** Before the mock: what happens, how long each part is, and the guessing tip (no negative marking). */
export function MockIntro({ parts, onStart, onBack }: MockIntroProps) {
    const { t } = usePrepT();
    return (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-4" data-testid="prep-mock-intro">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Timer aria-hidden="true" /> {t($ => $.prep.mock.introTitle)}</h1>
            <p className="text-lg text-slate-700">{t($ => $.prep.mock.intro)}</p>
            <ul className="space-y-2">
                {parts.map(p => (
                    <li key={p.section} className="flex items-center justify-between rounded-2xl bg-white border border-slate-200 px-4 py-3">
                        <span className="font-bold text-slate-700">{t($ => $.prep.sections[p.section])}</span>
                        <span className="text-slate-500">{t($ => $.prep.mock.partLine, { n: p.items.length, min: Math.round(p.seconds / 60) })}</span>
                    </li>
                ))}
            </ul>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4" data-testid="prep-guess-tip">
                <p className="font-bold text-amber-900 flex items-center gap-2"><Lightbulb size={18} aria-hidden="true" /> {t($ => $.prep.mock.tipTitle)}</p>
                <p className="text-amber-900 mt-1 leading-relaxed">{t($ => $.prep.mock.tip)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onStart} data-testid="prep-mock-start" className="rounded-2xl bg-indigo-600 text-white font-bold py-3 min-h-[52px]">
                    {t($ => $.prep.mock.start)}
                </button>
                <button type="button" onClick={onBack} className="rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold py-3 min-h-[52px]">
                    {t($ => $.prep.summary.home)}
                </button>
            </div>
        </div>
    );
}

export interface PartResult {
    readonly section: PrepSection;
    readonly correct: number;
    readonly total: number;
    readonly blank: number;
}

interface MockResultsProps {
    readonly results: readonly PartResult[];
}

/** Per-part lines under the summary; a gentle nudge when answers were left blank. */
export function MockResults({ results }: MockResultsProps) {
    const { t } = usePrepT();
    const blanks = results.reduce((n, r) => n + r.blank, 0);
    return (
        <div className="space-y-2 text-start" data-testid="prep-mock-results">
            {results.map(r => (
                <div key={r.section} className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-slate-700">
                    {t($ => $.prep.mock.sectionScore, { name: t($ => $.prep.sections[r.section]), correct: r.correct, total: r.total })}
                </div>
            ))}
            {blanks > 0 && (
                <p className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900" data-testid="prep-mock-blanks">
                    💡 {t($ => $.prep.mock.skipped, { n: blanks })}
                </p>
            )}
        </div>
    );
}
