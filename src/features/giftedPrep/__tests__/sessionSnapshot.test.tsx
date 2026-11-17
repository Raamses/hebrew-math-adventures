import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PrepProgressProvider } from '../context/PrepProgressContext';
import { usePrepSession } from '../hooks/usePrepSession';
import { loadPrepProgress } from '../engine/storage';
import { exerciseItem } from '../engine/arithmetic';

vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => ({ logEvent: vi.fn() }) }));

const wrapper = ({ children }: { children: ReactNode }) => <PrepProgressProvider profileId="snap-kid">{children}</PrepProgressProvider>;

/** ADR §7 amendment (G7.2): only a WRONG attempt keeps the question, key and chosen option. */
describe('G7.2 session snapshot', () => {
    beforeEach(() => localStorage.clear());

    it('stores question/answer/chosen on a wrong attempt and nothing extra on a correct one', () => {
        const right = exerciseItem(7, 1);
        const wrongItem = exerciseItem(8, 1);
        const items = [right, wrongItem];
        const { result } = renderHook(() => usePrepSession(items, 'learn'), { wrapper });

        act(() => result.current.answer(right.answerIndex));
        act(() => result.current.next());
        const wrongChoice = (wrongItem.answerIndex + 1) % 4;
        act(() => result.current.answer(wrongChoice));

        const [first, second] = loadPrepProgress('snap-kid').attempts;
        expect(first.correct).toBe(true);
        expect(first).not.toHaveProperty('question');
        expect(first).not.toHaveProperty('answer');
        expect(first).not.toHaveProperty('chosen');
        expect(second).toMatchObject({
            correct: false,
            question: wrongItem.stem.equation,
            answer: wrongItem.options[wrongItem.answerIndex],
            chosen: wrongItem.options[wrongChoice],
        });
    });
});
