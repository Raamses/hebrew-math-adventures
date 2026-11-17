import type { SkillTag } from '../types';
import type { PrepMistake } from '../engine/progress';
import { usePrepT } from '../hooks/usePrepT';

interface PrepMistakeListProps {
    readonly mistakes: readonly PrepMistake[];
    readonly skillName: (skill: SkillTag) => string;
}

/**
 * The last mistakes, newest first, each with its question and the correct answer. Question and
 * answers use dir="auto": an equation ("37 + 25 = ?") has no Hebrew letter, so it renders LTR.
 */
export function PrepMistakeList({ mistakes, skillName }: PrepMistakeListProps) {
    const { t } = usePrepT();
    return (
        <section data-testid="prep-progress-mistakes">
            <h4 className="mb-1 font-bold">✏️ {t($ => $.prep.parent.mistakes, { n: mistakes.length })}</h4>
            {mistakes.length === 0 ? (
                <p className="text-slate-500">{t($ => $.prep.parent.noMistakes)}</p>
            ) : (
                <ol className="space-y-2">
                    {mistakes.map(m => (
                        <li
                            key={`${m.at}-${m.itemId}`}
                            data-testid="prep-progress-mistake"
                            data-skill={m.skill}
                            className="rounded-lg border border-slate-200 bg-white p-2"
                        >
                            <div className="text-xs text-slate-500">{skillName(m.skill)}</div>
                            {m.question !== undefined ? (
                                <>
                                    <p dir="auto" className="font-medium" data-testid="prep-mistake-question">{m.question}</p>
                                    <p className="text-emerald-700">
                                        {t($ => $.prep.parent.correctAnswer)}{' '}
                                        <bdi dir="auto" className="font-bold" data-testid="prep-mistake-answer">{m.answer}</bdi>
                                    </p>
                                    {m.chosen !== undefined && (
                                        <p className="text-slate-500">
                                            {t($ => $.prep.parent.chosen)} <bdi dir="auto">{m.chosen}</bdi>
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-slate-500" data-testid="prep-mistake-no-details">{t($ => $.prep.parent.noDetails)}</p>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
