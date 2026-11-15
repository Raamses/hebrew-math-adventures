import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { choiceItem, numericItem } from './mathBuild';
import { fillPair, stemPair } from './mathText';
import { intBetween, mulberry32, shuffled, type Rng } from './prng';

/** Comparing exercises, and balancing two sides (the Stage-A "missing number" in a richer form). */

interface Expr { readonly a: number; readonly b: number; readonly op: '+' | '-'; readonly r: number }

const show = (e: Expr) => `${e.a} ${e.op} ${e.b}`;
const showEq = (e: Expr) => `${e.a} ${e.op === '+' ? '+' : '−'} ${e.b} = ${e.r}`;

/** An exercise with result r. d1: addition without carry; d2–3: + or -, numbers within 100. */
function exprFor(rng: Rng, r: number, difficulty: Difficulty): Expr {
    for (;;) {
        const op = difficulty === 1 || rng() < 0.5 ? '+' : '-';
        if (op === '+') {
            const a = intBetween(rng, 10, r - 2);
            const b = r - a;
            if (difficulty === 1 && (a % 10) + (b % 10) >= 10) continue;
            return { a, b, op, r };
        }
        const b = intBetween(rng, 2, 40);
        if (r + b <= 99) return { a: r + b, b, op, r };
    }
}

export function compareItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const wantMax = rng() < 0.5;
    // Four different results; harder levels keep them close, so every exercise must be worked out
    const spread = difficulty === 1 ? 30 : difficulty === 2 ? 14 : 7;
    const base = intBetween(rng, 20, 90 - spread);
    const results = new Set<number>();
    while (results.size < 4) results.add(base + intBetween(rng, 0, spread));
    const exprs = shuffled(rng, [...results]).map(r => exprFor(rng, r, difficulty));
    const sorted = [...exprs].sort((x, y) => (wantMax ? y.r - x.r : x.r - y.r));
    const key = sorted[0];
    return choiceItem(rng, seed, difficulty, {
        kind: 'math-compare', skill: 'compare',
        stem: fillPair(stemPair(wantMax ? 'compareMax' : 'compareMin')),
        options: sorted.map(show),
        explanation: `מחשבים כל תרגיל: ${sorted.map(e => ltr(showEq(e))).join(', ')}. `
            + `התוצאה ${wantMax ? 'הכי גדולה' : 'הכי קטנה'} היא ${key.r}.`,
    });
}

/** "a + ? = c + d" (or the sides swapped): first work out the full side, then the missing part. */
export function balanceItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const [lo, hi] = difficulty === 1 ? [2, 9] : difficulty === 2 ? [5, 25] : [12, 45];
    let c = 0, d = 0, a = 0, s = 0;
    do {
        c = intBetween(rng, lo, hi);
        d = intBetween(rng, lo, hi);
        s = c + d;
        a = intBetween(rng, 2, s - 2);
    } while (a === c || a === d || s - a === c || s - a === d);
    const x = s - a;
    const left = `${a} + ?`, right = `${c} + ${d}`;
    return numericItem(rng, seed, difficulty, {
        kind: 'math-missing', skill: 'missing-number',
        stem: { ...fillPair(stemPair('balance')), equation: rng() < 0.5 ? `${left} = ${right}` : `${right} = ${left}` },
        answer: x,
        // wrote the total of the full side / added instead of subtracting
        slips: [s, ...(a + s <= 100 ? [a + s] : [])],
        explanation: `קודם מחשבים את הצד השלם: ${ltr(`${c} + ${d} = ${s}`)}. `
            + `כמה צריך להוסיף ל־${a} כדי להגיע ל־${s}? ${ltr(`${s} − ${a} = ${x}`)}.`,
    });
}
