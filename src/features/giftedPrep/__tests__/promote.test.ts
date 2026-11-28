import { describe, it, expect } from 'vitest';
// @ts-expect-error -- plain .mjs script without type declarations; exercised as JS
import { mergeDecisions, parseArgs, promote } from '../../../../scripts/prep-content-promote.mjs';
import draftReading from '../../../../content-drafts/gifted-prep/he/reading.json';
import draftLanguage from '../../../../content-drafts/gifted-prep/he/language.json';
import draftAnalogies from '../../../../content-drafts/gifted-prep/he/analogies.json';
import shippedReading from '../content/he/reading.json';
import shippedLanguage from '../content/he/language.json';
import shippedAnalogiesJson from '../content/he/analogies.json';
import { parseAnalogyBank, type BankAnalogyItem, type BankLanguageItem, type BankPassage, type BankQuestion } from '../engine/bankSchema';

// The shipped analogy bank may be empty (no item approved yet), which JSON typing reads as `never[]`.
const shippedAnalogies = shippedAnalogiesJson as { schemaVersion: number; niqqudProvenance?: string; items: { id: string }[] };

const q = (id: string) => ({ id, stem: 's', options: ['a', 'b', 'c', 'd'], answerIndex: 0, explanation: 'e', skill: 'literal', flag: 'x' });
const drafts = {
    reading: { niqqudProvenance: 'machine; not been human-reviewed', passages: [
        { id: 'rc-001', title: 't', text: 'x', note: 'reviewer note', genre: 'story', reviewStatus: 'draft', questions: [q('rc-001-q1')] },
        { id: 'rc-002', title: 't', text: 'x', reviewStatus: 'draft', questions: [q('rc-002-q1')] },
        { id: 'rc-003', title: 't', text: 'x', reviewStatus: 'draft', questions: [q('rc-003-q1')] },
    ] },
    language: { items: [{ ...q('wm-001'), kind: 'word-meaning', reviewStatus: 'draft' }, { ...q('wm-002'), kind: 'word-meaning', reviewStatus: 'draft' }] },
};
const decisions = {
    'rc-001': { status: 'approve' }, 'rc-002': { status: 'edit', note: 'fix' }, 'rc-003': { status: 'drop' },
    'wm-001': { status: 'approve' },
};

describe('prep-content-promote', () => {
    const out = promote(drafts, decisions, { reviewer: 'Ram', today: '2026-11-15' });

    it('ships only approved items; edit, drop and undecided stay out', () => {
        expect(out.reading.passages.map((p: { id: string }) => p.id)).toEqual(['rc-001']);
        expect(out.language.items.map((i: { id: string }) => i.id)).toEqual(['wm-001']);
    });

    it('stamps reviewStatus/reviewer/date and strips review-only fields at every level', () => {
        const [p] = out.reading.passages;
        expect(p).toMatchObject({ reviewStatus: 'reviewed', reviewedBy: 'Ram', reviewedAt: '2026-11-15' });
        expect(p).not.toHaveProperty('note');
        expect(p).not.toHaveProperty('genre');
        expect(p.questions[0]).not.toHaveProperty('flag');
        expect(out.language.items[0]).not.toHaveProperty('flag');
        expect(out.language.items[0].reviewStatus).toBe('reviewed');
    });

    it('carries the bank-level niqqud provenance through, and adds none where the draft has none', () => {
        expect(out.reading.niqqudProvenance).toMatch(/not been human-reviewed/);
        expect(out.language).not.toHaveProperty('niqqudProvenance');
    });
});

describe('prep-content-promote CLI: several review rounds', () => {
    it('takes every decisions file in order, with --reviewer before, between or after them', () => {
        expect(parseArgs(['r1.json', 'r2.json'])).toEqual({ paths: ['r1.json', 'r2.json'], reviewer: 'Ram' });
        expect(parseArgs(['--reviewer', 'Dana', 'r1.json', 'r2.json'])).toEqual({ paths: ['r1.json', 'r2.json'], reviewer: 'Dana' });
        expect(parseArgs(['r1.json', '--reviewer', 'Dana', 'r2.json'])).toEqual({ paths: ['r1.json', 'r2.json'], reviewer: 'Dana' });
        expect(parseArgs(['r1.json', 'r2.json', '--reviewer', 'Dana'])).toEqual({ paths: ['r1.json', 'r2.json'], reviewer: 'Dana' });
        expect(parseArgs(['--reviewer', 'Dana']).paths).toEqual([]);
        expect(parseArgs([]).paths).toEqual([]);
    });

    it('keeps round-1 approvals when round 2 is added, and a later round wins for an id decided twice', () => {
        const round1 = { 'rc-001': { status: 'approve' }, 'wm-001': { status: 'approve' }, 'rc-002': { status: 'edit' } };
        const round2 = { 'rc-002': { status: 'approve' }, 'rc-003': { status: 'drop' } };
        const merged = mergeDecisions([round1, round2]);
        expect(merged['rc-002'].status).toBe('approve');
        const shipped = promote(drafts, merged, { today: '2026-11-16' });
        expect(shipped.reading.passages.map((p: { id: string }) => p.id)).toEqual(['rc-001', 'rc-002']);
        expect(shipped.language.items.map((i: { id: string }) => i.id)).toEqual(['wm-001']);
        // An item already shipped keeps its original approval date and reviewer; new ones get today
        const again = promote(drafts, merged, {
            today: '2026-11-20', reviewer: 'Ram',
            shipped: { reading: { passages: [{ id: 'rc-001', reviewedAt: '2026-11-15', reviewedBy: 'Ram' }] } },
        });
        expect(again.reading.passages.map((p: { reviewedAt: string }) => p.reviewedAt)).toEqual(['2026-11-15', '2026-11-20']);
        // Promoting round 2 alone is exactly the failure the merge prevents
        expect(promote(drafts, round2, { today: '2026-11-16' }).language.items).toEqual([]);
    });
});

describe('prep-content-promote on the real banks', () => {
    // Field names the bank parser knows (engine/bankSchema.ts) plus the two review stamps promote() adds.
    // `satisfies` ties each list to the schema type: adding or removing a bank field breaks the compile here.
    type Stamp = 'reviewedBy' | 'reviewedAt';
    const STAMPS = { reviewedBy: true, reviewedAt: true } satisfies Record<Stamp, true>;
    const QUESTION_KEYS = {
        id: true, stem: true, options: true, answerIndex: true, explanation: true, skill: true,
        stemNiqqud: true, optionsNiqqud: true, explanationNiqqud: true,
    } satisfies Record<keyof BankQuestion, true>;
    const PASSAGE_KEYS = {
        id: true, title: true, text: true, length: true, difficulty: true, reviewStatus: true, source: true,
        questions: true, titleNiqqud: true, textNiqqud: true, ...STAMPS,
    } satisfies Record<keyof BankPassage | Stamp, true>;
    const ITEM_KEYS = {
        ...QUESTION_KEYS, kind: true, difficulty: true, reviewStatus: true, source: true, ...STAMPS,
    } satisfies Record<keyof BankLanguageItem | Stamp, true>;
    const ANALOGY_KEYS = ITEM_KEYS satisfies Record<keyof BankAnalogyItem | Stamp, true>;
    const [QUESTION, PASSAGE, ITEM, ANALOGY] = [QUESTION_KEYS, PASSAGE_KEYS, ITEM_KEYS, ANALOGY_KEYS].map(o => Object.keys(o));
    const approveAll = Object.fromEntries([...shippedReading.passages, ...shippedLanguage.items, ...shippedAnalogies.items]
        .map(x => [x.id, { status: 'approve' }]));
    const drafts = { reading: draftReading, language: draftLanguage, analogies: draftAnalogies };
    const out = promote(drafts, approveAll, {
        reviewer: 'Someone', today: '2099-01-01',
        shipped: { reading: shippedReading, language: shippedLanguage, analogies: shippedAnalogies },
    });
    const extra = (o: object, allowed: string[]) => Object.keys(o).filter(k => !allowed.includes(k));

    it('every promoted key is a bank field: a new review-only draft field cannot slip into the bundle', () => {
        for (const p of out.reading.passages) {
            expect(extra(p, PASSAGE), p.id).toEqual([]);
            for (const q of p.questions) expect(extra(q, QUESTION), q.id).toEqual([]);
        }
        for (const i of out.language.items) expect(extra(i, ITEM), i.id).toEqual([]);
        for (const i of out.analogies.items) expect(extra(i, ANALOGY), i.id).toEqual([]);
    });

    it('re-promoting every shipped id rebuilds the shipped bank exactly, approval stamps carried by id', () => {
        // Also keeps drafts and shipped in step: a text or niqqud fix made in one file only fails here.
        expect(out.reading).toEqual(shippedReading);
        expect(out.language).toEqual(shippedLanguage);
        expect(out.analogies).toEqual(shippedAnalogies);
        expect(out.reading.passages.every((p: { reviewedBy: string }) => p.reviewedBy === 'Ram')).toBe(true);
        expect(out.language.items.some((i: { reviewedAt: string }) => i.reviewedAt === '2099-01-01')).toBe(false);
    });
});

describe('prep-content-promote on the verbal-analogy drafts', () => {
    // The shipped analogy bank can be empty, so these run over the drafts: approve every draft item, then promote
    // again with that result as the shipped bank (the next review round) and expect the same bank back.
    const approveAll = Object.fromEntries(draftAnalogies.items.map(i => [i.id, { status: 'approve' }]));
    const base = { reading: { passages: [] }, language: { items: [] }, analogies: draftAnalogies };
    const first = promote(base, approveAll, { reviewer: 'Ram', today: '2099-01-01' }).analogies;

    it('promotes every approved analogy draft as reviewed, text unchanged, review stamps added', () => {
        expect(first.items).toHaveLength(draftAnalogies.items.length);
        const parsed = parseAnalogyBank(first);
        parsed.forEach(i => expect(i.reviewStatus, i.id).toBe('reviewed'));
        first.items.forEach((i: Record<string, unknown>, n: number) => {
            const { reviewStatus: _r, reviewedBy, reviewedAt, ...rest } = i;
            const { reviewStatus: _d, ...draft } = draftAnalogies.items[n];
            expect(rest, String(i.id)).toEqual(draft);
            expect([reviewedBy, reviewedAt]).toEqual(['Ram', '2099-01-01']);
        });
        expect(first.niqqudProvenance).toBe(draftAnalogies.niqqudProvenance);
    });

    it('round-trips: re-promoting with the result as the shipped bank rebuilds it exactly, dates carried by id', () => {
        const again = promote(base, approveAll, { reviewer: 'Other', today: '2100-01-01', shipped: { analogies: first } });
        expect(again.analogies).toEqual(first);
    });

    it('ships no analogy item without an approve decision', () => {
        const some = { [draftAnalogies.items[0].id]: { status: 'approve' }, [draftAnalogies.items[1].id]: { status: 'edit' } };
        expect(promote(base, some, { today: '2099-01-01' }).analogies.items.map((i: { id: string }) => i.id))
            .toEqual([draftAnalogies.items[0].id]);
        expect(promote(base, {}, { today: '2099-01-01' }).analogies.items).toEqual([]);
    });
});
