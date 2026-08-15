// @vitest-environment jsdom
/**
 * Play-mode (PracticeMode) "state resets on answer" regression tests.
 *
 * Reported bug: the user suspects the state-reset also happens in play mode.
 * In PracticeMode, `useAnswerFlow.onCorrectComplete` calls `nextProblem()`
 * between questions. `nextProblem` must generate a NEW problem WITHOUT
 * resetting the session state (count / correct / score / combo / lives).
 *
 * These tests pin that contract: answering a question and advancing to the
 * next problem must preserve accumulated session state.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePracticeSession } from '../usePracticeSession';
import type { UserProfile } from '../../types/user';

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
        streak: 0,
    },
    arcadeStats: {},
};

vi.mock('../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: mockProfile,
        updateProfile: vi.fn(),
    }),
}));

// Deterministic MathModule so we can assert problem identity changes.
let problemCounter = 0;
vi.mock('../../engines/MathModule', () => {
    return {
        MathModule: vi.fn().mockImplementation(function () {
            return {
                generateProblem: vi.fn().mockImplementation(() => {
                    problemCounter++;
                    return {
                        type: 'arithmetic',
                        id: `p${problemCounter}`,
                        num1: problemCounter,
                        num2: 1,
                        operator: '+',
                        missing: 'answer',
                        answer: problemCounter + 1,
                    };
                }),
                evaluate: vi.fn().mockReturnValue({ isCorrect: true }),
            };
        }),
    };
});

describe('usePracticeSession — state persists across questions (regression)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        problemCounter = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('nextProblem advances the problem WITHOUT resetting session state', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('STANDARD');
        });

        const firstProblem = result.current.problem;
        expect(firstProblem).not.toBeNull();

        // Answer a question correctly — session state accumulates.
        act(() => {
            result.current.submitResult(true);
        });
        expect(result.current.session.correct).toBe(1);
        expect(result.current.session.attempts).toBe(1);
        expect(result.current.session.count).toBe(1);

        // Advance to the next problem (what onCorrectComplete does).
        act(() => {
            result.current.nextProblem();
        });

        // BUG CHECK: session state must NOT reset.
        expect(result.current.session.correct).toBe(1);
        expect(result.current.session.attempts).toBe(1);
        expect(result.current.session.count).toBe(1);
        expect(result.current.session.score).toBeGreaterThan(0);

        // The problem should have advanced to a new one.
        expect(result.current.problem).not.toBeNull();
        expect(result.current.problem).not.toBe(firstProblem);
    });

    it('multiple correct answers accumulate score/combo across nextProblem calls', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('STANDARD');
        });

        for (let i = 0; i < 5; i++) {
            act(() => {
                result.current.submitResult(true);
                result.current.nextProblem();
            });
        }

        // 5 correct answers → correct=5, attempts=5, count=5, score>0.
        expect(result.current.session.correct).toBe(5);
        expect(result.current.session.attempts).toBe(5);
        expect(result.current.session.count).toBe(5);
        expect(result.current.session.score).toBeGreaterThan(0);
        // Combo should have grown (starts at 1, +1 per correct).
        expect(result.current.session.combo).toBeGreaterThan(1);
    });

    it('restartSession resets state but nextProblem does not', () => {
        const { result } = renderHook(() => usePracticeSession({ targetLevel: 1 }));
        act(() => {
            result.current.initSession('STANDARD');
            result.current.submitResult(true);
            result.current.submitResult(true);
        });
        expect(result.current.session.correct).toBe(2);

        // nextProblem must NOT reset.
        act(() => {
            result.current.nextProblem();
        });
        expect(result.current.session.correct).toBe(2);

        // restartSession SHOULD reset (explicit user action).
        act(() => {
            result.current.restartSession();
        });
        expect(result.current.session.correct).toBe(0);
        expect(result.current.session.attempts).toBe(0);
        expect(result.current.session.score).toBe(0);
    });
});
