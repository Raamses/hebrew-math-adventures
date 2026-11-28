import { describe, it, expect } from 'vitest';
import { MAKERS, mathItem } from '../engine/arithmetic';
import { balanceItem, compareItem } from '../engine/mathCompare';
import { doubleHalfItem, placeValueItem } from '../engine/mathNumberSense';
import { oddOneOutItem, sequenceItem } from '../engine/mathPatterns';
import { moneyItem, storyItem } from '../engine/mathWorld';
import { ALL_PAIRS } from '../engine/mathText';
import { hasNiqqud, stripNiqqud } from '../engine/niqqud';
import type { Difficulty, PrepItem } from '../types';
import { oracle } from './mathOracles';

const SEEDS = Number(process.env.PREP_SWEEP ?? 10_000);
const DIFFS: Difficulty[] = [1, 2, 3];
const NEW_MAKERS = { balanceItem, compareItem, placeValueItem, doubleHalfItem, sequenceItem, oddOneOutItem, moneyItem, storyItem };

/**
 * Everything wrong with one item, as messages (empty = fine). Plain checks instead of expect() per item keep
 * the 10k-seed sweep fast enough for the PR gate; the test asserts the collected list is empty.
 */
function problems(item: PrepItem): string[] {
    const out: string[] = [];
    const say = (ok: boolean, msg: string) => { if (!ok) out.push(`${item.id}: ${msg}`); };
    say(item.options.length === 4 && new Set(item.options).size === 4, `options ${item.options}`);
    const right = oracle(item);
    say(right !== null && right.length === 1 && right[0] === item.answerIndex,
        `defensible ${JSON.stringify(right)} vs key ${item.answerIndex}: ${item.stem.text} ${item.stem.equation ?? ''} [${item.options}]`);
    const nums = (s?: string) => (s?.match(/\d+/g) ?? []).map(Number);
    say(item.options.flatMap(o => nums(o)).every(n => n <= 110), 'option number over 110');
    say(nums(item.stem.equation).every(n => n <= 100), 'equation number over 100');
    const key = item.options[item.answerIndex];
    say(!/^\d+$/.test(key) || (Number(key) >= 0 && Number(key) <= 100), `answer ${key} out of 0–100`);
    say(!/\{\{|\}\}/.test(item.stem.text ?? ''), 'leftover placeholder');
    say(stripNiqqud(item.stem.textNiqqud ?? '') === item.stem.text, 'niqqud twin differs');
    say(item.explanation.length > 10, 'explanation too short');
    for (const [, eq] of item.explanation.matchAll(/⁦([^⁩]+)⁩/g)) {
        const m = eq.match(/^(\d+) ([+−]) (\d+) = (\d+)$/);
        say(m !== null && Number(m[3]) !== 0 && (m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])) === Number(m[4]),
            `explanation step ${eq}`);
    }
    // "=" never sits in the Hebrew text outside an LTR isolate (RTL would flip it)
    say(!/=/.test(item.explanation.replace(/⁦[^⁩]*⁩/g, '')), 'bare "=" in explanation');
    return out;
}

describe('wider math pool: 10k-seed sweep per template and difficulty', () => {
    for (const [name, make] of Object.entries(NEW_MAKERS)) {
        it.each(DIFFS)(`${name} d%i: one defensible answer, 4 distinct options, answer within 0–100`, d => {
            const found: string[] = [];
            for (let seed = 1; seed <= SEEDS && found.length < 5; seed++) found.push(...problems(make(seed, d)));
            expect(found).toEqual([]);
        });
    }

    it('is deterministic per seed and every maker spreads the answer slot', () => {
        for (const make of Object.values(NEW_MAKERS)) {
            expect(make(123, 2)).toEqual(make(123, 2));
            const pos = [0, 0, 0, 0];
            for (let seed = 1; seed <= 2000; seed++) pos[make(seed, 2).answerIndex]++;
            pos.forEach(c => expect(c).toBeGreaterThan(350));
        }
    });

    it('the session mix reaches every task type', () => {
        const kinds = new Set<string>();
        for (let seed = 1; seed <= MAKERS.length * 3; seed++) kinds.add(mathItem(seed, 2).kind);
        expect([...kinds].sort()).toEqual([
            'math-backwards', 'math-calendar', 'math-clues', 'math-compare', 'math-counting', 'math-double-half',
            'math-exercise', 'math-hidden-digit', 'math-logic', 'math-machine', 'math-missing', 'math-money', 'math-odd-one-out',
            'math-parity', 'math-picture', 'math-place-value', 'math-position', 'math-pyramid', 'math-scales',
            'math-sequence', 'math-sum-difference', 'math-triangle', 'math-word',
        ]);
    });

    it('two-step word problems only at difficulty 3', () => {
        for (let seed = 1; seed <= 2000; seed++) {
            for (const d of [1, 2] as const) expect(storyItem(seed, d).stem.text).not.toMatch(/ואחר כך נחתו/);
        }
    });
});

describe('math-more.json stems', () => {
    it('every vocalized twin strips back to exactly its plain text', () => {
        expect(ALL_PAIRS.length).toBeGreaterThan(20);
        for (const [plain, voc] of ALL_PAIRS) {
            expect(hasNiqqud(plain), plain).toBe(false);
            expect(hasNiqqud(voc), voc).toBe(true);
            expect(stripNiqqud(voc)).toBe(plain);
        }
    });
});
