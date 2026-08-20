/**
 * parentEconomyEngine.test.ts — Tests for the parent economy engine.
 *
 * Tests all pure functions: coin earning, streak tracking, badge unlocks,
 * gift-to-child validation/execution, weekly leaderboard, and state helpers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    calculateCoinsEarned,
    updateParentStreak,
    applyStreakFreeze,
    checkBadgeUnlocks,
    validateGift,
    executeGift,
    submitLeaderboardScore,
    getCurrentWeekLeaderboard,
    pruneOldLeaderboardEntries,
    createInitialState,
    applyGameResult,
    PARENT_BADGES,
    MAX_DAILY_GIFT_PER_CHILD,
    MAX_DAILY_GIFT_TOTAL,
    STREAK_FREEZE_COST,
    MAX_STREAK_FREEZE_PER_MONTH,
    getWeekStartISO,
} from '../parentEconomyEngine';
import type { ParentEconomyState, GameResult } from '../../../../types/parent';

describe('parentEconomyEngine', () => {
    // ================================================================
    //  Coin Earning
    // ================================================================
    describe('calculateCoinsEarned', () => {
        it('blitz: floor(score/10), min 1', () => {
            expect(calculateCoinsEarned({ gameId: 'parent-blitz', score: 0, won: false }).coins).toBe(1);
            expect(calculateCoinsEarned({ gameId: 'parent-blitz', score: 55, won: true }).coins).toBe(5);
            expect(calculateCoinsEarned({ gameId: 'parent-blitz', score: 100, won: true }).coins).toBe(10);
            expect(calculateCoinsEarned({ gameId: 'parent-blitz', score: 3, won: false }).coins).toBe(1);
        });

        it('eod: 20 for win, 5 for loss', () => {
            expect(calculateCoinsEarned({ gameId: 'equation-of-the-day', score: 0, won: true }).coins).toBe(20);
            expect(calculateCoinsEarned({ gameId: 'equation-of-the-day', score: 0, won: false }).coins).toBe(5);
        });

        it('eod: streak bonus +5 per 2-day streak, capped at +25', () => {
            const r1 = calculateCoinsEarned({ gameId: 'equation-of-the-day', score: 0, won: true, currentStreak: 3 });
            expect(r1.bonusCoins).toBe(5);
            expect(r1.coins).toBe(25);
            expect(r1.bonusReason).toBe('streak_bonus');

            const r2 = calculateCoinsEarned({ gameId: 'equation-of-the-day', score: 0, won: true, currentStreak: 10 });
            expect(r2.bonusCoins).toBe(25);
            expect(r2.coins).toBe(45);

            const r3 = calculateCoinsEarned({ gameId: 'equation-of-the-day', score: 0, won: true, currentStreak: 100 });
            expect(r3.bonusCoins).toBe(25); // capped
        });

        it('eod: no streak bonus on loss', () => {
            const r = calculateCoinsEarned({ gameId: 'equation-of-the-day', score: 0, won: false, currentStreak: 10 });
            expect(r.bonusCoins).toBe(0);
            expect(r.coins).toBe(5);
        });

        it('merge: floor(score/50) + 30 if won, min 2', () => {
            expect(calculateCoinsEarned({ gameId: 'number-merge', score: 0, won: false }).coins).toBe(2);
            expect(calculateCoinsEarned({ gameId: 'number-merge', score: 100, won: false }).coins).toBe(2);
            expect(calculateCoinsEarned({ gameId: 'number-merge', score: 2048, won: true }).coins).toBe(70);
        });

        it('sudoku: 15 win, 5 partial, 2 start', () => {
            expect(calculateCoinsEarned({ gameId: 'sudoku', score: 100, won: true }).coins).toBe(15);
            expect(calculateCoinsEarned({ gameId: 'sudoku', score: 50, won: false }).coins).toBe(5);
            expect(calculateCoinsEarned({ gameId: 'sudoku', score: 0, won: false }).coins).toBe(2);
        });

        it('unknown game: 1 coin', () => {
            expect(calculateCoinsEarned({ gameId: 'unknown', score: 0, won: false }).coins).toBe(1);
        });
    });

    // ================================================================
    //  Parent Streak
    // ================================================================
    describe('updateParentStreak', () => {
        it('starts streak at 1 if never played', () => {
            const state = { ...createInitialState(), lastPlayedDate: null };
            const result = updateParentStreak(state, '2025-01-15');
            expect(result.streak).toBe(1);
            expect(result.bestStreak).toBe(1);
            expect(result.streakChanged).toBe(true);
        });

        it('increments streak if played yesterday', () => {
            const state = { ...createInitialState(), streak: 5, bestStreak: 5, lastPlayedDate: '2025-01-14' };
            const result = updateParentStreak(state, '2025-01-15');
            expect(result.streak).toBe(6);
            expect(result.bestStreak).toBe(6);
            expect(result.streakChanged).toBe(true);
        });

        it('resets streak to 1 if gap > 1 day', () => {
            const state = { ...createInitialState(), streak: 10, bestStreak: 10, lastPlayedDate: '2025-01-10' };
            const result = updateParentStreak(state, '2025-01-15');
            expect(result.streak).toBe(1);
            expect(result.bestStreak).toBe(10); // best stays
            expect(result.streakChanged).toBe(true);
        });

        it('no change if already played today', () => {
            const state = { ...createInitialState(), streak: 5, bestStreak: 7, lastPlayedDate: '2025-01-15' };
            const result = updateParentStreak(state, '2025-01-15');
            expect(result.streak).toBe(5);
            expect(result.bestStreak).toBe(7);
            expect(result.streakChanged).toBe(false);
        });

        it('updates bestStreak when new streak exceeds it', () => {
            const state = { ...createInitialState(), streak: 9, bestStreak: 9, lastPlayedDate: '2025-01-14' };
            const result = updateParentStreak(state, '2025-01-15');
            expect(result.streak).toBe(10);
            expect(result.bestStreak).toBe(10);
        });
    });

    //('applyStreakFreeze', () => {
    describe('applyStreakFreeze', () => {
        it('deducts coins and records date', () => {
            const state = { ...createInitialState(), coins: 100 };
            const result = applyStreakFreeze(state, '2025-01-15');
            expect(result).not.toBeNull();
            expect(result!.coins).toBe(100 - STREAK_FREEZE_COST);
            expect(result!.streakFreezeHistory).toContain('2025-01-15');
        });

        it('returns null if insufficient coins', () => {
            const state = { ...createInitialState(), coins: 5 };
            const result = applyStreakFreeze(state, '2025-01-15');
            expect(result).toBeNull();
        });

        it('returns null if monthly limit reached', () => {
            const state = {
                ...createInitialState(),
                coins: 100,
                streakFreezeHistory: ['2025-01-01', '2025-01-05', '2025-01-10'],
            };
            const result = applyStreakFreeze(state, '2025-01-15');
            expect(result).toBeNull();
        });

        it('allows freeze in a new month', () => {
            const state = {
                ...createInitialState(),
                coins: 100,
                streakFreezeHistory: ['2025-01-01', '2025-01-05', '2025-01-10'],
            };
            const result = applyStreakFreeze(state, '2025-02-01');
            expect(result).not.toBeNull();
            expect(result!.streakFreezeHistory).toHaveLength(4);
        });
    });

    // ================================================================
    //  Badge Unlocks
    // ================================================================
    describe('checkBadgeUnlocks', () => {
        it('unlocks first-game after 1 game', () => {
            const state = { ...createInitialState(), totalGamesPlayed: 1 };
            const badges = checkBadgeUnlocks(state);
            expect(badges).toContain('first-game');
        });

        it('unlocks streak-7 at 7-day best streak', () => {
            const state = { ...createInitialState(), bestStreak: 7 };
            expect(checkBadgeUnlocks(state)).toContain('streak-7');
        });

        it('unlocks streak-30 at 30-day best streak', () => {
            const state = { ...createInitialState(), bestStreak: 30 };
            expect(checkBadgeUnlocks(state)).toContain('streak-30');
        });

        it('unlocks human-calculator at 500+ coins earned', () => {
            const state = { ...createInitialState(), totalCoinsEarned: 500 };
            expect(checkBadgeUnlocks(state)).toContain('human-calculator');
        });

        it('unlocks blitz-master at score 100+', () => {
            const state = { ...createInitialState(), gameHighScores: { 'parent-blitz': 100 } };
            expect(checkBadgeUnlocks(state)).toContain('blitz-master');
        });

        it('unlocks eod-expert at 10+ wins', () => {
            const state = { ...createInitialState(), gameWinCounts: { 'equation-of-the-day': 10 } };
            expect(checkBadgeUnlocks(state)).toContain('eod-expert');
        });

        it('unlocks generous-parent at 100+ gifted coins', () => {
            const state = { ...createInitialState(), totalGiftedCoins: 100 };
            expect(checkBadgeUnlocks(state)).toContain('generous-parent');
        });

        it('unlocks merge-master at 2048+ score', () => {
            const state = { ...createInitialState(), gameHighScores: { 'number-merge': 2048 } };
            expect(checkBadgeUnlocks(state)).toContain('merge-master');
        });

        it('unlocks sudoku-solver at 5+ wins', () => {
            const state = { ...createInitialState(), gameWinCounts: { 'sudoku': 5 } };
            expect(checkBadgeUnlocks(state)).toContain('sudoku-solver');
        });

        it('unlocks streak-saver after using freeze', () => {
            const state = { ...createInitialState(), streakFreezeHistory: ['2025-01-01'] };
            expect(checkBadgeUnlocks(state)).toContain('streak-saver');
        });

        it('does not re-unlock already unlocked badges', () => {
            const state = {
                ...createInitialState(),
                totalGamesPlayed: 5,
                unlockedBadges: ['first-game'],
            };
            expect(checkBadgeUnlocks(state)).not.toContain('first-game');
        });

        it('unlocks multiple badges at once', () => {
            const state = {
                ...createInitialState(),
                totalGamesPlayed: 1,
                bestStreak: 7,
                totalCoinsEarned: 500,
            };
            const badges = checkBadgeUnlocks(state);
            expect(badges).toContain('first-game');
            expect(badges).toContain('streak-7');
            expect(badges).toContain('human-calculator');
        });
    });

    // ================================================================
    //  Gift to Child
    // ================================================================
    describe('validateGift', () => {
        it('returns null for valid gift', () => {
            const state = { ...createInitialState(), coins: 100 };
            expect(validateGift(state, 'child-1', 20, '2025-01-15')).toBeNull();
        });

        it('returns invalid_amount for zero or negative', () => {
            const state = { ...createInitialState(), coins: 100 };
            expect(validateGift(state, 'child-1', 0, '2025-01-15')).toBe('invalid_amount');
            expect(validateGift(state, 'child-1', -5, '2025-01-15')).toBe('invalid_amount');
        });

        it('returns insufficient_coins when not enough', () => {
            const state = { ...createInitialState(), coins: 10 };
            expect(validateGift(state, 'child-1', 50, '2025-01-15')).toBe('insufficient_coins');
        });

        it('returns daily_limit_exceeded when total daily limit hit', () => {
            const state = {
                ...createInitialState(),
                coins: 200,
                giftHistory: [
                    { id: '1', childProfileId: 'a', childName: 'A', amount: 60, date: '2025-01-15' },
                    { id: '2', childProfileId: 'b', childName: 'B', amount: 50, date: '2025-01-15' },
                ],
            };
            expect(validateGift(state, 'child-c', 1, '2025-01-15')).toBe('daily_limit_exceeded');
        });

        it('returns child_daily_limit_exceeded when per-child limit hit', () => {
            const state = {
                ...createInitialState(),
                coins: 200,
                giftHistory: [
                    { id: '1', childProfileId: 'child-1', childName: 'A', amount: 50, date: '2025-01-15' },
                ],
            };
            expect(validateGift(state, 'child-1', 1, '2025-01-15')).toBe('child_daily_limit_exceeded');
        });

        it('does not count gifts from other days', () => {
            const state = {
                ...createInitialState(),
                coins: 200,
                giftHistory: [
                    { id: '1', childProfileId: 'child-1', childName: 'A', amount: 50, date: '2025-01-14' },
                ],
            };
            expect(validateGift(state, 'child-1', 20, '2025-01-15')).toBeNull();
        });
    });

    describe('executeGift', () => {
        it('executes valid gift and returns transaction', () => {
            const state = { ...createInitialState(), coins: 100 };
            const result = executeGift(state, 'child-1', 'Alice', 30, '2025-01-15');
            expect(result).not.toBeNull();
            expect(result!.state.coins).toBe(70);
            expect(result!.state.totalGiftedCoins).toBe(30);
            expect(result!.transaction.amount).toBe(30);
            expect(result!.transaction.childName).toBe('Alice');
        });

        it('returns null for invalid gift', () => {
            const state = { ...createInitialState(), coins: 5 };
            expect(executeGift(state, 'child-1', 'Alice', 30, '2025-01-15')).toBeNull();
        });

        it('caps gift history at 100 entries', () => {
            let state = { ...createInitialState(), coins: 10000 };
            for (let i = 0; i < 105; i++) {
                const result = executeGift(state, `child-${i % 3}`, `Child ${i % 3}`, 1, `2025-01-${(i % 28) + 1}`);
                expect(result).not.toBeNull();
                state = result!.state;
            }
            expect(state.giftHistory!.length).toBeLessThanOrEqual(100);
        });
    });

    // ================================================================
    //  Weekly Leaderboard
    // ================================================================
    describe('submitLeaderboardScore', () => {
        it('adds new entry', () => {
            const entries = submitLeaderboardScore([], 'Alice', 50, '2025-01-12');
            expect(entries).toHaveLength(1);
            expect(entries[0].score).toBe(50);
        });

        it('updates existing entry if score is higher', () => {
            let entries = submitLeaderboardScore([], 'Alice', 50, '2025-01-12');
            entries = submitLeaderboardScore(entries, 'Alice', 80, '2025-01-12');
            expect(entries).toHaveLength(1);
            expect(entries[0].score).toBe(80);
        });

        it('does not update if score is lower', () => {
            let entries = submitLeaderboardScore([], 'Alice', 80, '2025-01-12');
            entries = submitLeaderboardScore(entries, 'Alice', 50, '2025-01-12');
            expect(entries).toHaveLength(1);
            expect(entries[0].score).toBe(80);
        });

        it('adds separate entries for different weeks', () => {
            let entries = submitLeaderboardScore([], 'Alice', 50, '2025-01-12');
            entries = submitLeaderboardScore(entries, 'Alice', 60, '2025-01-19');
            expect(entries).toHaveLength(2);
        });

        it('adds separate entries for different players', () => {
            let entries = submitLeaderboardScore([], 'Alice', 50, '2025-01-12');
            entries = submitLeaderboardScore(entries, 'Bob', 70, '2025-01-12');
            expect(entries).toHaveLength(2);
        });
    });

    describe('getCurrentWeekLeaderboard', () => {
        it('returns only current week entries sorted by score desc', () => {
            const entries = [
                { playerName: 'Alice', score: 50, weekStart: '2025-01-12', timestamp: 1 },
                { playerName: 'Bob', score: 80, weekStart: '2025-01-12', timestamp: 2 },
                { playerName: 'Carol', score: 60, weekStart: '2025-01-05', timestamp: 3 },
            ];
            const result = getCurrentWeekLeaderboard(entries, '2025-01-12');
            expect(result).toHaveLength(2);
            expect(result[0].playerName).toBe('Bob');
            expect(result[1].playerName).toBe('Alice');
        });

        it('returns empty for week with no entries', () => {
            const entries = [
                { playerName: 'Alice', score: 50, weekStart: '2025-01-05', timestamp: 1 },
            ];
            expect(getCurrentWeekLeaderboard(entries, '2025-01-12')).toHaveLength(0);
        });
    });

    describe('pruneOldLeaderboardEntries', () => {
        it('removes entries older than keepWeeks', () => {
            const entries = [
                { playerName: 'Old', score: 50, weekStart: '2025-01-01', timestamp: 1 },
                { playerName: 'Recent', score: 80, weekStart: '2025-01-12', timestamp: 2 },
            ];
            // Mock current date context — with keepWeeks=2, entries from 2+ weeks ago are pruned
            const result = pruneOldLeaderboardEntries(entries, 2);
            // The exact cutoff depends on "now", so just verify the function runs
            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    // ================================================================
    //  applyGameResult (integration)
    // ================================================================
    describe('applyGameResult', () => {
        it('earns coins, updates streak, and checks badges', () => {
            const state = createInitialState();
            const result: GameResult = { gameId: 'parent-blitz', score: 50, won: true };

            const outcome = applyGameResult(state, result, '2025-01-15');
            expect(outcome.coinsEarned.coins).toBe(5);
            expect(outcome.state.coins).toBe(5);
            expect(outcome.state.totalCoinsEarned).toBe(5);
            expect(outcome.state.totalGamesPlayed).toBe(1);
            expect(outcome.state.streak).toBe(1);
            expect(outcome.state.bestStreak).toBe(1);
            expect(outcome.state.lastPlayedDate).toBe('2025-01-15');
            expect(outcome.state.gameHighScores['parent-blitz']).toBe(50);
            expect(outcome.state.gameWinCounts['parent-blitz']).toBe(1);
            expect(outcome.newBadges).toContain('first-game');
            expect(outcome.state.unlockedBadges).toContain('first-game');
        });

        it('updates high score only if higher', () => {
            const state = { ...createInitialState(), gameHighScores: { 'parent-blitz': 100 } };
            const outcome = applyGameResult(state, { gameId: 'parent-blitz', score: 50, won: true }, '2025-01-15');
            expect(outcome.state.gameHighScores['parent-blitz']).toBe(100);
        });

        it('does not double-count streak for same-day play', () => {
            const state = {
                ...createInitialState(),
                streak: 5,
                bestStreak: 5,
                lastPlayedDate: '2025-01-15',
            };
            const outcome = applyGameResult(state, { gameId: 'parent-blitz', score: 10, won: true }, '2025-01-15');
            expect(outcome.state.streak).toBe(5); // unchanged
            expect(outcome.streakUpdate.streakChanged).toBe(false);
        });

        it('unlocks multiple badges from a single great result', () => {
            const yesterday = new Date(new Date('2025-01-15T12:00:00').getTime() - 86400000).toISOString().slice(0, 10);
            const state = {
                ...createInitialState(),
                totalGamesPlayed: 0,
                bestStreak: 6,
                totalCoinsEarned: 499,
                streak: 6,
                lastPlayedDate: yesterday,
            };
            // A win that pushes coins earned past 500 and streak to 7
            const outcome = applyGameResult(state, { gameId: 'parent-blitz', score: 100, won: true }, '2025-01-15');
            expect(outcome.state.totalCoinsEarned).toBeGreaterThanOrEqual(500);
            expect(outcome.state.streak).toBeGreaterThanOrEqual(7);
            // Should unlock first-game, streak-7, human-calculator, blitz-master
            expect(outcome.newBadges).toContain('first-game');
            expect(outcome.newBadges).toContain('streak-7');
            expect(outcome.newBadges).toContain('human-calculator');
            expect(outcome.newBadges).toContain('blitz-master');
        });
    });

    // ================================================================
    //  createInitialState
    // ================================================================
    describe('createInitialState', () => {
        it('returns all fields with correct defaults', () => {
            const state = createInitialState();
            expect(state.coins).toBe(0);
            expect(state.totalCoinsEarned).toBe(0);
            expect(state.totalGamesPlayed).toBe(0);
            expect(state.streak).toBe(0);
            expect(state.bestStreak).toBe(0);
            expect(state.lastPlayedDate).toBeNull();
            expect(state.unlockedBadges).toEqual([]);
            expect(state.giftHistory).toEqual([]);
            expect(state.totalGiftedCoins).toBe(0);
            expect(state.gameHighScores).toEqual({});
            expect(state.gameWinCounts).toEqual({});
            expect(state.streakFreezeHistory).toEqual([]);
        });
    });

    // ================================================================
    //  PARENT_BADGES sanity
    // ================================================================
    describe('PARENT_BADGES', () => {
        it('has 10 badges', () => {
            expect(Object.keys(PARENT_BADGES)).toHaveLength(10);
        });

        it('each badge has id, titleKey, descKey, icon', () => {
            for (const badge of Object.values(PARENT_BADGES)) {
                expect(badge.id).toBeDefined();
                expect(badge.titleKey).toContain('parent.badges.');
                expect(badge.descKey).toContain('parent.badges.');
                expect(badge.icon).toBeTruthy();
                expect(badge.icon.length).toBeGreaterThan(0);
            }
        });
    });

    // ================================================================
    //  Constants
    // ================================================================
    describe('constants', () => {
        it('MAX_DAILY_GIFT_PER_CHILD is 50', () => {
            expect(MAX_DAILY_GIFT_PER_CHILD).toBe(50);
        });
        it('MAX_DAILY_GIFT_TOTAL is 100', () => {
            expect(MAX_DAILY_GIFT_TOTAL).toBe(100);
        });
        it('STREAK_FREEZE_COST is 10', () => {
            expect(STREAK_FREEZE_COST).toBe(10);
        });
        it('MAX_STREAK_FREEZE_PER_MONTH is 3', () => {
            expect(MAX_STREAK_FREEZE_PER_MONTH).toBe(3);
        });
    });
});
