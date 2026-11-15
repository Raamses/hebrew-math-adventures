import { describe, it, expect } from 'vitest';
// @ts-expect-error -- plain .mjs script without type declarations; exercised as JS
import { mergeDecisions, parseArgs, promote } from '../../../../scripts/prep-content-promote.mjs';

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
        // Promoting round 2 alone is exactly the failure the merge prevents
        expect(promote(drafts, round2, { today: '2026-11-16' }).language.items).toEqual([]);
    });
});
