import { describe, it, expect, vi } from 'vitest';
import shippedReading from '../content/he/reading.json';
import shippedLanguage from '../content/he/language.json';
import shippedAnalogies from '../content/he/analogies.json';
import draftReading from '../../../../content-drafts/gifted-prep/he/reading.json';
import draftLanguage from '../../../../content-drafts/gifted-prep/he/language.json';
import draftAnalogies from '../../../../content-drafts/gifted-prep/he/analogies.json';
import {
    ANALOGY_ITEMS, languageItems, readingItems,
    type BankAnalogyItem, type BankLanguageItem, type BankPassage, type BankQuestion,
} from '../engine/bank';
import { parseAnalogyBank, parseLanguageBank, parseReadingBank } from '../engine/bankSchema';
import { getSectionBuilder, makeBuilders } from '../engine/sections';
import { mulberry32 } from '../engine/prng';
import { SKILL_TAGS } from '../types';
import { hasNiqqud, stripNiqqud } from '../engine/niqqud';

const HEBREW = /[֐-׿]/;

/** Plain fields carry no niqqud; a vocalized twin, when present, strips back to exactly the plain text. */
function checkText(id: string, plain: string, voc?: string) {
    expect(hasNiqqud(plain), `${id} plain text has niqqud`).toBe(false);
    if (voc !== undefined) {
        expect(stripNiqqud(voc), `${id} vocalized twin changes letters`).toBe(plain);
        if (HEBREW.test(plain)) expect(hasNiqqud(voc), `${id} vocalized twin has no marks`).toBe(true);
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

// A key that restates the passage's main-idea key gives the answer away twice (#315, #317 reviews).
// Content words only: niqqud and punctuation dropped, very common function words ignored.
const KEY_STOP = new Set(['כי', 'של', 'שלו', 'שלה', 'את', 'על', 'עם', 'לא', 'הוא', 'היא', 'זה', 'גם', 'כל', 'אבל', 'או', 'יש', 'מה', 'אם', 'רק', 'כדי', 'לו', 'לה', 'אל', 'מאוד']);
const contentWords = (s: string) => new Set(stripNiqqud(s).replace(/[^א-ת]+/g, ' ').split(' ').filter(w => w.length > 1 && !KEY_STOP.has(w)));
// Shipped before the guard existed: rc-055-q2's key is contained in q1's title key. Board card 6335a158 rewords it
// (Ram approves on a review page); remove the id here when that ships. Do not add to this list.
const KEY_REPEAT_REVIEWED = new Set(['rc-055-q2']);
function keyRepeats(p: BankPassage, exempt: ReadonlySet<string> = KEY_REPEAT_REVIEWED): string[] {
    const out: string[] = [];
    for (const m of p.questions.filter(q => q.skill === 'main-idea')) {
        const mk = contentWords(keyOf(m));
        for (const q of p.questions) {
            if (q === m || exempt.has(q.id)) continue;
            const k = contentWords(keyOf(q));
            const shared = [...k].filter(w => mk.has(w)).length;
            if (shared >= 2 && shared / Math.min(k.size, mk.size) >= 0.75) out.push(`${q.id} repeats ${m.id}`);
        }
    }
    return out;
}

describe('gifted-prep Hebrew banks', () => {
    const shippedP = parseReadingBank(shippedReading);
    const shippedL = parseLanguageBank(shippedLanguage);
    const draftP = parseReadingBank(draftReading);
    const draftL = parseLanguageBank(draftLanguage);
    // Verbal analogies: the shipped bank stays empty until Ram approves drafts, so the content checks also run
    // over the drafts, and the engine tests below use the drafts.
    const shippedA = parseAnalogyBank(shippedAnalogies);
    const draftA = parseAnalogyBank(draftAnalogies);

    it('ships ONLY items Ram reviewed (ADR §8; the review covers the plain text)', () => {
        shippedP.forEach(p => expect(p.reviewStatus, p.id).toBe('reviewed'));
        shippedL.forEach(i => expect(i.reviewStatus, i.id).toBe('reviewed'));
        shippedA.forEach(i => expect(i.reviewStatus, i.id).toBe('reviewed'));
    });

    it('declares niqqud provenance whenever a bank carries vocalized twins (it is not part of the review)', () => {
        const hasTwins = (json: object) => JSON.stringify(json).includes('Niqqud"');
        const banks = [shippedReading, shippedLanguage, shippedAnalogies, draftReading, draftLanguage, draftAnalogies];
        for (const bank of banks as Record<string, unknown>[]) {
            if (hasTwins(bank)) expect(String(bank.niqqudProvenance)).toMatch(/not been human-reviewed/);
        }
    });

    it('treats maqaf and paseq as plain punctuation, not niqqud', () => {
        expect(hasNiqqud('בית־ספר')).toBe(false);
        expect(stripNiqqud('בֵּית־סֵפֶר')).toBe('בית־ספר');
    });

    it('rejects malformed items at load (option count, key range, twin length, difficulty)', () => {
        const base = draftLanguage.items[0];
        const bad = (patch: Record<string, unknown>) => () => parseLanguageBank({ items: [{ ...base, ...patch }] });
        expect(bad({ options: ['a', 'b', 'c'] })).toThrow(/exactly 4 options/);
        expect(bad({ answerIndex: 4 })).toThrow(/answerIndex/);
        expect(bad({ optionsNiqqud: ['a'] })).toThrow(/optionsNiqqud length/);
        expect(bad({ difficulty: undefined })).toThrow(/difficulty/);
    });

    it('shipped and draft items are schema-valid and original', () => {
        [...shippedP, ...draftP].forEach(checkPassage);
        [...shippedL, ...draftL].forEach((i: BankLanguageItem) => {
            expect(i.source, i.id).toBe('original');
            checkQuestion(i);
        });
    });

    it('verbal-analogy items (shipped and draft) are schema-valid, original, and every text has a twin that strips to it', () => {
        expect(draftA.length).toBeGreaterThan(0);
        [...shippedA, ...draftA].forEach((i: BankAnalogyItem) => {
            expect(i.source, i.id).toBe('original');
            expect(i.kind, i.id).toBe('verbal-analogy');
            expect(i.skill, i.id).toBe('verbal-analogy');
            expect(i.id, i.id).toMatch(/^va-[0-9]{3}$/);
            // checkQuestion strips each twin and requires exactly the plain text back
            checkQuestion(i);
            expect(i.stemNiqqud, `${i.id} stem twin`).toBeDefined();
            expect(i.explanationNiqqud, `${i.id} explanation twin`).toBeDefined();
            expect(i.optionsNiqqud, `${i.id} option twins`).toHaveLength(4);
        });
        draftA.forEach(i => expect(i.reviewStatus, i.id).toBe('draft'));
        // Every shipped analogy came through promote from a draft with the same id.
        const draftIds = new Set(draftA.map(i => i.id));
        shippedA.forEach(i => expect(draftIds.has(i.id), i.id).toBe(true));
    });

    it('rejects an analogy item whose kind is not verbal-analogy', () => {
        const bad = { items: [{ ...draftAnalogies.items[0], kind: 'word-meaning' }] };
        expect(() => parseAnalogyBank(bad)).toThrow(/unknown kind/);
    });

    it('rejects a content typo in skill instead of casting it', () => {
        const bad = { items: [{ ...draftLanguage.items[0], skill: 'litteral' }] };
        expect(() => parseLanguageBank(bad)).toThrow(/unknown skill/);
    });

    it('no key restates the main-idea key of its passage', () => {
        expect([...shippedP, ...draftP].flatMap(p => keyRepeats(p))).toEqual([]);
        // The one exception is real and tracked (card 6335a158): without it, the guard catches it on the shipped data.
        expect([...KEY_REPEAT_REVIEWED]).toEqual(['rc-055-q2']);
        expect(keyRepeats(shippedP.find(p => p.id === 'rc-055')!, new Set())).toEqual(['rc-055-q2 repeats rc-055-q1']);
    });

    it('the key-repeat guard flags at 2+ shared content words covering 75% of the shorter key, and only then', () => {
        const base = draftP[0];
        const q = (n: number, skill: BankQuestion['skill'], key: string): BankQuestion =>
            ({ ...base.questions[0], id: `${base.id}-q${n}`, skill, options: [key, 'א1', 'א2', 'א3'], answerIndex: 0 });
        const passage = (key: string): BankPassage =>
            ({ ...base, questions: [q(1, 'main-idea', 'שמש ירח כוכב שמיים'), q(2, 'inference', key)] });
        // No exceptions here, so the cases do not depend on KEY_REPEAT_REVIEWED.
        const flags = (key: string) => keyRepeats(passage(key), new Set());
        expect(flags('כי שמש ירח כוכב ים')).toEqual([`${base.id}-q2 repeats ${base.id}-q1`]); // 3 of 4 = 0.75
        expect(flags('שמש ירח ים חול')).toEqual([]); // 2 of 4 = 0.5
        expect(flags('שמש')).toEqual([]); // 1 shared word, even at 100%
        expect(flags('הַשֶּׁמֶשׁ, שמש; ירח!')).toEqual([]); // השמש (with the article) is its own word, not שמש: 2 shared of 3 = 0.67
        expect(flags('שמש, ירח!')).toEqual([`${base.id}-q2 repeats ${base.id}-q1`]); // 2 of 2
    });

    it('ids are unique', () => {
        const ids = [
            ...draftP.flatMap(p => [p.id, ...p.questions.map(q => q.id)]), ...draftL.map(i => i.id), ...draftA.map(i => i.id),
        ];
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
        // Verbal analogies alone light up the language section.
        const analogiesOnly = makeBuilders([], [], draftA);
        expect(analogiesOnly.reading).toBeUndefined();
        expect(analogiesOnly.language).toBeDefined();
        const drawn = analogiesOnly.language!(mulberry32(5), 6, new Set());
        expect(drawn).toHaveLength(6);
        drawn.forEach(it => expect([it.kind, it.section, it.skill]).toEqual(['verbal-analogy', 'language', 'verbal-analogy']));
    });

    it('the language section draws word-meaning, sentence-completion and verbal-analogy items from one pool', () => {
        const pool = draftL.length + draftA.length;
        const items = makeBuilders([], draftL, draftA).language!(mulberry32(6), pool, new Set());
        expect(items).toHaveLength(pool);
        expect(new Set(items.map(it => it.kind))).toEqual(new Set(['word-meaning', 'sentence-completion', 'verbal-analogy']));
        items.forEach(it => expect(it.section, it.id).toBe('language'));
        // each item keeps its key through the option shuffle
        const src = new Map([...draftL, ...draftA].map(i => [i.id, i]));
        items.forEach(it => expect(it.options[it.answerIndex], it.id).toBe(keyOf(src.get(it.id)!)));
    });

    it('the app wires the shipped analogy bank into the language section (engine/sections.ts BUILDERS)', async () => {
        // Load the engine with the draft analogies standing in for the shipped file, so the wiring is tested even
        // while the shipped bank is empty.
        vi.resetModules();
        vi.doMock('../content/he/analogies.json', () => ({ default: draftAnalogies }));
        try {
            const bank = await import('../engine/bank');
            const sections = await import('../engine/sections');
            expect(bank.ANALOGY_ITEMS.map(i => i.id)).toEqual(draftA.map(i => i.id));
            const n = bank.LANGUAGE_ITEMS.length + bank.ANALOGY_ITEMS.length;
            const items = sections.getSectionBuilder('language')!(mulberry32(7), n, new Set());
            expect(items.filter(it => it.kind === 'verbal-analogy')).toHaveLength(draftA.length);
        } finally {
            vi.doUnmock('../content/he/analogies.json');
            vi.resetModules();
        }
    });

    it('with the shipped (possibly empty) analogy bank the app still draws language items', () => {
        expect(ANALOGY_ITEMS).toHaveLength(shippedAnalogies.items.length);
        const build = getSectionBuilder('language');
        expect(build).toBeDefined();
        const items = build!(mulberry32(9), 10, new Set());
        expect(items).toHaveLength(10);
        items.forEach(it => expect(it.section, it.id).toBe('language'));
        expect(items.some(it => it.kind === 'word-meaning' || it.kind === 'sentence-completion')).toBe(true);
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
