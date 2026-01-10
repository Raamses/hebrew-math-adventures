// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePracticeSession } from '../usePracticeSession';
import type { UserProfile } from '../../types/user';

// Mock ProfileContext
const mockProfile: UserProfile = {
    id: 'test-id',
    name: 'Test User',
    age: 10,
    avatarId: 'lion',
    mascotId: 'owl',
    themeId: 'default',
    streak: 5,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    settings: { musicVolume: 1, sfxVolume: 1, isMuted: false },
    capabilities: {
        skills: {},
        currentFocus: 'arithmetic',
        consecutiveFailures: 0,
        estimatedLevel: 1,
        streak: 0
    },
    arcadeStats: {}
};

vi.mock('../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: mockProfile
    })
}));

// Mock MathModule
vi.mock('../../engines/MathModule', () => {
    return {
        MathModule: vi.fn().mockImplementation(() => ({
            generateProblem: vi.fn().mockReturnValue({
                type: 'arithmetic',
                question: '1 + 1',
                answer: 2,
                options: [1, 2, 3, 4]
            }),
            evaluate: vi.fn().mockReturnValue({ isCorrect: true })
        }))
    };
});

describe('usePracticeSession', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('initializes with STANDARD mode by default', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        expect(result.current.session.mode).toBe('STANDARD');
        // INITIAL_LIVES is 0 for standard (or ignored)
        // Check logic: mode === 'SURVIVAL' ? INITIAL_LIVES : 0
        expect(result.current.session.lives).toBe(0);
    });

    it('initializes SURVIVAL mode with 3 lives', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('SURVIVAL');
        });
        expect(result.current.session.mode).toBe('SURVIVAL');
        expect(result.current.session.lives).toBe(3);
    });

    it('decrements lives on wrong answer in SURVIVAL', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('SURVIVAL');
        });

        act(() => {
            result.current.submitResult(false); // Wrong answer
        });

        expect(result.current.session.lives).toBe(2);
        expect(result.current.session.combo).toBe(1); // Reset to 1 (or stayed 1)
    });

    it('triggers game over when lives reach 0 in SURVIVAL', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('SURVIVAL');
        });

        act(() => {
            result.current.submitResult(false);
            result.current.submitResult(false);
            result.current.submitResult(false);
        });

        expect(result.current.session.lives).toBe(0);
        expect(result.current.session.isGameOver).toBe(true);
    });

    it('starts timer in TIME_ATTACK and ticks down', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('TIME_ATTACK');
        });

        // Effect runs on mount/change, so timer starts
        expect(result.current.session.timeLeft).toBe(60);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.session.timeLeft).toBe(59);
    });

    it('adds time bonus on correct answer in TIME_ATTACK', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('TIME_ATTACK');
        });

        act(() => {
            result.current.submitResult(true);
        });

        // 60 start + 2 bonus = 62
        expect(result.current.session.timeLeft).toBe(62);
    });
});
