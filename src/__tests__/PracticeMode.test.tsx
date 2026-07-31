import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: {
            id: 't', name: 'T',
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
            capabilities: { skills: {}, streak: 0, currentFocus: 'addition' },
            stats: { totalStars: 0, totalCoins: 0, badges: [], arcadeBestScores: {}, dailyStamps: {} },
            arcadeStats: {},
            streak: 0,
        },
        updateProfile: vi.fn(),
        incrementStreak: vi.fn(),
        resetStreak: vi.fn(),
        updateArcadeBestScore: vi.fn(),
        recordSession: vi.fn(),
        toggleSoundGarden: vi.fn(),
    }),
}));

const m: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (k: string) => m[k] ?? null,
        setItem: (k: string, v: string) => { m[k] = v; },
        removeItem: (k: string) => { delete m[k]; },
        clear: () => { Object.keys(m).forEach(k => delete m[k]); },
    },
});

import { usePracticeSession } from '../hooks/usePracticeSession';

// ─── Hook-level tests: nextProblem does NOT reset state ───

describe('usePracticeSession — nextProblem preserves state', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('nextProblem does NOT reset session state', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        expect(result.current.session.count).toBe(0);
        expect(result.current.session.score).toBe(0);

        act(() => {
            result.current.submitResult(true);
        });

        expect(result.current.session.count).toBe(1);
        const scoreAfterAnswer = result.current.session.score;
        const comboAfterAnswer = result.current.session.combo;

        act(() => {
            result.current.nextProblem();
        });

        expect(result.current.session.score).toBe(scoreAfterAnswer);
        expect(result.current.session.count).toBe(1);
        expect(result.current.session.combo).toBe(comboAfterAnswer);
    });

    it('restartSession DOES reset state', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => {
            result.current.submitResult(true);
        });

        expect(result.current.session.count).toBe(1);
        expect(result.current.session.score).toBeGreaterThan(0);

        act(() => {
            result.current.restartSession();
        });

        expect(result.current.session.count).toBe(0);
        expect(result.current.session.score).toBe(0);
        expect(result.current.session.combo).toBe(1);
    });

    it('initSession resets state and sets mode', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => {
            result.current.submitResult(true);
        });

        act(() => {
            result.current.initSession('TIME_ATTACK');
        });

        expect(result.current.session.mode).toBe('TIME_ATTACK');
        expect(result.current.session.count).toBe(0);
        expect(result.current.session.score).toBe(0);
        expect(result.current.session.timeLeft).toBe(60);
    });
});

// ─── Standard (Zen) mode ───

describe('usePracticeSession — Standard (Zen) mode', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('starts with count=0, score=0', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('STANDARD'); });
        expect(result.current.session.count).toBe(0);
        expect(result.current.session.score).toBe(0);
    });

    it('score accumulates across multiple correct answers with nextProblem', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('STANDARD'); });

        for (let i = 0; i < 5; i++) {
            act(() => { result.current.submitResult(true); });
            act(() => { result.current.nextProblem(); });
        }

        expect(result.current.session.count).toBe(5);
        expect(result.current.session.correct).toBe(5);
        // combo starts at 1, increments to 2 on first correct, multiplier = min(combo, 5)
        // 100*2 + 100*3 + 100*4 + 100*5 + 100*5 = 200+300+400+500+500 = 1900
        expect(result.current.session.score).toBe(1900);
    });

    it('wrong answer increments attempts but not count', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('STANDARD'); });
        act(() => { result.current.submitResult(false); });

        expect(result.current.session.attempts).toBe(1);
        expect(result.current.session.count).toBe(0);
        expect(result.current.session.correct).toBe(0);
    });

    it('mix of correct and wrong answers tracks correctly', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('STANDARD'); });

        act(() => { result.current.submitResult(true); });
        act(() => { result.current.nextProblem(); });
        act(() => { result.current.submitResult(true); });
        act(() => { result.current.nextProblem(); });
        act(() => { result.current.submitResult(false); });
        act(() => { result.current.nextProblem(); });
        act(() => { result.current.submitResult(true); });

        expect(result.current.session.count).toBe(3);
        expect(result.current.session.correct).toBe(3);
        expect(result.current.session.attempts).toBe(4);
    });

    it('combo increments on consecutive correct, resets on wrong', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.submitResult(true); });
        expect(result.current.session.combo).toBe(2);

        act(() => { result.current.submitResult(true); });
        expect(result.current.session.combo).toBe(3);

        act(() => { result.current.submitResult(false); });
        expect(result.current.session.combo).toBe(1);
    });

    it('nextProblem after correct answer does NOT reset score in Standard mode', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('STANDARD'); });

        for (let i = 0; i < 3; i++) {
            act(() => { result.current.submitResult(true); });
            act(() => { result.current.nextProblem(); });
        }

        expect(result.current.session.count).toBe(3);
        expect(result.current.session.score).toBe(900); // 100*2 + 100*3 + 100*4 = 200+300+400
    });
});

// ─── Survival mode ───

describe('usePracticeSession — Survival mode', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('starts with 3 lives', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('SURVIVAL'); });
        expect(result.current.session.lives).toBe(3);
    });

    it('loses a life on wrong answer', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('SURVIVAL'); });
        act(() => { result.current.submitResult(false); });
        expect(result.current.session.lives).toBe(2);
    });

    it('correct answer does NOT lose a life', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('SURVIVAL'); });
        act(() => { result.current.submitResult(true); });
        expect(result.current.session.lives).toBe(3);
    });

    it('game over at 0 lives', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('SURVIVAL'); });
        act(() => { result.current.submitResult(false); });
        act(() => { result.current.submitResult(false); });
        act(() => { result.current.submitResult(false); });

        expect(result.current.session.lives).toBe(0);
        expect(result.current.session.isGameOver).toBe(true);
    });

    it('nextProblem after wrong answer preserves remaining lives', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('SURVIVAL'); });
        act(() => { result.current.submitResult(false); });
        expect(result.current.session.lives).toBe(2);

        act(() => { result.current.nextProblem(); });
        expect(result.current.session.lives).toBe(2);
    });

    it('score accumulates in Survival with nextProblem', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('SURVIVAL'); });

        act(() => { result.current.submitResult(true); });
        act(() => { result.current.nextProblem(); });
        act(() => { result.current.submitResult(true); });
        act(() => { result.current.nextProblem(); });

        expect(result.current.session.count).toBe(2);
        expect(result.current.session.score).toBe(500); // 200+300
        expect(result.current.session.lives).toBe(3); // no lives lost
    });
});

// ─── Time Attack mode ───

describe('usePracticeSession — Time Attack mode', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('starts with 60 seconds', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('TIME_ATTACK'); });
        expect(result.current.session.timeLeft).toBe(60);
    });

    it('adds time bonus on correct answer', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('TIME_ATTACK'); });
        act(() => { result.current.submitResult(true); });
        expect(result.current.session.timeLeft).toBe(62);
    });

    it('wrong answer does NOT add time', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('TIME_ATTACK'); });
        act(() => { result.current.submitResult(false); });
        expect(result.current.session.timeLeft).toBe(60);
    });

    it('nextProblem after correct answer preserves time bonus', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('TIME_ATTACK'); });
        act(() => { result.current.submitResult(true); });
        act(() => { result.current.nextProblem(); });

        expect(result.current.session.timeLeft).toBe(62);
    });

    it('multiple correct answers + nextProblem accumulates time', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));

        act(() => { result.current.initSession('TIME_ATTACK'); });

        for (let i = 0; i < 3; i++) {
            act(() => { result.current.submitResult(true); });
            act(() => { result.current.nextProblem(); });
        }

        expect(result.current.session.timeLeft).toBe(66); // 60 + 2+2+2
        expect(result.current.session.score).toBe(900); // 200+300+400
    });
});