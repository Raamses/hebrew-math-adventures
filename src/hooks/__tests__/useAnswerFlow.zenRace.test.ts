// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnswerFlow } from '../useAnswerFlow';

// ADR 2026-08-zen-answer-race (Fix 1): the cross-entity race happens because
// the bubble game's onPopWrapper processes every pop with no answer-flow gate.
// useAnswerFlow.submitAnswer already drops submissions while status !== 'idle'
// (the "answer-lock"). This test pins that behavior so the container can rely
// on it: a second submission during processing is dropped, the first wins.
describe('useAnswerFlow — ADR 2026-08-zen-answer-race (Fix 1: answer-lock)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('drops a second submission while the first is processing (cross-entity pop gate)', () => {
        const onCorrectComplete = vi.fn();
        const onWrongComplete = vi.fn();
        const { result } = renderHook(() =>
            useAnswerFlow({ onCorrectComplete, onWrongComplete, correctDelay: 1000, wrongDelay: 500 })
        );

        // Simulate target + distractor popped near-simultaneously.
        act(() => {
            result.current.submitAnswer(true); // target pop — correct
        });
        expect(result.current.isProcessing).toBe(true);

        // Second pop arrives while the first is still being processed.
        act(() => {
            result.current.submitAnswer(false); // distractor pop — must be DROPPED
        });

        // The wrong-answer flow must NOT have started.
        expect(result.current.status).toBe('correct');
        expect(onWrongComplete).not.toHaveBeenCalled();

        // Only the first (correct) completion fires.
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(onCorrectComplete).toHaveBeenCalledTimes(1);
        expect(onWrongComplete).not.toHaveBeenCalled();
        expect(result.current.isProcessing).toBe(false);
    });

    it('correct + correct double-submit resolves to a single completion', () => {
        const onCorrectComplete = vi.fn();
        const { result } = renderHook(() =>
            useAnswerFlow({ onCorrectComplete, correctDelay: 1000 })
        );

        act(() => {
            result.current.submitAnswer(true);
            result.current.submitAnswer(true); // dropped — already processing
        });
        expect(onCorrectComplete).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(onCorrectComplete).toHaveBeenCalledTimes(1);
    });

    it('a pop after the flow completes is accepted (lock releases)', () => {
        const onCorrectComplete = vi.fn();
        const { result } = renderHook(() =>
            useAnswerFlow({ onCorrectComplete, correctDelay: 1000 })
        );

        act(() => {
            result.current.submitAnswer(true);
            vi.advanceTimersByTime(1000);
        });
        expect(onCorrectComplete).toHaveBeenCalledTimes(1);
        expect(result.current.isProcessing).toBe(false);

        // Next pop after idle is accepted.
        act(() => {
            result.current.submitAnswer(true);
        });
        expect(result.current.isProcessing).toBe(true);
    });
});
