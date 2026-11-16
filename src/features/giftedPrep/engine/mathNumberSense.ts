import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { numericItem } from './mathBuild';
import { fillPair, stemPair } from './mathText';
import { intBetween, mulberry32, pick, type Rng } from './prng';

/**
 * Number sense for grade 2 (numbers to 100): tens and ones, doubling and halving.
 * Each distractor is the result of one typical slip, named next to it.
 */

/** Two different digits, tens 2–9 and ones 1–9 (no "0 ones", no "44"). */
function tensOnes(rng: Rng): { t: number; u: number } {
    const t = intBetween(rng, 2, 9);
    let u = intBetween(rng, 1, 9);
    if (u === t) u = u === 9 ? 1 : u + 1;
    return { t, u };
}

const PV_VARIANTS = {
    2: ['tensUnits', 'unitsTens', 'tensIn'],
    3: ['regroup', 'unitsTens', 'tensIn'],
} as const;

export function placeValueItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const variant = difficulty === 1 ? 'tensUnits' : pick(rng, PV_VARIANTS[difficulty]);
    const base = { kind: 'math-place-value', skill: 'place-value' } as const;
    if (variant === 'tensIn') {
        const { t, u } = tensOnes(rng);
        const n = 10 * t + u;
        return numericItem(rng, seed, difficulty, {
            ...base, stem: fillPair(stemPair('tensIn'), { n }), answer: t,
            slips: [u /* read the ones digit */, 10 * t /* gave the value of the tens, not how many */],
            explanation: `ב־${n} הספרה ${t} היא ספרת העשרות: ${ltr(`${10 * t} + ${u} = ${n}`)}. אז יש ${t} עשרות.`,
        });
    }
    if (variant === 'regroup') {
        // 15 ones = one ten and 5 ones: "3 tens and 15 ones" is 45
        const t = intBetween(rng, 2, 7);
        const u = intBetween(rng, 11, 19);
        const n = 10 * t + u;
        return numericItem(rng, seed, difficulty, {
            ...base, stem: fillPair(stemPair('tensUnits'), { t, u }), answer: n,
            slips: [n - 10 /* dropped the extra ten */, t + u /* added the digits */],
            explanation: `${u} אחדות הן עשרת אחת ועוד ${u - 10} אחדות. אז: ${ltr(`${10 * t} + ${u} = ${n}`)}.`,
        });
    }
    const { t, u } = tensOnes(rng);
    const n = 10 * t + u;
    return numericItem(rng, seed, difficulty, {
        ...base, stem: fillPair(stemPair(variant), { t, u }), answer: n,
        slips: [10 * u + t /* swapped tens and ones */, t + u /* added the digits */],
        explanation: `${t} עשרות הן ${10 * t}, ועוד ${u} אחדות: ${ltr(`${10 * t} + ${u} = ${n}`)}.`,
    });
}

function doubleItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    // d1 no carry (ones 1–4), d2 carry (ones 5–9), d3 anything 26–50
    let n = 0;
    do {
        n = difficulty === 3 ? intBetween(rng, 26, 50) : intBetween(rng, 11, 49);
    } while ((difficulty === 1 && (n % 10 === 0 || n % 10 > 4)) || (difficulty === 2 && n % 10 < 5));
    const carry = (n % 10) * 2 >= 10;
    return numericItem(rng, seed, difficulty, {
        kind: 'math-double-half', skill: 'double-half',
        stem: fillPair(stemPair('double'), { n }), answer: 2 * n,
        slips: [n + 2 /* added 2 instead of doubling */, ...(carry ? [2 * n - 10 /* forgot the carried ten */] : [])],
        explanation: `פעמיים ${n} זה ${n} ועוד ${n}: ${ltr(`${n} + ${n} = ${2 * n}`)}.`,
    });
}

function halfItem(rng: Rng, seed: number, difficulty: Difficulty): PrepItem {
    // d1 both digits even (48 -> 24), d2 odd tens digit (36 -> 18), d3 even numbers 50–100
    let n = 0;
    do {
        n = difficulty === 3 ? 2 * intBetween(rng, 25, 50) : 2 * intBetween(rng, 6, 49);
    } while ((difficulty === 1 && (Math.floor(n / 10) % 2 === 1 || n % 10 === 0))
        || (difficulty === 2 && Math.floor(n / 10) % 2 === 0));
    const h = n / 2;
    // Halving each digit and losing the odd ten: half of 36 -> "13"
    const digitWise = Math.floor(Math.floor(n / 10) / 2) * 10 + (n % 10) / 2;
    return numericItem(rng, seed, difficulty, {
        kind: 'math-double-half', skill: 'double-half',
        stem: fillPair(stemPair('half'), { n }), answer: h,
        slips: [...(digitWise !== h ? [digitWise] : []), n - 2 /* took away 2 instead of halving */],
        explanation: `חצי של ${n} הוא המספר שאם מחברים אותו לעצמו מקבלים ${n}: ${ltr(`${h} + ${h} = ${n}`)}.`,
    });
}

export function doubleHalfItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    return rng() < 0.5 ? doubleItem(rng, seed, difficulty) : halfItem(rng, seed, difficulty);
}
