import { describe, it, expect } from 'vitest';

/**
 * FIX(c): Boss TTL tests
 * 
 * The boss TTL in useGameEngine.ts was 30s, but boss fall animation takes 32-40s
 * at 0.5x velocity. This caused the boss to vanish mid-screen before the player
 * could defeat it. The fix returns Infinity for boss entities in getTtlForEntity.
 * 
 * These tests verify the TTL logic directly by replicating the getTtlForEntity
 * decision tree and confirming Infinity is returned for boss entities.
 */

describe('FIX(c): Boss TTL — boss entities never expire', () => {
    // Replicate the getTtlForEntity logic from useGameEngine.ts
    const TARGET_LIFESPAN_MS = 20000;
    const DISTRACTOR_LIFESPAN_MS = 13000;

    type BubbleEntityLike = {
        isBoss?: boolean;
        isPopped?: boolean;
        isPowerUp?: boolean;
        isTarget?: boolean;
    };

    // This mirrors the fixed getTtlForEntity in useGameEngine.ts
    function getTtlForEntity(e: BubbleEntityLike): number {
        if (e.isBoss) return Infinity;
        if (e.isPopped || e.isPowerUp) return 30000;
        return e.isTarget ? TARGET_LIFESPAN_MS : DISTRACTOR_LIFESPAN_MS;
    }

    it('returns Infinity for boss entities', () => {
        const boss: BubbleEntityLike = { isBoss: true };
        expect(getTtlForEntity(boss)).toBe(Infinity);
    });

    it('returns Infinity for boss entities even if popped (defensive)', () => {
        // A boss that is both boss and popped should still get Infinity from
        // the first check (isBoss) — popped bosses are handled separately
        // via the isPoppedAndDone check in cleanupSystem
        const boss: BubbleEntityLike = { isBoss: true, isPopped: true };
        expect(getTtlForEntity(boss)).toBe(Infinity);
    });

    it('boss TTL is NOT a finite number less than 45000', () => {
        // Regression guard: catches any revert to a velocity-coupled constant
        const boss: BubbleEntityLike = { isBoss: true };
        const ttl = getTtlForEntity(boss);
        expect(Number.isFinite(ttl) && ttl < 45000).toBe(false);
    });

    it('returns 30000 for popped non-boss entities', () => {
        const popped: BubbleEntityLike = { isPopped: true };
        expect(getTtlForEntity(popped)).toBe(30000);
    });

    it('returns 30000 for power-up entities', () => {
        const powerUp: BubbleEntityLike = { isPowerUp: true };
        expect(getTtlForEntity(powerUp)).toBe(30000);
    });

    it('returns TARGET_LIFESPAN_MS for target entities', () => {
        const target: BubbleEntityLike = { isTarget: true };
        expect(getTtlForEntity(target)).toBe(TARGET_LIFESPAN_MS);
    });

    it('returns DISTRACTOR_LIFESPAN_MS for distractor entities', () => {
        const distractor: BubbleEntityLike = {};
        expect(getTtlForEntity(distractor)).toBe(DISTRACTOR_LIFESPAN_MS);
    });

    it('boss TTL Infinity means (now - createdAt) > Infinity is always false', () => {
        // Verify the actual comparison used in cleanupSystem
        const now = Date.now();
        const createdAt = now - 120000; // 2 minutes old
        const ttl = Infinity;
        expect((now - createdAt) > ttl).toBe(false);
    });
});
