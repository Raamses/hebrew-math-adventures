import { describe, it, expect, beforeEach } from 'vitest';
import { mulberry32, shuffleOptions, intBetween } from '../engine/prng';
import { BagDeck } from '../engine/bagDeck';
import {
    emptyPrepProgress, loadPrepProgress, migratePrepProgress, prepStorageKey, recordAttempt, savePrepProgress, MAX_ATTEMPTS,
} from '../engine/storage';
import { keyOf } from '../hooks/usePrepT';
import type { PrepAttempt } from '../types';

describe('prng', () => {
    it('same seed gives the same sequence', () => {
        const a = mulberry32(42), b = mulberry32(42);
        expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
    });

    it('intBetween stays inside the inclusive range', () => {
        const rng = mulberry32(7);
        for (let i = 0; i < 1000; i++) {
            const v = intBetween(rng, 3, 9);
            expect(v).toBeGreaterThanOrEqual(3);
            expect(v).toBeLessThanOrEqual(9);
        }
    });

    it('shuffleOptions tracks the correct answer and spreads its position', () => {
        const counts = [0, 0, 0, 0];
        for (let seed = 1; seed <= 2000; seed++) {
            const { options, answerIndex } = shuffleOptions(mulberry32(seed), ['ok', 'b', 'c', 'd'], 0);
            expect(options[answerIndex]).toBe('ok');
            counts[answerIndex]++;
        }
        counts.forEach(c => expect(c).toBeGreaterThan(400)); // ~500 each
    });
});

describe('BagDeck', () => {
    const pool = Array.from({ length: 6 }, (_, i) => ({ id: `x${i}` }));

    it('draws every item once before repeating', () => {
        const deck = new BagDeck(pool, mulberry32(3));
        const ids = deck.drawMany(6).map(x => x.id);
        expect(new Set(ids).size).toBe(6);
    });

    it('never repeats one of the last 3 draws', () => {
        const deck = new BagDeck(pool, mulberry32(9));
        const ids = deck.drawMany(60).map(x => x.id);
        for (let i = 1; i < ids.length; i++) {
            expect(ids.slice(Math.max(0, i - 3), i)).not.toContain(ids[i]);
        }
    });

    it('serves unseen items first', () => {
        const deck = new BagDeck(pool, mulberry32(5), new Set(['x0', 'x1', 'x2']));
        const first3 = deck.drawMany(3).map(x => x.id);
        expect(first3.sort()).toEqual(['x3', 'x4', 'x5']);
    });
});

describe('prep storage', () => {
    beforeEach(() => localStorage.clear());

    const attempt = (i: number, correct = true): PrepAttempt => ({
        itemId: `rc-001-q${i}`, section: 'reading', skill: 'literal', correct, ms: 1000, at: i,
    });

    it('round-trips per profile with schemaVersion', () => {
        const s = recordAttempt(emptyPrepProgress(), attempt(1));
        savePrepProgress('p1', s);
        expect(JSON.parse(localStorage.getItem(prepStorageKey('p1'))!).schemaVersion).toBe(1);
        expect(loadPrepProgress('p1').skills.literal).toEqual({ attempts: 1, correct: 1 });
        expect(loadPrepProgress('p2').attempts).toHaveLength(0);
    });

    it('starts fresh on corrupt or unknown-version data', () => {
        localStorage.setItem(prepStorageKey('p1'), '{not json');
        expect(loadPrepProgress('p1')).toEqual(emptyPrepProgress());
        expect(migratePrepProgress({ schemaVersion: 99 })).toEqual(emptyPrepProgress());
    });

    it('caps the attempt log', () => {
        let s = emptyPrepProgress();
        for (let i = 0; i < MAX_ATTEMPTS + 20; i++) s = recordAttempt(s, attempt(i, i % 2 === 0));
        expect(s.attempts).toHaveLength(MAX_ATTEMPTS);
        expect(s.skills.literal?.attempts).toBe(MAX_ATTEMPTS + 20);
    });
});

describe('usePrepT keyOf', () => {
    it('turns a selector into a dotted key', () => {
        expect(keyOf($ => $.prep.hub.title)).toBe('prep.hub.title');
        const section = 'math' as const;
        expect(keyOf($ => $.prep.sections[section])).toBe('prep.sections.math');
    });
});
