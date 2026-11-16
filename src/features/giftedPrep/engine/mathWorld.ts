import type { Difficulty, PrepItem } from '../types';
import { ltr, wordExplanation } from './arithmeticExplain';
import { numericItem } from './mathBuild';
import { fillPair, SHOP_ITEMS, stemPair, wordPair, type WordKey } from './mathText';
import { intBetween, mulberry32, pick, type Rng } from './prng';

/** Everyday math: shekel coins, change, and more word problems (templated Hebrew sentences). */

export function moneyItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const base = { kind: 'math-money', skill: 'money' } as const;
    if (rng() < 0.5) {
        const a = intBetween(rng, 2, difficulty === 1 ? 3 : 5);
        const b = intBetween(rng, 2, difficulty === 1 ? 2 : 4);
        const c = intBetween(rng, 2, difficulty === 1 ? 4 : 6);
        const tens = 10 * a, fives = 5 * b, total = tens + fives + c;
        return numericItem(rng, seed, difficulty, {
            ...base, stem: fillPair(stemPair('coins'), { a, b, c }), answer: total,
            // counted coins instead of shekels / forgot the 1-shekel coins / counted each 5 as 1
            slips: [a + b + c, tens + fives, tens + b + c],
            explanation: `${a} מטבעות של 10 הם ${tens} שקלים, ו־${b} מטבעות של 5 הם ${fives} שקלים. `
                + `ביחד: ${ltr(`${tens} + ${fives} = ${tens + fives}`)}, ועוד ${c}: ${ltr(`${tens + fives} + ${c} = ${total}`)}.`,
        });
    }
    const bill = difficulty === 1 ? 20 : difficulty === 2 ? 50 : 100;
    const price = difficulty === 1 ? intBetween(rng, 11, 18) : intBetween(rng, Math.floor(bill / 2) + 1, bill - 3);
    const [plain, voc] = pick(rng, SHOP_ITEMS);
    const change = bill - price;
    const [tPlain, tVoc] = stemPair('change');
    const pair = [tPlain.replace('{{item}}', plain), tVoc.replace('{{item}}', voc)] as const;
    return numericItem(rng, seed, difficulty, {
        ...base,
        stem: fillPair(pair, { p: price, b: bill }),
        answer: change,
        slips: [price /* answered the price */, ...(bill + price <= 110 ? [bill + price] : []) /* added */],
        explanation: `העודף הוא כמה חסר מהמחיר עד השטר: ${ltr(`${bill} − ${price} = ${change}`)}. `
            + `בדיקה: ${ltr(`${price} + ${change} = ${bill}`)}.`,
    });
}

interface WordTemplate {
    readonly key: WordKey;
    readonly make: (rng: Rng) => { n: readonly number[]; answer: number; slips: readonly number[]; explanation: string };
}

const sub = (n1: number, n2: number) => ({ answer: n1 - n2, slips: [n1 + n2], explanation: wordExplanation(n1, n2, '-', n1 - n2) });
const add = (n1: number, n2: number) => ({ answer: n1 + n2, slips: [Math.abs(n1 - n2)], explanation: wordExplanation(n1, n2, '+', n1 + n2) });
const two = (rng: Rng, lo1: number, hi1: number, lo2: number, hi2: (n1: number) => number) => {
    const n1 = intBetween(rng, lo1, hi1);
    return [n1, intBetween(rng, lo2, hi2(n1))] as const;
};

/** Words that decide the operation: "נשארו" / "יותר מ" / "הוסיפו" / two steps. */
export const WORD_TEMPLATES: readonly WordTemplate[] = [
    { key: 'class_left', make: r => { const [a, b] = two(r, 20, 35, 3, () => 15); return { n: [a, b], ...sub(a, b) }; } },
    { key: 'garden_flowers', make: r => { const [a, b] = two(r, 5, 40, 5, () => 40); return { n: [a, b], ...add(a, b) }; } },
    { key: 'stickers_more', make: r => { const [a, b] = two(r, 25, 70, 5, x => x - 3); return { n: [a, b], ...sub(a, b) }; } },
    { key: 'bus_on', make: r => { const [a, b] = two(r, 10, 40, 3, () => 25); return { n: [a, b], ...add(a, b) }; } },
    { key: 'book_pages', make: r => { const [a, b] = two(r, 40, 99, 10, x => x - 5); return { n: [a, b], ...sub(a, b) }; } },
    { key: 'marbles_more', make: r => { const [a, b] = two(r, 5, 40, 2, () => 20); return { n: [a, b], ...add(a, b) }; } },
    {
        key: 'pencils_added', make: r => {
            const a = intBetween(r, 5, 40);
            const total = a + intBetween(r, 3, 40);
            return {
                n: [a, total], answer: total - a, slips: [total + a],
                explanation: `מחפשים כמה חסר מ־${a} עד ${total}: ${ltr(`${total} − ${a} = ${total - a}`)}.`,
            };
        },
    },
    {
        key: 'birds_two_step', make: r => {
            const n1 = intBetween(r, 15, 40), n2 = intBetween(r, 3, n1 - 5), n3 = intBetween(r, 2, 20);
            const mid = n1 - n2;
            return {
                n: [n1, n2, n3], answer: mid + n3,
                // stopped after the first step / subtracted both
                slips: [mid, ...(mid - n3 >= 0 ? [mid - n3] : [])],
                explanation: `קודם עפו ${n2}: ${ltr(`${n1} − ${n2} = ${mid}`)}. אחר כך נחתו ${n3}: ${ltr(`${mid} + ${n3} = ${mid + n3}`)}.`,
            };
        },
    },
];

export function storyItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    // The two-step story only from difficulty 3; easier levels never get it
    const pool = difficulty === 3 ? WORD_TEMPLATES : WORD_TEMPLATES.filter(t => t.key !== 'birds_two_step');
    const tpl = pick(rng, pool);
    const { n, answer, slips, explanation } = tpl.make(rng);
    const vars = Object.fromEntries(n.map((v, i) => [`n${i + 1}`, v]));
    return numericItem(rng, seed, difficulty, {
        kind: 'math-word', skill: 'word-problem', stem: fillPair(wordPair(tpl.key), vars), answer, slips, explanation,
    });
}
