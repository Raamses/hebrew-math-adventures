/**
 * Gifted-prep item contract (ADR vault/decisions/2026-11-gifted-prep-stage-a.md).
 * Shape puzzles (series, 3×3 matrices, odd one out, figural analogies) ride on 'math-picture' with drawn
 * options (`optionFigures`); further Stage B kinds extend this union without changing the player.
 */

/** Test sections, in the order the Stage-A screening presents them. */
export type PrepSection = 'reading' | 'language' | 'math';

export type PrepKind =
    | 'math-exercise'        // "37 + 25 = ?"
    | 'math-missing'         // "? + 8 = 23"
    | 'math-word'            // short word problem
    | 'math-picture'         // picture puzzle: "🍎 + 🍎 = 8", how much is 🍎?
    | 'math-sequence'        // "3, 5, 7, 9, ?"
    | 'math-compare'         // which exercise has the biggest result?
    | 'math-odd-one-out'     // which number does not belong?
    | 'math-place-value'     // "4 tens and 7 ones"
    | 'math-double-half'     // double 16, half of 30
    | 'math-money'           // coins and change, in shekels
    | 'math-backwards'       // C3 reasoning: "I added 4, doubled it and got 20"
    | 'math-sum-difference'  // together 20, one has 6 more
    | 'math-position'        // places in a line, fence posts, floors
    | 'math-counting'        // handshakes, coin combinations, numbers from digits
    | 'math-parity'          // which total of odd numbers is even possible
    | 'math-pyramid'         // number pyramid: each brick is the sum of the two below
    | 'math-calendar'        // the 7-day week, a month running out
    | 'math-machine'         // number machine: find the in→out rule
    | 'math-hidden-digit'    // "4⭐ + ⭐5 = 87": which digit is ⭐
    | 'math-clues'           // "I'm thinking of a number" with 2-3 clues
    | 'math-scales'          // order by weight from comparisons; trade along balances
    | 'math-triangle'        // magic triangle: every side has the same sum
    | 'math-logic'           // who has what: four children, four pets, has / has-not clues
    | 'math-equalize'        // fair sharing: move half the gap, or down to the fair share
    | 'math-legs'            // heads and legs: chickens and sheep, beetles and spiders
    | 'reading'              // question about a passage
    | 'word-meaning'
    | 'sentence-completion';

/** Every skill tag; bank JSON is validated against this list at load (engine/bank.ts). */
export const SKILL_TAGS = [
    'add', 'sub', 'missing-number', 'word-problem', 'picture-puzzle',
    'number-pattern', 'compare', 'odd-one-out', 'place-value', 'double-half', 'money',
    'work-backwards', 'sum-difference', 'position', 'counting', 'parity', 'number-wall', 'calendar',
    'number-machine', 'hidden-digit', 'clues', 'scales', 'magic-triangle', 'logic-grid', 'fair-share', 'heads-legs',
    'literal', 'inference', 'vocabulary', 'main-idea', 'sequence',
    'word-meaning', 'sentence-completion',
] as const;
export type SkillTag = typeof SKILL_TAGS[number];

export type Difficulty = 1 | 2 | 3;

import type { Figure, FigureBoard } from './engine/figures';

/** The stem is data, never JSX. `equation` is rendered inside <div dir="ltr">. */
export interface PrepStem {
    readonly text?: string;
    /** Fully vocalized twin of `text` (bank items); shown when niqqud is on. */
    readonly textNiqqud?: string;
    readonly equation?: string;
    /** Picture-puzzle lines ("🍎 + 🍎 = 8"), each rendered LTR like an equation. */
    readonly pictureLines?: readonly string[];
    /** Number pyramid, top row first: a number, '?' (the asked brick) or '' (an empty brick). Drawn as bricks. */
    readonly pyramid?: readonly (readonly string[])[];
    /** Magic triangle, 6 circles: top, left middle, bottom left, bottom middle, bottom right, right middle ('' empty, '?' asked). */
    readonly triangle?: readonly string[];
    /** Shape puzzles: a row, a 3×3 grid or an A:B::C:? analogy of drawn figures, `null` = the "?" cell (components/PrepFigure.tsx). */
    readonly figures?: FigureBoard;
    /** Reading items carry their passage so the player can show it above the question. */
    readonly passage?: {
        readonly id: string;
        readonly title: string;
        readonly text: string;
        readonly titleNiqqud?: string;
        readonly textNiqqud?: string;
    };
}

export interface PrepItem {
    readonly id: string;
    readonly kind: PrepKind;
    readonly section: PrepSection;
    readonly skill: SkillTag;
    readonly difficulty: Difficulty;
    readonly stem: PrepStem;
    /** Always 4 options, already shuffled by seed. Numeric options render LTR. */
    readonly options: readonly string[];
    readonly answerIndex: number;
    readonly optionsNiqqud?: readonly string[];
    /** Shape puzzles: the figure drawn for each option; `options` then holds each figure's Hebrew label. */
    readonly optionFigures?: readonly Figure[];
    /** Kid-language Hebrew explanation shown after answering in learning mode. */
    readonly explanation: string;
    readonly explanationNiqqud?: string;
    readonly source: 'procedural' | 'bank';
    readonly seed?: number;
}

/** One answered item, as stored in the attempt log (no child-typed text, no PII). */
export interface PrepAttempt {
    readonly itemId: string;
    readonly section: PrepSection;
    readonly skill: SkillTag;
    readonly correct: boolean;
    readonly ms: number;
    readonly at: number;
    /** Wrong attempts only (G7.2 parent view, engine/mistakeDetails.ts): the app's own question text,
     * the key and the chosen option. Optional in schema v1: attempts recorded before G7.2 have none. */
    readonly question?: string;
    readonly answer?: string;
    readonly chosen?: string;
}

export interface PrepSkillStat {
    readonly attempts: number;
    readonly correct: number;
}

export interface PrepMockResult {
    readonly at: number;
    /** Only the parts that ran (language is never in the mock; reading only once it has reviewed content). */
    readonly sections: Readonly<Partial<Record<PrepSection, { readonly answered: number; readonly correct: number; readonly total: number }>>>;
}

export const PREP_SCHEMA_VERSION = 1;

export interface PrepProgressState {
    readonly schemaVersion: typeof PREP_SCHEMA_VERSION;
    readonly skills: Readonly<Partial<Record<SkillTag, PrepSkillStat>>>;
    readonly attempts: readonly PrepAttempt[];
    readonly mocks: readonly PrepMockResult[];
    /** Bank item ids seen recently, so sessions prefer unseen items. */
    readonly seenIds: readonly string[];
    /** Show vocalized text (ניקוד). Optional in schema v1; absent means on (grade-2 readers). */
    readonly niqqud?: boolean;
}
