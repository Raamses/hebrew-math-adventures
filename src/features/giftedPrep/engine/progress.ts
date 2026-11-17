import type { PrepAttempt, PrepProgressState, SkillTag } from '../types';
import { SKILL_TAGS } from '../types';

/** One wrong attempt, as surfaced to the parent/adaptive views. */
export interface PrepMistake {
    readonly itemId: string;
    readonly skill: SkillTag;
    readonly at: number;
    readonly ms: number;
}

export interface PrepTypeProgress {
    readonly skill: SkillTag;
    readonly attempts: number;
    readonly correct: number;
    /** correct/attempts rounded to 2 decimals (0..1); null when attempts === 0 */
    readonly accuracy: number | null;
    /** median of `ms` over ALL attempts of this skill; null when attempts === 0 */
    readonly medianMs: number | null;
    /** wrong attempts of this skill, NEWEST first, capped at 10 */
    readonly mistakes: readonly PrepMistake[];
}

const MISTAKES_PER_TYPE_CAP = 10;
const DEFAULT_RECENT_MISTAKES_CAP = 20;

function toMistake(attempt: PrepAttempt): PrepMistake {
    return { itemId: attempt.itemId, skill: attempt.skill, at: attempt.at, ms: attempt.ms };
}

/** Newest-first mistakes from a chronological attempt list, capped at `cap`. */
function mistakesOf(attempts: readonly PrepAttempt[], cap: number): readonly PrepMistake[] {
    return attempts
        .filter(a => !a.correct)
        .slice()
        .reverse()
        .slice(0, cap)
        .map(toMistake);
}

/** Sorted ascending ms values; odd count -> middle, even -> rounded mean of the two middle values. */
function median(msValues: readonly number[]): number {
    const sorted = [...msValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** One entry per skill that has attempts>0, in SKILL_TAGS declaration order. */
export function derivePrepTypeProgress(state: PrepProgressState): readonly PrepTypeProgress[] {
    const result: PrepTypeProgress[] = [];
    for (const skill of SKILL_TAGS) {
        const skillAttempts = state.attempts.filter(a => a.skill === skill);
        if (skillAttempts.length === 0) continue;
        const correct = skillAttempts.filter(a => a.correct).length;
        result.push({
            skill,
            attempts: skillAttempts.length,
            correct,
            accuracy: Math.round((correct / skillAttempts.length) * 100) / 100,
            medianMs: median(skillAttempts.map(a => Math.max(0, a.ms))),
            mistakes: mistakesOf(skillAttempts, MISTAKES_PER_TYPE_CAP),
        });
    }
    return result;
}

/** Most recent wrong attempts across all skills, NEWEST first, capped at `max` (default 20). */
export function recentPrepMistakes(
    state: PrepProgressState,
    max: number = DEFAULT_RECENT_MISTAKES_CAP,
): readonly PrepMistake[] {
    return mistakesOf(state.attempts, max);
}
