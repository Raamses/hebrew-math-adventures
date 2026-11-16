import more from '../content/he/math-more.json';
import type { PrepItem } from '../types';

/**
 * Independent answer oracles for the wider math pool: each reads only what the child sees (stem text,
 * equation, options) and returns the set of options a careful child could defend. The sweep test
 * requires that set to be exactly the key.
 */

const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const evalExpr = (s: string): number => {
    const m = s.match(/^(\d+) ([+-]) (\d+)$/);
    if (!m) throw new Error(`not an exercise: ${s}`);
    return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3]);
};
const sameText = (item: PrepItem, plain: string) => {
    const re = new RegExp(`^${plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\\\{\w+\\\}\\\}/g, '.+')}$`);
    return re.test(item.stem.text ?? '');
};

/** The next/missing term, if the shown terms follow one of: constant step, two alternating steps, step growing by 1. */
export function sequenceAnswer(line: string): number {
    const parts = line.split(', ');
    const at = parts.indexOf('?');
    const known = parts.map(p => (p === '?' ? NaN : Number(p)));
    const candidates = new Set<number>();
    for (let v = 0; v <= 100; v++) {
        const t = known.map((k, i) => (i === at ? v : k));
        const d = t.slice(1).map((x, i) => x - t[i]);
        const constant = d.every(x => x === d[0]);
        const alternating = d.length >= 4 && d.every((x, i) => x === d[i % 2]) && d[0] !== d[1];
        const growing = d.every((x, i) => i === 0 || x - d[i - 1] === 1);
        if (constant || alternating || growing) candidates.add(v);
    }
    if (candidates.size !== 1) throw new Error(`sequence ${line} has ${candidates.size} readings`);
    return [...candidates][0];
}

const PROPS: ((n: number) => boolean)[] = [
    n => n % 2 === 0, n => n % 2 === 1, n => n % 10 === 0, n => n % 5 === 0, n => n < 10,
    n => n > 10 && Math.floor(n / 10) === n % 10,
    ...Array.from({ length: 10 }, (_, d) => (n: number) => n >= 10 && Math.floor(n / 10) === d),
    ...Array.from({ length: 10 }, (_, d) => (n: number) => n % 10 === d),
];

/** Options that stand alone under some simple property the other three share. */
function oddOnes(options: readonly number[]): number[] {
    const out = new Set<number>();
    for (const p of PROPS) {
        // three share the property and one does not
        const miss = options.filter(n => !p(n));
        if (miss.length === 1) out.add(miss[0]);
    }
    return [...out];
}

const S = more.stems;
const W = more.wordProblems;

/** The value the stem asks for, computed from scratch. Returns null for kinds this file does not cover. */
export function oracle(item: PrepItem): number[] | null {
    const opts = item.options;
    const [t0] = [item.stem.text ?? ''];
    switch (item.kind) {
        case 'math-compare': {
            const vals = opts.map(evalExpr);
            const best = sameText(item, S.compareMax[0]) ? Math.max(...vals) : Math.min(...vals);
            return vals.flatMap((v, i) => (v === best ? [i] : []));
        }
        case 'math-odd-one-out': {
            const ns = opts.map(Number);
            return oddOnes(ns).map(n => ns.indexOf(n));
        }
        case 'math-sequence': {
            const a = sequenceAnswer(item.stem.equation!);
            return opts.flatMap((o, i) => (Number(o) === a ? [i] : []));
        }
        default: break;
    }
    let answer: number | undefined;
    const n = nums(t0);
    if (item.kind === 'math-missing' && item.stem.equation?.includes(' = ') && item.stem.equation.split('+').length === 3) {
        const [l, r] = item.stem.equation.split(' = ');
        const full = l.includes('?') ? r : l, part = l.includes('?') ? l : r;
        answer = evalExpr(full) - nums(part)[0];
    } else if (item.kind === 'math-place-value') {
        if (sameText(item, S.tensIn[0])) answer = Math.floor(n[0] / 10);
        else if (sameText(item, S.unitsTens[0])) answer = n[0] + 10 * n[1];
        else answer = 10 * n[0] + n[1];
    } else if (item.kind === 'math-double-half') {
        answer = sameText(item, S.double[0]) ? 2 * n[0] : n[0] / 2;
    } else if (item.kind === 'math-money') {
        answer = sameText(item, S.coins[0]) ? 10 * n[0] + 5 * n[2] + n[4] : n[1] - n[0];
    } else if (item.kind === 'math-word') {
        const solve: Record<string, (x: number[]) => number> = {
            class_left: x => x[0] - x[1], garden_flowers: x => x[0] + x[1], stickers_more: x => x[0] - x[1],
            bus_on: x => x[0] + x[1], book_pages: x => x[0] - x[1], pencils_added: x => x[1] - x[0],
            marbles_more: x => x[0] + x[1], birds_two_step: x => x[0] - x[1] + x[2],
        };
        const key = Object.keys(W).find(k => sameText(item, W[k as keyof typeof W][0]));
        if (!key) return null; // an original word problem (he.json bank), covered by arithmetic.test.ts
        answer = solve[key](n);
    } else {
        return null;
    }
    return opts.flatMap((o, i) => (Number(o) === answer ? [i] : []));
}
