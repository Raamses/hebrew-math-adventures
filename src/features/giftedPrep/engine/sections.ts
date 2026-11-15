import type { PrepItem, PrepSection } from '../types';
import type { Rng } from './prng';

/** Builds `count` items for one section. `seen` holds bank ids the child answered recently. */
export type SectionBuilder = (rng: Rng, count: number, seen: ReadonlySet<string>) => PrepItem[];

/** Order matches the Stage-A booklet: reading first, then math. Language is practice-only. */
export const SECTION_ORDER: readonly PrepSection[] = ['reading', 'language', 'math'];

export const SECTION_EMOJI: Readonly<Record<PrepSection, string>> = {
    reading: '📖',
    language: '🔤',
    math: '🔢',
};

const builders: Partial<Record<PrepSection, SectionBuilder>> = {};

/** Each content PR registers its section; the hub shows "soon" for sections not registered yet. */
export function registerSection(section: PrepSection, builder: SectionBuilder): void {
    builders[section] = builder;
}

export function getSectionBuilder(section: PrepSection): SectionBuilder | undefined {
    return builders[section];
}
