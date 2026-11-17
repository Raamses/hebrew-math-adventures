import type { Difficulty, PrepItem, PrepProgressState, SkillTag } from '../types';
import { exerciseItem, missingItem, wordItem } from './arithmetic';
import { balanceItem, compareItem } from './mathCompare';
import { doubleHalfItem, placeValueItem } from './mathNumberSense';
import { oddOneOutItem, sequenceItem } from './mathPatterns';
import { moneyItem, storyItem } from './mathWorld';
import { pictureItem } from './pictures';
import { derivePrepTypeProgress } from './progress';
import { type Rng } from './prng';
import { buildGuarded } from './sections';

/**
 * G7.3 adaptive math learning selector: draws more from the kid's weak Stage-A types, weighted by
 * G7.1 per-type accuracy (derivePrepTypeProgress), with a count floor so every type still appears.
 * Pure; the repetition guard (buildGuarded) keeps item variety identical to buildMath.
 */

export const MATH_ORIGINAL_TYPES = ['exercise', 'missing-number', 'word-problem', 'picture-puzzle'] as const;
export type MathOriginalType = typeof MATH_ORIGINAL_TYPES[number];

export const NUMBER_SENSE_TAGS = [
    'number-pattern', 'compare', 'odd-one-out', 'place-value', 'double-half', 'money',
] as const;
type NumberSenseTag = typeof NUMBER_SENSE_TAGS[number];

export const ORIGINAL_TOTAL = 10;
export const ORIGINAL_FLOOR = 2;
export const SESSION_COUNT = 16;

type Maker = (seed: number, difficulty: Difficulty) => PrepItem;

/** Skill tags that feed each original type's weakness (G7.1 accuracy, derivePrepTypeProgress). */
const MEMBER_TAGS: Readonly<Record<MathOriginalType, readonly SkillTag[]>> = {
    exercise: ['add', 'sub'],
    'missing-number': ['missing-number'],
    'word-problem': ['word-problem'],
    'picture-puzzle': ['picture-puzzle'],
};

const NUMBER_SENSE_MAKERS: Readonly<Record<NumberSenseTag, Maker>> = {
    'number-pattern': sequenceItem,
    compare: compareItem,
    'odd-one-out': oddOneOutItem,
    'place-value': placeValueItem,
    'double-half': doubleHalfItem,
    money: moneyItem,
};

/** 1 + weakness; weakness = max over member tags of (null -> 0.5, else 1 - accuracy). Always >= 1. */
export function originalTypeWeight(state: PrepProgressState, type: MathOriginalType): number {
    const progress = derivePrepTypeProgress(state);
    const weakness = Math.max(...MEMBER_TAGS[type].map(tag => {
        const accuracy = progress.find(p => p.skill === tag)?.accuracy ?? null;
        return accuracy == null ? 0.5 : 1 - accuracy;
    }));
    return 1 + weakness;
}

/** Weighted draw of `n` distinct types from `types`, without replacement; ties favor earlier index. */
function weightedDrawWithoutReplacement(
    rng: Rng, types: readonly MathOriginalType[], weights: readonly number[], n: number,
): MathOriginalType[] {
    const pool = types.map((type, i) => ({ type, weight: weights[i] }));
    const picked: MathOriginalType[] = [];
    for (let k = 0; k < n; k++) {
        const total = pool.reduce((sum, p) => sum + p.weight, 0);
        let r = rng() * total;
        let idx = pool.length - 1;
        for (let i = 0; i < pool.length; i++) {
            r -= pool[i].weight;
            if (r <= 0) { idx = i; break; }
        }
        picked.push(pool[idx].type);
        pool.splice(idx, 1);
    }
    return picked;
}

/** Floor ORIGINAL_FLOOR per original type, then the remaining slots by weighted draw. Sum is always ORIGINAL_TOTAL. */
export function originalTypeCounts(rng: Rng, state: PrepProgressState): Record<MathOriginalType, number> {
    const weights = MATH_ORIGINAL_TYPES.map(type => originalTypeWeight(state, type));
    const counts = Object.fromEntries(
        MATH_ORIGINAL_TYPES.map(type => [type, ORIGINAL_FLOOR]),
    ) as Record<MathOriginalType, number>;
    const extraSlots = ORIGINAL_TOTAL - ORIGINAL_FLOOR * MATH_ORIGINAL_TYPES.length;
    for (const type of weightedDrawWithoutReplacement(rng, MATH_ORIGINAL_TYPES, weights, extraSlots)) {
        counts[type] += 1;
    }
    return counts;
}

/** Booklet-order makers for one session: the 4 original types (weighted counts), then one per number-sense tag. */
function makerOrder(counts: Record<MathOriginalType, number>): Maker[] {
    const missingMakers: readonly Maker[] = [missingItem, balanceItem];
    const wordMakers: readonly Maker[] = [wordItem, storyItem, storyItem];
    const makers: Maker[] = [];
    for (let i = 0; i < counts.exercise; i++) makers.push(exerciseItem);
    for (let i = 0; i < counts['missing-number']; i++) makers.push(missingMakers[i % missingMakers.length]);
    for (let i = 0; i < counts['word-problem']; i++) makers.push(wordMakers[i]);
    for (let i = 0; i < counts['picture-puzzle']; i++) makers.push(pictureItem);
    for (const tag of NUMBER_SENSE_TAGS) makers.push(NUMBER_SENSE_MAKERS[tag]);
    return makers;
}

/**
 * 16-item adaptive math learning session: the 4 original Stage-A types keep 10 slots (weighted by
 * weakness, floor 2 each), number-sense keeps its per-session floor (every tag exactly once).
 * These items are all procedural (no bank ids), so there is no `seen` parameter (as in buildMath).
 */
export function buildAdaptiveMath(rng: Rng, state: PrepProgressState): PrepItem[] {
    const makers = makerOrder(originalTypeCounts(rng, state));
    return buildGuarded(rng, SESSION_COUNT, (seed, difficulty, i) => makers[i](seed, difficulty));
}
