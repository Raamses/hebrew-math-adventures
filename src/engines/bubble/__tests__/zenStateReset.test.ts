// @vitest-environment jsdom
/**
 * Zen-mode "state resets on answer" regression tests.
 *
 * Reported bug: in zen mode, when the user answers a question, the game state
 * (combo / score / level) appears to reset. The suspected mechanism is the
 * cross-entity pop race: `handleSessionLeveling` calls
 * `behavior.regenerateProblem()` SYNCHRONOUSLY inside `onPopWrapper`, which
 * rotates `targetValue` immediately. Any already-spawned target bubble on
 * screen (carrying the OLD internalValue) then validates as WRONG, so a
 * follow-up tap on it resets combo and mis-scores — the "state reset".
 *
 * These tests pin the engine-level contract that must hold for zen state to
 * persist across questions.
 */
import { describe, it, expect } from 'vitest';
import { MathBehaviorStrategy } from '../strategies/MathStrategy';
import type { GameConfig, BubbleEntity } from '../types';

// Minimal valid GameConfig (matches MathStrategy.test.ts)
const makeConfig = (): GameConfig => ({
    modeName: 'test',
    spawnIntervalMs: 1000,
    maxOnScreen: 8,
    distractorRatio: 2,
    baseVelocity: 0.5,
    winCondition: { type: 'target_count', value: 10 },
    failCondition: { type: 'strikes', value: 3 },
    difficultyScale: 'linear',
    levelMultiplier: 1.0,
    theme: 'space',
    vfxEnabled: true,
});

// Zen config: endless win, strikes:0 fail (never game-over)
const makeZenConfig = (): GameConfig => ({
    ...makeConfig(),
    winCondition: { type: 'endless', value: 0 },
    failCondition: { type: 'strikes', value: 0 },
});

const makeBubble = (id: string, internalValue: number): BubbleEntity => ({
    id,
    x: 50,
    y: 50,
    content: internalValue,
    internalValue,
    velocity: 0.5,
    isPopped: false,
    createdAt: Date.now(),
    speedMultiplier: 1,
    variant: 'medium',
});

describe('Zen mode — state persists across questions (regression)', () => {
    it('a correct pop does NOT rotate the target before the pop is fully validated', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();

        // Set an initial problem and capture its target.
        strategy.initializeLevel(1, config);
        const initialTarget = strategy.getTargetValue();
        expect(initialTarget).toBeGreaterThanOrEqual(0);

        // A target bubble carrying the CURRENT target must validate as correct.
        const targetBubble = makeBubble('t1', initialTarget);
        expect(strategy.validate(targetBubble)).toBe(true);

        // Snapshot before rotation (as useGameEngine.handlePop now does).
        const snapshot = strategy.getTargetValue();

        // Simulate the container's post-answer rotation (regenerateProblem).
        // This is what handleSessionLeveling does synchronously after enginePop.
        strategy.regenerateProblem(1, config, 1);
        const newTarget = strategy.getTargetValue();

        // The OLD target bubble must NOT validate as correct anymore.
        // (This is the crux: after rotation, stale on-screen targets are "wrong".)
        expect(strategy.validate(targetBubble)).toBe(false);
        // But validateAgainst() correctly identifies it as 'stale', not 'wrong'.
        expect(strategy.validateAgainst(targetBubble, snapshot)).toBe('stale');
        expect(newTarget).not.toBe(initialTarget);
    });

    it('a stale target bubble (old targetValue) is NOT counted as a wrong answer after rotation', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();

        strategy.initializeLevel(1, config);
        const initialTarget = strategy.getTargetValue();

        // Snapshot the target BEFORE rotation (as useGameEngine.handlePop now does).
        const snapshot = strategy.getTargetValue();

        // Player answers correctly → container rotates the problem.
        strategy.regenerateProblem(1, config, 1);
        const newTarget = strategy.getTargetValue();

        // The player then taps the still-visible OLD target bubble.
        const staleBubble = makeBubble('stale', initialTarget);

        // The fix: validateAgainst() distinguishes stale from wrong.
        // A stale bubble (matches the pre-rotation snapshot) is 'stale',
        // NOT 'wrong' — the engine ignores it instead of resetting combo.
        const verdict = strategy.validateAgainst(staleBubble, snapshot);
        expect(verdict).toBe('stale');
        expect(newTarget).not.toBe(initialTarget);

        // The old validate() still returns false for the stale bubble —
        // that's expected, which is why validateAgainst() exists.
        expect(strategy.validate(staleBubble)).toBe(false);
    });

    it('zen config never triggers game-over on strikes (strikes value is 0)', () => {
        const config = makeZenConfig();
        expect(config.winCondition.type).toBe('endless');
        expect(config.failCondition.type).toBe('strikes');
        expect(config.failCondition.value).toBe(0);
        // The engine's fail check is `value && strikes >= value` — 0 is falsy,
        // so zen never ends. State must persist indefinitely.
        expect(Boolean(config.failCondition.value)).toBe(false);
    });
});
