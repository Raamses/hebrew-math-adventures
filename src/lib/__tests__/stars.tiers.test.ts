/**
 * Exhaustive unit tests for star-tier reward logic.
 *
 * Covers all 3 tiers (PERFECT / GOOD / PASS) with explicit boundary-value
 * testing, null-result handling, and edge cases that the base stars.test.ts
 * only touches lightly.
 *
 * Card: 8ebe8c53-f8dc-4072-851b-86457a736f6e
 */
import { describe, it, expect } from 'vitest';
import {
    computeStarsByTier,
    getTier,
    tierToStars,
    STAR_TIERS,
    type StarTier,
    type PerformanceResult,
} from '../stars';

// ──────────────────────────────────────────────────────────────
// Helper: count mistakes from a PerformanceResult
// ──────────────────────────────────────────────────────────────
function mistakes(r: PerformanceResult): number {
    return r.attempts - r.correct;
}

// ──────────────────────────────────────────────────────────────
// 1. getTier — all three tiers + null
// ──────────────────────────────────────────────────────────────
describe('getTier — exhaustive tier coverage', () => {
    // ── PERFECT tier (≤ 1 mistake) ──────────────────────────────
    describe('PERFECT tier (≤ 1 mistake → 3 stars)', () => {
        it('returns PERFECT for 0 mistakes (flawless)', () => {
            expect(getTier({ correct: 1, attempts: 1 })).toBe('PERFECT');
            expect(getTier({ correct: 10, attempts: 10 })).toBe('PERFECT');
            expect(getTier({ correct: 100, attempts: 100 })).toBe('PERFECT');
        });

        it('returns PERFECT for exactly 1 mistake (upper boundary)', () => {
            expect(getTier({ correct: 0, attempts: 1 })).toBe('PERFECT');
            expect(getTier({ correct: 9, attempts: 10 })).toBe('PERFECT');
            expect(getTier({ correct: 99, attempts: 100 })).toBe('PERFECT');
        });

        it('PERFECT boundary: 1 mistake → PERFECT, 2 mistakes → GOOD', () => {
            // This is the critical boundary between PERFECT and GOOD
            expect(getTier({ correct: 9, attempts: 10 })).toBe('PERFECT');  // 1 mistake
            expect(getTier({ correct: 8, attempts: 10 })).toBe('GOOD');      // 2 mistakes
        });
    });

    // ── GOOD tier (2–3 mistakes) ────────────────────────────────
    describe('GOOD tier (2–3 mistakes → 2 stars)', () => {
        it('returns GOOD for exactly 2 mistakes (lower boundary)', () => {
            expect(getTier({ correct: 0, attempts: 2 })).toBe('GOOD');
            expect(getTier({ correct: 8, attempts: 10 })).toBe('GOOD');
            expect(getTier({ correct: 98, attempts: 100 })).toBe('GOOD');
        });

        it('returns GOOD for exactly 3 mistakes (upper boundary)', () => {
            expect(getTier({ correct: 0, attempts: 3 })).toBe('GOOD');
            expect(getTier({ correct: 7, attempts: 10 })).toBe('GOOD');
            expect(getTier({ correct: 97, attempts: 100 })).toBe('GOOD');
        });

        it('GOOD boundary: 3 mistakes → GOOD, 4 mistakes → PASS', () => {
            // This is the critical boundary between GOOD and PASS
            expect(getTier({ correct: 7, attempts: 10 })).toBe('GOOD');   // 3 mistakes
            expect(getTier({ correct: 6, attempts: 10 })).toBe('PASS');    // 4 mistakes
        });
    });

    // ── PASS tier (> 3 mistakes) ────────────────────────────────
    describe('PASS tier (> 3 mistakes → 1 star)', () => {
        it('returns PASS for exactly 4 mistakes (lower boundary)', () => {
            expect(getTier({ correct: 0, attempts: 4 })).toBe('PASS');
            expect(getTier({ correct: 6, attempts: 10 })).toBe('PASS');
            expect(getTier({ correct: 96, attempts: 100 })).toBe('PASS');
        });

        it('returns PASS for many mistakes', () => {
            expect(getTier({ correct: 1, attempts: 100 })).toBe('PASS');
            expect(getTier({ correct: 0, attempts: 50 })).toBe('PASS');
            expect(getTier({ correct: 0, attempts: 1000 })).toBe('PASS');
        });

        it('returns PASS when every single attempt is wrong', () => {
            expect(getTier({ correct: 0, attempts: 5 })).toBe('PASS');
            expect(getTier({ correct: 0, attempts: 99 })).toBe('PASS');
        });
    });
});

// ──────────────────────────────────────────────────────────────
// 2. getTier — null result (no attempt data)
// ──────────────────────────────────────────────────────────────
describe('getTier — null result edge cases', () => {
    it('returns null when attempts is 0 (no data)', () => {
        expect(getTier({ correct: 0, attempts: 0 })).toBeNull();
    });

    it('returns null even if correct > 0 but attempts is 0 (paradoxical input)', () => {
        // Defensive: correct without attempts shouldn't happen, but shouldn't crash
        expect(getTier({ correct: 5, attempts: 0 })).toBeNull();
    });

    it('returns null for attempts = 0 regardless of correct value', () => {
        expect(getTier({ correct: 0, attempts: 0 })).toBeNull();
        expect(getTier({ correct: 100, attempts: 0 })).toBeNull();
    });

    it('does NOT return null when attempts = 1 (minimum valid data)', () => {
        expect(getTier({ correct: 0, attempts: 1 })).not.toBeNull();
        expect(getTier({ correct: 1, attempts: 1 })).not.toBeNull();
    });
});

// ──────────────────────────────────────────────────────────────
// 3. getTier — boundary value table (systematic)
// ──────────────────────────────────────────────────────────────
describe('getTier — systematic boundary value table', () => {
    // Test every mistake count from 0 to 6 with a base of 10 attempts
    const cases: Array<{ mistakes: number; expected: StarTier | null }> = [
        { mistakes: 0, expected: 'PERFECT' },
        { mistakes: 1, expected: 'PERFECT' },
        { mistakes: 2, expected: 'GOOD' },
        { mistakes: 3, expected: 'GOOD' },
        { mistakes: 4, expected: 'PASS' },
        { mistakes: 5, expected: 'PASS' },
        { mistakes: 6, expected: 'PASS' },
    ];

    for (const { mistakes: m, expected } of cases) {
        it(`attempts=10, mistakes=${m} → ${expected}`, () => {
            const result = { correct: 10 - m, attempts: 10 };
            expect(mistakes(result)).toBe(m);
            expect(getTier(result)).toBe(expected);
        });
    }

    // Also test with a different base size to ensure scale-independence
    const smallCases: Array<{ mistakes: number; expected: StarTier | null }> = [
        { mistakes: 0, expected: 'PERFECT' },
        { mistakes: 1, expected: 'PERFECT' },
        { mistakes: 2, expected: 'GOOD' },
        { mistakes: 3, expected: 'GOOD' },
        { mistakes: 4, expected: 'PASS' },
    ];

    for (const { mistakes: m, expected } of smallCases) {
        it(`attempts=5, mistakes=${m} → ${expected} (scale check)`, () => {
            const result = { correct: 5 - m, attempts: 5 };
            expect(getTier(result)).toBe(expected);
        });
    }
});

// ──────────────────────────────────────────────────────────────
// 4. tierToStars — exhaustive mapping
// ──────────────────────────────────────────────────────────────
describe('tierToStars — exhaustive tier → star mapping', () => {
    it('maps every StarTier to the correct star count', () => {
        const expected: Record<StarTier, number> = {
            PERFECT: 3,
            GOOD: 2,
            PASS: 1,
        };
        for (const tier of STAR_TIERS as StarTier[]) {
            expect(tierToStars(tier)).toBe(expected[tier]);
        }
    });

    it('star values are strictly descending by tier order', () => {
        const stars = STAR_TIERS.map(t => tierToStars(t as StarTier));
        for (let i = 0; i < stars.length - 1; i++) {
            expect(stars[i]).toBeGreaterThan(stars[i + 1]);
        }
    });

    it('always returns a value in [1, 3]', () => {
        for (const tier of STAR_TIERS as StarTier[]) {
            const s = tierToStars(tier);
            expect(s).toBeGreaterThanOrEqual(1);
            expect(s).toBeLessThanOrEqual(3);
        }
    });
});

// ──────────────────────────────────────────────────────────────
// 5. computeStarsByTier — full tier coverage + edge cases
// ──────────────────────────────────────────────────────────────
describe('computeStarsByTier — full tier + edge case coverage', () => {
    // ── 3-star (PERFECT) ─────────────────────────────────────────
    describe('3 stars (PERFECT tier)', () => {
        it('3 stars for 0 mistakes with 1 attempt (minimum PERFECT)', () => {
            expect(computeStarsByTier(1, 1)).toBe(3);
        });

        it('3 stars for 0 mistakes with many attempts', () => {
            expect(computeStarsByTier(50, 50)).toBe(3);
            expect(computeStarsByTier(1000, 1000)).toBe(3);
        });

        it('3 stars for exactly 1 mistake (PERFECT upper boundary)', () => {
            expect(computeStarsByTier(0, 1)).toBe(3);   // 1 attempt, 1 mistake
            expect(computeStarsByTier(49, 50)).toBe(3);  // 50 attempts, 1 mistake
        });

        it('boundary: 1 mistake → 3 stars, 2 mistakes → 2 stars', () => {
            expect(computeStarsByTier(9, 10)).toBe(3);  // 1 mistake
            expect(computeStarsByTier(8, 10)).toBe(2);  // 2 mistakes
        });
    });

    // ── 2-star (GOOD) ────────────────────────────────────────────
    describe('2 stars (GOOD tier)', () => {
        it('2 stars for exactly 2 mistakes (GOOD lower boundary)', () => {
            expect(computeStarsByTier(0, 2)).toBe(2);
            expect(computeStarsByTier(8, 10)).toBe(2);
        });

        it('2 stars for exactly 3 mistakes (GOOD upper boundary)', () => {
            expect(computeStarsByTier(0, 3)).toBe(2);
            expect(computeStarsByTier(7, 10)).toBe(2);
        });

        it('boundary: 3 mistakes → 2 stars, 4 mistakes → 1 star', () => {
            expect(computeStarsByTier(7, 10)).toBe(2);  // 3 mistakes
            expect(computeStarsByTier(6, 10)).toBe(1);  // 4 mistakes
        });
    });

    // ── 1-star (PASS) ───────────────────────────────────────────
    describe('1 star (PASS tier)', () => {
        it('1 star for exactly 4 mistakes (PASS lower boundary)', () => {
            expect(computeStarsByTier(0, 4)).toBe(1);
            expect(computeStarsByTier(6, 10)).toBe(1);
        });

        it('1 star for many mistakes', () => {
            expect(computeStarsByTier(1, 100)).toBe(1);
            expect(computeStarsByTier(0, 999)).toBe(1);
        });

        it('1 star is the minimum (never 0)', () => {
            expect(computeStarsByTier(0, 1)).toBe(3);  // 1 mistake = PERFECT, not 0
            expect(computeStarsByTier(0, 10000)).toBe(1);  // worst case = 1
        });
    });

    // ── Null / no-data edge cases ────────────────────────────────
    describe('null result (no attempt data)', () => {
        it('defaults to 1 star (PASS) when attempts = 0 and correct = 0', () => {
            expect(computeStarsByTier(0, 0)).toBe(1);
        });

        it('defaults to 1 star even if correct > 0 but attempts = 0', () => {
            // Paradoxical: correct without attempts. Should still give 1 star.
            expect(computeStarsByTier(5, 0)).toBe(1);
            expect(computeStarsByTier(100, 0)).toBe(1);
        });

        it('getTier returns null but computeStarsByTier still returns 1', () => {
            const result: PerformanceResult = { correct: 0, attempts: 0 };
            expect(getTier(result)).toBeNull();
            expect(computeStarsByTier(result.correct, result.attempts)).toBe(1);
        });
    });

    // ── Single-attempt edge cases ──────────────────────────────
    describe('single-attempt scenarios', () => {
        it('1 correct / 1 attempt → PERFECT (3 stars)', () => {
            expect(computeStarsByTier(1, 1)).toBe(3);
        });

        it('0 correct / 1 attempt → PERFECT (1 mistake, 3 stars)', () => {
            // 1 mistake is still PERFECT tier
            expect(computeStarsByTier(0, 1)).toBe(3);
        });
    });

    // ── Scale invariance ────────────────────────────────────────
    describe('scale invariance', () => {
        it('same mistake ratio produces same tier regardless of total attempts', () => {
            // 0% mistake rate → PERFECT
            expect(computeStarsByTier(5, 5)).toBe(3);
            expect(computeStarsByTier(100, 100)).toBe(3);

            // 10% mistake rate with 10 attempts = 1 mistake → PERFECT
            // 10% mistake rate with 100 attempts = 10 mistakes → PASS
            // (This documents that the tier is mistake-COUNT based, not ratio based)
            expect(computeStarsByTier(9, 10)).toBe(3);    // 1 mistake
            expect(computeStarsByTier(90, 100)).toBe(1); // 10 mistakes
        });

        it('large attempt counts at boundaries work correctly', () => {
            expect(computeStarsByTier(999999, 1000000)).toBe(3);  // 1 mistake
            expect(computeStarsByTier(999998, 1000000)).toBe(2);  // 2 mistakes
            expect(computeStarsByTier(999997, 1000000)).toBe(2);  // 3 mistakes
            expect(computeStarsByTier(999996, 1000000)).toBe(1);  // 4 mistakes
        });
    });

    // ── Round-trip consistency ──────────────────────────────────
    describe('round-trip consistency: computeStarsByTier ↔ getTier ↔ tierToStars', () => {
        const testResults: PerformanceResult[] = [
            { correct: 0, attempts: 0 },   // null → default PASS
            { correct: 1, attempts: 1 },   // PERFECT
            { correct: 0, attempts: 1 },   // PERFECT (1 mistake)
            { correct: 0, attempts: 2 },   // GOOD
            { correct: 0, attempts: 3 },   // GOOD
            { correct: 0, attempts: 4 },   // PASS
            { correct: 5, attempts: 5 },   // PERFECT
            { correct: 3, attempts: 6 },   // GOOD (3 mistakes)
            { correct: 2, attempts: 6 },   // PASS (4 mistakes)
            { correct: 10, attempts: 10 }, // PERFECT
        ];

        for (const r of testResults) {
            it(`consistency for correct=${r.correct}, attempts=${r.attempts}`, () => {
                const tier = getTier(r);
                const expectedStars = tier ? tierToStars(tier) : tierToStars('PASS');
                expect(computeStarsByTier(r.correct, r.attempts)).toBe(expectedStars);
            });
        }
    });

    // ── Negative input edge cases ───────────────────────────────
    describe('negative / invalid input handling', () => {
        it('handles negative attempts gracefully (treats as no data → null tier)', () => {
            // attempts <= 0 → null tier → 1 star default
            expect(getTier({ correct: 0, attempts: -1 })).toBeNull();
            expect(computeStarsByTier(0, -1)).toBe(1);
        });

        it('handles negative correct (more wrong than attempts would suggest)', () => {
            // This shouldn't happen in practice, but we test it doesn't crash.
            // correct=-1, attempts=5 → mistakes = 5 - (-1) = 6 → PASS
            // (negative correct inflates mistake count beyond real)
            const tier = getTier({ correct: -1, attempts: 5 });
            expect(tier).toBe('PASS');
        });

        it('handles correct > attempts (impossible but defensive)', () => {
            // correct > attempts → negative mistakes → treated as PERFECT
            // because mistakes = attempts - correct < 0 ≤ 1
            const tier = getTier({ correct: 10, attempts: 5 });
            expect(tier).toBe('PERFECT');
            expect(computeStarsByTier(10, 5)).toBe(3);
        });
    });
});

// ──────────────────────────────────────────────────────────────
// 6. STAR_TIERS constant integrity
// ──────────────────────────────────────────────────────────────
describe('STAR_TIERS constant integrity', () => {
    it('contains exactly 3 tiers', () => {
        expect(STAR_TIERS).toHaveLength(3);
    });

    it('is readonly / immutable in spirit (frozen check)', () => {
        // STAR_TIERS is declared as readonly, verify it has all expected entries
        expect(STAR_TIERS[0]).toBe('PERFECT');
        expect(STAR_TIERS[1]).toBe('GOOD');
        expect(STAR_TIERS[2]).toBe('PASS');
    });

    it('every tier maps to a unique star value', () => {
        const starValues = (STAR_TIERS as StarTier[]).map(t => tierToStars(t));
        const unique = new Set(starValues);
        expect(unique.size).toBe(starValues.length);
    });

    it('tiers are ordered from highest to lowest reward', () => {
        const stars = (STAR_TIERS as StarTier[]).map(t => tierToStars(t));
        expect(stars).toEqual([3, 2, 1]);
    });
});
