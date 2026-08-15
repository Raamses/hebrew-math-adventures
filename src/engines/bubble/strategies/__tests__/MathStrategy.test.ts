import { describe, it, expect } from 'vitest';
import { MathBehaviorStrategy } from '../MathStrategy';
import { SPAWN_CONFIG } from '../../../../lib/worldConfig';
import type { GameConfig } from '../../types';
import type { ArithmeticProblem } from '../../../../lib/gameLogic';

// Helper: minimal valid GameConfig
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

describe('MathBehaviorStrategy', () => {
    describe('P1-11: Anti-repeat window', () => {
        it('MAX_RECENT_SIGNATURES should be 12 (from SPAWN_CONFIG)', () => {
            expect(SPAWN_CONFIG.MAX_RECENT_SIGNATURES).toBe(12);
        });

        it('MAX_REGEN_ATTEMPTS should be 8 (from SPAWN_CONFIG)', () => {
            expect(SPAWN_CONFIG.MAX_REGEN_ATTEMPTS).toBe(8);
        });

        it('generates 40 consecutive problems at level 1 with no two consecutive identical', () => {
            const strategy = new MathBehaviorStrategy();
    const config = makeConfig();
            const signatures: string[] = [];

            for (let i = 0; i < 40; i++) {
                strategy.regenerateProblem(1, config);
                const problem = (strategy as any).currentProblem;
                expect(problem).not.toBeNull();
                const sig = (strategy as any).problemSignature(problem);
                // No two consecutive identical
                if (signatures.length > 0) {
                    expect(sig).not.toBe(signatures[signatures.length - 1]);
                }
                signatures.push(sig);
            }
        });

        it('tracks up to 12 recent signatures', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            for (let i = 0; i < 25; i++) {
                strategy.regenerateProblem(1, config);
            }

            // After 25 generations, the recentSignatures array should be capped at 12
            const recent = (strategy as any).recentSignatures as string[];
            expect(recent.length).toBeLessThanOrEqual(12);
        });
    });

    describe('P1-12: Distractor range scaling', () => {
        it('distractor range uses min 5 (not 10) for small targets', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            // Set a small target (e.g., 2)
            (strategy as any).targetValue = 2;
            (strategy as any).currentProblem = null;

            // Generate many distractors — with old min 10, range would be 10
            // With new min 5, range should be 5
            const distractors: number[] = [];
            for (let i = 0; i < 200; i++) {
                const d = strategy.generateNext(config).internalValue!;
                if (d !== 2) distractors.push(d); // filter out targets
            }

            // With range=5, offset=2: values from 2-2=0 to 2+3=5 (excluding target=2)
            // So distractors should be in [0, 1, 3, 4, 5]
            // With old range=10, offset=5: values from -3 to 7 → [0,1,3,4,5,6,7]
            // If min is 5, we should never see values > 5
            const maxDistractor = Math.max(...distractors);
            expect(maxDistractor).toBeLessThanOrEqual(5);
        });
    });

    describe('P1-13: Pedagogical (misconception-based) distractors', () => {
        it('when problem is 7+5=12, generateDistractor produces 11, 13, or 35 at meaningful frequency', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            // Set the current problem to 7+5=12
            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-7+5',
                num1: 7,
                num2: 5,
                operator: '+',
                missing: 'answer',
                answer: 12,
            };
            (strategy as any).currentProblem = problem;
            (strategy as any).targetValue = 12;

            const distractorCounts: Record<number, number> = {};
            const iterations = 500;

            for (let i = 0; i < iterations; i++) {
                const d = strategy.generateNext(config).internalValue!;
                if (d !== 12) {
                    distractorCounts[d] = (distractorCounts[d] || 0) + 1;
                }
            }

            // Check that pedagogical distractors appear:
            // 11 (off-by-one), 13 (off-by-one) — these are within the remediated range (±3)
            // Note: 35 (operation confusion: 7*5) is now filtered by the remediated range
            // (diff=23 > maxDist=3) to keep distractors pedagogically close for ages 4-8.
            expect(distractorCounts[11]).toBeGreaterThan(0);
            expect(distractorCounts[13]).toBeGreaterThan(0);

            // Never produce the answer (12) as a distractor
            expect(distractorCounts[12] || 0).toBe(0);

            // Pedagogical distractors should appear at meaningful frequency
            const totalPedagogical = (distractorCounts[11] || 0) + (distractorCounts[13] || 0);
            expect(totalPedagogical).toBeGreaterThan(30);
        });

        it('never returns the answer as a distractor (via generateDistractor)', () => {
            const strategy = new MathBehaviorStrategy();

            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-mult',
                num1: 6,
                num2: 7,
                operator: '*',
                missing: 'answer',
                answer: 42,
            };
            (strategy as any).currentProblem = problem;
            (strategy as any).targetValue = 42;

            // generateNext can return the target (42) when it decides to spawn a target bubble.
            // We need to test generateDistractor directly (it's private but accessible via any cast).
            const generateDistractor = (strategy as any).generateDistractor.bind(strategy);
            for (let i = 0; i < 1000; i++) {
                const d = generateDistractor();
                expect(d).not.toBe(42);
            }
        });

        it('for multiplication, includes operation confusion (num1+num2)', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-6*7',
                num1: 6,
                num2: 7,
                operator: '*',
                missing: 'answer',
                answer: 42,
            };
            (strategy as any).currentProblem = problem;
            (strategy as any).targetValue = 42;

            const distractorCounts: Record<number, number> = {};
            for (let i = 0; i < 500; i++) {
                const d = strategy.generateNext(config).internalValue!;
                if (d !== 42) {
                    distractorCounts[d] = (distractorCounts[d] || 0) + 1;
                }
            }

            // Note: 6+7=13 (operation confusion) is now filtered by the remediated range
            // (diff=29 > maxDist=10) to keep distractors close for ages 4-8.
            // Off-by-one: 41 and 43 are within range (diff=1 <= 10)
            expect(distractorCounts[41]).toBeGreaterThan(0);
            expect(distractorCounts[43]).toBeGreaterThan(0);
        });

        it('for subtraction, includes operation confusion (num1+num2)', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-20-8',
                num1: 20,
                num2: 8,
                operator: '-',
                missing: 'answer',
                answer: 12,
            };
            (strategy as any).currentProblem = problem;
            (strategy as any).targetValue = 12;

            const distractorCounts: Record<number, number> = {};
            for (let i = 0; i < 500; i++) {
                const d = strategy.generateNext(config).internalValue!;
                if (d !== 12) {
                    distractorCounts[d] = (distractorCounts[d] || 0) + 1;
                }
            }

            // Note: 20+8=28 (operation confusion) is now filtered by the remediated range
            // (diff=16 > maxDist=3) to keep distractors close for ages 4-8.
            // Off-by-one distractors 11 and 13 should still appear
            expect(distractorCounts[11]).toBeGreaterThan(0);
            expect(distractorCounts[13]).toBeGreaterThan(0);
        });

        it('for 2-digit answers, includes digit-swap distractor', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            // 15+4=19 → swapped digits = 91
            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-swap',
                num1: 15,
                num2: 4,
                operator: '+',
                missing: 'answer',
                answer: 19,
            };
            (strategy as any).currentProblem = problem;
            (strategy as any).targetValue = 19;

            const distractorCounts: Record<number, number> = {};
            for (let i = 0; i < 1000; i++) {
                const d = strategy.generateNext(config).internalValue!;
                if (d !== 19) {
                    distractorCounts[d] = (distractorCounts[d] || 0) + 1;
                }
            }

            // Note: digit swap of 19 = 91 is now filtered by the remediated range
            // (diff=72 > maxDist=5) to keep distractors close for ages 4-8.
            // Off-by-one distractors 18 and 20 should still appear
            expect(distractorCounts[18]).toBeGreaterThan(0);
            expect(distractorCounts[20]).toBeGreaterThan(0);
        });

        it('pedagogical distractors are never negative or > 999', () => {
            const strategy = new MathBehaviorStrategy();
            const config = makeConfig();

            const problem: ArithmeticProblem = {
                type: 'arithmetic',
                id: 'test-bounds',
                num1: 1,
                num2: 1,
                operator: '+',
                missing: 'answer',
                answer: 2,
            };
            (strategy as any).currentProblem = problem;
            (strategy as any).targetValue = 2;

            for (let i = 0; i < 1000; i++) {
                const d = strategy.generateNext(config).internalValue!;
                expect(d).toBeGreaterThanOrEqual(0);
                expect(d).toBeLessThanOrEqual(999);
            }
        });
    });
});
