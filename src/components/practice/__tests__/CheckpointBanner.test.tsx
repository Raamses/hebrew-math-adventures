// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CheckpointBanner } from '../CheckpointBanner';

describe('CheckpointBanner', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

    it('renders nothing when message is null', () => {
        const onComplete = vi.fn();
        render(<CheckpointBanner message={null} onComplete={onComplete} />);
        expect(screen.queryByTestId('checkpoint-banner')).toBeNull();
    });

    it('renders banner when message is provided', () => {
        const onComplete = vi.fn();
        render(<CheckpointBanner message="שליש מהדרך! מעולה! 🌟" onComplete={onComplete} />);
        expect(screen.getByTestId('checkpoint-banner')).toBeTruthy();
        expect(screen.getByText('שליש מהדרך! מעולה! 🌟')).toBeTruthy();
    });

    it('auto-dismisses after 1600ms', () => {
        const onComplete = vi.fn();
        render(<CheckpointBanner message="שליש מהדרך! מעולה! 🌟" onComplete={onComplete} />);
        expect(onComplete).not.toHaveBeenCalled();
        act(() => { vi.advanceTimersByTime(1600); });
        expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does NOT dismiss before 1600ms', () => {
        const onComplete = vi.fn();
        render(<CheckpointBanner message="שליש מהדרך! מעולה! 🌟" onComplete={onComplete} />);
        act(() => { vi.advanceTimersByTime(1599); });
        expect(onComplete).not.toHaveBeenCalled();
    });

    it('new message restarts the timer', () => {
        const onComplete = vi.fn();
        const { rerender } = render(<CheckpointBanner message="First" onComplete={onComplete} />);
        act(() => { vi.advanceTimersByTime(800); });
        rerender(<CheckpointBanner message="Second" onComplete={onComplete} />);
        act(() => { vi.advanceTimersByTime(800); }); // total 1600 from first, 800 from second
        expect(onComplete).not.toHaveBeenCalled(); // timer restarted, so not yet
        act(() => { vi.advanceTimersByTime(800); }); // total 1600 from second
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
