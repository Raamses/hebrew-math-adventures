'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PrepItem } from '../types';
import { usePrepProgress } from '../context/PrepProgressContext';
import { usePrepAnalytics, type PrepMode } from './usePrepAnalytics';

export interface SessionAnswer {
    readonly itemId: string;
    /** null = left blank (mock mode, time ran out) */
    readonly chosen: number | null;
    readonly correct: boolean;
}

/**
 * One pass through a fixed list of items. Records every answer in PrepProgress and analytics.
 * `answer()` locks the item (no changing an answer once given, like the paper test).
 */
export function usePrepSession(items: readonly PrepItem[], mode: PrepMode) {
    const { addAttempt } = usePrepProgress();
    const analytics = usePrepAnalytics();
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<readonly SessionAnswer[]>([]);
    const shownAt = useRef(0);
    // Start the response timer whenever a new item is shown
    useEffect(() => { shownAt.current = Date.now(); }, [index]);

    const current = items[index] as PrepItem | undefined;
    // answers[i] belongs to items[i]: one answer per item, in order
    const currentAnswer = answers[index] as SessionAnswer | undefined;
    const done = index >= items.length;

    const answer = useCallback((choice: number | null) => {
        if (!current || answers.length > index) return;
        const correct = choice === current.answerIndex;
        const ms = Date.now() - shownAt.current;
        setAnswers(prev => [...prev, { itemId: current.id, chosen: choice, correct }]);
        addAttempt({ itemId: current.id, section: current.section, skill: current.skill, correct, ms, at: Date.now() });
        analytics.itemAnswered(current, correct, ms, mode);
    }, [current, answers.length, index, addAttempt, analytics, mode]);

    const next = useCallback(() => setIndex(i => i + 1), []);

    /** Mock mode: time is up, every remaining item counts as blank. */
    const finishBlank = useCallback(() => {
        setAnswers(prev => [
            ...prev,
            ...items.slice(prev.length).map(it => ({ itemId: it.id, chosen: null, correct: false })),
        ]);
        setIndex(items.length);
    }, [items]);

    const correctCount = answers.filter(a => a.correct).length;
    return { current, index, total: items.length, currentAnswer, answers, answer, next, finishBlank, done, correctCount };
}
