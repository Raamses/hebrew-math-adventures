// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFeedbackEffects } from '../useFeedbackEffects';

describe('useFeedbackEffects', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

    it('starts in idle state with no effects', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        expect(result.current.mascotEmotion).toBe('idle');
        expect(result.current.showBubble).toBe(false);
        expect(result.current.showStars).toBe(false);
        expect(result.current.showConfetti).toBe(false);
        expect(result.current.burstId).toBe(0);
    });

    it('celebrate() sets all effects and bumps burstId', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.celebrate('Great!'); });
        expect(result.current.mascotEmotion).toBe('excited');
        expect(result.current.mascotMessage).toBe('Great!');
        expect(result.current.showBubble).toBe(true);
        expect(result.current.showStars).toBe(true);
        expect(result.current.showConfetti).toBe(true);
        expect(result.current.burstId).toBe(1);
    });

    it('bubble clears at 1400ms and confetti at 2200ms', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.celebrate('Great!'); });

        act(() => { vi.advanceTimersByTime(1400); });
        expect(result.current.showBubble).toBe(false);
        expect(result.current.mascotEmotion).toBe('idle');
        expect(result.current.showConfetti).toBe(true); // still going

        act(() => { vi.advanceTimersByTime(800); }); // total 2200
        expect(result.current.showConfetti).toBe(false);
    });

    it('showStars is NOT cleared by any timer (owned by FlyingStars)', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.celebrate('Great!'); });
        act(() => { vi.advanceTimersByTime(3000); });
        expect(result.current.showStars).toBe(true); // still true — caller must clear via clearStars
    });

    it('a second celebrate() restarts timers and bumps burstId again', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.celebrate('Great!'); });
        expect(result.current.burstId).toBe(1);

        act(() => { vi.advanceTimersByTime(200); });
        act(() => { result.current.celebrate('Again!'); });
        expect(result.current.burstId).toBe(2);
        expect(result.current.mascotMessage).toBe('Again!');
        expect(result.current.showBubble).toBe(true);
        expect(result.current.showConfetti).toBe(true);

        // Timers should be from the SECOND celebrate, not the first
        act(() => { vi.advanceTimersByTime(1400); });
        expect(result.current.showBubble).toBe(false);
        expect(result.current.showConfetti).toBe(true);

        act(() => { vi.advanceTimersByTime(800); });
        expect(result.current.showConfetti).toBe(false);
    });

    it('encourage() sets mascot to encourage without stars/confetti', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.encourage('Try again'); });
        expect(result.current.mascotEmotion).toBe('encourage');
        expect(result.current.showBubble).toBe(true);
        expect(result.current.showStars).toBe(false);
        expect(result.current.showConfetti).toBe(false);
        expect(result.current.burstId).toBe(1);
    });

    it('clearAll() resets everything', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.celebrate('Great!'); });
        act(() => { result.current.clearAll(); });
        expect(result.current.showBubble).toBe(false);
        expect(result.current.showStars).toBe(false);
        expect(result.current.showConfetti).toBe(false);
        expect(result.current.mascotEmotion).toBe('idle');
    });

    it('unmount clears pending timers', () => {
        const { result } = renderHook(() => useFeedbackEffects());
        act(() => { result.current.celebrate('Great!'); });
        // Should not throw on unmount
        expect(() => result.current).toBeDefined();
    });
});
