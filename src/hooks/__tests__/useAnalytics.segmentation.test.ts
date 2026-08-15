import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeSegment, getOrAssignSegment, shouldFireWeeklySummary, markWeeklySummaryFired } from '../useAnalytics';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

// Install mock
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('Analytics Segmentation', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('computeSegment', () => {
        it('classifies first-session users as new_user', () => {
            expect(computeSegment(1, 0.8)).toBe('new_user');
        });

        it('classifies low-accuracy users as struggling_user', () => {
            expect(computeSegment(5, 0.3)).toBe('struggling_user');
        });

        it('classifies high-accuracy users as advanced_user', () => {
            expect(computeSegment(10, 0.95)).toBe('advanced_user');
        });

        it('classifies mid-range users as returning_user', () => {
            expect(computeSegment(5, 0.7)).toBe('returning_user');
        });

        it('boundary: accuracy exactly 0.5 is returning_user', () => {
            expect(computeSegment(5, 0.5)).toBe('returning_user');
        });

        it('boundary: accuracy exactly 0.9 is returning_user (not advanced)', () => {
            expect(computeSegment(5, 0.9)).toBe('returning_user');
        });
    });

    describe('getOrAssignSegment', () => {
        it('assigns new_user on first call', () => {
            const segment = getOrAssignSegment(0.8);
            expect(segment).toBe('new_user');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('session_count', '1');
        });

        it('increments session count on each call', () => {
            getOrAssignSegment(0.8);
            getOrAssignSegment(0.7);
            getOrAssignSegment(0.9);
            expect(localStorageMock.setItem).toHaveBeenLastCalledWith('session_count', '3');
        });

        it('stores segment in localStorage', () => {
            // First call: session 1 = new_user regardless of accuracy
            getOrAssignSegment(0.8);
            // Second call: session 2, low accuracy = struggling_user
            getOrAssignSegment(0.3);
            // Check that user_segment was set to struggling_user at some point
            const calls = (localStorageMock.setItem as any).mock.calls.filter((c: string[]) => c[0] === 'user_segment');
            expect(calls.length).toBeGreaterThan(0);
            expect(calls[calls.length - 1][1]).toBe('struggling_user');
        });

        it('updates segment when accuracy changes', () => {
            // First session: new_user
            getOrAssignSegment(0.8);
            // Second session with low accuracy: struggling
            const segment = getOrAssignSegment(0.3);
            expect(segment).toBe('struggling_user');
        });
    });

    describe('shouldFireWeeklySummary', () => {
        it('returns true when no week has been recorded', () => {
            expect(shouldFireWeeklySummary()).toBe(true);
        });

        it('returns false after marking weekly summary as fired', () => {
            markWeeklySummaryFired();
            expect(shouldFireWeeklySummary()).toBe(false);
        });

        it('returns true for a different week', () => {
            markWeeklySummaryFired();
            // Simulate different week by overwriting the stored value
            localStorageMock.setItem('last_reported_week', '1999-W1');
            expect(shouldFireWeeklySummary()).toBe(true);
        });
    });

    describe('markWeeklySummaryFired', () => {
        it('stores the current ISO week', () => {
            markWeeklySummaryFired();
            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'last_reported_week',
                expect.stringMatching(/^\d{4}-W\d+$/)
            );
        });
    });
});