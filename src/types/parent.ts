/**
 * parent.ts — Type definitions for the parent economy system (Phase 6).
 *
 * These types are used by parentEconomyEngine.ts (pure functions) and
 * the React components that display/manage the parent economy.
 */

/** IDs for all parent badges */
export type ParentBadgeId =
    | 'first-game'
    | 'streak-7'
    | 'streak-30'
    | 'human-calculator'
    | 'blitz-master'
    | 'eod-expert'
    | 'generous-parent'
    | 'merge-master'
    | 'sudoku-solver'
    | 'streak-saver';

/** Badge definition (static data) */
export interface ParentBadge {
    id: ParentBadgeId;
    titleKey: string;      // i18n key, e.g. 'parent.badges.firstGame.title'
    descKey: string;       // i18n key for description
    icon: string;          // emoji
}

/** Game result passed to the economy engine */
export interface GameResult {
    gameId: string;        // 'parent-blitz' | 'equation-of-the-day' | 'number-merge' | 'sudoku'
    score: number;         // game-specific score
    won: boolean;          // whether the game was won
    currentStreak?: number; // current EoD streak (for bonus calculation)
}

/** Result of coin earning calculation */
export interface CoinEarningResult {
    coins: number;         // total coins earned (base + bonus)
    baseCoins: number;     // base coins from game
    bonusCoins: number;    // bonus coins (e.g. streak bonus)
    bonusReason?: string;  // why bonus was awarded
}

/** A gift transaction from parent to child */
export interface GiftTransaction {
    id: string;
    childProfileId: string;
    childName: string;
    amount: number;
    date: string;          // YYYY-MM-DD
}

/** Leaderboard entry for weekly Blitz competition */
export interface LeaderboardEntry {
    playerName: string;
    score: number;
    weekStart: string;     // YYYY-MM-DD (Sunday)
    timestamp: number;     // ms epoch
}

/** Full parent economy state, persisted to localStorage */
export interface ParentEconomyState {
    coins: number;                    // current spendable parent coins
    totalCoinsEarned: number;         // lifetime coins earned (for badges)
    totalGamesPlayed: number;         // lifetime games played
    streak: number;                   // current daily play streak
    bestStreak: number;               // best daily play streak ever
    lastPlayedDate: string | null;    // YYYY-MM-DD of last game played
    unlockedBadges: ParentBadgeId[];  // unlocked badge IDs
    giftHistory: GiftTransaction[];   // recent gift transactions (capped at 100)
    totalGiftedCoins: number;         // lifetime coins gifted to children
    gameHighScores: Record<string, number>;  // gameId → best score
    gameWinCounts: Record<string, number>;   // gameId → win count
    streakFreezeHistory: string[];    // dates streak freeze was used (YYYY-MM-DD)
}
