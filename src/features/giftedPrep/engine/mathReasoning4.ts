import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { choiceItem, numericItem } from './mathBuild';
import { fillPair, joinPairs, reasonPair, type Pair } from './mathText';
import { intBetween, mulberry32, pick, shuffled, type Rng } from './prng';

/**
 * C5 reasoning, part B: scales (order things by weight from a few comparisons; trade along a chain of
 * balances) and the magic triangle (each side has the same sum; corners count twice).
 */

const stem = ({ text, textNiqqud }: ReturnType<typeof fillPair>) => ({ text: text!, textNiqqud: textNiqqud! });
const asPair = (p: ReturnType<typeof fillPair>): Pair => [p.text!, p.textNiqqud!];
const repeatSum = (a: number, k: number) => `${Array(k).fill(a).join(' + ')} = ${a * k}`;

// ── Scales ──

const THINGS = ['⚽', '🍎', '🎈', '📘', '🎩', '🧸', '🥕', '🧦'] as const;
/** Ordering stems put each comparison on its own line (the question paragraph keeps line breaks). */
/** Chains from big to small, so "one of the first weighs like several of the next" looks right. */
const TRADE_CHAINS = [['🍉', '🍍', '🍎', '🍓'], ['🎃', '🥥', '🍊', '🍒']] as const;

function orderingItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    const order = shuffled(rng, THINGS).slice(0, 4); // heaviest first
    const facts = [0, 1, 2].map(i => ({ heavy: order[i], light: order[i + 1] }));
    const shown = difficulty === 1 ? facts : shuffled(rng, facts);
    const sentences = shown.map(f => (difficulty === 3 && rng() < 0.5
        ? asPair(fillPair(reasonPair('scales', 'lighter'), { a: f.light, b: f.heavy }))
        : asPair(fillPair(reasonPair('scales', 'heavier'), { a: f.heavy, b: f.light }))));
    const askHeavy = rng() < 0.5;
    const text = joinPairs(...sentences, reasonPair('scales', askHeavy ? 'askHeaviest' : 'askLightest'));
    const key = askHeavy ? order[0] : order[3];
    return choiceItem(rng, seed, difficulty, {
        kind: 'math-scales', skill: 'scales', stem: { text: text[0], textNiqqud: text[1] },
        options: [key, ...order.filter(o => o !== key)],
        explanation: `מסדרים בשורה מהכבד אל הקל: ${order.join(', ')}. `
            + `כל משפט מחבר שניים שעומדים זה ליד זה בשורה. ${askHeavy ? 'הכי כבד' : 'הכי קל'}: ${key}.`,
    });
}

function tradeItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    const chain = pick(rng, TRADE_CHAINS);
    const steps = difficulty === 3 ? [intBetween(rng, 2, 3), intBetween(rng, 2, 3), intBetween(rng, 2, 3)] : [intBetween(rng, 2, 3), intBetween(rng, 2, 4)];
    const lines = steps.map((n, i) => `${chain[i]} = ${Array(n).fill(chain[i + 1]).join(' ')}`);
    const last = chain[steps.length];
    const answer = steps.reduce((p, n) => p * n, 1);
    // running total in the smallest kind, one balance at a time from the top
    const work: string[] = [];
    steps.forEach((n, i) => {
        if (i === 0) return;
        const before = steps.slice(0, i).reduce((p, x) => p * x, 1);
        work.push(`כל ${chain[i]} שוקל כמו ${n} ${chain[i + 1]}, ויש ${before} ${chain[i]}: ${ltr(repeatSum(n, before))}`);
    });
    return numericItem(rng, seed, difficulty, {
        kind: 'math-scales', skill: 'scales',
        stem: { ...stem(fillPair(reasonPair('scales', 'trade'), { x: last, y: chain[0] })), pictureLines: lines },
        answer,
        slips: [
            steps.reduce((p, n) => p + n, 0), // added the numbers instead of trading step by step
            steps[steps.length - 1], // read only the last balance
            steps[0], // read only the first balance
            answer + 1, answer - 1,
        ],
        explanation: `${chain[0]} אחד שוקל כמו ${steps[0]} ${chain[1]}. ${work.join('. ')}. אז ${chain[0]} אחד שוקל כמו ${answer} ${last}.`,
    });
}

export function scalesItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    return difficulty === 1 || rng() < 0.5 ? orderingItem(rng, seed, difficulty) : tradeItem(rng, seed, difficulty);
}

// ── Magic triangle: cells 0 top, 1 left middle, 2 bottom left, 3 bottom middle, 4 bottom right, 5 right middle ──

const TRIANGLE_SIDES = [[0, 1, 2], [2, 3, 4], [4, 5, 0]] as const;
const CORNERS = [0, 2, 4] as const;
const sideOf = (cell: number) => TRIANGLE_SIDES.filter(s => (s as readonly number[]).includes(cell));

function cornerSumItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    const k = intBetween(rng, 1, 8);
    const nums = Array.from({ length: 6 }, (_, i) => k + i);
    const total = nums.reduce((a, b) => a + b, 0);
    // with 1..6 the side sum can be 9, 10, 11 or 12; adding k−1 to every number adds 3(k−1) to each side
    // (reasoning.test brute-forces every arrangement to confirm each item)
    const n = pick(rng, [9, 10, 11, 12]) + 3 * (k - 1);
    const answer = 3 * n - total;
    return numericItem(rng, seed, difficulty, {
        kind: 'math-triangle', skill: 'magic-triangle',
        stem: { ...stem(fillPair(reasonPair('triangle', 'corners'), { list: nums.join(', '), n })), triangle: ['', '', '', '', '', ''] },
        answer,
        slips: [n /* one side */, 3 * n /* added the sides but did not take away the six numbers */, total - n, answer + 1, answer - 1],
        explanation: `כל פינה נמצאת בשתי צלעות. כשמחברים את שלוש הצלעות, ${ltr(`${n} + ${n} + ${n} = ${3 * n}`)}, כל פינה נספרת פעמיים. `
            + `כל ששת המספרים ביחד: ${ltr(`${nums.join(' + ')} = ${total}`)}. מה שנשאר הוא הפינות עוד פעם: ${ltr(`${3 * n} − ${total} = ${answer}`)}.`,
    });
}

export function triangleItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    if (difficulty === 3 && rng() < 0.5) return cornerSumItem(rng, seed, difficulty);
    for (;;) {
        const n = intBetween(rng, 12, difficulty === 1 ? 25 : 40);
        const cells = Array<number>(6).fill(0);
        CORNERS.forEach(c => { cells[c] = intBetween(rng, 1, Math.floor(n / 2)); });
        for (const [a, m, b] of TRIANGLE_SIDES) cells[m] = n - cells[a] - cells[b];
        if (cells.some(v => v < 1) || new Set(cells).size < 4) continue;
        // d1 says the sum and hides a middle; d2-3 do not say it, and from d3 the hidden one can be a corner
        const hide = difficulty === 3 ? pick(rng, [0, 1, 2, 3, 4, 5]) : pick(rng, [1, 3, 5]);
        const answer = cells[hide];
        const full = TRIANGLE_SIDES.find(s => !(s as readonly number[]).includes(hide))!;
        const mine = sideOf(hide)[0];
        const others = mine.filter(i => i !== hide).map(i => cells[i]);
        const shown = cells.map((v, i) => (i === hide ? '?' : String(v)));
        const given = difficulty === 1;
        return numericItem(rng, seed, difficulty, {
            kind: 'math-triangle', skill: 'magic-triangle',
            stem: { ...stem(fillPair(reasonPair('triangle', given ? 'sumGiven' : 'sumEqual'), { n })), triangle: shown },
            answer,
            slips: [n /* wrote the side sum */, others[0] + others[1] /* added the two neighbours */, answer + 1, answer - 1],
            explanation: (given ? '' : `קודם מוצאים את הסכום מהצלע השלמה: ${ltr(`${full.map(i => cells[i]).join(' + ')} = ${n}`)}. `)
                + `בצלע של סימן השאלה כבר יש ${others[0]} ו־${others[1]}: ${ltr(`${others[0]} + ${others[1]} = ${others[0] + others[1]}`)}, `
                + `וחסר עד ${n}: ${ltr(`${n} − ${others[0] + others[1]} = ${answer}`)}.`,
        });
    }
}
