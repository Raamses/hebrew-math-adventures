import { describe, it, expect, vi } from 'vitest';
import { GameDirector, Director } from '../GameDirector';
import { RollingWindow, ROLLING_WINDOW_CONFIG } from '../../lib/rollingWindow';
import type { UserCapabilityProfile } from '../../types/progress';
import type { BaseGameConfig } from '../interfaces';

const makeProfile = (overrides: Partial<UserCapabilityProfile> = {}): UserCapabilityProfile => ({
    skills: {},
    currentFocus: 'addition',
    consecutiveFailures: 0,
    estimatedLevel: 1,
    streak: 0,
    ...overrides,
});

const makeConfig = (overrides: Partial<BaseGameConfig> = {}): BaseGameConfig => ({
    type: 'addition_simple',
    max: 100,
    ...overrides,
});

describe('GameDirector.tuneConfig', () => {
    const director = new GameDirector();

    it('returns config unchanged when no rescue or challenge conditions are met', () => {
        const profile = makeProfile();
        const config = makeConfig();
        const tuned = director.tuneConfig(config, profile);
        expect(tuned.isRescue).toBeUndefined();
        expect(tuned.isChallenge).toBeUndefined();
        expect(tuned.max).toBe(100);
    });

    // --- Rescue Mode ---

    it('triggers rescue mode when consecutiveFailures >= 2 (age < 8)', () => {
        const profile = makeProfile({ consecutiveFailures: 2 });
        const tuned = director.tuneConfig(makeConfig(), profile);
        expect(tuned.isRescue).toBe(true);
        expect(tuned.isChallenge).toBe(false);
    });

    it('triggers rescue mode when consecutiveFailures >= 3 (age >= 8)', () => {
        const profile = makeProfile({ consecutiveFailures: 3, age: 8 });
        const tuned = director.tuneConfig(makeConfig(), profile);
        expect(tuned.isRescue).toBe(true);
    });

    it('does NOT trigger rescue when consecutiveFailures = 2 and age >= 8', () => {
        const profile = makeProfile({ consecutiveFailures: 2, age: 9 });
        const tuned = director.tuneConfig(makeConfig(), profile);
        expect(tuned.isRescue).toBeUndefined();
    });

    it('reduces max value by 0.8x in rescue mode, floored at 5', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const tuned = director.tuneConfig(makeConfig({ max: 100 }), profile);
        expect(tuned.max).toBe(80); // floor(100 * 0.8)
    });

    it('floors max at MIN_MAX_VALUE (5) in rescue mode', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const tuned = director.tuneConfig(makeConfig({ max: 4 }), profile);
        expect(tuned.max).toBe(5);
    });

    it('simplifies sub_borrow to sub_simple in rescue mode', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const tuned = director.tuneConfig(makeConfig({ type: 'sub_borrow' }), profile);
        expect(tuned.type).toBe('sub_simple');
    });

    it('simplifies addition_carry to addition_simple in rescue mode', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const tuned = director.tuneConfig(makeConfig({ type: 'addition_carry' }), profile);
        expect(tuned.type).toBe('addition_simple');
    });

    it('reduces density by 0.8x in rescue mode, min 0.1', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const tuned = director.tuneConfig(makeConfig({ density: 0.5 }), profile);
        expect(tuned.density).toBeCloseTo(0.4);
    });

    it('reduces distractorRatio by 0.7x in rescue mode, min 1', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const tuned = director.tuneConfig(makeConfig({ distractorRatio: 4 } as any), profile);
        expect((tuned as any).distractorRatio).toBe(2); // floor(4 * 0.7) = floor(2.8) = 2
    });

    // --- Challenge Mode ---

    it('triggers challenge mode when skill consecutiveCorrect >= 5', () => {
        const profile = makeProfile({
            skills: {
                addition_simple: {
                    attempts: 10, correct: 8, consecutiveCorrect: 5,
                    consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
                },
            },
        });
        const tuned = director.tuneConfig(makeConfig({ type: 'addition_simple' }), profile);
        expect(tuned.isChallenge).toBe(true);
        expect(tuned.isRescue).toBe(false);
    });

    it('triggers challenge mode when profile streak > 5', () => {
        const profile = makeProfile({ streak: 6 });
        const tuned = director.tuneConfig(makeConfig(), profile);
        expect(tuned.isChallenge).toBe(true);
    });

    it('increases max by 1.2x in challenge mode', () => {
        const profile = makeProfile({ streak: 6 });
        const tuned = director.tuneConfig(makeConfig({ max: 100 }), profile);
        expect(tuned.max).toBe(120); // floor(100 * 1.2)
    });

    it('increases distractorRatio by 1 in challenge mode', () => {
        const profile = makeProfile({ streak: 6 });
        const tuned = director.tuneConfig(makeConfig({ distractorRatio: 3 } as any), profile);
        expect((tuned as any).distractorRatio).toBe(4);
    });

    it('rescue and challenge are mutually exclusive (rescue takes priority)', () => {
        const profile = makeProfile({
            consecutiveFailures: 3,
            streak: 10,
            skills: {
                addition_simple: {
                    attempts: 10, correct: 8, consecutiveCorrect: 7,
                    consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
                },
            },
        });
        const tuned = director.tuneConfig(makeConfig({ type: 'addition_simple' }), profile);
        expect(tuned.isRescue).toBe(true);
        expect(tuned.isChallenge).toBe(false);
    });
});

describe('GameDirector.recordResult', () => {
    const director = new GameDirector();

    it('increments attempts and updates correct stats on correct answer', () => {
        const profile = makeProfile();
        const result = director.recordResult(profile, true);
        const skill = result.skills['addition'];
        expect(skill.attempts).toBe(1);
        expect(skill.correct).toBe(1);
        expect(skill.consecutiveCorrect).toBe(1);
        expect(skill.consecutiveWrong).toBe(0);
    });

    it('increments consecutiveWrong and resets consecutiveCorrect on wrong answer', () => {
        const profile = makeProfile({
            skills: {
                addition: {
                    attempts: 5, correct: 3, consecutiveCorrect: 2,
                    consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
                },
            },
        });
        const result = director.recordResult(profile, false);
        const skill = result.skills['addition'];
        expect(skill.attempts).toBe(6);
        expect(skill.consecutiveCorrect).toBe(0);
        expect(skill.consecutiveWrong).toBe(1);
    });

    it('resets consecutiveFailures on correct answer', () => {
        const profile = makeProfile({ consecutiveFailures: 3 });
        const result = director.recordResult(profile, true);
        expect(result.consecutiveFailures).toBe(0);
    });

    it('increments consecutiveFailures on wrong answer', () => {
        const profile = makeProfile({ consecutiveFailures: 1 });
        const result = director.recordResult(profile, false);
        expect(result.consecutiveFailures).toBe(2);
    });

    it('creates a new skill entry if currentFocus skill does not exist', () => {
        const profile = makeProfile({ currentFocus: 'multiplication' });
        const result = director.recordResult(profile, true);
        expect(result.skills['multiplication']).toBeDefined();
        expect(result.skills['multiplication'].attempts).toBe(1);
    });

    it('does not mutate the original profile', () => {
        const profile = makeProfile({
            skills: {
                addition: {
                    attempts: 5, correct: 3, consecutiveCorrect: 2,
                    consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
                },
            },
        });
        const original = JSON.stringify(profile);
        director.recordResult(profile, true);
        expect(JSON.stringify(profile)).toBe(original);
    });

    it('grows estimatedLevel when 3 skills are mastered (10+ attempts, 80%+ accuracy)', () => {
        const masteredSkill = (correct: number, attempts: number) => ({
            attempts, correct, consecutiveCorrect: 0,
            consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
        });
        const profile = makeProfile({
            estimatedLevel: 1,
            skills: {
                addition: masteredSkill(9, 10),   // 90% accuracy, 10 attempts
                subtraction: masteredSkill(8, 10), // 80% accuracy, 10 attempts
                multiplication: masteredSkill(10, 10), // 100% accuracy
            },
        });
        const result = director.recordResult(profile, true);
        expect(result.estimatedLevel).toBe(2); // 3 mastered / 3 = 1, level = 1 + 1 = 2
    });

    it('does not grow level when skills are not mastered (< 80% accuracy)', () => {
        const partialSkill = {
            attempts: 10, correct: 7, consecutiveCorrect: 0,
            consecutiveWrong: 3, lastPlayedAt: 0, avgSpeedMs: 0,
        }; // 70% accuracy
        const profile = makeProfile({
            estimatedLevel: 1,
            skills: { addition: partialSkill },
        });
        const result = director.recordResult(profile, true);
        expect(result.estimatedLevel).toBe(1);
    });

    it('caps estimatedLevel at 10', () => {
        const masteredSkill = {
            attempts: 20, correct: 20, consecutiveCorrect: 0,
            consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
        };
        const skills: Record<string, typeof masteredSkill> = {};
        for (let i = 0; i < 30; i++) {
            skills[`skill_${i}`] = { ...masteredSkill };
        }
        const profile = makeProfile({ estimatedLevel: 10, skills });
        const result = director.recordResult(profile, true);
        expect(result.estimatedLevel).toBe(10);
    });

    it('fires onLevelUp callback when level increases', () => {
        const masteredSkill = {
            attempts: 15, correct: 15, consecutiveCorrect: 0,
            consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0,
        };
        const profile = makeProfile({
            estimatedLevel: 1,
            skills: {
                a: masteredSkill,
                b: masteredSkill,
                c: masteredSkill,
            },
        });
        const onLevelUp = vi.fn();
        director.recordResult(profile, true, onLevelUp);
        expect(onLevelUp).toHaveBeenCalledWith(2);
    });

    it('does NOT fire onLevelUp when level does not change', () => {
        const profile = makeProfile({ estimatedLevel: 5 });
        const onLevelUp = vi.fn();
        director.recordResult(profile, true, onLevelUp);
        expect(onLevelUp).not.toHaveBeenCalled();
    });
});

describe('Director singleton', () => {
    it('is an instance of GameDirector', () => {
        expect(Director).toBeInstanceOf(GameDirector);
    });
});

// ================================================================
//  Phase 6: Rolling-window adaptive difficulty (GameDirector.applyRollingWindowSignal)
// ================================================================
//
// GameDirector.applyRollingWindowSignal is the "GameDirector uses it" side
// of the standalone RollingWindow module (src/lib/rollingWindow.ts, tested
// independently in lib/__tests__/rollingWindow.test.ts). These tests cover
// the translation from an AdaptationSignal into config deltas.

describe('GameDirector.applyRollingWindowSignal', () => {
    const director = new GameDirector();

    const bubbleConfig = (overrides: Partial<BaseGameConfig> = {}): BaseGameConfig => ({
        distractorRatio: 2,
        spawnIntervalMs: 1000,
        baseVelocity: 0.5,
        ...overrides,
    });

    it('returns the config unchanged for a steady signal', () => {
        const config = bubbleConfig();
        const tuned = director.applyRollingWindowSignal(config, { direction: 'steady', accuracy: 0.6, confidence: 1 });
        expect(tuned).toEqual(config);
    });

    it('eases difficulty for an "easier" signal: reduces distractorRatio, slows spawn and velocity', () => {
        const config = bubbleConfig({ distractorRatio: 2, spawnIntervalMs: 1000, baseVelocity: 0.5 });
        const tuned = director.applyRollingWindowSignal(config, { direction: 'easier', accuracy: 0.3, confidence: 1 });

        expect(tuned.distractorRatio).toBeCloseTo(2 * ROLLING_WINDOW_CONFIG.EASE_MULTIPLIERS.distractorRatio);
        expect(tuned.spawnIntervalMs).toBe(Math.round(1000 * ROLLING_WINDOW_CONFIG.EASE_MULTIPLIERS.spawnInterval));
        expect(tuned.baseVelocity).toBeCloseTo(0.5 * ROLLING_WINDOW_CONFIG.EASE_MULTIPLIERS.baseVelocity);
    });

    it('floors distractorRatio at 1 when easing', () => {
        const config = bubbleConfig({ distractorRatio: 1 });
        const tuned = director.applyRollingWindowSignal(config, { direction: 'easier', accuracy: 0.2, confidence: 1 });
        expect(tuned.distractorRatio).toBe(1);
    });

    it('increases difficulty for a "harder" signal: raises distractorRatio, speeds up spawn and velocity', () => {
        const config = bubbleConfig({ distractorRatio: 2, spawnIntervalMs: 1000, baseVelocity: 0.5 });
        const tuned = director.applyRollingWindowSignal(config, { direction: 'harder', accuracy: 0.95, confidence: 1 });

        expect(tuned.distractorRatio).toBeCloseTo(2 * ROLLING_WINDOW_CONFIG.CHALLENGE_MULTIPLIERS.distractorRatio);
        expect(tuned.spawnIntervalMs).toBe(Math.round(1000 * ROLLING_WINDOW_CONFIG.CHALLENGE_MULTIPLIERS.spawnInterval));
        expect(tuned.baseVelocity).toBeCloseTo(0.5 * ROLLING_WINDOW_CONFIG.CHALLENGE_MULTIPLIERS.baseVelocity);
    });

    it('leaves non-numeric fields untouched', () => {
        const config = bubbleConfig({ type: 'addition_simple' });
        const tuned = director.applyRollingWindowSignal(config, { direction: 'harder', accuracy: 0.95, confidence: 1 });
        expect(tuned.type).toBe('addition_simple');
    });

    it('does not mutate the original config object', () => {
        const config = bubbleConfig();
        const original = JSON.stringify(config);
        director.applyRollingWindowSignal(config, { direction: 'harder', accuracy: 0.95, confidence: 1 });
        expect(JSON.stringify(config)).toBe(original);
    });

    // --- End-to-end: RollingWindow → signal() → GameDirector.applyRollingWindowSignal ---

    it('integrates with a real RollingWindow: 10 wrong answers eases difficulty', () => {
        const rw = new RollingWindow(ROLLING_WINDOW_CONFIG.WINDOW_SIZE);
        for (let i = 0; i < 10; i++) rw.push({ correct: false, timestamp: i });

        const signal = rw.signal(ROLLING_WINDOW_CONFIG.EASE_THRESHOLD, ROLLING_WINDOW_CONFIG.CHALLENGE_THRESHOLD);
        expect(signal.direction).toBe('easier');

        const config = bubbleConfig({ distractorRatio: 3 });
        const tuned = director.applyRollingWindowSignal(config, signal);
        expect(tuned.distractorRatio).toBeLessThan(3);
    });

    it('integrates with a real RollingWindow: 10 correct answers increases difficulty', () => {
        const rw = new RollingWindow(ROLLING_WINDOW_CONFIG.WINDOW_SIZE);
        for (let i = 0; i < 10; i++) rw.push({ correct: true, timestamp: i });

        const signal = rw.signal(ROLLING_WINDOW_CONFIG.EASE_THRESHOLD, ROLLING_WINDOW_CONFIG.CHALLENGE_THRESHOLD);
        expect(signal.direction).toBe('harder');

        const config = bubbleConfig({ distractorRatio: 2 });
        const tuned = director.applyRollingWindowSignal(config, signal);
        expect(tuned.distractorRatio).toBeGreaterThan(2);
    });

    it('integrates with a real RollingWindow: mixed 50% accuracy stays steady', () => {
        const rw = new RollingWindow(ROLLING_WINDOW_CONFIG.WINDOW_SIZE);
        for (let i = 0; i < 10; i++) rw.push({ correct: i % 2 === 0, timestamp: i });

        const signal = rw.signal(ROLLING_WINDOW_CONFIG.EASE_THRESHOLD, ROLLING_WINDOW_CONFIG.CHALLENGE_THRESHOLD);
        expect(signal.direction).toBe('steady');

        const config = bubbleConfig({ distractorRatio: 2 });
        const tuned = director.applyRollingWindowSignal(config, signal);
        expect(tuned.distractorRatio).toBe(2);
    });
});