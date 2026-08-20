/**
 * parentEconomyEngine.ts — Pure functions for the parent economy system.
 *
 * This module is a TRUE LEAF: it imports only from `../../types/parent` (for
 * shared type definitions). It never imports from engines/, components/,
 * hooks/, context/, or data/.
 *
 * All functions are pure (no side effects, no I/O). localStorage persistence
 * is handled by the caller (React components/hooks).
 *
 * Phase 6 features:
 *   - Parent coin earning (separate from child coins)
 *   - Parent daily streak tracking (separate from child streak)
 *   - Parent badge definitions and unlock criteria
 *   - Gift-to-child mechanism (transfer parent coins to child profile)
 *   - Weekly Blitz leaderboard (resets every Sunday)
 */

import type {
    ParentEconomyState,
    ParentBadgeId,
    ParentBadge,
    LeaderboardEntry,
    GiftTransaction,
    GameResult,
    CoinEarningResult,
} from '../../types/parent';

// ================================================================
//  Constants
// ================================================================

/** Maximum coins a parent can gift to a single child per day */
export const MAX_DAILY_GIFT_PER_CHILD = 50;

/** Maximum total gifts per day across all children */
export const MAX_DAILY_GIFT_TOTAL = 100;

/** Streak freeze cost in parent coins */
export const STREAK_FREEZE_COST = 10;

/** Maximum streak freeze uses per month */
export const MAX_STREAK_FREEZE_PER_MONTH = 3;

// ================================================================
//  Coin Earning Rules
// ================================================================

/**
 * Calculate coins earned for a game result.
 *
 * - Blitz: floor(score / 10), min 1 for playing
 * - EquationOfTheDay: 20 for win, 5 for loss, +5 bonus for streak (max +25)
 * - NumberMerge: floor(score / 50) + (won ? 30 : 0), min 2 for playing
 * - Sudoku: 15 for win, 5 for partial, 2 for start
 */
export function calculateCoinsEarned(result: GameResult): CoinEarningResult {
    let coins = 0;
    let bonusReason: string | undefined;
    let bonusCoins = 0;

    switch (result.gameId) {
        case 'parent-blitz': {
            coins = Math.max(1, Math.floor(result.score / 10));
            break;
        }
        case 'equation-of-the-day': {
            coins = result.won ? 20 : 5;
            // Streak bonus: +5 per consecutive day, capped at +25
            if (result.won && result.currentStreak > 0) {
                bonusCoins = Math.min(25, Math.floor(result.currentStreak / 2) * 5);
                if (bonusCoins > 0) bonusReason = 'streak_bonus';
            }
            break;
        }
        case 'number-merge': {
            coins = Math.max(2, Math.floor(result.score / 50) + (result.won ? 30 : 0));
            break;
        }
        case 'sudoku': {
            coins = result.won ? 15 : result.score > 0 ? 5 : 2;
            break;
        }
        default: {
            coins = 1;
        }
    }

    const total = coins + bonusCoins;
    return { coins: total, baseCoins: coins, bonusCoins, bonusReason };
}

// ================================================================
//  Parent Streak
// ================================================================

/** Get today's date as YYYY-MM-DD */
export function getTodayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Get yesterday's date as YYYY-MM-DD (relative to a reference date, default: today) */
export function getYesterdayISO(refDate?: string): string {
    const d = refDate ? new Date(refDate + 'T12:00:00') : new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

/**
 * Update parent streak after playing a game.
 * If lastPlayedDate is yesterday → streak +1
 * If lastPlayedDate is today → no change (already played)
 * If lastPlayedDate is older or null → streak = 1
 */
export function updateParentStreak(
    state: ParentEconomyState,
    today: string = getTodayISO(),
): { streak: number; bestStreak: number; lastPlayedDate: string; streakChanged: boolean } {
    if (state.lastPlayedDate === today) {
        return {
            streak: state.streak,
            bestStreak: state.bestStreak,
            lastPlayedDate: state.lastPlayedDate,
            streakChanged: false,
        };
    }

    const yesterday = getYesterdayISO(today);
    let newStreak: number;

    if (state.lastPlayedDate === yesterday) {
        newStreak = state.streak + 1;
    } else {
        newStreak = 1;
    }

    return {
        streak: newStreak,
        bestStreak: Math.max(state.bestStreak, newStreak),
        lastPlayedDate: today,
        streakChanged: true,
    };
}

/**
 * Apply streak freeze (uses parent coins to protect streak on a missed day).
 * Returns null if freeze cannot be applied (insufficient coins or monthly limit reached).
 */
export function applyStreakFreeze(
    state: ParentEconomyState,
    today: string = getTodayISO(),
): ParentEconomyState | null {
    if (state.coins < STREAK_FREEZE_COST) return null;

    const monthKey = today.slice(0, 7); // YYYY-MM
    const freezesThisMonth = state.streakFreezeHistory?.filter(
        (d: string) => d.slice(0, 7) === monthKey,
    ) ?? [];

    if (freezesThisMonth.length >= MAX_STREAK_FREEZE_PER_MONTH) return null;

    return {
        ...state,
        coins: state.coins - STREAK_FREEZE_COST,
        streakFreezeHistory: [...(state.streakFreezeHistory ?? []), today],
    };
}

// ================================================================
//  Parent Badges
// ================================================================

export const PARENT_BADGES: Record<ParentBadgeId, ParentBadge> = {
    'first-game': {
        id: 'first-game',
        titleKey: 'parent.badges.firstGame.title',
        descKey: 'parent.badges.firstGame.desc',
        icon: '🎮',
    },
    'streak-7': {
        id: 'streak-7',
        titleKey: 'parent.badges.streak7.title',
        descKey: 'parent.badges.streak7.desc',
        icon: '🔥',
    },
    'streak-30': {
        id: 'streak-30',
        titleKey: 'parent.badges.streak30.title',
        descKey: 'parent.badges.streak30.desc',
        icon: '💎',
    },
    'human-calculator': {
        id: 'human-calculator',
        titleKey: 'parent.badges.humanCalculator.title',
        descKey: 'parent.badges.humanCalculator.desc',
        icon: '🧮',
    },
    'blitz-master': {
        id: 'blitz-master',
        titleKey: 'parent.badges.blitzMaster.title',
        descKey: 'parent.badges.blitzMaster.desc',
        icon: '⚡',
    },
    'eod-expert': {
        id: 'eod-expert',
        titleKey: 'parent.badges.eodExpert.title',
        descKey: 'parent.badges.eodExpert.desc',
        icon: '📅',
    },
    'generous-parent': {
        id: 'generous-parent',
        titleKey: 'parent.badges.generousParent.title',
        descKey: 'parent.badges.generousParent.desc',
        icon: '🎁',
    },
    'merge-master': {
        id: 'merge-master',
        titleKey: 'parent.badges.mergeMaster.title',
        descKey: 'parent.badges.mergeMaster.desc',
        icon: '🔗',
    },
    'sudoku-solver': {
        id: 'sudoku-solver',
        titleKey: 'parent.badges.sudokuSolver.title',
        descKey: 'parent.badges.sudokuSolver.desc',
        icon: '🔢',
    },
    'streak-saver': {
        id: 'streak-saver',
        titleKey: 'parent.badges.streakSaver.title',
        descKey: 'parent.badges.streakSaver.desc',
        icon: '🛡️',
    },
};

/**
 * Check which badges should be unlocked based on the current state.
 * Returns array of badge IDs that are newly earned (not already unlocked).
 */
export function checkBadgeUnlocks(state: ParentEconomyState): ParentBadgeId[] {
    const newlyUnlocked: ParentBadgeId[] = [];
    const existing = new Set(state.unlockedBadges ?? []);

    const shouldUnlock = (id: ParentBadgeId, condition: boolean) => {
        if (condition && !existing.has(id)) newlyUnlocked.push(id);
    };

    // first-game: played at least 1 game
    shouldUnlock('first-game', state.totalGamesPlayed >= 1);

    // streak-7: reached a 7-day streak
    shouldUnlock('streak-7', state.bestStreak >= 7);

    // streak-30: reached a 30-day streak
    shouldUnlock('streak-30', state.bestStreak >= 30);

    // human-calculator: earned 500+ total coins
    shouldUnlock('human-calculator', state.totalCoinsEarned >= 500);

    // blitz-master: blitz high score >= 100
    shouldUnlock('blitz-master', (state.gameHighScores?.['parent-blitz'] ?? 0) >= 100);

    // eod-expert: EoD win count >= 10
    shouldUnlock('eod-expert', (state.gameWinCounts?.['equation-of-the-day'] ?? 0) >= 10);

    // generous-parent: gifted 100+ total coins to children
    shouldUnlock('generous-parent', state.totalGiftedCoins >= 100);

    // merge-master: NumberMerge high score >= 2048
    shouldUnlock('merge-master', (state.gameHighScores?.['number-merge'] ?? 0) >= 2048);

    // sudoku-solver: won 5+ sudoku games
    shouldUnlock('sudoku-solver', (state.gameWinCounts?.['sudoku'] ?? 0) >= 5);

    // streak-saver: used streak freeze at least once
    shouldUnlock('streak-saver', (state.streakFreezeHistory?.length ?? 0) >= 1);

    return newlyUnlocked;
}

// ================================================================
//  Gift to Child
// ================================================================

/**
 * Validate a gift transaction. Returns error string if invalid, null if valid.
 */
export function validateGift(
    state: ParentEconomyState,
    childProfileId: string,
    amount: number,
    today: string = getTodayISO(),
): string | null {
    if (amount <= 0) return 'invalid_amount';
    if (amount > state.coins) return 'insufficient_coins';

    const todaysGifts = (state.giftHistory ?? []).filter(
        (g: GiftTransaction) => g.date === today,
    );

    const totalToday = todaysGifts.reduce((sum: number, g: GiftTransaction) => sum + g.amount, 0);
    if (totalToday + amount > MAX_DAILY_GIFT_TOTAL) return 'daily_limit_exceeded';

    const toThisChildToday = todaysGifts
        .filter((g: GiftTransaction) => g.childProfileId === childProfileId)
        .reduce((sum: number, g: GiftTransaction) => sum + g.amount, 0);
    if (toThisChildToday + amount > MAX_DAILY_GIFT_PER_CHILD) return 'child_daily_limit_exceeded';

    return null;
}

/**
 * Execute a gift transaction. Returns updated state and the transaction record,
 * or null if the gift is invalid.
 */
export function executeGift(
    state: ParentEconomyState,
    childProfileId: string,
    childName: string,
    amount: number,
    today: string = getTodayISO(),
): { state: ParentEconomyState; transaction: GiftTransaction } | null {
    const error = validateGift(state, childProfileId, amount, today);
    if (error) return null;

    const transaction: GiftTransaction = {
        id: `gift-${Date.now()}-${childProfileId}`,
        childProfileId,
        childName,
        amount,
        date: today,
    };

    return {
        state: {
            ...state,
            coins: state.coins - amount,
            totalGiftedCoins: state.totalGiftedCoins + amount,
            giftHistory: [...(state.giftHistory ?? []), transaction].slice(-100), // cap at 100
        },
        transaction,
    };
}

// ================================================================
//  Weekly Leaderboard
// ================================================================

/** Get the ISO date of the most recent Sunday (start of leaderboard week) */
export function getWeekStartISO(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
}

/**
 * Add or update a score entry on the weekly leaderboard.
 * Only keeps the best score per player per week.
 */
export function submitLeaderboardScore(
    entries: LeaderboardEntry[],
    playerName: string,
    score: number,
    weekStart: string = getWeekStartISO(),
): LeaderboardEntry[] {
    const existing = entries.find(
        (e: LeaderboardEntry) => e.playerName === playerName && e.weekStart === weekStart,
    );

    if (existing) {
        if (score > existing.score) {
            return entries.map((e: LeaderboardEntry) =>
                e === existing ? { ...e, score, timestamp: Date.now() } : e,
            );
        }
        return entries; // no update needed
    }

    const entry: LeaderboardEntry = {
        playerName,
        score,
        weekStart,
        timestamp: Date.now(),
    };

    return [...entries, entry];
}

/**
 * Get the current week's leaderboard, sorted by score descending.
 */
export function getCurrentWeekLeaderboard(
    entries: LeaderboardEntry[],
    weekStart: string = getWeekStartISO(),
): LeaderboardEntry[] {
    return entries
        .filter((e: LeaderboardEntry) => e.weekStart === weekStart)
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.score - a.score);
}

/**
 * Remove entries from previous weeks. Call this on load to keep storage small.
 */
export function pruneOldLeaderboardEntries(
    entries: LeaderboardEntry[],
    keepWeeks: number = 2,
): LeaderboardEntry[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepWeeks * 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return entries.filter((e: LeaderboardEntry) => e.weekStart >= cutoffStr);
}

// ================================================================
//  State Helpers
// ================================================================

/** Create the initial/default parent economy state */
export function createInitialState(): ParentEconomyState {
    return {
        coins: 0,
        totalCoinsEarned: 0,
        totalGamesPlayed: 0,
        streak: 0,
        bestStreak: 0,
        lastPlayedDate: null,
        unlockedBadges: [],
        giftHistory: [],
        totalGiftedCoins: 0,
        gameHighScores: {},
        gameWinCounts: {},
        streakFreezeHistory: [],
    };
}

/**
 * Apply a game result to the parent economy state.
 * This is the main integration function — call it when a parent game finishes.
 */
export function applyGameResult(
    state: ParentEconomyState,
    result: GameResult,
    today: string = getTodayISO(),
): {
    state: ParentEconomyState;
    coinsEarned: CoinEarningResult;
    newBadges: ParentBadgeId[];
    streakUpdate: { streak: number; bestStreak: number; streakChanged: boolean };
} {
    const coinsEarned = calculateCoinsEarned(result);
    const streakUpdate = updateParentStreak(state, today);

    const stateAfterGame: ParentEconomyState = {
        ...state,
        coins: state.coins + coinsEarned.coins,
        totalCoinsEarned: state.totalCoinsEarned + coinsEarned.coins,
        totalGamesPlayed: state.totalGamesPlayed + 1,
        streak: streakUpdate.streak,
        bestStreak: streakUpdate.bestStreak,
        lastPlayedDate: streakUpdate.lastPlayedDate,
        gameHighScores: {
            ...state.gameHighScores,
            [result.gameId]: Math.max(
                state.gameHighScores?.[result.gameId] ?? 0,
                result.score,
            ),
        },
        gameWinCounts: {
            ...state.gameWinCounts,
            [result.gameId]: (state.gameWinCounts?.[result.gameId] ?? 0) + (result.won ? 1 : 0),
        },
    };

    const newBadges = checkBadgeUnlocks(stateAfterGame);
    if (newBadges.length > 0) {
        stateAfterGame.unlockedBadges = [...stateAfterGame.unlockedBadges, ...newBadges];
    }

    return { state: stateAfterGame, coinsEarned, newBadges, streakUpdate };
}
