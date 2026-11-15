'use client';
import { useCallback, useState } from 'react';
import type { PrepMockResult } from '../types';
import { buildMock, type MockPart } from '../engine/mock';
import { mulberry32, newSeed } from '../engine/prng';
import { usePrepProgress } from '../context/PrepProgressContext';
import { usePrepAnalytics } from '../hooks/usePrepAnalytics';
import type { SessionAnswer } from '../hooks/usePrepSession';
import { MockSection } from './MockSection';
import { MockIntro, MockResults, type PartResult } from './MockScreens';
import { PrepSummary } from './PrepSummary';

interface MockRouteProps {
    readonly onAgain: () => void;
    readonly onExit: () => void;
}

type Phase = { readonly name: 'intro' } | { readonly name: 'part'; readonly index: number } | { readonly name: 'done' };

/** Stage-A practice test: intro → timed parts in booklet order → results (saved to prep progress). */
export function MockRoute({ onAgain, onExit }: MockRouteProps) {
    const { progress, addMock } = usePrepProgress();
    const analytics = usePrepAnalytics();
    const [parts] = useState<readonly MockPart[]>(() => buildMock(mulberry32(newSeed()), new Set(progress.seenIds)));
    const [phase, setPhase] = useState<Phase>({ name: 'intro' });
    const [results, setResults] = useState<readonly PartResult[]>([]);
    const [startedAt, setStartedAt] = useState(0);

    const start = () => {
        setStartedAt(Date.now());
        analytics.sessionStart('mock', parts.map(p => p.section).join('+'), parts.reduce((n, p) => n + p.items.length, 0));
        setPhase({ name: 'part', index: 0 });
    };

    const partDone = useCallback((answers: readonly SessionAnswer[]) => {
        if (phase.name !== 'part') return;
        const part = parts[phase.index];
        const result: PartResult = {
            section: part.section,
            correct: answers.filter(a => a.correct).length,
            total: part.items.length,
            blank: answers.filter(a => a.chosen === null).length,
        };
        const all = [...results, result];
        setResults(all);
        if (phase.index + 1 < parts.length) {
            setPhase({ name: 'part', index: phase.index + 1 });
            return;
        }
        const sections = Object.fromEntries(all.map(r => [r.section, { answered: r.total - r.blank, correct: r.correct, total: r.total }]));
        addMock({ at: Date.now(), sections: sections as PrepMockResult['sections'] });
        const correct = all.reduce((n, r) => n + r.correct, 0), total = all.reduce((n, r) => n + r.total, 0);
        analytics.sessionEnd('mock', all.map(r => r.section).join('+'), correct, total, Math.round((Date.now() - startedAt) / 1000));
        setPhase({ name: 'done' });
    }, [phase, parts, results, addMock, analytics, startedAt]);

    if (phase.name === 'intro') return <MockIntro parts={parts} onStart={start} onBack={onExit} />;
    if (phase.name === 'part') {
        return (
            <MockSection
                key={phase.index}
                part={parts[phase.index]}
                partIndex={phase.index}
                partCount={parts.length}
                onDone={partDone}
                onQuit={onExit}
            />
        );
    }
    const correct = results.reduce((n, r) => n + r.correct, 0), total = results.reduce((n, r) => n + r.total, 0);
    return (
        <PrepSummary correct={correct} total={total} onAgain={onAgain} onHome={onExit}>
            <MockResults results={results} />
        </PrepSummary>
    );
}

