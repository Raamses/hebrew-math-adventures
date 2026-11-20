import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { choiceItem, numericItem } from './mathBuild';
import { fillPair, reasonPair, type Pair } from './mathText';
import { intBetween, mulberry32, pick, shuffled, type Rng } from './prng';

/**
 * C3 reasoning, part 2: parity and range (which total is even possible), number pyramids (the middle
 * brick counts twice), and the 7-day week. As in mathReasoning.ts, every distractor is one named wrong path.
 */

const stem = ({ text, textNiqqud }: ReturnType<typeof fillPair>) => ({ text, textNiqqud });
/** `a + a + … = a·k` written out. */
const repeatSum = (a: number, k: number) => `${Array(k).fill(a).join(' + ')} = ${a * k}`;

// ── Parity: "Roni added 3 odd numbers, each between 1 and 9. Which total could be right?" ──

type ParityVariant = 'odd2' | 'oddBound' | 'mixed' | 'frog';
const PARITY_VARIANTS: Readonly<Record<Difficulty, readonly ParityVariant[]>> = {
    1: ['odd2'],
    2: ['oddBound', 'frog'],
    3: ['mixed', 'oddBound', 'frog'],
};

/** Distinct values from `pool` that pass `ok`, in shuffled order. */
const draw = (rng: Rng, pool: readonly number[], ok: (v: number) => boolean, n: number) =>
    shuffled(rng, pool.filter(ok)).slice(0, n);
const span = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);

function parityExplain(k: number, m: number, key: number): string {
    const pairs = Math.floor(k / 2), odd = k % 2 === 1;
    return `אי־זוגי ועוד אי־זוגי הוא תמיד זוגי, כמו ${ltr('3 + 5 = 8')}. `
        + `ב־${k} מספרים אי־זוגיים יש ${pairs === 1 ? 'זוג אחד' : `${pairs} זוגות`}${odd ? ' ועוד אחד, אז הסכום שלהם אי־זוגי' : ', אז הסכום שלהם זוגי'}`
        + `${m ? ', ומספרים זוגיים לא משנים את זה' : ''}. התוצאה ${odd ? 'אי־זוגית' : 'זוגית'}: ${key}.`;
}

export function parityItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const v = pick(rng, PARITY_VARIANTS[difficulty]);
    const base = { kind: 'math-parity', skill: 'parity' } as const;
    if (v === 'frog') {
        const j = difficulty === 2 ? 2 : 3;
        const s = intBetween(rng, 10, 40);
        const key = s + j * intBetween(rng, 3, 9);
        // landed behind the start (went backwards), and numbers next to the key, off the frog's path
        const behind = s - j * intBetween(rng, 1, Math.min(3, Math.floor(s / j)));
        const near = shuffled(rng, [key - 1, key + 1, key + 2, key - 2].filter(x => (x - s) % j !== 0));
        return choiceItem(rng, seed, difficulty, {
            ...base, stem: stem(fillPair(reasonPair('parity', 'frog'), { s, j })),
            options: [key, behind, ...near.slice(0, 2)].map(String),
            explanation: `הצפרדע נוחתת רק על המספרים שבקפיצות של ${j} מ־${s} והלאה: ${span(1, 4).map(t => s + j * t).join(', ')} וכן הלאה. `
                + `${key} בדרך שלה: ${ltr(`${s} + ${repeatSum(j, (key - s) / j).replace(/ = \d+$/, '')} = ${key}`)}. `
                + `${behind} קטן מ־${s}, והצפרדע קופצת רק קדימה.`,
        });
    }
    const k = v === 'odd2' ? 2 : intBetween(rng, 3, 4);
    const m = v === 'mixed' ? intBetween(rng, 1, 2) : 0;
    const bounded = v !== 'odd2';
    // smallest and largest possible totals: odd numbers 1..9, even numbers 2..8
    const lo = k + 2 * m, hi = bounded ? 9 * k + 8 * m : 40;
    const parity = k % 2;
    const fits = (x: number) => x % 2 === parity && x >= lo && x <= hi;
    const key = draw(rng, span(Math.max(lo, 10), hi), fits, 1)[0];
    const tooBig = bounded ? [hi + 2 * intBetween(rng, 1, 4)] : []; // right kind of number, but bigger than the largest total
    const wrongKind = draw(rng, span(Math.max(lo, 10), Math.min(hi, 60)), x => x % 2 !== parity, 3 - tooBig.length);
    const pair: Pair = reasonPair('parity', v);
    return choiceItem(rng, seed, difficulty, {
        ...base, stem: stem(fillPair(pair, { k, m })),
        options: [key, ...tooBig, ...wrongKind].map(String),
        explanation: parityExplain(k, m, key)
            + (bounded ? ` ${tooBig[0]} גם ${parity ? 'אי־זוגי' : 'זוגי'}, אבל גדול מדי: הכי הרבה אפשר להגיע ל־${ltr(`${[...Array(k).fill(9), ...Array(m).fill(8)].join(' + ')} = ${hi}`)}.` : ''),
    });
}

// ── Number pyramid: each brick is the sum of the two below it ──

/** '' is an empty brick, '?' the asked one. */
const row = (cells: readonly (number | string)[]) => cells.map(String);
const E = '';

export function pyramidItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const [lo, hi] = difficulty === 1 ? [1, 12] : difficulty === 2 ? [2, 18] : [2, 20];
    let a = 0, b = 0, c = 0;
    do { a = intBetween(rng, lo, hi); b = intBetween(rng, lo, hi); c = intBetween(rng, lo, hi); } while (a + 2 * b + c > 100 || a === c);
    const L = a + b, R = b + c, T = L + R;
    const text = stem(fillPair(reasonPair('pyramid', 'ask')));
    if (difficulty === 1) {
        return numericItem(rng, seed, difficulty, {
            kind: 'math-pyramid', skill: 'number-wall', stem: { ...text, pyramid: [row(['?']), row([E, E]), row([a, b, c])] },
            answer: T,
            slips: [a + b + c /* added the bottom row once */, L, R],
            explanation: `קודם ממלאים את השורה האמצעית: ${ltr(`${a} + ${b} = ${L}`)} ו־${ltr(`${b} + ${c} = ${R}`)}. `
                + `למעלה: ${ltr(`${L} + ${R} = ${T}`)}.`,
        });
    }
    if (difficulty === 2) {
        return numericItem(rng, seed, difficulty, {
            kind: 'math-pyramid', skill: 'number-wall', stem: { ...text, pyramid: [row([T]), row([L, E]), row([E, '?', c])] },
            answer: b,
            slips: [R /* stopped at the middle row */, T - c /* skipped the middle row */, L /* copied the brick above */],
            explanation: `מלמעלה למטה: המשבצת הריקה באמצע היא ${ltr(`${T} − ${L} = ${R}`)}. `
                + `היא הסכום של סימן השאלה ושל ${c}, אז ${ltr(`${R} − ${c} = ${b}`)}.`,
        });
    }
    const twice = T - a - c;
    return numericItem(rng, seed, difficulty, {
        kind: 'math-pyramid', skill: 'number-wall', stem: { ...text, pyramid: [row([T]), row([E, E]), row([a, '?', c])] },
        answer: b,
        slips: [twice /* forgot that the middle brick counts twice */, Math.round(twice / 2) + 1, Math.round(twice / 2) - 1],
        explanation: `המספר שבאמצע השורה התחתונה נכנס לשתי המשבצות שבאמצע, ולכן למעלה הוא נספר פעמיים: `
            + `${ltr(`${a} + ${b} + ${b} + ${c} = ${T}`)}. בלי ${a} ו־${c}: ${ltr(`${T} − ${a} − ${c} = ${twice}`)}, `
            + `וזה פעמיים המספר החסר: ${ltr(`${b} + ${b} = ${twice}`)}.`,
    });
}

// ── The 7-day week ──

const DAYS: readonly Pair[] = [
    ['יום ראשון', 'יוֹם רִאשׁוֹן'], ['יום שני', 'יוֹם שֵׁנִי'], ['יום שלישי', 'יוֹם שְׁלִישִׁי'], ['יום רביעי', 'יוֹם רְבִיעִי'],
    ['יום חמישי', 'יוֹם חֲמִישִׁי'], ['יום שישי', 'יוֹם שִׁישִּׁי'], ['שבת', 'שַׁבָּת'],
];
const mod7 = (i: number) => ((i % 7) + 7) % 7;

export function calendarItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const base = { kind: 'math-calendar', skill: 'calendar' } as const;
    if (difficulty === 3 && rng() < 0.4) {
        // the month runs out: "the 25th, a 30-day month, in 10 days"
        const d = intBetween(rng, 20, 29), n = intBetween(rng, 31 - d + 1, 15);
        const key = d + n - 30;
        return numericItem(rng, seed, difficulty, {
            ...base, stem: stem(fillPair(reasonPair('calendar', 'date'), { d, n })), answer: key,
            slips: [d + n /* forgot that the month ends */, key + 1 /* counted today */, key - 1],
            explanation: `עד סוף החודש נשארו ${ltr(`30 − ${d} = ${30 - d}`)} ימים. `
                + `אחריהם מתחיל חודש חדש, ונשארו עוד ${ltr(`${n} − ${30 - d} = ${key}`)} ימים: התאריך ${key}.`,
        });
    }
    const back = difficulty === 3 && rng() < 0.5;
    const n = difficulty === 1 ? intBetween(rng, 7, 10) : difficulty === 2 ? intBetween(rng, 9, 20) : intBetween(rng, 15, 30);
    const today = intBetween(rng, 0, 6);
    const dir = back ? -1 : 1;
    const key = mod7(today + dir * n);
    const rest = n % 7, weeks = Math.floor(n / 7);
    // counted today as the first day / one day too far / went the other way in the week
    const wrong = [...new Set([today + dir * (n - 1), today + dir * (n + 1), today - dir * n].map(mod7))].filter(i => i !== key);
    while (wrong.length < 3) { const i = intBetween(rng, 0, 6); if (i !== key && !wrong.includes(i)) wrong.push(i); }
    const t = DAYS[today];
    const ask = reasonPair('calendar', back ? 'before' : 'after');
    const steps = span(1, rest).map(i => DAYS[mod7(today + dir * i)][0]);
    const item = choiceItem(rng, seed, difficulty, {
        ...base,
        stem: { text: fillPair(ask, { n, day: t[0] }).text, textNiqqud: fillPair(ask, { n, day: t[1] }).textNiqqud },
        options: [key, ...wrong.slice(0, 3)].map(i => DAYS[i][0]),
        explanation: `כל 7 ימים חוזרים לאותו יום בשבוע. ${ltr(`${n} − ${Array(weeks).fill(7).join(' − ')} = ${rest}`)}, `
            + (rest === 0
                ? `אז זה שוב ${t[0]}.`
                : `אז מספיק לספור ${rest === 1 ? 'יום אחד' : `${rest} ימים`} ${back ? 'אחורה' : 'קדימה'} מ${t[0]}: ${steps.join(', ')}. התשובה: ${DAYS[key][0]}.`),
    });
    return { ...item, optionsNiqqud: item.options.map(o => DAYS.find(d => d[0] === o)![1]) };
}
