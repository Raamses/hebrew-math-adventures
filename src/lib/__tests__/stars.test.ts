import { describe, it, expect } from 'vitest';
import {
    computeStarsByTier,
    getTier,
    tierToStars,
    STAR_TIERS,
    type StarTier,
} from '../stars';

describe('star-tier reward helper (computeStarsByTier)', () => {
    describe('getTier', () => {
        it('returns null when there is no attempt data (attempts = 0)', () => {
            expect(getTier({ correct: 0, attempts: 0 })).toBeNull();
        });

        it('returns PERFECT for ≤ 1 mistake', () => {
            expect(getTier({ correct: 5, attempts: 5 })).toBe('PERFECT');
            expect(getTier({ correct: 4, attempts: 5 })).toBe('PERFECT');
        });

        it('returns GOOD for ≤ 3 mistakes', () => {
            expect(getTier({ correct: 2, attempts: 5 })).toBe('GOOD');
            expect(getTier({ correct: 2, attempts: 4 })).toBe('GOOD');
        });

        it('returns PASS for more than 3 mistakes', () => {
            expect(getTier({ correct: 1, attempts: 5 })).toBe('PASS');
            expect(getTier({ correct: 0, attempts: 4 })).toBe('PASS');
        });
    });

    describe('tierToStars', () => {
        it('maps PERFECT→3, GOOD→2, PASS→1', () => {
            expect(tierToStars('PERFECT')).toBe(3);
            expect(tierToStars('GOOD')).toBe(2);
            expect(tierToStars('PASS')).toBe(1);
        });
    });

    describe('computeStarsByTier', () => {
        it('awards 3 stars for perfect performance (≤1 mistake)', () => {
            expect(computeStarsByTier(5, 5)).toBe(3);
            expect(computeStarsByTier(4, 5)).toBe(3);
        });

        it('awards 2 stars for good performance (≤3 mistakes)', () => {
            expect(computeStarsByTier(2, 5)).toBe(2);
            expect(computeStarsByTier(2, 4)).toBe(2);
        });

        it('awards 1 star for pass performance (>3 mistakes)', () => {
            expect(computeStarsByTier(1, 5)).toBe(1);
            expect(computeStarsByTier(0, 4)).toBe(1);
        });

        it('defaults to 1 star (Pass) when there is no attempt data', () => {
            // A player who completes a node always earns at least 1 star.
            expect(computeStarsByTier(0, 0)).toBe(1);
        });

        it('never awards fewer than 1 star', () => {
            expect(computeStarsByTier(0, 100)).toBe(1);
        });
    });

    describe('STAR_TIERS', () => {
        it('is ordered best → worst and covers all tiers', () => {
            expect(STAR_TIERS).toEqual(['PERFECT', 'GOOD', 'PASS']);
            for (const tier of STAR_TIERS as StarTier[]) {
                expect([3, 2, 1]).toContain(tierToStars(tier));
            }
        });
    });
});
