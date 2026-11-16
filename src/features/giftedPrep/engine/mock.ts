import type { PrepItem, PrepSection } from '../types';
import { getSectionBuilder } from './sections';
import type { Rng } from './prng';

/**
 * Stage-A practice test, scaled down for a 7-year-old at home. The real booklet (Ministry key, תשפ"ה)
 * has a reading part (2 passages, 12 questions) and an arithmetic part (~14 tasks). Here: one part each,
 * ~10 questions, a gentle timer per part, no going back. Language items are practice only (not on the key).
 */
export interface MockPart {
    readonly section: PrepSection;
    readonly items: readonly PrepItem[];
    readonly seconds: number;
}

export const MOCK_PLAN: readonly { section: PrepSection; count: number; seconds: number }[] = [
    { section: 'reading', count: 10, seconds: 12 * 60 },
    { section: 'math', count: 10, seconds: 10 * 60 },
];

/** Parts whose section has content; a section without reviewed items is left out, not faked. */
export function buildMock(rng: Rng, seen: ReadonlySet<string>): MockPart[] {
    return MOCK_PLAN.flatMap(({ section, count, seconds }) => {
        const build = getSectionBuilder(section);
        if (!build) return [];
        const items = build(rng, count, seen);
        // Reading keeps passages whole, so a part can run past `count`; the timer keeps the same pace per question
        return items.length ? [{ section, items, seconds: Math.round((seconds * Math.max(count, items.length)) / count) }] : [];
    });
}
