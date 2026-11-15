import { describe, it, expect } from 'vitest';
import { exerciseItem, mathItem, missingItem, wordItem } from '../engine/arithmetic';
import type { Difficulty, PrepItem } from '../types';

const SEEDS = 3000;
const DIFFS: Difficulty[] = [1, 2, 3];

/** Evaluate "a op b" where one of a, b, result may be "?" given the candidate value. */
function satisfies(eq: string, candidate: number): boolean {
    const m = eq.match(/^(\d+|\?) ([+-]) (\d+|\?) = (\d+|\?)$/);
    if (!m) throw new Error(`bad equation ${eq}`);
    const [a, b, r] = [m[1], m[3], m[4]].map(x => (x === '?' ? candidate : Number(x)));
    return m[2] === '+' ? a + b === r : a - b === r;
}

function checkShape(item: PrepItem) {
    expect(item.options).toHaveLength(4);
    expect(new Set(item.options).size).toBe(4);
    item.options.forEach(o => expect(Number(o)).toBeGreaterThanOrEqual(0));
    expect(item.explanation.length).toBeGreaterThan(10);
    expect(item.section).toBe('math');
}

describe('Stage-A arithmetic generators (seed sweep)', () => {
    it.each(DIFFS)('exercise d%i: exactly one option solves the equation, results stay within 100', d => {
        for (let seed = 1; seed <= SEEDS; seed++) {
            const item = exerciseItem(seed, d);
            checkShape(item);
            const solving = item.options.filter(o => satisfies(item.stem.equation!, Number(o)));
            expect(solving).toEqual([item.options[item.answerIndex]]);
            expect(Number(item.options[item.answerIndex])).toBeLessThanOrEqual(100);
        }
    });

    it.each(DIFFS)('missing number d%i: exactly one option fills the blank', d => {
        for (let seed = 1; seed <= SEEDS; seed++) {
            const item = missingItem(seed, d);
            checkShape(item);
            const solving = item.options.filter(o => satisfies(item.stem.equation!, Number(o)));
            expect(solving).toEqual([item.options[item.answerIndex]]);
        }
    });

    it('word problems: interpolated Hebrew text, no leftover placeholders, answer in range', () => {
        for (let seed = 1; seed <= SEEDS; seed++) {
            const item = wordItem(seed, 2);
            checkShape(item);
            expect(item.stem.text).not.toMatch(/\{\{|\}\}/);
            expect(item.stem.text).toMatch(/[֐-׿]/);
            const ans = Number(item.options[item.answerIndex]);
            expect(ans).toBeGreaterThan(0);
            expect(ans).toBeLessThanOrEqual(100);
        }
    });

    it('is deterministic per seed and spreads the answer position', () => {
        expect(mathItem(77, 2)).toEqual(mathItem(77, 2));
        const pos = [0, 0, 0, 0];
        for (let seed = 1; seed <= 4000; seed++) pos[mathItem(seed, 2).answerIndex]++;
        pos.forEach(c => expect(c).toBeGreaterThan(800));
    });

    it('carry/borrow appears only from difficulty 2', () => {
        for (let seed = 1; seed <= 500; seed++) {
            const [a, op, b] = exerciseItem(seed, 1).stem.equation!.split(' ');
            const carry = op === '+' ? (Number(a) % 10) + (Number(b) % 10) >= 10 : Number(a) % 10 < Number(b) % 10;
            expect(carry).toBe(false);
        }
    });

    it('wraps equations inside Hebrew explanations in LTR isolates', () => {
        const item = exerciseItem(5, 2);
        expect(item.explanation).toMatch(/⁦[^⁩]*=[^⁩]*⁩/);
    });
});

describe('arithmetic explanations', () => {
    const strip = (s: string) => s.replace(/[⁦⁩]/g, '');
    /** Every isolated "x op y = z" inside an explanation must be true arithmetic. */
    const checkEquations = (text: string) => {
        const eqs = [...text.matchAll(/⁦([^⁩]+)⁩/g)].map(m => m[1]);
        expect(eqs.length).toBeGreaterThan(0);
        for (const eq of eqs) {
            const m = eq.match(/^(\d+) ([+−]) (\d+) = (\d+)$/);
            expect(m, eq).not.toBeNull();
            const [a, b, r] = [Number(m![1]), Number(m![3]), Number(m![4])];
            expect(m![2] === '+' ? a + b : a - b, eq).toBe(r);
            expect(b, `no "± 0" steps in ${eq}`).not.toBe(0);
        }
    };
    it('every equation in every explanation is correct and never adds/subtracts 0', () => {
        for (let seed = 1; seed <= 3000; seed++) {
            for (const d of [1, 2, 3] as const) {
                checkEquations(exerciseItem(seed, d).explanation);
                checkEquations(missingItem(seed, d).explanation);
                expect(strip(wordItem(seed, d).explanation)).toMatch(/=/);
            }
        }
    });
});
