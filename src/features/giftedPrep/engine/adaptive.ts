import type { Difficulty, PrepItem, PrepProgressState, SkillTag } from '../types';
import { exerciseItem, missingItem, wordItem } from './arithmetic';
import { balanceItem, compareItem } from './mathCompare';
import { doubleHalfItem, placeValueItem } from './mathNumberSense';
import { oddOneOutItem, sequenceItem } from './mathPatterns';
import { moneyItem, storyItem } from './mathWorld';
import { backwardsItem, countingItem, positionItem, sumDifferenceItem } from './mathReasoning';
import { calendarItem, parityItem, pyramidItem } from './mathReasoning2';
import { cluesItem, hiddenDigitItem, machineItem } from './mathReasoning3';
import { scalesItem, triangleItem } from './mathReasoning4';
import { logicItem } from './mathReasoning5';
import { equalizeItem, legsItem } from './mathReasoning6';
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

/** C3 non-routine reasoning types: REASONING_PER_SESSION of them per session, weighted by weakness. */
export const REASONING_TAGS = [
    'work-backwards', 'sum-difference', 'position', 'counting', 'parity', 'number-wall', 'calendar',
    'number-machine', 'hidden-digit', 'clues', 'scales', 'magic-triangle', 'logic-grid', 'fair-share', 'heads-legs',
] as const;
export type ReasoningTag = typeof REASONING_TAGS[number];

export const ORIGINAL_TOTAL = 10;
export const ORIGINAL_FLOOR = 2;
export const REASONING_PER_SESSION = 2;
export const SESSION_COUNT = ORIGINAL_TOTAL + NUMBER_SENSE_TAGS.length + REASONING_PER_SESSION;

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

const REASONING_MAKERS: Readonly<Record<ReasoningTag, Maker>> = {
    'work-backwards': backwardsItem,
    'sum-difference': sumDifferenceItem,
    position: positionItem,
    counting: countingItem,
    parity: parityItem,
    'number-wall': pyramidItem,
    calendar: calendarItem,
    'number-machine': machineItem,
    'hidden-digit': hiddenDigitItem,
    clues: cluesItem,
    scales: scalesItem,
    'magic-triangle': triangleItem,
    'logic-grid': logicItem,
    'fair-share': equalizeItem,
    'heads-legs': legsItem,
};

/** 1 - accuracy of one skill; 0.5 when it has no attempts yet. */
const weaknessOf = (state: PrepProgressState, tag: SkillTag) => {
    const accuracy = derivePrepTypeProgress(state).find(p => p.skill === tag)?.accuracy ?? null;
    return accuracy == null ? 0.5 : 1 - accuracy;
};

/** 1 + weakness; weakness = max over member tags of (null -> 0.5, else 1 - accuracy). Always >= 1. */
export function originalTypeWeight(state: PrepProgressState, type: MathOriginalType): number {
    return 1 + Math.max(...MEMBER_TAGS[type].map(tag => weaknessOf(state, tag)));
}

/** Weighted draw of `n` distinct types from `types`, without replacement; ties favor earlier index. */
function weightedDrawWithoutReplacement<T>(
    rng: Rng, types: readonly T[], weights: readonly number[], n: number,
): T[] {
    const pool = types.map((type, i) => ({ type, weight: weights[i] }));
    const picked: T[] = [];
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

/** REASONING_PER_SESSION distinct reasoning types, weak ones more likely (weight 1 + weakness). */
export function reasoningPicks(rng: Rng, state: PrepProgressState): ReasoningTag[] {
    const weights = REASONING_TAGS.map(tag => 1 + weaknessOf(state, tag));
    return weightedDrawWithoutReplacement(rng, REASONING_TAGS, weights, REASONING_PER_SESSION);
}

/**
 * A reasoning type's level follows the kid on that type, not the session position: easy until 3 attempts
 * and while under 50% right, hardest from 80%.
 */
export function reasoningDifficulty(state: PrepProgressState, tag: ReasoningTag): Difficulty {
    const p = derivePrepTypeProgress(state).find(t => t.skill === tag);
    if (!p || p.attempts < 3 || (p.accuracy ?? 0) < 0.5) return 1;
    return (p.accuracy ?? 0) >= 0.8 ? 3 : 2;
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
 * 18-item adaptive math learning session: the 4 original Stage-A types keep 10 slots (weighted by
 * weakness, floor 2 each), number-sense keeps its per-session floor (every tag exactly once), and
 * 2 reasoning types close the session, each at the level the kid has reached on it.
 * These items are all procedural (no bank ids), so there is no `seen` parameter (as in buildMath).
 */
export function buildAdaptiveMath(rng: Rng, state: PrepProgressState): PrepItem[] {
    const makers = makerOrder(originalTypeCounts(rng, state));
    for (const tag of reasoningPicks(rng, state)) {
        const level = reasoningDifficulty(state, tag);
        makers.push(seed => REASONING_MAKERS[tag](seed, level));
    }
    return buildGuarded(rng, SESSION_COUNT, (seed, difficulty, i) => makers[i](seed, difficulty));
}
