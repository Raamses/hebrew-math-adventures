import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { mmss, useCountdown } from '../hooks/useCountdown';
import { buildMock, MOCK_PLAN } from '../engine/mock';
import { mulberry32 } from '../engine/prng';
import { READING_PASSAGES } from '../engine/bank';

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
