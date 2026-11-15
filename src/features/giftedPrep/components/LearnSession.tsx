'use client';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrepItem, PrepSection } from '../types';
import { usePrepSession } from '../hooks/usePrepSession';
import { usePrepAnalytics } from '../hooks/usePrepAnalytics';
import { usePrepT } from '../hooks/usePrepT';
import { usePrepProgress } from '../context/PrepProgressContext';
import { pickOptions, pickText } from '../engine/niqqud';
import { ItemStem } from './ItemStem';
import { OptionList } from './OptionList';
import { PrepSummary } from './PrepSummary';
import { QuitControl } from './QuitConfirm';

interface LearnSessionProps {
    readonly section: PrepSection;
    readonly items: readonly PrepItem[];
    readonly onAgain: () => void;
    readonly onExit: () => void;
}

/** Learning mode: untimed, instant feedback, kid-language explanation after every answer. */
export function LearnSession({ section, items, onAgain, onExit }: LearnSessionProps) {
    const { t } = usePrepT();
    const analytics = usePrepAnalytics();
    const s = usePrepSession(items, 'learn');
    const { niqqud } = usePrepProgress();
    const [startedAt] = useState(() => Date.now());
    const ended = useRef(false);

    useEffect(() => { analytics.sessionStart('learn', section, items.length); }, [analytics, section, items.length]);
    useEffect(() => {
        if (s.done && !ended.current) {
            ended.current = true;
            analytics.sessionEnd('learn', section, s.correctCount, s.total, Math.round((Date.now() - startedAt) / 1000));
        }
    }, [s.done, s.correctCount, s.total, analytics, section, startedAt]);

    if (s.done || !s.current) {
        return <PrepSummary correct={s.correctCount} total={s.total} onAgain={onAgain} onHome={onExit} />;
    }

    const item = s.current;
    const answered = s.currentAnswer !== undefined;
    const last = s.index === s.total - 1;

    return (
        <div className="max-w-xl mx-auto px-4 py-4 space-y-4" data-testid="prep-learn-session">
            <header className="flex items-center gap-3">
                <QuitControl onQuit={onExit} />
                <div className="flex-1">
                    <div className="text-sm font-bold text-slate-500">{t($ => $.prep.player.question, { n: s.index + 1, total: s.total })}</div>
                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
                        <div className="h-full bg-teal-500 rtl:origin-right ltr:origin-left transition-transform" style={{ transform: `scaleX(${(s.index + (answered ? 1 : 0)) / s.total})` }} />
                    </div>
                </div>
            </header>

            <ItemStem stem={item.stem} niqqud={niqqud} />
            <OptionList
                options={pickOptions(niqqud, item.options, item.optionsNiqqud)}
                chosen={s.currentAnswer?.chosen ?? undefined}
                reveal
                answerIndex={item.answerIndex}
                onChoose={i => s.answer(i)}
            />

            {answered && (
                <div
                    className={cn('rounded-2xl p-4 space-y-2', s.currentAnswer?.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200')}
                    data-testid="prep-feedback"
                    aria-live="polite"
                >
                    <p className="font-bold text-lg">{s.currentAnswer?.correct ? `✅ ${t($ => $.prep.player.correct)}` : `💡 ${t($ => $.prep.player.wrong)}`}</p>
                    <p className="text-slate-700 leading-relaxed" data-testid="prep-explanation">{pickText(niqqud, item.explanation, item.explanationNiqqud)}</p>
                    <button
                        type="button"
                        onClick={s.next}
                        data-testid="prep-next"
                        className="w-full rounded-2xl bg-teal-500 text-white font-bold py-3 min-h-[52px]"
                    >
                        {last ? t($ => $.prep.player.finish) : t($ => $.prep.player.next)}
                    </button>
                </div>
            )}
        </div>
    );
}
