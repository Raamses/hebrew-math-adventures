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

export const buildMath: SectionBuilder = (rng, count) =>
    Array.from({ length: count }, (_, i) => mathItem(intBetween(rng, 1, 2 ** 31 - 2), difficultyAt(i, count)));

/** Each content PR adds its section here; the hub shows "soon" for sections not listed yet. */
const BUILDERS: Partial<Record<PrepSection, SectionBuilder>> = {
    math: buildMath,
};

export function getSectionBuilder(section: PrepSection): SectionBuilder | undefined {
    return BUILDERS[section];
}
