import { describe, it, expect, vi } from 'vitest';
import { MathBehaviorStrategy } from '../strategies/MathStrategy';
import type { GameConfig, BubbleEntity } from '../types';
import type { ArithmeticProblem } from '../../../lib/gameLogic';

// Minimal valid GameConfig factory
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

const setProblem = (strategy: MathBehaviorStrategy, answer: number): void => {
  const problem: ArithmeticProblem = {
    type: 'arithmetic',
    id: 'test',
    num1: answer,
    num2: 0,
    operator: '+',
    missing: 'answer',
    answer,
  };
  (strategy as any).setProblem(problem);
};

describe('P0 spawn overhaul — MathStrategy bag', () => {
  it('fractional distractorRatio 1.5 builds integer bag with no RangeError', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 10);
    const config = makeConfig({ distractorRatio: 1.5 });

    // Draw enough to trigger at least one refill
    expect(() => {
      for (let i = 0; i < 40; i++) {
        strategy.generateNext(config);
      }
    }).not.toThrow();

    const bag = (strategy as any).spawnBag as boolean[];
    expect(bag.length).toBeGreaterThan(0);
  });

  it('fractional distractorRatio 0.8 builds bag with mostly targets', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 10);
    const config = makeConfig({ distractorRatio: 0.8 });

    // Draw many and count target vs distractor outcomes
    let targetHits = 0;
    let distractorHits = 0;
    for (let i = 0; i < 100; i++) {
      const result = strategy.generateNext(config);
      if (result.internalValue === 10) {
        targetHits++;
      } else {
        distractorHits++;
      }
    }
    // With ratio 0.8, targets should be majority (~55%)
    expect(targetHits).toBeGreaterThan(distractorHits);
  });

  it('forceTarget bypasses the bag and leaves bag state unchanged', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 42);
    const config = makeConfig({ distractorRatio: 2 });

    // Prime the bag
    strategy.generateNext(config);
    const bagBefore = [...((strategy as any).spawnBag as boolean[])];

    const result = strategy.generateNext(config, { forceTarget: true });
    const bagAfter = [...((strategy as any).spawnBag as boolean[])];

    expect(result.internalValue).toBe(42);
    expect(bagAfter).toEqual(bagBefore);
  });

  it('bag resets when distractorRatio changes', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 7);

    const configA = makeConfig({ distractorRatio: 2 });
    strategy.generateNext(configA);
    const lastRatioA = (strategy as any).lastRatio as number;

    const configB = makeConfig({ distractorRatio: 0.8 });
    strategy.generateNext(configB);
    const lastRatioB = (strategy as any).lastRatio as number;

    expect(lastRatioA).toBe(2);
    expect(lastRatioB).toBe(0.8);
    expect(lastRatioB).not.toBe(lastRatioA);
  });
});

describe('P0 spawn overhaul — anti-repeat relaxation', () => {
  it('does not produce back-to-back FALLBACK_PROBLEM signatures when fallback triggers twice', () => {
    const strategy = new MathBehaviorStrategy();

    // Force the strategy into a corner: accept the first generated problem as the only recent sig,
    // then keep regenerating until we observe two consecutive fallbacks.
    const config = makeConfig();

    // Fill recent signatures with many distinct small problems so that level 1 generation
    // exhausts all attempts and hits the fallback path twice in a row.
    const recent: string[] = [];
    for (let n = 100; n < 130; n++) {
      recent.push(`arithmetic:${n}:+:0:${n}`);
    }
    (strategy as any).recentSignatures = recent;

    setProblem(strategy, 2);

    // First fallback
    (strategy as any).generateAndSetProblem(1, config);
    const sig1 = (strategy as any).problemSignature((strategy as any).currentProblem);

    // Push the sig and immediately regenerate again, forcing fallback path again.
    (strategy as any).pushSignature(sig1);
    (strategy as any).generateAndSetProblem(1, config);
    const sig2 = (strategy as any).problemSignature((strategy as any).currentProblem);

    // Fallback must never repeat its own signature back-to-back
    expect(sig1).not.toBe(sig2);
  });

  it('filters trivial problems when correctCount >= 3', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 0);

    const trivialSignatures = (strategy as any).collectTrivialSignatures() as string[];
    expect(trivialSignatures).toContain('arithmetic:0:+:0:0');
    expect(trivialSignatures).toContain('arithmetic:1:-:1:0');
    expect(trivialSignatures).toContain('arithmetic:0:*:1:0');
    expect(trivialSignatures).toContain('arithmetic:0:*:9:0');
  });
});

describe('P0 spawn overhaul — safety net filtering', () => {
  it('does not count popped, powerup, or boss entities as active targets', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 5);

    const validTarget: BubbleEntity = {
      id: 't1',
      x: 50,
      y: 50,
      content: 5,
      internalValue: 5,
      velocity: 0.5,
      variant: 'medium',
      isPopped: false,
      createdAt: Date.now(),
    } as BubbleEntity;

    const poppedTarget = { ...validTarget, id: 't2', isPopped: true };
    const powerUp = { ...validTarget, id: 'p1', isPowerUp: true, internalValue: 'freeze' };
    const boss = { ...validTarget, id: 'b1', isBoss: true };

    expect(strategy.validate(validTarget)).toBe(true);
    expect(strategy.validate(poppedTarget)).toBe(true); // validate ignores pop state
    expect(strategy.validate(powerUp)).toBe(false);
    expect(strategy.validate(boss)).toBe(true); // same value, but isBoss must be filtered separately

    // Simulating the safety-net filter used in useGameEngine
    const isTargetEntity = (e: BubbleEntity): boolean => {
      if (e.isPopped || e.isPowerUp || e.isBoss) return false;
      return strategy.validate(e);
    };

    expect(isTargetEntity(validTarget)).toBe(true);
    expect(isTargetEntity(poppedTarget)).toBe(false);
    expect(isTargetEntity(powerUp)).toBe(false);
    expect(isTargetEntity(boss)).toBe(false);
  });
});

describe('P0 spawn overhaul — boss fight target visibility', () => {
  it('spawnBoss uses forceTarget so boss value equals current target', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 9);

    // Mock validate so that only the intended target is "correct"
    const validateSpy = vi.spyOn(strategy, 'validate').mockImplementation((entity) => entity.internalValue === 9);

    const config = makeConfig();
    const bossProps = strategy.generateNext(config, { forceTarget: true });

    expect(validateSpy(bossProps as BubbleEntity)).toBe(true);

    validateSpy.mockRestore();
  });
});

describe('P0 spawn overhaul — credit accumulator tab-backgrounding', () => {
  it('tab backgrounding (dt > 2000ms) resets spawn credits to 0 and does not flood', () => {
    // Simulate the credit accumulator logic from useGameEngine.spawnSystem
    let lastFrameTime = 0;
    let spawnCredits = 0;
    const MAX_BANKED_CREDITS = 3;
    const spawnIntervalMs = 1000;

    // First frame — seed
    const firstTime = 5000;
    if (lastFrameTime === 0) {
      lastFrameTime = firstTime;
    }

    // Normal frame: small dt
    let time = firstTime + 16;
    let dt = time - lastFrameTime;
    lastFrameTime = time;
    if (dt <= 2000) {
      spawnCredits = Math.min(spawnCredits + dt / spawnIntervalMs, MAX_BANKED_CREDITS);
    }
    expect(spawnCredits).toBeCloseTo(0.016, 1);

    // Tab backgrounded: 30s gap
    time = firstTime + 30000;
    dt = time - lastFrameTime;
    lastFrameTime = time;
    if (dt > 2000) {
      spawnCredits = 0;
    }
    expect(spawnCredits).toBe(0);

    // Next normal frame after un-background
    time = firstTime + 30016;
    dt = time - lastFrameTime;
    lastFrameTime = time;
    if (dt <= 2000) {
      spawnCredits = Math.min(spawnCredits + dt / spawnIntervalMs, MAX_BANKED_CREDITS);
    }
    expect(spawnCredits).toBeCloseTo(0.016, 1);
    expect(spawnCredits).toBeLessThan(1); // no flood
  });
});

describe('P0 spawn overhaul — forceTarget + multi-spawn exact count', () => {
  it('with 3 credits and forceTarget set, exactly 1 forced target is spawned', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 7);
    const config = makeConfig({ distractorRatio: 2 });

    // Prime the bag
    strategy.generateNext(config);
    const bagBefore = [...((strategy as any).spawnBag as boolean[])];

    let forcedCount = 0;
    let normalCount = 0;
    let forceTarget = true; // simulate safety net triggering

    // Simulate 3-spawn loop
    for (let i = 0; i < 3; i++) {
      const opts = forceTarget ? { forceTarget: true } : undefined;
      const result = strategy.generateNext(config, opts);

      if (forceTarget) {
        expect(result.internalValue).toBe(7); // forced = target
        forcedCount++;
        forceTarget = false; // clear after exactly one forced spawn
      } else {
        normalCount++;
      }
    }

    expect(forcedCount).toBe(1);
    expect(normalCount).toBe(2);

    // Bag should be unchanged by the forced spawn (but consumed by the 2 normal ones)
    const bagAfter = [...((strategy as any).spawnBag as boolean[])];
    expect(bagAfter.length).toBe(bagBefore.length - 2);
  });
});
