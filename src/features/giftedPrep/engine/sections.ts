import type { Difficulty, PrepItem, PrepSection } from '../types';
import { mathItem } from './arithmetic';
import { LANGUAGE_ITEMS, READING_PASSAGES, languageItems, readingItems, type BankLanguageItem, type BankPassage } from './bank';
import { intBetween, type Rng } from './prng';
import { pyramidText } from './mistakeDetails';

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
    const text = `${item.stem.equation ?? ''} ${(item.stem.pictureLines ?? []).join(' ')} ${item.stem.pyramid ? pyramidText(item.stem.pyramid) : ''} ${item.stem.text ?? ''} ${item.options[item.answerIndex]}`;
    return (text.match(/\d+/g) ?? []).map(Number);
}

const GUARD = 3;
/** What makes two items "the same question": the equation or picture, else the text plus its options
 * (compare / odd-one-out items share one stem text, so the options tell them apart). */
export const stemKey = (item: PrepItem) => item.stem.equation ?? item.stem.pictureLines?.join('|')
    ?? (item.stem.pyramid && pyramidText(item.stem.pyramid))
    ?? `${item.stem.text ?? item.id}|${[...item.options].sort().join(',')}`;
const MAX_TRIES = 30;

/**
 * Repetition guard (vault/rules/math-curriculum.md): a new item that shares an operand or result
 * with any of the last GUARD items, or repeats an earlier item of the session, is regenerated (up
 * to MAX_TRIES) before being accepted. `make` builds one item from a seed, difficulty and its
 * index in the session (the adaptive math builder varies makers by index).
 */
export function buildGuarded(
    rng: Rng, count: number,
    make: (seed: number, difficulty: Difficulty, i: number) => PrepItem,
): PrepItem[] {
    const out: PrepItem[] = [];
    for (let i = 0; i < count; i++) {
        const recent = new Set(out.slice(-GUARD).flatMap(itemNumbers));
        const shown = new Set(out.map(stemKey));
        const clashes = (it: PrepItem) => shown.has(stemKey(it)) || itemNumbers(it).some(n => recent.has(n));
        let item = make(intBetween(rng, 1, 2 ** 31 - 2), difficultyAt(i, count), i);
        for (let t = 0; t < MAX_TRIES && clashes(item); t++) {
            item = make(intBetween(rng, 1, 2 ** 31 - 2), difficultyAt(i, count), i);
        }
        out.push(item);
    }
    return out;
}

/**
 * Procedural math with the repetition guard: `seen` holds bank ids, which procedural items do not
 * have, so it is not used here.
 */
export const buildMath: SectionBuilder = (rng, count) =>
    buildGuarded(rng, count, (seed, difficulty) => mathItem(seed, difficulty));

/**
 * Builder map for the given banks: a bank section lights up only once Ram's review promoted at least one
 * item into content/he/ (empty pool -> section absent -> "soon" in the hub). Exported for tests.
 */
export function makeBuilders(
    passages: readonly BankPassage[], items: readonly BankLanguageItem[],
): Partial<Record<PrepSection, SectionBuilder>> {
    return {
        math: buildMath,
        ...(passages.length > 0 ? { reading: (rng: Rng, n: number, seen: ReadonlySet<string>) => readingItems(rng, n, seen, passages) } : {}),
        ...(items.length > 0 ? { language: (rng: Rng, n: number, seen: ReadonlySet<string>) => languageItems(rng, n, seen, items) } : {}),
    };
}

const BUILDERS = makeBuilders(READING_PASSAGES, LANGUAGE_ITEMS);

export function getSectionBuilder(section: PrepSection): SectionBuilder | undefined {
    return BUILDERS[section];
}
