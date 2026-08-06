/**
 * Star-tier computation — single source of truth for dynamic star rewards.
 *
 * Every game mode (PRACTICE, SENSORY, MEMORY, INVADERS, LESSON) converts a
 * performance result into a 1–3 star rating by tier:
 *
 *   - Perfect: ≤ 1 mistake  → 3 stars
 *   - Good:    ≤ 3 mistakes → 2 stars
 *   - Pass:    otherwise    → 1 star
 *
 * The tiers intentionally mirror the classic Pass / Good / Perfect reward
 * ladder so players always earn at least 1 star for completing a node and are
 * rewarded for accuracy, never for simply finishing.
 */

/** Result tiers, ordered best → worst. */
export type StarTier = 'PERFECT' | 'GOOD' | 'PASS';

export interface PerformanceResult {
    /** Number of correct answers / successful actions. */
    correct: number;
    /** Number of total attempts (correct + mistakes). 0 means "no data". */
    attempts: number;
}

const STAR_TIERS: readonly StarTier[] = ['PERFECT', 'GOOD', 'PASS'];

/** Returns the performance tier for a result, or null when there is no data. */
export function getTier(result: PerformanceResult): StarTier | null {
    if (result.attempts <= 0) return null;
    const mistakes = result.attempts - result.correct;
    if (mistakes <= 1) return 'PERFECT';
    if (mistakes <= 3) return 'GOOD';
    return 'PASS';
}

/** Maps a tier to its star reward (PERFECT=3, GOOD=2, PASS=1). */
export function tierToStars(tier: StarTier): number {
    switch (tier) {
        case 'PERFECT':
            return 3;
        case 'GOOD':
            return 2;
        case 'PASS':
            return 1;
    }
}

/**
 * Computes stars (1–3) from a performance result, defaulting to the lowest
 * tier (PASS / 1 star) when there is no attempt data — a player who completes
 * a node always earns at least 1 star.
 */
export function computeStarsByTier(correct: number, attempts: number): number {
    const tier = getTier({ correct, attempts });
    return tier ? tierToStars(tier) : tierToStars('PASS');
}

/** Exported for introspection/validation in tests. */
export { STAR_TIERS };
