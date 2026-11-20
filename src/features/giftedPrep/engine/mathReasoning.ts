import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { numericItem } from './mathBuild';
import { fillPair, joinPairs, reasonPair, type Pair } from './mathText';
import { intBetween, mulberry32, pick, type Rng } from './prng';

/**
 * Non-routine reasoning (C3): small numbers, but each type needs one insight that plain arithmetic does
 * not give: undo the steps from the end, take the difference away and halve, count the person or post
 * only once, or list the cases in order. Every distractor is the result of one named wrong path.
 */

/** Whole-number slips in 0–100, then "miscounted by one" as the last resort, so the fill never needs ±10. */
const ints = (xs: readonly number[], answer: number) =>
    [...xs, answer + 1, answer - 1].filter(x => Number.isInteger(x) && x >= 0 && x <= 100);
/** `a + a + … = a·k`, written out for kids who have not met multiplication yet. */
const repeatSum = (a: number, k: number) => `${Array(k).fill(a).join(' + ')} = ${a * k}`;
const fill = (pair: Pair, vars: Readonly<Record<string, number>>): Pair => {
    const { text, textNiqqud } = fillPair(pair, vars);
    return [text!, textNiqqud!];
};
const stem = (pair: Pair) => ({ text: pair[0], textNiqqud: pair[1] });

// ── Work backwards: "I added 4, then doubled it, then took away 6, and got 20" ──

type Op = 'add' | 'sub' | 'double' | 'half';
interface Step { readonly op: Op; readonly n: number }

const forward = (x: number, s: Step) => (s.op === 'add' ? x + s.n : s.op === 'sub' ? x - s.n : s.op === 'double' ? 2 * x : x / 2);
const undo = (x: number, s: Step) => (s.op === 'add' ? x - s.n : s.op === 'sub' ? x + s.n : s.op === 'double' ? x / 2 : 2 * x);
const run = (x: number, steps: readonly Step[], f: (v: number, s: Step) => number) => steps.reduce(f, x);

/** Step shapes per level: 'pm' is add or sub. d1 two +/- steps, d2 one doubling or halving, d3 three steps. */
const SHAPES: Readonly<Record<Difficulty, readonly (readonly ('pm' | 'double' | 'half')[])[]>> = {
    1: [['pm', 'pm']],
    2: [['double', 'pm'], ['pm', 'double'], ['half', 'pm'], ['pm', 'half']],
    3: [['pm', 'double', 'pm'], ['half', 'pm', 'double'], ['pm', 'half', 'pm'], ['double', 'pm', 'half']],
};

function undoSentence(s: Step, v: number): string {
    const w = undo(v, s);
    if (s.op === 'add') return `הוספתי ${s.n}, אז מורידים ${s.n}: ${ltr(`${v} − ${s.n} = ${w}`)}.`;
    if (s.op === 'sub') return `הורדתי ${s.n}, אז מוסיפים ${s.n}: ${ltr(`${v} + ${s.n} = ${w}`)}.`;
    if (s.op === 'double') return `חיברתי אותו לעצמו, אז לוקחים חצי: החצי של ${v} הוא ${w}, כי ${ltr(`${w} + ${w} = ${v}`)}.`;
    return `לקחתי חצי, אז מחברים אותו לעצמו: ${ltr(`${v} + ${v} = ${w}`)}.`;
}

export function backwardsItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const shape = pick(rng, SHAPES[difficulty]);
    for (;;) {
        const x = intBetween(rng, 2, difficulty === 1 ? 40 : 30);
        const steps: Step[] = shape.map(k => (k === 'pm'
            ? { op: rng() < 0.5 ? 'add' : 'sub', n: intBetween(rng, 2, difficulty === 1 ? 15 : 12) }
            : { op: k, n: 0 }));
        // every number on the way is a whole number between 1 and 100, and the steps do not cancel out
        const path = steps.reduce<number[]>((acc, s) => [...acc, forward(acc[acc.length - 1], s)], [x]);
        if (path.some(v => !Number.isInteger(v) || v < 1 || v > 100)) continue;
        const r = path[path.length - 1];
        if (r === x || (steps.length === 2 && steps.every(s => s.op === 'add' || s.op === 'sub') && steps[0].op === steps[1].op)) continue;
        const hasScale = steps.some(s => s.op === 'double' || s.op === 'half');
        const slips = ints([
            run(r, steps, forward), // did the same steps again instead of undoing them
            run(r, steps, undo), // undid them, but from the first step instead of from the end
            undo(r, steps[steps.length - 1]), // undid only the last step
            ...(hasScale ? [run(r, [...steps].reverse().filter(s => s.op === 'add' || s.op === 'sub'), undo)] : []), // skipped the halving/doubling
        ], x);
        const parts = steps.flatMap((s, i) => [
            ...(i > 0 ? [reasonPair('backwards', 'then')] : []),
            fill(reasonPair('backwards', s.op), { n: s.n }),
        ]);
        const text = joinPairs(reasonPair('backwards', 'intro'), ...parts, fill(reasonPair('backwards', 'end'), { r }));
        const back = [...steps].reverse();
        const values = back.reduce<number[]>((acc, s) => [...acc, undo(acc[acc.length - 1], s)], [r]);
        return numericItem(rng, seed, difficulty, {
            kind: 'math-backwards', skill: 'work-backwards', stem: stem(text), answer: x, slips,
            explanation: `הולכים אחורה מהסוף, ובכל צעד עושים את ההפך. `
                + back.map((s, i) => undoSentence(s, values[i])).join(' ')
                + ` המספר שחשבתי עליו הוא ${x}.`,
        });
    }
}

// ── Sum and difference: "together 20, one has 6 more" -> take the 6 away, then halve ──

const SD_CONTEXTS = ['numbers', 'marbles', 'cookies'] as const;

export function sumDifferenceItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const [aLo, aHi, dLo, dHi] = difficulty === 1 ? [2, 8, 2, 6] : difficulty === 2 ? [5, 20, 2, 15] : [10, 35, 5, 25];
    const small = intBetween(rng, aLo, aHi);
    let d = intBetween(rng, dLo, dHi);
    // difference = smaller part would make "forgot to halve" land on the bigger part
    if (d === small) d = d === dHi ? dLo : d + 1;
    const big = small + d, s = small + big;
    const askBig = rng() < 0.5;
    const ctx = pick(rng, SD_CONTEXTS);
    const answer = askBig ? big : small;
    const slips = ints([
        s / 2, // shared the total equally and ignored the difference
        s - d, // took the difference away but forgot to halve
        askBig ? small : big, // found the other one
        askBig ? s + d : d,
    ], answer);
    return numericItem(rng, seed, difficulty, {
        kind: 'math-sum-difference', skill: 'sum-difference',
        stem: stem(fill(reasonPair('sumDifference', `${ctx}${askBig ? 'Big' : 'Small'}` as 'numbersBig'), { s, d })),
        answer, slips,
        explanation: `אם מורידים מהגדול את ה־${d} העודפים, שני החלקים שווים, וביחד הם ${ltr(`${s} − ${d} = ${2 * small}`)}. `
            + `כל חלק הוא חצי: ${ltr(`${small} + ${small} = ${2 * small}`)}, אז הקטן הוא ${small}. `
            + `הגדול: ${ltr(`${small} + ${d} = ${big}`)}. בדיקה: ${ltr(`${small} + ${big} = ${s}`)}.`,
    });
}

// ── Positions and gaps: count the child, the post or the floor exactly once ──

type PosVariant = 'total' | 'fromBack' | 'between' | 'fence' | 'floors';
const POS_VARIANTS: Readonly<Record<Difficulty, readonly PosVariant[]>> = {
    1: ['total', 'floors'],
    2: ['total', 'fromBack', 'between', 'floors'],
    3: ['fromBack', 'between', 'fence', 'floors'],
};

interface Built { readonly vars: Record<string, number>; readonly answer: number; readonly slips: readonly number[]; readonly explanation: string }

function position(rng: Rng, v: PosVariant, difficulty: Difficulty): Built {
    switch (v) {
        case 'total': {
            const hi = difficulty === 1 ? 8 : 15;
            const a = intBetween(rng, 2, hi), b = intBetween(rng, 2, hi);
            const n = a + b - 1;
            return {
                vars: { a, b }, answer: n,
                slips: [a + b /* counted Roni twice */, a + b - 2 /* left Roni out */, Math.abs(a - b)],
                explanation: `לפני רוני עומדים ${a - 1} ילדים, ואחרי רוני עומדים ${b - 1}. `
                    + `${ltr(`${a - 1} + ${b - 1} + 1 = ${n}`)}: סופרים את רוני רק פעם אחת.`,
            };
        }
        case 'fromBack': {
            const n = intBetween(rng, difficulty === 2 ? 8 : 15, difficulty === 2 ? 20 : 40);
            const a = intBetween(rng, 2, n - 2);
            return {
                vars: { n, a }, answer: n - a + 1,
                slips: [n - a /* forgot Roni's own place */, a /* the place from the front */, n - a + 2],
                explanation: `רוני והילדים שלפניו תופסים ${a} מקומות, אז אחרי רוני עומדים ${ltr(`${n} − ${a} = ${n - a}`)} ילדים. `
                    + `מהסוף, רוני בא מיד אחריהם: ${ltr(`${n - a} + 1 = ${n - a + 1}`)}.`,
            };
        }
        case 'between': {
            const a = intBetween(rng, 2, 9), b = a + intBetween(rng, 3, difficulty === 2 ? 9 : 20);
            return {
                vars: { a, b }, answer: b - a - 1,
                slips: [b - a /* subtracted the places */, b - a + 1 /* counted both of them */, b - a - 2],
                explanation: `${ltr(`${b} − ${a} = ${b - a}`)} זה כמה צעדים יש מרוני עד גל. `
                    + `הצעד האחרון נוחת על גל עצמו, וגל לא עומד בין רוני לגל: ${ltr(`${b - a} − 1 = ${b - a - 1}`)}.`,
            };
        }
        case 'fence': {
            const g = pick(rng, [2, 5, 10]);
            const k = intBetween(rng, 3, g === 10 ? 10 : g === 5 ? 8 : 6);
            const L = g * k;
            const spots = Array.from({ length: k + 1 }, (_, i) => i * g);
            return {
                vars: { L, g }, answer: k + 1,
                slips: [k /* counted the gaps, not the posts */, k + 2, k - 1],
                explanation: `העמודים עומדים ב־${spots.join(', ')} מטרים. `
                    + `יש ${k} רווחים של ${g} מטרים, ועמוד אחד יותר מהרווחים: ${ltr(`${k} + 1 = ${k + 1}`)}.`,
            };
        }
        case 'floors': {
            const g = difficulty === 1 ? 10 : pick(rng, [5, 10]);
            const a = difficulty === 1 ? 1 : intBetween(rng, 1, 3);
            const b = a + intBetween(rng, 2, difficulty === 1 ? 4 : 5);
            const k = b - a;
            return {
                vars: { g, a, b }, answer: g * k,
                slips: [g * b /* counted every floor up to the top one */, g * (k + 1) /* counted the floors, not the gaps */, g * (k - 1)],
                explanation: `מקומה ${a} לקומה ${b} עולים ${ltr(`${b} − ${a} = ${k}`)} פעמים מקומה לקומה, `
                    + `ובכל פעם ${g} מדרגות: ${ltr(repeatSum(g, k))}.`,
            };
        }
    }
}

export function positionItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const v = pick(rng, POS_VARIANTS[difficulty]);
    const { vars, answer, slips, explanation } = position(rng, v, difficulty);
    return numericItem(rng, seed, difficulty, {
        kind: 'math-position', skill: 'position',
        stem: stem(fill(reasonPair('position', v), vars)), answer, slips: ints(slips, answer), explanation,
    });
}

// ── Systematic counting: list the cases in an order that skips none and repeats none ──

type CountVariant = 'handshakes' | 'games' | 'coins' | 'digits' | 'outfits';
const COUNT_VARIANTS: Readonly<Record<Difficulty, readonly CountVariant[]>> = {
    1: ['handshakes', 'digits', 'outfits'],
    2: ['handshakes', 'games', 'coins', 'digits', 'outfits'],
    3: ['handshakes', 'games', 'coins', 'digits'],
};

/** Ways to pay n with 2s and 5s, as [fives, twos]. */
export function coinWays(n: number): [number, number][] {
    const out: [number, number][] = [];
    for (let f = 0; 5 * f <= n; f++) if ((n - 5 * f) % 2 === 0) out.push([f, (n - 5 * f) / 2]);
    return out;
}

const coinsText = (f: number, t: number) => [
    ...(f ? [f === 1 ? 'מטבע אחד של 5' : `${f} מטבעות של 5`] : []),
    ...(t ? [t === 1 ? 'מטבע אחד של 2' : `${t} מטבעות של 2`] : []),
].join(' ו־');

function counting(rng: Rng, v: CountVariant, difficulty: Difficulty): Built & { readonly key: string } {
    switch (v) {
        case 'handshakes':
        case 'games': {
            const n = difficulty === 1 ? intBetween(rng, 3, 4) : difficulty === 2 ? intBetween(rng, 4, 5) : intBetween(rng, 5, 6);
            const terms = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
            const total = (n * (n - 1)) / 2;
            const who = v === 'handshakes' ? 'החבר הראשון לוחץ יד' : 'הילד הראשון משחק נגד';
            return {
                key: v, vars: { n }, answer: total,
                slips: [n * (n - 1) /* counted every pair twice */, n /* one per person */, n - 1 /* only the first person's */],
                explanation: `${who} ${n - 1} אחרים. השני עוד ${n - 2} (את הראשון כבר ספרנו), וכך הלאה: `
                    + `${ltr(`${terms.join(' + ')} = ${total}`)}.`,
            };
        }
        case 'coins': {
            let n = 0;
            do n = intBetween(rng, difficulty === 2 ? 10 : 15, difficulty === 2 ? 20 : 30); while (coinWays(n).length < 2);
            const ways = coinWays(n);
            return {
                key: v, vars: { n }, answer: ways.length,
                slips: [Math.floor(n / 5) + 1 /* counted every number of 5s, even ones that leave an odd rest */, ways.length - 1, ways.length + 1],
                explanation: `בודקים כל מספר של מטבעות 5, מ־0 והלאה. מה שנשאר צריך להיות זוגי, כדי לשלם אותו במטבעות של 2. `
                    + `הדרכים: ${ways.map(([f, t]) => coinsText(f, t)).join('; ')}. סך הכול ${ways.length}.`,
            };
        }
        case 'digits': {
            const zero = difficulty === 3 || (difficulty === 2 && rng() < 0.5);
            const twice = difficulty > 1 && rng() < 0.5;
            const pool = Array.from({ length: 9 }, (_, i) => i + 1);
            const ds: number[] = zero ? [0] : [];
            while (ds.length < 3) { const x = pick(rng, pool); if (!ds.includes(x)) ds.push(x); }
            ds.sort((x, y) => x - y);
            const made = ds.flatMap(t => ds.map(u => 10 * t + u)).filter(m => m >= 10 && (twice || Math.floor(m / 10) !== m % 10));
            const answer = made.length;
            const slips = twice
                ? (zero ? [9 /* forgot that 0 cannot lead */, 4 /* forgot the doubles */, 7] : [6 /* forgot the doubles */, 3, 8])
                : (zero ? [6 /* forgot that 0 cannot lead */, 9, 3] : [9 /* added the doubles */, 3, 5]);
            return {
                key: twice ? 'digitsTwice' : 'digitsOnce', vars: { a: ds[0], b: ds[1], c: ds[2] }, answer, slips,
                explanation: `כותבים לפי הסדר, לפי ספרת העשרות: ${made.join(', ')}. `
                    + `${zero ? 'מספר דו־ספרתי לא מתחיל ב־0. ' : ''}סך הכול ${answer} מספרים.`,
            };
        }
        case 'outfits': {
            const a = intBetween(rng, 2, difficulty === 1 ? 3 : 4), b = intBetween(rng, 2, 3);
            return {
                key: v, vars: { a, b }, answer: a * b,
                slips: [a + b /* added shirts and trousers */, a * b - 1, a * b + 1],
                explanation: `לכל חולצה אפשר לבחור ${b} זוגות מכנסיים. ${a} חולצות: ${ltr(repeatSum(b, a))}.`,
            };
        }
    }
}

export function countingItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const v = pick(rng, COUNT_VARIANTS[difficulty]);
    const { key, vars, answer, slips, explanation } = counting(rng, v, difficulty);
    return numericItem(rng, seed, difficulty, {
        kind: 'math-counting', skill: 'counting',
        stem: stem(fill(reasonPair('counting', key as 'coins'), vars)), answer, slips: ints(slips, answer), explanation, max: 30,
    });
}
