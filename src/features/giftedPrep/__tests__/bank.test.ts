import { describe, it, expect } from 'vitest';
import shippedReading from '../content/he/reading.json';
import shippedLanguage from '../content/he/language.json';
import draftReading from '../../../../content-drafts/gifted-prep/he/reading.json';
import draftLanguage from '../../../../content-drafts/gifted-prep/he/language.json';
import { languageItems, readingItems, type BankLanguageItem, type BankPassage, type BankQuestion } from '../engine/bank';
import { parseLanguageBank, parseReadingBank } from '../engine/bankSchema';
import { makeBuilders } from '../engine/sections';
import { mulberry32 } from '../engine/prng';
import { SKILL_TAGS } from '../types';

const HEBREW = /[֐-׿]/;
const MARKS = /[֑-ׇ]/g;
const HAS_MARK = /[֑-ׇ]/;

/** Plain fields carry no niqqud; a vocalized twin, when present, strips back to exactly the plain text. */
function checkText(id: string, plain: string, voc?: string) {
    expect(HAS_MARK.test(plain), `${id} plain text has niqqud`).toBe(false);
    if (voc !== undefined) {
        expect(voc.replace(MARKS, ''), `${id} vocalized twin changes letters`).toBe(plain);
        if (HEBREW.test(plain)) expect(HAS_MARK.test(voc), `${id} vocalized twin has no marks`).toBe(true);
    }
}

function checkQuestion(q: BankQuestion) {
    expect(q.options, q.id).toHaveLength(4);
    expect(new Set(q.options).size, `${q.id} duplicate options`).toBe(4);
    expect(q.answerIndex, q.id).toBeGreaterThanOrEqual(0);
    expect(q.answerIndex, q.id).toBeLessThan(4);
    expect(q.stem, q.id).toMatch(HEBREW);
    expect(q.explanation.length, `${q.id} explanation`).toBeGreaterThan(5);
    expect(SKILL_TAGS, q.id).toContain(q.skill);
    q.options.forEach(o => expect(o.length, `${q.id} option too long for 375px`).toBeLessThanOrEqual(60));
    checkText(`${q.id}.stem`, q.stem, q.stemNiqqud);
    checkText(`${q.id}.explanation`, q.explanation, q.explanationNiqqud);
    q.options.forEach((o, i) => checkText(`${q.id}.o${i}`, o, q.optionsNiqqud?.[i]));
    if (q.optionsNiqqud) expect(q.optionsNiqqud, q.id).toHaveLength(4);
}

function checkPassage(p: BankPassage) {
    expect(p.source, p.id).toBe('original');
    expect(p.text, p.id).toMatch(HEBREW);
    checkText(`${p.id}.title`, p.title, p.titleNiqqud);
    checkText(`${p.id}.text`, p.text, p.textNiqqud);
    expect(p.questions.length, p.id).toBeGreaterThanOrEqual(2);
    p.questions.forEach(q => {
        expect(q.id.startsWith(`${p.id}-q`), q.id).toBe(true);
        checkQuestion(q);
    });
}

const keyOf = (q: BankQuestion) => q.options[q.answerIndex];

describe('gifted-prep Hebrew banks', () => {
    const shippedP = parseReadingBank(shippedReading);
    const shippedL = parseLanguageBank(shippedLanguage);
    const draftP = parseReadingBank(draftReading);
    const draftL = parseLanguageBank(draftLanguage);

    it('ships ONLY items Ram reviewed (ADR §8)', () => {
        shippedP.forEach(p => expect(p.reviewStatus, p.id).toBe('reviewed'));
        shippedL.forEach(i => expect(i.reviewStatus, i.id).toBe('reviewed'));
    });

    it('shipped and draft items are schema-valid and original', () => {
        [...shippedP, ...draftP].forEach(checkPassage);
        [...shippedL, ...draftL].forEach((i: BankLanguageItem) => {
            expect(i.source, i.id).toBe('original');
            checkQuestion(i);
        });
    });

    it('rejects a content typo in skill instead of casting it', () => {
        const bad = { items: [{ ...draftLanguage.items[0], skill: 'litteral' }] };
        expect(() => parseLanguageBank(bad)).toThrow(/unknown skill/);
    });

    it('ids are unique', () => {
        const ids = [...draftP.flatMap(p => [p.id, ...p.questions.map(q => q.id)]), ...draftL.map(i => i.id)];
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('a bank section lights up only when its pool has items', () => {
        const empty = makeBuilders([], []);
        expect(empty.reading).toBeUndefined();
        expect(empty.language).toBeUndefined();
        expect(empty.math).toBeDefined();
        const full = makeBuilders(draftP, draftL);
        expect(full.reading).toBeDefined();
        expect(full.language).toBeDefined();
        expect(full.reading!(mulberry32(1), 5, new Set()).length).toBeGreaterThanOrEqual(5);
    });

    it('reading sessions keep passages whole, reach the count, and keep the key (plain and vocalized)', () => {
        const items = readingItems(mulberry32(4), 12, new Set(), draftP);
        expect(items.length).toBeGreaterThanOrEqual(12);
        const byPassage = new Map<string, number>();
        items.forEach(it => byPassage.set(it.stem.passage!.id, (byPassage.get(it.stem.passage!.id) ?? 0) + 1));
        byPassage.forEach((n, id) => expect(n).toBe(draftP.find(p => p.id === id)!.questions.length));
        const all = draftP.flatMap(p => p.questions);
        items.forEach(it => {
            const src = all.find(q => q.id === it.id)!;
            expect(it.options[it.answerIndex]).toBe(keyOf(src));
            if (src.optionsNiqqud) expect(it.optionsNiqqud![it.answerIndex]).toBe(src.optionsNiqqud[src.answerIndex]);
        });
    });

    it('prefers passages the child has not seen', () => {
        const seen = new Set(draftP.slice(0, 30).flatMap(p => p.questions.map(q => q.id)));
        readingItems(mulberry32(8), 6, seen, draftP).forEach(it => expect(seen.has(it.id)).toBe(false));
    });

    it('language sessions shuffle options but keep the key, including a non-zero key', () => {
        const items = languageItems(mulberry32(2), 10, new Set(), draftL);
        expect(items).toHaveLength(10);
        items.forEach(it => expect(it.options[it.answerIndex]).toBe(keyOf(draftL.find(d => d.id === it.id)!)));
        const moved = draftL.map(i => ({ ...i, options: [i.options[1], i.options[0], i.options[2], i.options[3]], answerIndex: 1 }));
        languageItems(mulberry32(3), 10, new Set(), moved)
            .forEach(it => expect(it.options[it.answerIndex]).toBe(draftL.find(d => d.id === it.id)!.options[0]));
    });
});
