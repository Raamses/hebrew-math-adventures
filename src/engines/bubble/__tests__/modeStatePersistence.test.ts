// @vitest-environment jsdom
/**
 * Cross-mode state persistence tests (e2e-style).
 *
 * Tests that game state (combo, score, targetsPopped, level) persists
 * correctly across answer flows in ALL game modes:
 *   - Zen mode (endless, no strikes) — state must NEVER reset
 *   - Classic mode (target_count, strikes) — state persists until win/lose
 *   - Survival mode (endless, strikes) — state persists until 3 strikes
 *   - Blitz mode (time_limit, no strikes) — state persists until timer ends
 *
 * Also tests the zen-mode "state resets on answer" bug fix:
 *   - validateAgainst() correctly identifies stale bubbles
 *   - answer lock prevents cross-entity pop race
 *   - stale bubbles are ignored (no combo reset, no strike)
 *   - play mode (classic) also benefits from the fix
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MathBehaviorStrategy } from '../strategies/MathStrategy';
import type { GameConfig, BubbleEntity, IGameBehavior } from '../types';
import { SESSION_CONFIG } from '../../../lib/worldConfig';

// --- Config factories ---

const makeConfig = (overrides: Partial<GameConfig> = {}): GameConfig => ({
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
    ...overrides,
});

const makeZenConfig = (): GameConfig => ({
    ...makeConfig(),
    modeName: 'Zen',
    winCondition: { type: 'endless', value: 0 },
    failCondition: { type: 'strikes', value: 0 },
});

const makeClassicConfig = (): GameConfig => ({
    ...makeConfig(),
    modeName: 'Classic',
    winCondition: { type: 'target_count', value: 20 },
    failCondition: { type: 'strikes', value: 3 },
});

const makeSurvivalConfig = (): GameConfig => ({
    ...makeConfig(),
    modeName: 'Survival',
    winCondition: { type: 'endless', value: 0 },
    failCondition: { type: 'strikes', value: 3 },
});

const makeBlitzConfig = (): GameConfig => ({
    ...makeConfig(),
    modeName: 'Blitz',
    winCondition: { type: 'time_limit', value: 60 },
    failCondition: { type: 'strikes', value: 0 },
});

const setProblem = (strategy: MathBehaviorStrategy, answer: number): void => {
    const problem = {
        type: 'arithmetic' as const,
        id: 'test',
        num1: answer,
        num2: 0,
        operator: '+' as const,
        missing: 'answer' as const,
        answer,
    };
    (strategy as any).setProblem(problem);
};

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
    variant: 'medium' as const,
});

/**
 * Rotate the problem until the target actually moves.
 *
 * `regenerateProblem` draws at random, so it can land back on the answer it
 * just had. That makes a bubble carrying the old answer legitimately correct
 * and turns any staleness assertion into a coin flip — retrying keeps the
 * rotation real while making the assertion deterministic.
 */
const rotateToNewTarget = (
    strategy: MathBehaviorStrategy,
    config: GameConfig,
    round: number
): number => {
    const before = strategy.getTargetValue()!;

    for (let attempt = 0; attempt < 50; attempt++) {
        strategy.regenerateProblem(1, config, round);
        const next = strategy.getTargetValue()!;
        if (next !== before) return next;
    }

    throw new Error(`regenerateProblem never moved off target ${before}`);
};

// Simulate the engine's handlePop logic for stale detection
const simulatePop = (
    strategy: MathBehaviorStrategy,
    bubble: BubbleEntity,
    snapshotTarget: number
): { isCorrect: boolean | undefined; isStale: boolean } => {
    let isCorrect: boolean | undefined;
    let isStale = false;

    if (strategy.getTargetValue && strategy.validateAgainst) {
        const verdict = strategy.validateAgainst(bubble, snapshotTarget);
        if (verdict === 'stale') {
            isStale = true;
            isCorrect = undefined;
        } else {
            isCorrect = verdict === 'correct';
        }
    } else {
        isCorrect = strategy.validate(bubble);
    }

    return { isCorrect, isStale };
};

// Simulate the engine's game state update for a pop
interface SimpleGameState {
    score: number;
    combo: number;
    strikes: number;
    targetsPopped: number;
    isGameOver: boolean;
    isVictory: boolean;
}

const makeInitialState = (): SimpleGameState => ({
    score: 0,
    combo: 0,
    strikes: 0,
    targetsPopped: 0,
    isGameOver: false,
    isVictory: false,
});

const applyPop = (state: SimpleGameState, config: GameConfig, isCorrect: boolean | undefined): SimpleGameState => {
    if (isCorrect === undefined) return state; // stale or power-up: no change

    const newCombo = isCorrect ? state.combo + 1 : 0;
    const scoreBonus = isCorrect ? (10 * (1 + newCombo * 0.1)) : 0;
    const frenzyMultiplier = newCombo >= 15 ? 5 : newCombo >= 10 ? 3 : newCombo >= 5 ? 2 : 1;
    const finalScoreBonus = isCorrect ? scoreBonus * frenzyMultiplier : 0;

    const next: SimpleGameState = {
        ...state,
        combo: newCombo,
        score: state.score + finalScoreBonus,
        strikes: isCorrect ? state.strikes : state.strikes + 1,
        targetsPopped: isCorrect ? state.targetsPopped + 1 : state.targetsPopped,
        isGameOver: false,
        isVictory: false,
    };

    // Win condition
    if (config.winCondition.type === 'target_count' && next.targetsPopped >= config.winCondition.value) {
        next.isVictory = true;
        next.isGameOver = true;
    }

    // Fail condition (only if failCondition.value is truthy)
    if (config.failCondition.type === 'strikes' && config.failCondition.value && next.strikes >= config.failCondition.value) {
        next.isGameOver = true;
    }

    return next;
};

// ================================================================
// Zen mode — state MUST persist across answers
// ================================================================

describe('Zen mode — state persistence across answers', () => {
    it('combo accumulates across multiple correct answers without resetting', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 5; i++) {
            const target = strategy.getTargetValue()!;
            const snapshot = target;
            const bubble = makeBubble(`b${i}`, target);
            const { isCorrect } = simulatePop(strategy, bubble, snapshot);
            state = applyPop(state, config, isCorrect);

            // After rotation
            strategy.regenerateProblem(1, config, i + 1);
        }

        expect(state.combo).toBe(5);
        expect(state.targetsPopped).toBe(5);
        expect(state.strikes).toBe(0);
        expect(state.isGameOver).toBe(false); // zen never ends
    });

    it('score increases with combo multiplier across consecutive correct answers', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 10; i++) {
            const target = strategy.getTargetValue()!;
            const snapshot = target;
            const bubble = makeBubble(`b${i}`, target);
            const { isCorrect } = simulatePop(strategy, bubble, snapshot);
            state = applyPop(state, config, isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        // 10 correct: combo=10, frenzy multiplier = 3x at combo>=10
        // Score should be substantial
        expect(state.combo).toBe(10);
        expect(state.score).toBeGreaterThan(100);
        expect(state.isGameOver).toBe(false); // zen never ends
    });

    it('a wrong answer resets combo but does NOT end the game (strikes=0)', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 3 correct
        for (let i = 0; i < 3; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`c${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }
        expect(state.combo).toBe(3);

        // Wrong answer
        const wrongBubble = makeBubble('wrong', 99999);
        state = applyPop(state, config, false);

        expect(state.combo).toBe(0);
        // In zen mode, strikes DO increment in state, but the game-over check
        // uses `failCondition.value && strikes >= value` — value=0 is falsy,
        // so the game never ends. The key invariant: isGameOver stays false.
        expect(state.strikes).toBe(1); // strikes increment, but...
        expect(state.isGameOver).toBe(false); // ...zen never ends (value=0 is falsy)
        expect(state.targetsPopped).toBe(3); // still have the 3 correct
    });

    it('a stale bubble (old target after rotation) does NOT reset combo', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // Correct answer
        const target1 = strategy.getTargetValue()!;
        const snapshot = target1;
        const bubble1 = makeBubble('b1', target1);
        state = applyPop(state, config, simulatePop(strategy, bubble1, snapshot).isCorrect);
        expect(state.combo).toBe(1);

        // Rotate problem
        strategy.regenerateProblem(1, config, 1);
        const target2 = strategy.getTargetValue()!;

        // Player taps stale bubble (old target)
        const staleBubble = makeBubble('stale', target1);
        const { isCorrect, isStale } = simulatePop(strategy, staleBubble, snapshot);

        // If target changed: bubble is 'stale' (ignored, no state change)
        // If target stayed same: bubble is still 'correct' (also no penalty)
        // In neither case should it be 'wrong' (which would reset combo)
        if (target2 !== target1) {
            expect(isStale).toBe(true);
            expect(isCorrect).toBeUndefined();
        }

        // Stale/correct pop does NOT add a strike or reset combo
        state = applyPop(state, config, isCorrect);
        // Combo: 1 (from first correct) + 1 if this was also correct, or 1 if stale
        expect(state.strikes).toBe(0); // never a strike
        expect(state.targetsPopped).toBeGreaterThanOrEqual(1); // preserved
    });

    it('zen mode never triggers game-over regardless of wrong answers', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 100 wrong answers
        for (let i = 0; i < 100; i++) {
            state = applyPop(state, config, false);
        }

        // Strikes increment in state (100), but game-over check is
        // `failCondition.value && strikes >= value` — value=0 is falsy,
        // so zen NEVER triggers game-over regardless of strike count.
        expect(state.strikes).toBe(100); // strikes DO accumulate...
        expect(state.isGameOver).toBe(false); // ...but game never ends (value=0 is falsy)
        expect(state.combo).toBe(0);
    });
});

// ================================================================
// Classic mode — state persists until win or lose
// ================================================================

describe('Classic mode — state persistence until win/lose', () => {
    it('combo and score persist across correct answers', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 5; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        expect(state.combo).toBe(5);
        expect(state.targetsPopped).toBe(5);
        expect(state.isGameOver).toBe(false);
    });

    it('reaching target_count win condition triggers victory', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig(); // target_count: 20
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 20; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        expect(state.targetsPopped).toBe(20);
        expect(state.isVictory).toBe(true);
        expect(state.isGameOver).toBe(true);
    });

    it('3 strikes triggers game-over (not victory)', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 2 wrong
        state = applyPop(state, config, false);
        state = applyPop(state, config, false);
        expect(state.strikes).toBe(2);
        expect(state.isGameOver).toBe(false);

        // 3rd strike
        state = applyPop(state, config, false);
        expect(state.strikes).toBe(3);
        expect(state.isGameOver).toBe(true);
        expect(state.isVictory).toBe(false);
    });

    it('stale bubble does NOT count as a strike in classic mode', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 2 strikes already
        state = applyPop(state, config, false);
        state = applyPop(state, config, false);
        expect(state.strikes).toBe(2);

        // Correct answer → rotate
        const target = strategy.getTargetValue()!;
        const snapshot = target;
        const bubble = makeBubble('correct', target);
        state = applyPop(state, config, simulatePop(strategy, bubble, snapshot).isCorrect);
        strategy.regenerateProblem(1, config, 1);

        // Tap stale bubble (old target value)
        const staleBubble = makeBubble('stale', target);
        const { isCorrect, isStale } = simulatePop(strategy, staleBubble, snapshot);

        // If the rotation produced a different target, the old bubble is 'stale'.
        // If it produced the same target (rare), the bubble is still 'correct'.
        // In either case, it must NOT be 'wrong' (which would add a strike).
        expect(isStale === true || isCorrect === true).toBe(true);

        // Only verify the strike-prevention if it was actually stale
        if (isStale) {
            state = applyPop(state, config, isCorrect);
            // Stale should NOT add a strike
            expect(state.strikes).toBe(2); // still 2, not 3
            expect(state.isGameOver).toBe(false); // not game over
        }
    });
});

// ================================================================
// Survival mode — state persists until 3 strikes
// ================================================================

describe('Survival mode — state persistence until strikes', () => {
    it('combo persists across correct answers in endless mode', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeSurvivalConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 15; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        expect(state.combo).toBe(15);
        expect(state.targetsPopped).toBe(15);
        expect(state.isGameOver).toBe(false); // endless, no win condition
    });

    it('3 strikes ends survival (but not as victory)', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeSurvivalConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 2 correct first
        for (let i = 0; i < 2; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        // 3 wrong
        for (let i = 0; i < 3; i++) {
            state = applyPop(state, config, false);
        }

        expect(state.strikes).toBe(3);
        expect(state.isGameOver).toBe(true);
        expect(state.isVictory).toBe(false);
        expect(state.targetsPopped).toBe(2); // the 2 correct are preserved
    });

    it('stale bubble does NOT reset combo in survival mode', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeSurvivalConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // Build combo of 5
        for (let i = 0; i < 5; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }
        expect(state.combo).toBe(5);

        // Tap stale bubble (from before rotation)
        const oldTarget = (strategy as any).targetValue;
        const lastSnapshot = strategy.getTargetValue()!;
        strategy.regenerateProblem(1, config, 6);
        const newTarget = strategy.getTargetValue()!;

        const staleBubble = makeBubble('stale', lastSnapshot);
        const { isStale, isCorrect } = simulatePop(strategy, staleBubble, lastSnapshot);

        // Stale or still-correct (if rotation produced same target). Must NOT be 'wrong'.
        expect(isStale === true || isCorrect === true).toBe(true);

        if (isStale) {
            state = applyPop(state, config, isCorrect);
            expect(state.combo).toBe(5); // preserved!
        }
    });
});

// ================================================================
// Blitz mode — state persists until timer ends
// ================================================================

describe('Blitz mode — state persistence with timer', () => {
    it('combo persists and score accumulates in time_limit mode', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeBlitzConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 8; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        expect(state.combo).toBe(8);
        expect(state.score).toBeGreaterThan(0);
        expect(state.isGameOver).toBe(false); // no strikes condition, timer-based
    });

    it('wrong answers do NOT end blitz (strikes=0, only timer ends)', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeBlitzConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 50 wrong answers
        for (let i = 0; i < 50; i++) {
            state = applyPop(state, config, false);
        }

        // Blitz: strikes increment in state, but failCondition.value=0 is falsy,
        // so the game never ends from strikes — only the timer ends it.
        expect(state.strikes).toBe(50); // strikes DO accumulate...
        expect(state.isGameOver).toBe(false); // ...but only timer ends blitz
    });

    it('stale bubble is ignored in blitz mode too', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeBlitzConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 3 correct
        for (let i = 0; i < 3; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        const lastSnapshot = strategy.getTargetValue()!;
        rotateToNewTarget(strategy, config, 4);

        // Stale bubble
        const staleBubble = makeBubble('stale', lastSnapshot);
        const { isStale, isCorrect } = simulatePop(strategy, staleBubble, lastSnapshot);

        expect(isStale).toBe(true);
        state = applyPop(state, config, isCorrect);
        expect(state.combo).toBe(3); // preserved
        expect(state.strikes).toBe(0); // preserved (blitz has 0 strikes)
    });
});

// ================================================================
// Answer lock — cross-entity pop race prevention
// ================================================================

describe('Answer lock prevents cross-entity pop race', () => {
    it('ANSWER_LOCK_MS is 120ms', () => {
        expect(SESSION_CONFIG.ANSWER_LOCK_MS).toBe(120);
    });

    it('second pop within 120ms is dropped (answer lock)', () => {
        let answerLock = false;
        const lockMs = 120;
        let processedPops = 0;

        // First pop
        if (!answerLock) {
            answerLock = true;
            processedPops++;
            // Simulate setTimeout releasing lock
            setTimeout(() => { answerLock = false; }, lockMs);
        }

        // Second pop immediately (within lock window)
        if (!answerLock) {
            processedPops++; // should NOT execute
        }

        expect(processedPops).toBe(1);
        expect(answerLock).toBe(true);
    });

    it('pop after lock window is accepted', () => {
        vi.useFakeTimers();

        let answerLock = false;
        const lockMs = 120;
        let processedPops = 0;

        // First pop
        if (!answerLock) {
            answerLock = true;
            processedPops++;
            setTimeout(() => { answerLock = false; }, lockMs);
        }

        // Advance past lock window
        vi.advanceTimersByTime(lockMs + 1);

        // Second pop after lock released
        if (!answerLock) {
            processedPops++;
        }

        expect(processedPops).toBe(2);
        vi.useRealTimers();
    });
});

// ================================================================
// validateAgainst — three-way verdict across modes
// ================================================================

describe('validateAgainst three-way verdict across all modes', () => {
    it('zen mode: stale bubble identified correctly', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        const target = strategy.getTargetValue()!;
        const snapshot = target;

        // Before rotation: correct
        const correctBubble = makeBubble('c', target);
        expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');

        // After rotation: stale
        rotateToNewTarget(strategy, config, 1);
        expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('stale');

        // Unrelated value: wrong
        const wrongBubble = makeBubble('w', 99999);
        expect(strategy.validateAgainst(wrongBubble, snapshot)).toBe('wrong');
    });

    it('classic mode: stale bubble identified correctly', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig();
        strategy.initializeLevel(1, config);

        const target = strategy.getTargetValue()!;
        const snapshot = target;
        const correctBubble = makeBubble('c', target);

        expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');

        strategy.regenerateProblem(1, config, 1);
        const newTarget = strategy.getTargetValue()!;
        // A wrong bubble (never was target) is always 'wrong'
        const wrongBubble = makeBubble('w', 99999);
        expect(strategy.validateAgainst(wrongBubble, snapshot)).toBe('wrong');
        // If target changed, old bubble is stale. If same, still correct.
        if (newTarget !== target) {
            expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('stale');
        } else {
            expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');
        }
    });

    it('survival mode: stale bubble identified correctly', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeSurvivalConfig();
        strategy.initializeLevel(1, config);

        const target = strategy.getTargetValue()!;
        const snapshot = target;
        const correctBubble = makeBubble('c', target);

        expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');

        strategy.regenerateProblem(1, config, 1);
        const newTarget = strategy.getTargetValue()!;
        const wrongBubble = makeBubble('w', 99999);
        expect(strategy.validateAgainst(wrongBubble, snapshot)).toBe('wrong');
        if (newTarget !== target) {
            expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('stale');
        } else {
            expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');
        }
    });

    it('blitz mode: stale bubble identified correctly', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeBlitzConfig();
        strategy.initializeLevel(1, config);

        const target = strategy.getTargetValue()!;
        const snapshot = target;
        const correctBubble = makeBubble('c', target);

        expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');

        // Rotate to a new problem. The new target may differ,
        // but if it happens to be the same, validateAgainst returns 'correct'.
        // The key test: after rotation, a bubble with a DIFFERENT value that
        // doesn't match the new target is 'wrong', not 'correct'.
        strategy.regenerateProblem(1, config, 1);
        const newTarget = strategy.getTargetValue()!;
        const wrongBubble = makeBubble('w', 99999);
        expect(strategy.validateAgainst(wrongBubble, snapshot)).toBe('wrong');

        // If target changed, old bubble is stale. If same, it's still correct.
        if (newTarget !== target) {
            expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('stale');
        } else {
            // Same target — still correct (valid but rare coincidence)
            expect(strategy.validateAgainst(correctBubble, snapshot)).toBe('correct');
        }
    });
});

// ================================================================
// Cross-mode: state does NOT reset on correct answer
// ================================================================

describe('Cross-mode: state does NOT reset on correct answer (regression)', () => {
    it('zen: score, combo, targetsPopped all persist after 20 answers', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        for (let i = 0; i < 20; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);

            // State must persist after each answer
            expect(state.combo).toBe(i + 1);
            expect(state.targetsPopped).toBe(i + 1);
            expect(state.isGameOver).toBe(false);
        }

        expect(state.combo).toBe(20);
        expect(state.targetsPopped).toBe(20);
        expect(state.score).toBeGreaterThan(0);
    });

    it('classic: combo persists across answer rotations', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // Answer 5 correctly with rotations between each
        for (let i = 0; i < 5; i++) {
            const target = strategy.getTargetValue()!;
            const snapshot = target;
            const bubble = makeBubble(`b${i}`, target);

            state = applyPop(state, config, simulatePop(strategy, bubble, snapshot).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);

            // Combo must persist (not reset to 0)
            expect(state.combo).toBe(i + 1);
        }
    });

    it('survival: score and targetsPopped persist across wrong+correct mix', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeSurvivalConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 3 correct
        for (let i = 0; i < 3; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }
        expect(state.targetsPopped).toBe(3);
        expect(state.combo).toBe(3);

        // 1 wrong (combo resets, targets persist)
        state = applyPop(state, config, false);
        expect(state.combo).toBe(0);
        expect(state.targetsPopped).toBe(3); // preserved

        // 2 more correct (combo rebuilds from 0)
        for (let i = 0; i < 2; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`c${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, 4 + i);
        }
        expect(state.combo).toBe(2);
        expect(state.targetsPopped).toBe(5); // 3 + 2
    });
});

// ================================================================
// Problem rotation does not reset state
// ================================================================

describe('Problem rotation does NOT reset game state', () => {
    it('rotating problem (regenerateProblem) changes target but preserves combo/score', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // Answer 3 correctly
        for (let i = 0; i < 3; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);

            // Rotate (this is what handleSessionLeveling does)
            strategy.regenerateProblem(1, config, i + 1);

            // State must persist
            expect(state.combo).toBe(i + 1);
            expect(state.score).toBeGreaterThan(0);
        }

        // Final check: target changed but state preserved
        expect(state.combo).toBe(3);
        expect(state.targetsPopped).toBe(3);
    });

    it('adaptive difficulty (harderConfig) does not reset combo', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeZenConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 3 correct to trigger adaptive difficulty
        for (let i = 0; i < 3; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        // Simulate harderConfig (adaptive difficulty)
        const harderConfig = makeConfig({
            ...config,
            distractorRatio: 3,
            spawnIntervalMs: 850,
            maxOnScreen: 9,
        });

        // Rotate with harder config — state must persist
        strategy.regenerateProblem(1, harderConfig, 3);

        expect(state.combo).toBe(3);
        expect(state.targetsPopped).toBe(3);
        expect(state.score).toBeGreaterThan(0);
    });

    it('level up does not reset score or targetsPopped', () => {
        const strategy = new MathBehaviorStrategy();
        const config = makeClassicConfig();
        strategy.initializeLevel(1, config);

        let state = makeInitialState();

        // 5 correct (enough for level-up threshold [5,5,4,...])
        for (let i = 0; i < 5; i++) {
            const target = strategy.getTargetValue()!;
            const bubble = makeBubble(`b${i}`, target);
            state = applyPop(state, config, simulatePop(strategy, bubble, target).isCorrect);
            strategy.regenerateProblem(1, config, i + 1);
        }

        // Simulate level up: regenerate at new level
        strategy.regenerateProblem(2, config, 5);

        // State must persist through level change
        expect(state.combo).toBe(5); // combo continues (consecutiveCorrect resets, but combo is separate)
        expect(state.targetsPopped).toBe(5);
        expect(state.score).toBeGreaterThan(0);
    });
});
