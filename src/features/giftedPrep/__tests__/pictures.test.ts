import { describe, it, expect } from 'vitest';
import { pictureItem } from '../engine/pictures';
import type { Difficulty } from '../types';

const SEEDS = 3000;
const DIFFS: Difficulty[] = [1, 2, 3];
const ICON = /\p{Extended_Pictographic}/u;

/** Brute force: every assignment of 0..30 to the icons that satisfies all lines. */
function solutions(lines: readonly string[]): Map<string, number>[] {
    const parsed = lines.map(l => {
        const [lhs, rhs] = l.split(' = ');
        return { terms: lhs.split(' + '), total: Number(rhs) };
    });
    const icons = [...new Set(parsed.flatMap(p => p.terms))];
    const out: Map<string, number>[] = [];
    const assign = (i: number, vals: Map<string, number>) => {
        if (i === icons.length) {
            if (parsed.every(p => p.terms.reduce((s, t) => s + vals.get(t)!, 0) === p.total)) out.push(new Map(vals));
            return;
        }
        for (let v = 0; v <= 30; v++) { vals.set(icons[i], v); assign(i + 1, vals); }
    };
    assign(0, new Map());
    return out;
}

describe('Stage-A picture puzzles (seed sweep)', () => {
    it.each(DIFFS)('d%i: exactly one solution, it is the key, and no other option fits', d => {
        for (let seed = 1; seed <= SEEDS; seed++) {
            const item = pictureItem(seed, d);
            const lines = item.stem.pictureLines!;
            expect(lines.length).toBeGreaterThanOrEqual(1);
            lines.forEach(l => expect(l).toMatch(ICON));
            const sols = solutions(lines);
            expect(sols, lines.join(' | ')).toHaveLength(1);
            const asked = [...item.stem.text!.matchAll(/\p{Extended_Pictographic}/gu)].at(-1)![0];
            expect(Number(item.options[item.answerIndex])).toBe(sols[0].get(asked));
            expect(item.options).toHaveLength(4);
            expect(new Set(item.options).size).toBe(4);
            item.options.forEach(o => expect(Number(o)).toBeGreaterThanOrEqual(0));
            lines.forEach(l => expect(Number(l.split(' = ')[1]), l).toBeLessThanOrEqual(20));
        }
    });

    it('explanations isolate every equation (incl. "🍎 = 5") for RTL', () => {
        for (let seed = 1; seed <= 300; seed++) {
            const { explanation } = pictureItem(seed, 3);
            const outside = explanation.replace(/⁦[^⁩]*⁩/g, '');
            expect(outside, explanation).not.toMatch(/=/);
        }
    });

    it('is deterministic and spreads the answer slot', () => {
        expect(pictureItem(9, 2)).toEqual(pictureItem(9, 2));
        const pos = [0, 0, 0, 0];
        for (let seed = 1; seed <= 4000; seed++) pos[pictureItem(seed, 2).answerIndex]++;
        pos.forEach(c => expect(c).toBeGreaterThan(800));
    });
});
