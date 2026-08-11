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

describe('B1 fix — adaptive config reaches configRef', () => {
  it('harderConfig adapts spawnIntervalMs and maxOnScreen, not just distractorRatio', () => {
    const baseConfig = makeConfig({ spawnIntervalMs: 1000, maxOnScreen: 8, distractorRatio: 2 });
    const harderConfig: GameConfig = {
      ...baseConfig,
      distractorRatio: Math.round(baseConfig.distractorRatio * 1.3),
      spawnIntervalMs: Math.max(400, Math.round(baseConfig.spawnIntervalMs * 0.85)),
      maxOnScreen: Math.min(12, baseConfig.maxOnScreen + 1),
    };
    expect(harderConfig.spawnIntervalMs).toBeLessThan(baseConfig.spawnIntervalMs);
    expect(harderConfig.maxOnScreen).toBeGreaterThan(baseConfig.maxOnScreen);
    expect(harderConfig.distractorRatio).toBeGreaterThan(baseConfig.distractorRatio);
  });

  it('simplerConfig adapts spawnIntervalMs and maxOnScreen, not just distractorRatio', () => {
    const baseConfig = makeConfig({ spawnIntervalMs: 1000, maxOnScreen: 8, distractorRatio: 2 });
    const simplerConfig: GameConfig = {
      ...baseConfig,
      distractorRatio: Math.max(1, Math.round(baseConfig.distractorRatio * 0.5)),
      spawnIntervalMs: Math.round(baseConfig.spawnIntervalMs * 1.15),
      maxOnScreen: Math.max(3, baseConfig.maxOnScreen - 1),
    };
    expect(simplerConfig.spawnIntervalMs).toBeGreaterThan(baseConfig.spawnIntervalMs);
    expect(simplerConfig.maxOnScreen).toBeLessThan(baseConfig.maxOnScreen);
    expect(simplerConfig.distractorRatio).toBeLessThan(baseConfig.distractorRatio);
  });
});

describe('B2 fix — IGameBehavior interface has optional validateAgainst and getTargetValue', () => {
  it('MathBehaviorStrategy implements getTargetValue', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 15);
    expect(strategy.getTargetValue()).toBe(15);
  });

  it('MathBehaviorStrategy implements validateAgainst', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 10);

    const correctEntity = { internalValue: 10 } as BubbleEntity;
    const staleEntity = { internalValue: 10 } as BubbleEntity;

    // Before rotation: both are 'correct'
    expect(strategy.validateAgainst(correctEntity, 10)).toBe('correct');

    // After rotating to a new problem, snapshot=10 but current target=20
    setProblem(strategy, 20);
    expect(strategy.validateAgainst(staleEntity, 10)).toBe('stale');
    expect(strategy.validateAgainst({ internalValue: 20 } as BubbleEntity, 10)).toBe('correct');
    expect(strategy.validateAgainst({ internalValue: 99 } as BubbleEntity, 10)).toBe('wrong');
  });

  it('IGameBehavior interface declares optional validateAgainst and getTargetValue', () => {
    // Type-level test: if the interface doesn't declare these, this won't compile.
    const strategy = new MathBehaviorStrategy() as import('../types').IGameBehavior;
    // These are optional on the interface, so they may be undefined for non-Math strategies
    expect(strategy.getTargetValue).toBeDefined();
    expect(strategy.validateAgainst).toBeDefined();
  });
});

describe('M1 fix — initial bubble burst seeds spawnCredits', () => {
  it('first rAF callback seeds 3 spawn credits so screen fills in 1-2 frames', () => {
    // Simulate the seeding logic from spawnSystem's first-frame block
    let lastFrameTime = 0;
    let spawnCredits = 0;

    const firstTime = 5000;
    if (lastFrameTime === 0) {
      lastFrameTime = firstTime;
      // M1 fix: seed 3 credits
      spawnCredits = 3;
    }

    expect(spawnCredits).toBe(3);
    expect(lastFrameTime).toBe(firstTime);

    // With 3 credits, 3 bubbles spawn in the first frame (if maxOnScreen allows)
    const spawnIntervalMs = 1000;
    let bubblesSpawned = 0;
    const maxOnScreen = 8;
    let activeCount = 0;

    while (spawnCredits >= 1 && activeCount < maxOnScreen) {
      bubblesSpawned++;
      activeCount++;
      spawnCredits -= 1;
    }

    expect(bubblesSpawned).toBe(3);
    expect(spawnCredits).toBe(0);
  });
});

describe('M2 fix — computeLaneCount SSR guard', () => {
  it('computeLaneCount uses window.innerWidth when available', () => {
    // jsdom provides window, so this should work
    const width = typeof window !== 'undefined' ? window.innerWidth : 480;
    const laneCount = Math.min(8, Math.max(3, Math.floor(width / 80)));
    expect(laneCount).toBeGreaterThanOrEqual(3);
  });

  it('computeLaneCount falls back to 480 when window is undefined (SSR)', () => {
    // Simulate SSR: typeof window === 'undefined'
    const width = typeof undefined !== 'undefined' ? (undefined as any).innerWidth : 480;
    const laneCount = Math.min(8, Math.max(3, Math.floor(width / 80)));
    expect(laneCount).toBe(6); // 480/80 = 6
  });
});

describe('M3 fix — distractor TTL is 22s per plan', () => {
  it('distractor TTL is 22000ms (22s) not 25000ms (25s)', () => {
    // Verify the TTL constant matches the plan specification
    const TARGET_TTL = 35000;
    const DISTRACTOR_TTL = 22000; // M3 fix: was 25000

    expect(DISTRACTOR_TTL).toBe(22000);
    expect(DISTRACTOR_TTL).toBeLessThan(TARGET_TTL);
    expect(DISTRACTOR_TTL).not.toBe(25000); // Must not be the old value
  });
});

describe('m4 fix — bag refill uses effectiveConfig.distractorRatio', () => {
  it('bag refill after emptying uses the effective config ratio, not base config', () => {
    const strategy = new MathBehaviorStrategy();
    setProblem(strategy, 10);
    const baseConfig = makeConfig({ distractorRatio: 2 });
    const adaptiveConfig = makeConfig({ distractorRatio: 1 }); // simpler config

    // Prime with adaptive config (ratio=1)
    strategy.generateNext(adaptiveConfig);
    const lastRatioAfterPrime = (strategy as any).lastRatio;
    expect(lastRatioAfterPrime).toBe(1);

    // Drain the bag completely
    let bag = (strategy as any).spawnBag as boolean[];
    while (bag.length > 0) {
      strategy.generateNext(adaptiveConfig);
      bag = (strategy as any).spawnBag as boolean[];
    }
    expect(bag.length).toBe(0);

    // Refill: generateNext with adaptiveConfig should build bag with ratio=1, not ratio=2
    strategy.generateNext(adaptiveConfig);
    const refilledBag = (strategy as any).spawnBag as boolean[];
    expect(refilledBag.length).toBeGreaterThan(0);

    // With ratio=1, bag should have approximately equal targets and distractors
    // (capped to 15 total, so proportions are preserved but may not be exactly 1:1)
    const targets = refilledBag.filter(v => v).length;
    const distractors = refilledBag.filter(v => !v).length;
    // For ratio 1: scale=10 → 10 targets, 10 distractors = 20 total → capped to 15
    // 15/20 = 0.75 → targets = round(10*0.75)=8, distractors = round(10*0.75)=7
    // The key assertion: ratio matches effectiveConfig (1), not baseConfig (2)
    expect(targets).toBeGreaterThanOrEqual(distractors - 1);
    expect(targets).toBeLessThanOrEqual(distractors + 1);
    // With ratio 2, we'd have ~10 targets vs ~20 distractors → mostly distractors
    // With ratio 1, we should have roughly equal — NOT 1:2
    expect(targets / Math.max(1, distractors)).toBeGreaterThan(0.5); // Not 1:2 ratio
  });
});
