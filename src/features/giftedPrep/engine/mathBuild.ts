import type { Difficulty, PrepItem, PrepKind, PrepStem, SkillTag } from '../types';
import { numericDistractors } from './distractors';
import { shuffleOptions, type Rng } from './prng';

export interface NumericSpec {
    readonly kind: PrepKind;
    readonly skill: SkillTag;
    readonly stem: PrepStem;
    readonly answer: number;
    /** Wrong answers, each from exactly one slip; filled up with off-by-one / off-by-ten slips. */
    readonly slips: readonly number[];
    readonly explanation: string;
    readonly max?: number;
}

/** A 4-option numeric item: the answer plus three distinct non-negative distractors, shuffled by seed. */
export function numericItem(rng: Rng, seed: number, difficulty: Difficulty, spec: NumericSpec): PrepItem {
    const wrong = numericDistractors(rng, { answer: spec.answer, slips: spec.slips, max: spec.max });
    const { options, answerIndex } = shuffleOptions(rng, [spec.answer, ...wrong].map(String), 0);
    return {
        id: `${spec.kind}:${difficulty}:${seed}`, kind: spec.kind, section: 'math', skill: spec.skill, difficulty,
        stem: spec.stem, options, answerIndex, explanation: spec.explanation, source: 'procedural', seed,
    };
}

/** A 4-option item whose options are given strings (expressions, numbers); `options[0]` is the key. */
export function choiceItem(
    rng: Rng, seed: number, difficulty: Difficulty,
    spec: Omit<NumericSpec, 'answer' | 'slips' | 'max'> & { readonly options: readonly string[] },
): PrepItem {
    const { options, answerIndex } = shuffleOptions(rng, spec.options, 0);
    return {
        id: `${spec.kind}:${difficulty}:${seed}`, kind: spec.kind, section: 'math', skill: spec.skill, difficulty,
        stem: spec.stem, options, answerIndex, explanation: spec.explanation, source: 'procedural', seed,
    };
}
