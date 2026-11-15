import type { Difficulty, PrepItem, PrepSection } from '../types';
import { mathItem } from './arithmetic';
import { intBetween, type Rng } from './prng';

/** Builds `count` items for one section. `seen` holds bank ids the child answered recently. */
export type SectionBuilder = (rng: Rng, count: number, seen: ReadonlySet<string>) => PrepItem[];

/** Order matches the Stage-A booklet: reading first, then math. Language is practice-only. */
export const SECTION_ORDER: readonly PrepSection[] = ['reading', 'language', 'math'];

export const SECTION_EMOJI: Readonly<Record<PrepSection, string>> = {
    reading: '📖',
    language: '🔤',
    math: '🔢',
};

/** Easy → harder within a session: first third difficulty 1, last quarter difficulty 3. */
export function difficultyAt(i: number, count: number): Difficulty {
    if (i < Math.ceil(count / 3)) return 1;
    if (i >= count - Math.floor(count / 4)) return 3;
    return 2;
}

/** All numbers an item shows (operands and result), used by the repetition guard. */
export function itemNumbers(item: PrepItem): number[] {
    const text = `${item.stem.equation ?? ''} ${item.stem.text ?? ''} ${item.options[item.answerIndex]}`;
    return (text.match(/\d+/g) ?? []).map(Number);
}

const GUARD = 3;
const stemKey = (item: PrepItem) => item.stem.equation ?? item.stem.text ?? item.id;
const MAX_TRIES = 30;

/**
 * Procedural math with the repetition guard (vault/rules/math-curriculum.md): a new item that shares an
 * operand or result with any of the last 3, or repeats an earlier item of the session, is regenerated. `seen` holds bank ids, which
 * procedural items do not have, so it is not used here.
 */
export const buildMath: SectionBuilder = (rng, count) => {
    const out: PrepItem[] = [];
    for (let i = 0; i < count; i++) {
        const recent = new Set(out.slice(-GUARD).flatMap(itemNumbers));
        const shown = new Set(out.map(stemKey));
        const clashes = (it: PrepItem) => shown.has(stemKey(it)) || itemNumbers(it).some(n => recent.has(n));
        let item = mathItem(intBetween(rng, 1, 2 ** 31 - 2), difficultyAt(i, count));
        for (let t = 0; t < MAX_TRIES && clashes(item); t++) {
            item = mathItem(intBetween(rng, 1, 2 ** 31 - 2), difficultyAt(i, count));
        }
        out.push(item);
    }
    return out;
};

/** Each content PR adds its section here; the hub shows "soon" for sections not listed yet. */
const BUILDERS: Partial<Record<PrepSection, SectionBuilder>> = {
    math: buildMath,
};

export function getSectionBuilder(section: PrepSection): SectionBuilder | undefined {
    return BUILDERS[section];
}
