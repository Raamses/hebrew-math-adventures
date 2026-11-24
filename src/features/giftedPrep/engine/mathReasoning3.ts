import type { Difficulty, PrepItem } from '../types';
import { ltr } from './arithmeticExplain';
import { numericItem, choiceItem } from './mathBuild';
import { fillPair, joinPairs, reasonPair, type Pair } from './mathText';
import { intBetween, mulberry32, pick, shuffled, type Rng } from './prng';

/**
 * C5 reasoning: find a machine's rule from in→out pairs, find the digit a shape hides (ones column
 * first), and pick the number that fits every clue. As in mathReasoning.ts, every distractor is one named
 * wrong path.
 */

const stem = ({ text, textNiqqud }: ReturnType<typeof fillPair>) => ({ text, textNiqqud });

// ── Number machine: 3 → 7, 5 → 11, 8 → 17, 6 → ? ──

interface Rule { readonly scale: 'one' | 'double' | 'half'; readonly add: number }

const applyRule = (r: Rule, x: number) => (r.scale === 'double' ? 2 * x : r.scale === 'half' ? x / 2 : x) + r.add;

function pickRule(rng: Rng, difficulty: Difficulty): Rule {
    if (difficulty === 1) return { scale: 'one', add: (rng() < 0.7 ? 1 : -1) * intBetween(rng, 2, 15) };
    if (difficulty === 2) return rng() < 0.3 ? { scale: 'one', add: intBetween(rng, 11, 30) } : { scale: 'double', add: pick(rng, [0, 0, 1, -1, 2]) };
    return rng() < 0.6
        ? { scale: 'double', add: (rng() < 0.5 ? 1 : -1) * intBetween(rng, 3, 10) }
        : { scale: 'half', add: pick(rng, [0, 0, 1, 2, 3, 5, -1]) };
}

/** One input's working, as an LTR isolate: "6 + 6 + 1 = 13", half: "9 + 9 = 18" then "+ add". */
function ruleSteps(r: Rule, x: number): string {
    const y = applyRule(r, x);
    const signed = (v: number, n: number) => `${v} ${n >= 0 ? '+' : '−'} ${Math.abs(n)} = ${v + n}`;
    if (r.scale === 'one') return ltr(signed(x, r.add));
    if (r.scale === 'double') return r.add === 0 ? ltr(`${x} + ${x} = ${y}`) : ltr(`${x} + ${x} ${r.add > 0 ? '+' : '−'} ${Math.abs(r.add)} = ${y}`);
    const h = x / 2;
    return r.add === 0 ? `החצי של ${x} הוא ${h}, כי ${ltr(`${h} + ${h} = ${x}`)}` : `החצי של ${x} הוא ${h}, ואז ${ltr(signed(h, r.add))}`;
}

function ruleName(r: Rule): string {
    const tail = r.add === 0 ? '' : r.add > 0 ? `, ואז מוסיפים ${r.add}` : `, ואז מורידים ${-r.add}`;
    if (r.scale === 'one') return r.add > 0 ? `מוסיפים ${r.add}` : `מורידים ${-r.add}`;
    return (r.scale === 'double' ? 'מחברים את המספר לעצמו' : 'לוקחים חצי') + tail;
}

export function machineItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const rule = pickRule(rng, difficulty);
    for (;;) {
        const pool = Array.from({ length: rule.scale === 'one' ? 60 : 45 }, (_, i) => i + 2).filter(x => rule.scale !== 'half' || x % 2 === 0);
        const [a, b, c, q] = shuffled(rng, pool).slice(0, 4);
        const ins = [a, b, c].sort((x, y) => x - y);
        const outs = ins.map(x => applyRule(rule, x));
        const answer = applyRule(rule, q);
        if ([...outs, answer].some(y => y < 1 || y > 100)) continue;
        const slips = [
            q + (outs[0] - ins[0]), // took the first pair's difference as the rule
            outs[2] + (outs[2] - outs[1]), // continued the outputs like a number sequence
            ...(rule.scale === 'one' ? [q - rule.add] : [applyRule({ ...rule, add: 0 }, q), q + rule.add]), // did the opposite / dropped one part of the rule
            answer + 1, answer - 1,
        ].filter(x => Number.isInteger(x) && x >= 0 && x <= 100);
        return numericItem(rng, seed, difficulty, {
            kind: 'math-machine', skill: 'number-machine',
            stem: { ...stem(fillPair(reasonPair('machine', 'ask'))), pictureLines: [...ins.map((x, i) => `${x} → ${outs[i]}`), `${q} → ?`] },
            answer, slips,
            explanation: `הכלל: ${ruleName(rule)}. בודקים: ${ruleSteps(rule, ins[0])}, וגם ${ruleSteps(rule, ins[2])}. `
                + `אז ל־${q}: ${ruleSteps(rule, q)}.`,
        });
    }
}

// ── Hidden digit: "4⭐ + ⭐5 = 87" ──

const STAR = '⭐';
type DigitForm = 'onesPlus' | 'twoPlaces' | 'carry' | 'minus';
const DIGIT_FORMS: Readonly<Record<Difficulty, readonly DigitForm[]>> = {
    1: ['onesPlus'],
    2: ['twoPlaces', 'carry'],
    3: ['carry', 'minus', 'twoPlaces'],
};

/** Every digit 0–9 that makes `eq` true when put in place of ⭐ (a leading ⭐ cannot be 0). */
export function starDigits(eq: string): number[] {
    return Array.from({ length: 10 }, (_, d) => d).filter(d => {
        const filled = eq.replaceAll(STAR, String(d));
        const m = filled.match(/^(\d+) ([+−]) (\d+) = (\d+)$/);
        if (!m || [m[1], m[3]].some(n => n.length > 1 && n.startsWith('0'))) return false;
        return (m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])) === Number(m[4]);
    });
}

export function hiddenDigitItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const form = pick(rng, DIGIT_FORMS[difficulty]);
    for (;;) {
        const x = intBetween(rng, 1, 9);
        let left = '', right = '', a = 0, b = 0, op: '+' | '−' = '+';
        if (form === 'onesPlus') { // 3⭐ + 41 = 76: no carry, one ⭐
            const t = intBetween(rng, 1, 5), b2 = intBetween(rng, 10, 40);
            if (b2 % 10 === 0 || x + (b2 % 10) >= 10) continue;
            [left, right, a, b] = [`${t}${STAR}`, String(b2), 10 * t + x, b2];
        } else if (form === 'twoPlaces') { // ⭐2 + 3⭐ = 57: ⭐ is a tens digit and a ones digit
            const u = intBetween(rng, 1, 9), t = intBetween(rng, 1, 6);
            [left, right, a, b] = [`${STAR}${u}`, `${t}${STAR}`, 10 * x + u, 10 * t + x];
        } else if (form === 'carry') { // 4⭐ + 2⭐ = 74 ... ones column carries
            const t1 = intBetween(rng, 1, 4), t2 = intBetween(rng, 1, 4), u = intBetween(rng, 1, 9);
            if (x + u < 10) continue;
            [left, right, a, b] = [`${t1}${STAR}`, `${t2}${u}`, 10 * t1 + x, 10 * t2 + u];
        } else { // 8⭐ − 26 = 57 ... borrow from the tens
            const t = intBetween(rng, 5, 9), b2 = intBetween(rng, 11, 49);
            if (x >= b2 % 10) continue;
            [left, right, a, b, op] = [`${t}${STAR}`, String(b2), 10 * t + x, b2, '−'];
        }
        const r = op === '+' ? a + b : a - b;
        if (r < 10 || r > 99) continue;
        const equation = `${left} ${op} ${right} = ${r}`;
        if (starDigits(equation).length !== 1) continue;
        const onesR = r % 10;
        // the ones column: which ones digit is the ⭐ and which one is known
        const starLeft = form !== 'twoPlaces';
        const known = starLeft ? b % 10 : a % 10;
        const carried = op === '+' ? (a % 10) + (b % 10) >= 10 : (a % 10) < (b % 10);
        const digits = Array.from({ length: 10 }, (_, d) => d).sort((p, q) => Math.abs(p - x) - Math.abs(q - x));
        const slips = [
            Math.abs(onesR - known), // subtracted the ones digits the easy way round, ignoring the carry or borrow
            onesR, // copied the result's ones digit
            known, // copied the other number's ones digit
            ...digits, // then the nearest digits, so every option stays a digit
        ];
        const check = op === '+' ? `${a} + ${b} = ${r}` : `${a} − ${b} = ${r}`;
        const sides = starLeft ? `${STAR} ${op === '+' ? 'ועוד' : 'פחות'} ${known}` : `${known} ועוד ${STAR}`;
        const note = !carried ? '' : op === '+' ? ', ועשרת אחת עוברת לעשרות' : ', אז פורטים עשרת';
        // how the ones column gives ⭐: back from the result's ones digit (with the carried or borrowed ten)
        const find = op === '+'
            ? `${onesR + (carried ? 10 : 0)} − ${known} = ${x}`
            : carried ? `${onesR} + ${known} − 10 = ${x}` : `${onesR} + ${known} = ${x}`;
        return numericItem(rng, seed, difficulty, {
            kind: 'math-hidden-digit', skill: 'hidden-digit',
            stem: { ...stem(fillPair(reasonPair('hiddenDigit', 'ask'))), equation },
            answer: x, slips: slips.filter(d => d >= 0 && d <= 9), max: 0,
            explanation: `מתחילים מהאחדות: ${sides} צריך להיגמר ב־${onesR}${note}. `
                + `${STAR} הוא ${x}: ${ltr(find)}. `
                + `${form === 'twoPlaces' ? `${STAR} מופיע גם בעשרות, ושם הוא מתאים גם כן. ` : ''}בדיקה: ${ltr(check)}.`,
        });
    }
}

// ── "I'm thinking of a number" with 2-3 clues ──

type ClueKind = 'even' | 'odd' | 'gt' | 'lt' | 'tens' | 'ones' | 'digitSum';
interface Clue { readonly kind: ClueKind; readonly n: number }

const tensOf = (v: number) => Math.floor(v / 10);
export const clueHolds = (c: Clue, v: number): boolean => ({
    even: v % 2 === 0, odd: v % 2 === 1, gt: v > c.n, lt: v < c.n,
    tens: tensOf(v) === c.n, ones: v % 10 === c.n, digitSum: tensOf(v) + (v % 10) === c.n,
})[c.kind];

/** A clue the key satisfies. */
function clueFor(rng: Rng, kind: ClueKind, key: number): Clue {
    switch (kind) {
        case 'gt': return { kind, n: key - intBetween(rng, 3, 15) };
        case 'lt': return { kind, n: key + intBetween(rng, 3, 15) };
        case 'tens': return { kind, n: tensOf(key) };
        case 'ones': return { kind, n: key % 10 };
        case 'digitSum': return { kind, n: tensOf(key) + (key % 10) };
        default: return { kind, n: 0 };
    }
}

/** 'parity' becomes even or odd, whichever the key is. */
type ClueSlot = Exclude<ClueKind, 'even' | 'odd'> | 'parity';
const CLUE_SETS: Readonly<Record<Difficulty, readonly (readonly ClueSlot[])[]>> = {
    1: [['parity', 'tens'], ['parity', 'gt'], ['ones', 'gt']],
    2: [['parity', 'gt', 'tens'], ['parity', 'lt', 'digitSum'], ['ones', 'gt', 'lt']],
    3: [['parity', 'gt', 'digitSum'], ['gt', 'lt', 'digitSum'], ['parity', 'lt', 'digitSum']],
};

export function cluesItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const set = pick(rng, CLUE_SETS[difficulty]);
    for (;;) {
        const key = intBetween(rng, 12, 98);
        const clues = set.map(k => clueFor(rng, k === 'parity' ? (key % 2 ? 'odd' : 'even') : k, key));
        if (clues.some(c => (c.kind === 'gt' && c.n < 1) || (c.kind === 'lt' && c.n > 100))) continue;
        // each wrong option breaks exactly one clue and keeps the others: the child missed that one clue
        const near = Array.from({ length: 89 }, (_, i) => i + 10).filter(v => v !== key);
        const wrong = clues.map(broken => shuffled(rng, near).find(v => !clueHolds(broken, v) && clues.every(c => c === broken || clueHolds(c, v))));
        while (clues.length === 2 && wrong.length < 3) wrong.push(shuffled(rng, near).find(v => clues.filter(c => !clueHolds(c, v)).length === 2));
        if (wrong.some(v => v === undefined) || new Set(wrong).size !== 3) continue;
        const parts: Pair[] = clues.map(c => fillPair(reasonPair('clues', c.kind), { n: c.n })).map(p => [p.text!, p.textNiqqud!]);
        const text = joinPairs(reasonPair('clues', 'intro'), ...parts, reasonPair('clues', 'ask'));
        return choiceItem(rng, seed, difficulty, {
            kind: 'math-clues', skill: 'clues', stem: { text: text[0], textNiqqud: text[1] },
            options: [key, ...(wrong as number[])].map(String),
            explanation: `בודקים כל מספר מול כל מה שנאמר. רק ${key} מתאים לכולם. `
                + (wrong as number[]).map(v => `${v} לא מתאים, כי ${whyNot(clues.find(c => !clueHolds(c, v))!, v)}`).join('; ') + '.',
        });
    }
}

function whyNot(c: Clue, v: number): string {
    switch (c.kind) {
        case 'even': return 'הוא אי־זוגי';
        case 'odd': return 'הוא זוגי';
        case 'gt': return `הוא לא גדול מ־${c.n}`;
        case 'lt': return `הוא לא קטן מ־${c.n}`;
        case 'tens': return `ספרת העשרות שלו היא ${tensOf(v)}`;
        case 'ones': return `ספרת האחדות שלו היא ${v % 10}`;
        case 'digitSum': return v % 10 === 0
            ? `סכום הספרות שלו הוא ${tensOf(v)}, לא ${c.n}`
            : `${ltr(`${tensOf(v)} + ${v % 10} = ${tensOf(v) + (v % 10)}`)}, לא ${c.n}`;
    }
}
