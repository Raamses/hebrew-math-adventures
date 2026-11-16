import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { mmss, useCountdown } from '../hooks/useCountdown';
import { buildMock, MOCK_PLAN } from '../engine/mock';
import { mulberry32 } from '../engine/prng';
import { READING_PASSAGES } from '../engine/bank';
import { stemKey } from '../engine/sections';

describe('useCountdown', () => {
    afterEach(() => vi.useRealTimers());

    it('counts down, pauses, and fires onExpire exactly once', () => {
        vi.useFakeTimers();
        const onExpire = vi.fn();
        const { result, rerender } = renderHook(({ paused }) => useCountdown(5, paused, onExpire), { initialProps: { paused: false } });
        act(() => { vi.advanceTimersByTime(2000); });
        expect(result.current).toBe(3);
        rerender({ paused: true });
        act(() => { vi.advanceTimersByTime(10_000); });
        expect(result.current).toBe(3);
        rerender({ paused: false });
        act(() => { vi.advanceTimersByTime(3000); });
        expect(result.current).toBe(0);
        act(() => { vi.advanceTimersByTime(5000); });
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('formats minutes and seconds', () => {
        expect(mmss(605)).toEqual({ min: '10', sec: '05' });
    });
});

describe('buildMock', () => {
    it('follows the booklet order and leaves out parts without reviewed content', () => {
        const parts = buildMock(mulberry32(1), new Set());
        const expected = MOCK_PLAN.filter(p => p.section !== 'reading' || READING_PASSAGES.length > 0).map(p => p.section);
        expect(parts.map(p => p.section)).toEqual(expected);
        parts.forEach(p => {
            expect(p.items.length).toBeGreaterThanOrEqual(MOCK_PLAN.find(m => m.section === p.section)!.count);
            expect(p.seconds).toBeGreaterThan(0);
        });
    });
});

describe('buildMock draws from the wider pools without repeats', () => {
    it('no question appears twice inside one practice test, over 300 tests', () => {
        const kinds = new Set<string>();
        for (let seed = 1; seed <= 300; seed++) {
            const items = buildMock(mulberry32(seed), new Set()).flatMap(p => p.items);
            expect(new Set(items.map(i => i.id)).size, `seed ${seed} ids`).toBe(items.length);
            expect(new Set(items.map(stemKey)).size, `seed ${seed} questions`).toBe(items.length);
            items.forEach(i => kinds.add(i.kind));
        }
        // the math part reaches the new task types, not only the original four
        ['math-sequence', 'math-compare', 'math-odd-one-out', 'math-place-value', 'math-double-half', 'math-money']
            .forEach(k => expect(kinds.has(k), k).toBe(true));
    });
});
