// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnswerFlow } from '../useAnswerFlow';
import { GameDirector } from '../../engines/GameDirector';
import type { UserCapabilityProfile } from '../../types/progress';

describe('useAnswerFlow', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('1. Initial state: status is idle and isProcessing is false', () => {
        const { result } = renderHook(() => useAnswerFlow());
        expect(result.current.status).toBe('idle');
        expect(result.current.isProcessing).toBe(false);
    });

    it('2. Correct answer transition: updates status to correct and triggers onCorrectComplete', () => {
        const onCorrectComplete = vi.fn();
        const { result } = renderHook(() =>
            useAnswerFlow({
                onCorrectComplete,
                correctDelay: 1000,
            })
        );

        act(() => {
            result.current.submitAnswer(true);
        });

        expect(result.current.status).toBe('correct');
        expect(result.current.isProcessing).toBe(true);
        expect(onCorrectComplete).not.toHaveBeenCalled();

        // Double submission prevention
        act(() => {
            result.current.submitAnswer(false);
        });
        expect(result.current.status).toBe('correct');

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isProcessing).toBe(false);
        expect(onCorrectComplete).toHaveBeenCalledTimes(1);
    });

    it('3. Wrong answer transition: updates status to wrong and triggers onWrongComplete', () => {
        const onWrongComplete = vi.fn();
        const { result } = renderHook(() =>
            useAnswerFlow({
                onWrongComplete,
                wrongDelay: 500,
            })
        );

        act(() => {
            result.current.submitAnswer(false);
        });

        expect(result.current.status).toBe('wrong');
        expect(result.current.isProcessing).toBe(true);
        expect(onWrongComplete).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isProcessing).toBe(false);
        expect(onWrongComplete).toHaveBeenCalledTimes(1);
    });

    it('4. Session completion: handles sequence of answers until session completes', () => {
        const totalQuestions = 3;
        let answeredCount = 0;
        let sessionCompleted = false;

        const onAnswerProcessed = () => {
            answeredCount++;
            if (answeredCount >= totalQuestions) {
                sessionCompleted = true;
            }
        };

        const { result } = renderHook(() =>
            useAnswerFlow({
                onCorrectComplete: onAnswerProcessed,
                onWrongComplete: onAnswerProcessed,
                correctDelay: 100,
                wrongDelay: 100,
            })
        );

        // Submit 1st answer (correct)
        act(() => {
            result.current.submitAnswer(true);
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(answeredCount).toBe(1);
        expect(sessionCompleted).toBe(false);

        // Submit 2nd answer (wrong)
        act(() => {
            result.current.submitAnswer(false);
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(answeredCount).toBe(2);
        expect(sessionCompleted).toBe(false);

        // Submit 3rd answer (correct)
        act(() => {
            result.current.submitAnswer(true);
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(answeredCount).toBe(3);
        expect(sessionCompleted).toBe(true);
    });

    it('5. recordResult integration with GameDirector (mastery tracking)', () => {
        const director = new GameDirector();
        let profile: UserCapabilityProfile = {
            skills: {},
            currentFocus: 'addition',
            consecutiveFailures: 0,
            estimatedLevel: 1,
            streak: 0,
        };

        const onLevelUp = vi.fn();

        const handleAnswer = (isCorrect: boolean) => {
            profile = director.recordResult(profile, isCorrect, onLevelUp);
        };

        const { result } = renderHook(() =>
            useAnswerFlow({
                onCorrectComplete: () => handleAnswer(true),
                onWrongComplete: () => handleAnswer(false),
                correctDelay: 100,
                wrongDelay: 100,
            })
        );

        // Submit a correct answer via hook
        act(() => {
            result.current.submitAnswer(true);
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(profile.skills.addition.attempts).toBe(1);
        expect(profile.skills.addition.correct).toBe(1);
        expect(profile.skills.addition.consecutiveCorrect).toBe(1);
        expect(profile.consecutiveFailures).toBe(0);

        // Submit a wrong answer via hook
        act(() => {
            result.current.submitAnswer(false);
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(profile.skills.addition.attempts).toBe(2);
        expect(profile.skills.addition.correct).toBe(1);
        expect(profile.skills.addition.consecutiveCorrect).toBe(0);
        expect(profile.skills.addition.consecutiveWrong).toBe(1);
        expect(profile.consecutiveFailures).toBe(1);

        // Simulate reaching mastery threshold across 3 skills
        // Mastery: attempts >= 10 and accuracy >= 0.8
        // Level increases every 3 mastered skills
        profile.skills = {
            skill1: { attempts: 10, correct: 10, consecutiveCorrect: 10, consecutiveWrong: 0, lastPlayedAt: Date.now(), avgSpeedMs: 1000 },
            skill2: { attempts: 10, correct: 10, consecutiveCorrect: 10, consecutiveWrong: 0, lastPlayedAt: Date.now(), avgSpeedMs: 1000 },
            addition: profile.skills.addition,
        };

        // Answering 8 more correct answers for 'addition' so total attempts = 10 (9 correct, 1 wrong = 90% accuracy)
        for (let i = 0; i < 8; i++) {
            act(() => {
                result.current.submitAnswer(true);
            });
            act(() => {
                vi.advanceTimersByTime(100);
            });
        }

        // Now addition has 10 attempts, 9 correct (90% accuracy).
        // Total 3 mastered skills (skill1, skill2, addition).
        // newLevel = Math.min(10, 1 + Math.floor(3 / 3)) = 2.
        expect(profile.estimatedLevel).toBe(2);
        expect(onLevelUp).toHaveBeenCalledWith(2);
    });

    it('reset method clears pending timeout and resets status to idle', () => {
        const onCorrectComplete = vi.fn();
        const { result } = renderHook(() =>
            useAnswerFlow({
                onCorrectComplete,
                correctDelay: 1000,
            })
        );

        act(() => {
            result.current.submitAnswer(true);
        });
        expect(result.current.status).toBe('correct');

        act(() => {
            result.current.reset();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isProcessing).toBe(false);

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(onCorrectComplete).not.toHaveBeenCalled();
    });
});
