'use client';
import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { SessionAnswer } from '../hooks/usePrepSession';
import { usePrepSession } from '../hooks/usePrepSession';
import { mmss, useCountdown } from '../hooks/useCountdown';
import { usePrepT } from '../hooks/usePrepT';
import { usePrepProgress } from '../context/PrepProgressContext';
import { pickOptions } from '../engine/niqqud';
import type { MockPart } from '../engine/mock';
import { ItemStem } from './ItemStem';
import { OptionList } from './OptionList';
import { QuitControl } from './QuitConfirm';

interface MockSectionProps {
    readonly part: MockPart;
    readonly partIndex: number;
    readonly partCount: number;
    readonly onDone: (answers: readonly SessionAnswer[]) => void;
    readonly onQuit: () => void;
}

/** One timed part: no feedback, no going back; when time is up the rest count as blank. */
export function MockSection({ part, partIndex, partCount, onDone, onQuit }: MockSectionProps) {
    const { t } = usePrepT();
    const s = usePrepSession(part.items, 'mock');
    const { niqqud } = usePrepProgress();
    const [paused, setPaused] = useState(false);
    const [choice, setChoice] = useState<number | undefined>(undefined);
    const left = useCountdown(part.seconds, paused || s.done, s.finishBlank);
    const { min, sec } = mmss(left);

    useEffect(() => { if (s.done) onDone(s.answers); }, [s.done, s.answers, onDone]);

    const goNext = useCallback(() => {
        s.answer(choice ?? null);
        setChoice(undefined);
        s.next();
    }, [s, choice]);

    if (s.done || !s.current) return null;
    const item = s.current;
    const last = s.index === s.total - 1;

    return (
        <div className="max-w-xl mx-auto px-4 py-4 space-y-4" data-testid="prep-mock-section">
            <header className="flex items-center gap-3">
                <QuitControl onQuit={onQuit} onPauseChange={setPaused} />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-500">
                        {t($ => $.prep.sections[part.section])} · {partIndex + 1}/{partCount} · {t($ => $.prep.player.question, { n: s.index + 1, total: s.total })}
                    </div>
                    <div className="text-xs text-slate-400">{t($ => $.prep.mock.noBack)}</div>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-slate-700 font-bold" data-testid="prep-timer" aria-live="off">
                    <Clock size={16} aria-hidden="true" />
                    <span dir="ltr" className="unicode-bidi-isolate font-rubik tabular-nums">{`${min}:${sec}`}</span>
                </div>
            </header>

            <ItemStem stem={item.stem} niqqud={niqqud} />
            <OptionList
                options={pickOptions(niqqud, item.options, item.optionsNiqqud)}
                chosen={choice}
                reveal={false}
                answerIndex={item.answerIndex}
                onChoose={setChoice}
            />
            <button
                type="button"
                onClick={goNext}
                data-testid="prep-next"
                className="w-full rounded-2xl bg-indigo-600 text-white font-bold py-3 min-h-[52px]"
            >
                {last ? t($ => $.prep.player.finish) : t($ => $.prep.player.next)}
            </button>
        </div>
    );
}
