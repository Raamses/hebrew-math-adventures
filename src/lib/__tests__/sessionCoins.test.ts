import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    SESSION_COIN_DAILY_CAP,
    calculateSessionCoins,
    awardSessionCoins,
    getCoinsAwardedToday,
    isSessionAwarded,
} from '../sessionCoins';

describe('sessionCoins module', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('SESSION_COIN_DAILY_CAP constant', () => {
        it('exports SESSION_COIN_DAILY_CAP as 25', () => {
            expect(SESSION_COIN_DAILY_CAP).toBe(25);
            expect(typeof SESSION_COIN_DAILY_CAP).toBe('number');
            expect(Number.isInteger(SESSION_COIN_DAILY_CAP)).toBe(true);
        });
    });

    describe('calculateSessionCoins (pure function)', () => {
        it('calculates full coins when well within daily cap', () => {
            const coins = calculateSessionCoins({ correct: 10, attempts: 10, success: true }, {
                coinsAwardedToday: 0,
                isDailyChallenge: false,
            });
            expect(coins).toBe(10);
        });

        it('supports raw number stats', () => {
            const coins = calculateSessionCoins(10, {
                coinsAwardedToday: 0,
                isDailyChallenge: false,
            });
            expect(coins).toBe(10);
        });

        it('partially clamps to remaining daily allowance', () => {
            const coins = calculateSessionCoins({ correct: 10 }, {
                coinsAwardedToday: 20,
                isDailyChallenge: false,
            });
            expect(coins).toBe(5);
        });

        it('returns 0 when cap is exactly reached', () => {
            const coins = calculateSessionCoins({ correct: 10 }, {
                coinsAwardedToday: 25,
                isDailyChallenge: false,
            });
            expect(coins).toBe(0);
        });

        it('returns 0 when cap is exceeded', () => {
            const coins = calculateSessionCoins({ correct: 10 }, {
                coinsAwardedToday: 30,
                isDailyChallenge: false,
            });
            expect(coins).toBe(0);
        });

        it('returns 0 for daily-challenge-sourced sessions (no double-count)', () => {
            const coins = calculateSessionCoins({ correct: 10 }, {
                coinsAwardedToday: 0,
                isDailyChallenge: true,
            });
            expect(coins).toBe(0);
        });

        it('returns 0 for failed sessions', () => {
            expect(calculateSessionCoins({ correct: 10, success: false }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ correct: 10, failed: true }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ correct: 10, aborted: true }, { coinsAwardedToday: 0 })).toBe(0);
        });

        it('returns 0 for 0-coin sessions', () => {
            expect(calculateSessionCoins({ correct: 0 }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ coins: 0 }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins(0, { coinsAwardedToday: 0 })).toBe(0);
        });

        it('clamps NaN, undefined, negative, or Infinity stats to 0', () => {
            expect(calculateSessionCoins({ correct: NaN }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ correct: undefined }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ correct: -10 }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ correct: Infinity }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({ correct: -Infinity }, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins(NaN, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins(Infinity, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins(-5, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins(null, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins(undefined, { coinsAwardedToday: 0 })).toBe(0);
            expect(calculateSessionCoins({}, { coinsAwardedToday: 0 })).toBe(0);
        });

        it('output is never NaN, negative, or fractional', () => {
            const outputs = [
                calculateSessionCoins({ correct: 3.7 }, { coinsAwardedToday: 0 }),
                calculateSessionCoins({ correct: -10 }, { coinsAwardedToday: -5 }),
                calculateSessionCoins({ correct: 10 }, { coinsAwardedToday: NaN }),
                calculateSessionCoins({ correct: 10 }, { coinsAwardedToday: Infinity }),
                calculateSessionCoins(undefined, undefined),
            ];
            for (const out of outputs) {
                expect(typeof out).toBe('number');
                expect(isNaN(out)).toBe(false);
                expect(isFinite(out)).toBe(true);
                expect(out).toBeGreaterThanOrEqual(0);
                expect(Number.isInteger(out)).toBe(true);
            }
        });

        it('respects explicitly provided coins stat over correct count', () => {
            const coins = calculateSessionCoins({ coins: 7, correct: 10 }, { coinsAwardedToday: 0 });
            expect(coins).toBe(7);
        });

        it('is pure and does not mutate its arguments', () => {
            const stats = { correct: 8, attempts: 10 };
            const daily = { coinsAwardedToday: 5, isDailyChallenge: false };
            const statsFrozen = Object.freeze({ ...stats });
            const dailyFrozen = Object.freeze({ ...daily });

            expect(() => calculateSessionCoins(statsFrozen, dailyFrozen)).not.toThrow();
        });
    });

    describe('awardSessionCoins effectful wrapper & ledger persistence', () => {
        it('awards coins and calls addCoins callback when valid', () => {
            const addCoins = vi.fn();
            const result = awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'session-101',
                stats: { correct: 10, attempts: 10, success: true },
                isDailyChallenge: false,
                addCoins,
            });

            expect(result).toBe(10);
            expect(addCoins).toHaveBeenCalledTimes(1);
            expect(addCoins).toHaveBeenCalledWith(10);
            expect(getCoinsAwardedToday('child-1')).toBe(10);
            expect(isSessionAwarded('session-101', 'child-1')).toBe(true);
        });

        it('deduplicates double-invocations with the same sessionId (StrictMode protection)', () => {
            const addCoins = vi.fn();
            const params = {
                profileId: 'child-1',
                sessionId: 'session-stable-1',
                stats: { correct: 10, attempts: 10, success: true },
                isDailyChallenge: false,
                addCoins,
            };

            const firstResult = awardSessionCoins(params);
            expect(firstResult).toBe(10);
            expect(addCoins).toHaveBeenCalledTimes(1);

            // Second invocation (e.g. StrictMode double-mounting or remount)
            const secondResult = awardSessionCoins(params);
            expect(secondResult).toBe(10);
            expect(addCoins).toHaveBeenCalledTimes(1);
            expect(getCoinsAwardedToday('child-1')).toBe(10);
        });

        it('survives component remounts reading from localStorage', () => {
            const addCoins1 = vi.fn();
            awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'session-remount-1',
                stats: { correct: 8 },
                addCoins: addCoins1,
            });
            expect(addCoins1).toHaveBeenCalledWith(8);

            // Simulate remount in another component instance with a new addCoins reference
            const addCoins2 = vi.fn();
            const result = awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'session-remount-1',
                stats: { correct: 8 },
                addCoins: addCoins2,
            });

            expect(result).toBe(8);
            expect(addCoins2).not.toHaveBeenCalled();
            expect(getCoinsAwardedToday('child-1')).toBe(8);
        });

        it('does not invoke addCoins if 0 coins are awarded', () => {
            const addCoins = vi.fn();
            const result = awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'session-zero',
                stats: { correct: 0 },
                addCoins,
            });

            expect(result).toBe(0);
            expect(addCoins).not.toHaveBeenCalled();
        });

        it('does not invoke addCoins if session is a daily challenge', () => {
            const addCoins = vi.fn();
            const result = awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'session-dc',
                stats: { correct: 10 },
                isDailyChallenge: true,
                addCoins,
            });

            expect(result).toBe(0);
            expect(addCoins).not.toHaveBeenCalled();
        });

        it('clamps consecutive sessions across the day until reaching cap', () => {
            const addCoins = vi.fn();

            // Session 1: 10 coins (total 10)
            awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'sess-1',
                stats: { correct: 10 },
                addCoins,
            });
            expect(getCoinsAwardedToday('child-1')).toBe(10);

            // Session 2: 10 coins (total 20)
            awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'sess-2',
                stats: { correct: 10 },
                addCoins,
            });
            expect(getCoinsAwardedToday('child-1')).toBe(20);

            // Session 3: 10 coins requested -> clamped to 5 (total 25)
            const r3 = awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'sess-3',
                stats: { correct: 10 },
                addCoins,
            });
            expect(r3).toBe(5);
            expect(getCoinsAwardedToday('child-1')).toBe(25);

            // Session 4: requested 10 -> cap reached, 0 awarded
            const r4 = awardSessionCoins({
                profileId: 'child-1',
                sessionId: 'sess-4',
                stats: { correct: 10 },
                addCoins,
            });
            expect(r4).toBe(0);
            expect(getCoinsAwardedToday('child-1')).toBe(25);

            expect(addCoins).toHaveBeenCalledTimes(3);
            expect(addCoins).toHaveBeenNthCalledWith(1, 10);
            expect(addCoins).toHaveBeenNthCalledWith(2, 10);
            expect(addCoins).toHaveBeenNthCalledWith(3, 5);
        });

        it('isolates ledgers between different children', () => {
            const addCoins = vi.fn();

            awardSessionCoins({ profileId: 'child-A', sessionId: 'sess-A1', stats: { correct: 20 }, addCoins });
            awardSessionCoins({ profileId: 'child-B', sessionId: 'sess-B1', stats: { correct: 15 }, addCoins });

            expect(getCoinsAwardedToday('child-A')).toBe(20);
            expect(getCoinsAwardedToday('child-B')).toBe(15);
        });

        it('isolates ledgers across different dates', () => {
            const addCoins = vi.fn();

            awardSessionCoins({ profileId: 'child-1', sessionId: 'sess-d1', stats: { correct: 25 }, date: '2026-10-17', addCoins });
            awardSessionCoins({ profileId: 'child-1', sessionId: 'sess-d2', stats: { correct: 10 }, date: '2026-10-18', addCoins });

            expect(getCoinsAwardedToday('child-1', '2026-10-17')).toBe(25);
            expect(getCoinsAwardedToday('child-1', '2026-10-18')).toBe(10);
        });
    });
});
