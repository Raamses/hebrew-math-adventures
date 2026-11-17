import { describe, it, expect } from 'vitest';
import { figureItem } from '../engine/pictures';
import { analogyPuzzle } from '../engine/figureAnalogy';
import { canon, label, type Figure } from '../engine/figures';
import { stripNiqqud } from '../engine/niqqud';
import mathNiqqud from '../content/he/math-niqqud.json';
import type { Difficulty, PrepItem } from '../types';
import { analogyAnswers, differences } from './analogyOracle';

const SEEDS = Number(process.env.PREP_SWEEP ?? 10_000);
const DIFFS: Difficulty[] = [1, 2, 3];
const item = (seed: number, d: Difficulty) => figureItem(seed, d, analogyPuzzle);
const cellsOf = (it: PrepItem) => (it.stem.figures?.cells ?? []).filter((x): x is Figure => x !== null);

function problems(it: PrepItem): string[] {
    const out: string[] = [];
    const say = (good: boolean, msg: string) => { if (!good) out.push(`${it.id}: ${msg} | ${it.explanation}`); };
    const board = it.stem.figures;
    const figs = it.optionFigures;
    if (!board || board.layout !== 'analogy' || !figs) return [`${it.id}: not an analogy item`];
    const [a, b, c] = cellsOf(it);
    say(board.cells.length === 4 && board.cells[3] === null && cellsOf(it).length === 3, 'board is A, B, C, ?');
    say(label(a) !== label(b), 'A and B look the same (no rule to see)');
    say(label(c) !== label(a), 'C is a copy of A');
    // exactly one correct option: every one-attribute rule that explains A→B gives one answer for C, and only the key matches it
    const answers = analogyAnswers(a, b, c);
    const correct = figs.flatMap((f, i) => (answers.has(label(f)) ? [i] : []));
    say(answers.size === 1, `A→B has rules with different answers: ${[...answers].join(' / ')}`);
    say(correct.length === 1 && correct[0] === it.answerIndex, `correct options ${JSON.stringify(correct)} vs key ${it.answerIndex}`);
    // no two equivalent options, after symmetry canonicalization
    const keys = figs.map(f => JSON.stringify(canon(f)));
    say(new Set(keys).size === 4, 'two options look the same');
    say(new Set(it.options).size === 4 && it.options.every((o, i) => o === label(figs[i])), 'labels');
    // every distractor breaks exactly one rule
    const k = figs[it.answerIndex];
    figs.forEach((f, i) => {
        if (i !== it.answerIndex) say(differences(f, k).length === 1, `distractor ${label(f)} differs in ${differences(f, k).join('+')}`);
    });
    say(stripNiqqud(it.stem.textNiqqud ?? '') === it.stem.text, 'niqqud twin');
    say(!/=/.test(it.explanation) && it.explanation.includes(label(k)), 'explanation names the answer');
    return out;
}

/**
 * The rule A→B shows, as the child would name it: rot90 = quarter turn clockwise, rot270 = anticlockwise.
 * A is always the flag for turns and mirrors, so its rotation survives canon: a left-right mirror maps rot to
 * -rot (sum 0 mod 360), an up-down mirror to 180 - rot (sum 180).
 */
function ruleOf(it: PrepItem): string {
    const [a, b] = cellsOf(it);
    const d = differences(a, b)[0];
    if (d !== 'orientation') return d;
    if (!!a.flip === !!b.flip) return `rot${(b.rot - a.rot + 360) % 360}`;
    return (a.rot + b.rot) % 360 === 0 ? 'mirrorLR' : 'mirrorUD';
}

describe('figural analogies (A:B::C:?): 10k-seed sweep', () => {
    it.each(DIFFS)('d%i: one correct option, no two equivalent options, each distractor breaks exactly one rule', d => {
        const found: string[] = [];
        for (let seed = 1; seed <= SEEDS && found.length < 5; seed++) found.push(...problems(item(seed, d)));
        expect(found).toEqual([]);
    });

    it.each(DIFFS)('d%i: reaches every rule of its level and spreads the answer slot', d => {
        const rules = new Set<string>();
        const pos = [0, 0, 0, 0];
        for (let seed = 1; seed <= 2000; seed++) {
            const it = item(seed, d);
            pos[it.answerIndex]++;
            rules.add(ruleOf(it));
        }
        expect([...rules].sort()).toEqual(d === 1
            ? ['color', 'rot180', 'rot90', 'size']
            : ['color', 'mirrorLR', 'mirrorUD', 'rot180', 'rot270', 'rot90', 'size']);
        pos.forEach(n => expect(n).toBeGreaterThan(400));
    });

    it('d3 starts C facing another way than A, so copying B is a trap', () => {
        for (let seed = 1; seed <= 2000; seed++) {
            const it = item(seed, 3);
            const [a, , c] = cellsOf(it);
            if (ruleOf(it) === 'size' || ruleOf(it) === 'color') continue;
            // cells are canonical: an arrow or triangle carries no mirror bit, so only its direction counts
            expect(a.rot !== c.rot || (c.shape === 'flag' && !!a.flip !== !!c.flip), it.explanation).toBe(true);
        }
    });

    it('figureItem mixes analogies in with the other shape puzzles', () => {
        const layouts = new Set(Array.from({ length: 200 }, (_, i) => figureItem(i + 1, 2).stem.figures?.layout ?? 'odd'));
        expect([...layouts].sort()).toEqual(['analogy', 'grid', 'odd', 'row']);
    });

    it('the analogy stem has an exact niqqud twin', () => {
        const [plain, voc] = mathNiqqud.figureStems.analogy;
        expect(stripNiqqud(voc)).toBe(plain);
    });
});
