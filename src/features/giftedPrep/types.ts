/**
 * Gifted-prep item contract (ADR vault/decisions/2026-11-gifted-prep-stage-a.md).
 * Stage A needs only the kinds below; Stage B kinds (matrix, figural series, analogies) extend
 * this union later without changing the player.
 */

/** Test sections, in the order the Stage-A screening presents them. */
export type PrepSection = 'reading' | 'language' | 'math';

export type PrepKind =
    | 'math-exercise'        // "37 + 25 = ?"
    | 'math-missing'         // "? + 8 = 23"
    | 'math-word'            // short word problem
    | 'reading'              // question about a passage
    | 'word-meaning'
    | 'sentence-completion';

/** Every skill tag; bank JSON is validated against this list at load (engine/bank.ts). */
export const SKILL_TAGS = [
    'add', 'sub', 'missing-number', 'word-problem',
    'literal', 'inference', 'vocabulary', 'main-idea', 'sequence',
    'word-meaning', 'sentence-completion',
] as const;
export type SkillTag = typeof SKILL_TAGS[number];

export type Difficulty = 1 | 2 | 3;

/** The stem is data, never JSX. `equation` is rendered inside <div dir="ltr">. */
export interface PrepStem {
    readonly text?: string;
    /** Fully vocalized twin of `text` (bank items); shown when niqqud is on. */
    readonly textNiqqud?: string;
    readonly equation?: string;
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
    /** Kid-language Hebrew explanation shown after answering in learning mode. */
    readonly explanation: string;
    readonly explanationNiqqud?: string;
    readonly source: 'procedural' | 'bank';
    readonly seed?: number;
}

/** One answered item, as stored in the attempt log (no free text, no PII). */
export interface PrepAttempt {
    readonly itemId: string;
    readonly section: PrepSection;
    readonly skill: SkillTag;
    readonly correct: boolean;
    readonly ms: number;
    readonly at: number;
}

export interface PrepSkillStat {
    readonly attempts: number;
    readonly correct: number;
}

export interface PrepMockResult {
    readonly at: number;
    readonly sections: Readonly<Record<PrepSection, { readonly answered: number; readonly correct: number; readonly total: number }>>;
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
