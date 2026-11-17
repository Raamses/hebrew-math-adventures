import { useMemo } from 'react';
import type { PrepProgressState, SkillTag } from '../types';
import { derivePrepTypeProgress, recentPrepMistakes, weakestPrepTypes } from '../engine/progress';
import { usePrepT } from '../hooks/usePrepT';
import { PrepMistakeList } from './PrepMistakeList';

interface PrepProgressPanelProps {
    readonly progress: PrepProgressState;
}

const percent = (accuracy: number | null) => Math.round((accuracy ?? 0) * 100);
const seconds = (ms: number | null) => ((ms ?? 0) / 1000).toFixed(1);

/** G7.2 parent progress: accuracy and median time per type, the 3 weakest types, the last 20 mistakes. */
export function PrepProgressPanel({ progress }: PrepProgressPanelProps) {
    const { t } = usePrepT();
    const types = useMemo(() => derivePrepTypeProgress(progress), [progress]);
    const weakest = useMemo(() => weakestPrepTypes(types), [types]);
    const mistakes = useMemo(() => recentPrepMistakes(progress), [progress]);

    if (types.length === 0) {
        return (
            <div data-testid="prep-progress-panel" className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                <div className="mb-1 text-3xl" aria-hidden>🌱</div>
                <p data-testid="prep-progress-empty">{t($ => $.prep.parent.empty)}</p>
            </div>
        );
    }

    const skillName = (skill: SkillTag) => t($ => $.prep.skills[skill]);
    const pct = (accuracy: number | null) => t($ => $.prep.parent.percent, { n: percent(accuracy) });

    return (
        <div data-testid="prep-progress-panel" className="mt-3 space-y-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <h3 className="font-bold text-slate-800">{t($ => $.prep.parent.title)}</h3>

            <section data-testid="prep-progress-weakest">
                <h4 className="mb-1 font-bold">🎯 {t($ => $.prep.parent.weakest)}</h4>
                {weakest.length === 0 ? (
                    <p className="text-slate-500">{t($ => $.prep.parent.noWeak)}</p>
                ) : (
                    <ol className="flex flex-wrap gap-2">
                        {weakest.map(p => (
                            <li
                                key={p.skill}
                                data-testid="prep-progress-weak-type"
                                data-skill={p.skill}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-bold text-amber-800"
                            >
                                {skillName(p.skill)} · <bdi dir="ltr">{pct(p.accuracy)}</bdi>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            <section>
                <h4 className="mb-1 font-bold">{t($ => $.prep.parent.byType)}</h4>
                <table className="w-full">
                    <thead className="text-xs text-slate-500">
                        <tr>
                            <th scope="col" className="py-1 text-start font-semibold">{t($ => $.prep.parent.type)}</th>
                            <th scope="col" className="py-1 text-start font-semibold">{t($ => $.prep.parent.accuracy)}</th>
                            <th scope="col" className="py-1 text-start font-semibold">{t($ => $.prep.parent.median)}</th>
                            <th scope="col" className="py-1 text-start font-semibold">{t($ => $.prep.parent.attempts)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {types.map(p => (
                            <tr key={p.skill} data-testid="prep-progress-type" data-skill={p.skill} className="border-t border-slate-200">
                                <th scope="row" className="py-1 text-start font-medium">{skillName(p.skill)}</th>
                                <td className="py-1"><bdi dir="ltr">{pct(p.accuracy)}</bdi></td>
                                <td className="py-1">{t($ => $.prep.parent.seconds, { s: seconds(p.medianMs) })}</td>
                                <td className="py-1">{p.attempts}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <PrepMistakeList mistakes={mistakes} skillName={skillName} />
        </div>
    );
}
