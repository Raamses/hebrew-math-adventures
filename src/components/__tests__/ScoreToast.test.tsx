// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ScoreToast } from '../ScoreToast';

describe('ScoreToast', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

    it('does not render when isVisible is false', () => {
        const onComplete = vi.fn();
        render(<ScoreToast message="נכון!" isVisible={false} onComplete={onComplete} />);
        expect(screen.queryByText('נכון!')).toBeNull();
    });

    it('renders when isVisible is true', () => {
        const onComplete = vi.fn();
        render(<ScoreToast message="נכון!" isVisible={true} onComplete={onComplete} />);
        expect(screen.getAllByText('נכון!').length).toBeGreaterThan(0);
    });

    it('calls onComplete after 900ms', () => {
        const onComplete = vi.fn();
        render(<ScoreToast message="נכון!" isVisible={true} onComplete={onComplete} />);
        expect(onComplete).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(900); });
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onComplete before 900ms', () => {
        const onComplete = vi.fn();
        render(<ScoreToast message="נכון!" isVisible={true} onComplete={onComplete} />);
        act(() => { vi.advanceTimersByTime(899); });
        expect(onComplete).not.toHaveBeenCalled();
    });

    // Regression: inline-arrow onComplete from parent changed identity on every
    // render, restarting the timer and preventing dismissal. With the ref fix,
    // a new onComplete identity must NOT restart the timer.
    it('survives parent re-renders with new onComplete identity (timer leak fix)', () => {
        const onComplete1 = vi.fn();
        const { rerender } = render(<ScoreToast message="נכון!" isVisible={true} onComplete={onComplete1} />);

        // Simulate parent re-rendering with a NEW inline arrow (different identity)
        const onComplete2 = vi.fn();
        rerender(<ScoreToast message="נכון!" isVisible={true} onComplete={onComplete2} />);
        const onComplete3 = vi.fn();
        rerender(<ScoreToast message="נכון!" isVisible={true} onComplete={onComplete3} />);

        act(() => { vi.advanceTimersByTime(900); });
        // The FIRST onComplete is the one captured in the ref at mount; subsequent
        // renders update the ref but do NOT restart the timer. So exactly one call.
        expect(onComplete3).toHaveBeenCalledTimes(1);
        expect(onComplete1).not.toHaveBeenCalled();
        expect(onComplete2).not.toHaveBeenCalled();
    });
});
