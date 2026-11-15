import { describe, it, expect } from 'vitest';
import shippedReading from '../content/he/reading.json';
import shippedLanguage from '../content/he/language.json';
import draftReading from '../../../../content-drafts/gifted-prep/he/reading.json';
import draftLanguage from '../../../../content-drafts/gifted-prep/he/language.json';
import { languageItems, readingItems, type BankLanguageItem, type BankPassage, type BankQuestion } from '../engine/bank';
import { mulberry32 } from '../engine/prng';

const HEBREW = /[֐-׿]/;
const NIQQUD = /[֑-ׇ]/;
const SKILLS = ['literal', 'inference', 'vocabulary', 'main-idea', 'sequence', 'word-meaning', 'sentence-completion'];

function checkQuestion(q: BankQuestion) {
    expect(q.options, q.id).toHaveLength(4);
    expect(new Set(q.options).size, `${q.id} duplicate options`).toBe(4);
    expect(q.answerIndex, q.id).toBeGreaterThanOrEqual(0);
    expect(q.answerIndex, q.id).toBeLessThan(4);
    expect(q.stem, q.id).toMatch(HEBREW);
    expect(q.explanation.length, `${q.id} explanation`).toBeGreaterThan(5);
    expect(SKILLS, q.id).toContain(q.skill);
    q.options.forEach(o => expect(o.length, `${q.id} option too long for 375px`).toBeLessThanOrEqual(60));
}

function checkPassage(p: BankPassage) {
    expect(p.source, p.id).toBe('original');
    expect(p.text, p.id).toMatch(HEBREW);
    expect(p.text, `${p.id} has niqqud`).not.toMatch(NIQQUD);
    expect(p.questions.length, p.id).toBeGreaterThanOrEqual(2);
    p.questions.forEach(q => {
        expect(q.id.startsWith(`${p.id}-q`), q.id).toBe(true);
        checkQuestion(q);
    });
}

const allIds = (ps: readonly BankPassage[], items: readonly BankLanguageItem[]) =>
    [...ps.flatMap(p => [p.id, ...p.questions.map(q => q.id)]), ...items.map(i => i.id)];

describe('gifted-prep Hebrew banks', () => {
    const shippedP = shippedReading.passages as readonly BankPassage[];
    const shippedL = shippedLanguage.items as readonly BankLanguageItem[];
    const draftP = draftReading.passages as readonly BankPassage[];
    const draftL = draftLanguage.items as readonly BankLanguageItem[];

    it('ships ONLY items Ram reviewed (ADR §8)', () => {
        shippedP.forEach(p => expect(p.reviewStatus, p.id).toBe('reviewed'));
        shippedL.forEach(i => expect(i.reviewStatus, i.id).toBe('reviewed'));
    });

    it('shipped and draft items are schema-valid and original', () => {
        [...shippedP, ...draftP].forEach(checkPassage);
        [...shippedL, ...draftL].forEach(i => {
            expect(i.source, i.id).toBe('original');
            expect(['word-meaning', 'sentence-completion'], i.id).toContain(i.kind);
            checkQuestion(i);
        });
    });

    it('ids are unique', () => {
        const ids = allIds(draftP, draftL);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('reading sessions keep passages whole and reach the requested count', () => {
        const items = readingItems(mulberry32(4), 12, new Set(), draftP);
        expect(items.length).toBeGreaterThanOrEqual(12);
        const byPassage = new Map<string, number>();
        items.forEach(it => byPassage.set(it.stem.passage!.id, (byPassage.get(it.stem.passage!.id) ?? 0) + 1));
        byPassage.forEach((n, id) => expect(n).toBe(draftP.find(p => p.id === id)!.questions.length));
        items.forEach(it => expect(it.options[it.answerIndex]).toBe(
            draftP.flatMap(p => p.questions).find(q => q.id === it.id)!.options[0]));
    });

    it('prefers passages the child has not seen', () => {
        const seen = new Set(draftP.slice(0, 30).flatMap(p => p.questions.map(q => q.id)));
        const items = readingItems(mulberry32(8), 6, seen, draftP);
        items.forEach(it => expect(seen.has(it.id)).toBe(false));
    });

    it('language sessions shuffle options but keep the key', () => {
        const items = languageItems(mulberry32(2), 10, new Set(), draftL);
        expect(items).toHaveLength(10);
        items.forEach(it => expect(it.options[it.answerIndex]).toBe(draftL.find(d => d.id === it.id)!.options[0]));
    });
});
