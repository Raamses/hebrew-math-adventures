import type { Difficulty, PrepItem } from '../types';
import { choiceItem, numericItem } from './mathBuild';
import { fillPair, stemPair } from './mathText';
import { intBetween, mulberry32, pick, shuffled, type Rng } from './prng';

/** Number patterns: sequences with a rule, and "which number does not belong". */

type Rule =
    | { readonly kind: 'step'; readonly step: number }
    | { readonly kind: 'alt'; readonly steps: readonly [number, number] }
    | { readonly kind: 'grow'; readonly first: number };

const diffAt = (rule: Rule, i: number): number =>
    rule.kind === 'step' ? rule.step : rule.kind === 'alt' ? rule.steps[i % 2] : rule.first + i;

function pickRule(rng: Rng, difficulty: Difficulty): Rule {
    if (difficulty === 1) return { kind: 'step', step: pick(rng, [2, 3, 5, 10]) };
    if (difficulty === 2) return { kind: 'step', step: pick(rng, [4, 6, 9, 11, -2, -3, -5, -10]) };
    const r = rng();
    if (r < 0.4) {
        const a = intBetween(rng, 4, 9);
        return { kind: 'alt', steps: [a, -intBetween(rng, 1, a - 2)] };
    }
    if (r < 0.7) {
        const a = intBetween(rng, 1, 5);
        let b = intBetween(rng, 2, 9);
        if (b === a) b = a + 4;
        return { kind: 'alt', steps: [a, b] };
    }
    return { kind: 'grow', first: intBetween(rng, 1, 3) };
}

/** `count` terms of the rule from `start`. */
const termsOf = (rule: Rule, start: number, count: number): number[] =>
    Array.from({ length: count - 1 }).reduce<number[]>((acc, _, i) => [...acc, acc[i] + diffAt(rule, i)], [start]);

export function sequenceItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const rule = pickRule(rng, difficulty);
    const shown = rule.kind === 'step' ? 5 : 6;
    for (;;) {
        const terms = termsOf(rule, intBetween(rng, 0, 60), shown + 1);
        if (terms.some(t => t < 0 || t > 100)) continue;
        const gap = rule.kind === 'step' && rng() < 0.35 ? intBetween(rng, 1, shown - 2) : -1;
        const at = gap >= 0 ? gap : shown;
        const answer = terms[at];
        const line = terms.slice(0, gap >= 0 ? shown : shown + 1).map((t, i) => (i === at ? '?' : String(t))).join(', ');
        const d = diffAt(rule, at - 1);
        // repeated the previous step instead of alternating / growing; went the wrong way; skipped a step
        const slips = gap >= 0 ? [] : rule.kind === 'step' ? [answer + d, answer - 2 * d] : [terms[at - 1] + diffAt(rule, at - 2), answer + 1];
        const rest = rule.kind === 'step'
            ? `בכל צעד ${d > 0 ? 'מוסיפים' : 'מורידים'} ${Math.abs(d)}.`
            : rule.kind === 'alt'
                ? `הצעדים מתחלפים: ${rule.steps.map(s => (s > 0 ? `עוד ${s}` : `פחות ${-s}`)).join(', ואז ')}.`
                : `כל צעד גדול באחד מהצעד שלפניו: עכשיו מוסיפים ${d}.`;
        return numericItem(rng, seed, difficulty, {
            kind: 'math-sequence', skill: 'number-pattern',
            stem: { ...fillPair(stemPair(gap >= 0 ? 'sequenceGap' : 'sequenceNext')), equation: line },
            answer, slips, explanation: `${rest} לכן המספר ${gap >= 0 ? 'החסר' : 'הבא'} הוא ${answer}.`,
        });
    }
}

interface Prop { readonly name: string; readonly has: (n: number) => boolean; readonly why: string }

const tensOf = (n: number) => Math.floor(n / 10);

/** Simple properties a 2nd grader can name; also used to prove only one number is the odd one out. */
export function oddOneOutProps(): Prop[] {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    return [
        { name: 'even', has: n => n % 2 === 0, why: 'הם מספרים זוגיים' },
        { name: 'odd', has: n => n % 2 === 1, why: 'הם מספרים אי־זוגיים' },
        { name: 'tens', has: n => n % 10 === 0, why: 'הם עשרות שלמות (נגמרים ב־0)' },
        { name: 'fives', has: n => n % 5 === 0, why: 'נגמרים ב־0 או ב־5' },
        { name: 'twin', has: n => n > 10 && tensOf(n) === n % 10, why: 'שתי הספרות שלהם שוות' },
        { name: 'oneDigit', has: n => n < 10, why: 'הם מספרים עם ספרה אחת' },
        ...digits.map(d => ({ name: `tens${d}`, has: (n: number) => n >= 10 && tensOf(n) === d, why: `יש בהם ${d} עשרות` })),
        ...digits.map(d => ({ name: `ones${d}`, has: (n: number) => n % 10 === d, why: `נגמרים בספרה ${d}` })),
    ];
}

/** Options that are the single outlier under some property: the other three share it, this one does not. */
export function outliers(nums: readonly number[], props: readonly Prop[] = oddOneOutProps()): Set<number> {
    const out = new Set<number>();
    for (const p of props) {
        const miss = nums.filter(n => !p.has(n));
        if (miss.length === 1) out.add(miss[0]);
    }
    return out;
}

const ODD_PROPS: Readonly<Record<Difficulty, readonly string[]>> = {
    1: ['even', 'odd', 'tens', 'tens2', 'tens5'],
    2: ['fives', 'twin', 'ones3', 'ones7', 'tens4', 'tens8'],
    3: ['even', 'odd', 'fives', 'twin', 'ones4', 'ones9', 'tens6', 'tens7'],
};

export function oddOneOutItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const props = oddOneOutProps();
    const wanted = pick(rng, ODD_PROPS[difficulty]);
    const prop = props.find(p => p.name === wanted)!;
    for (;;) {
        const pool = Array.from({ length: 99 }, (_, i) => i + 1);
        const fits = shuffled(rng, pool.filter(prop.has)).slice(0, 3);
        const misfits = pool.filter(n => !prop.has(n));
        const odd = pick(rng, misfits);
        const all = [odd, ...fits];
        const found = outliers(all, props);
        if (fits.length < 3 || found.size !== 1 || !found.has(odd)) continue;
        const sorted = [...fits].sort((a, b) => a - b);
        return choiceItem(rng, seed, difficulty, {
            kind: 'math-odd-one-out', skill: 'odd-one-out',
            stem: fillPair(stemPair('oddOneOut')),
            options: all.map(String),
            explanation: `${sorted.slice(0, 2).join(', ')} ו־${sorted[2]} ${prop.why}, ו־${odd} לא.`,
        });
    }
}
