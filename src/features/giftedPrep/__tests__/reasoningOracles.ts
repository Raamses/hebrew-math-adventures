import type { PrepItem } from '../types';

/**
 * Independent solvers for the C3 reasoning types. Each reads only what the child sees (the plain stem
 * text) and finds the answer by brute force or by simulating the story, never by the generator's
 * formula. Returns every value that fits, so a sweep can demand exactly one.
 */

const nums = (s: string) => (s.match(/\d+/g) ?? []).map(Number);
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** "I added 4, then doubled it ... and got 20": try every starting number. */
function backwards(text: string): number[] {
    const steps = [...text.matchAll(/הוספתי לו (\d+)|הורדתי ממנו (\d+)|חיברתי אותו לעצמו|לקחתי את החצי שלו/g)];
    const r = Number(text.match(/וקיבלתי (\d+)/)![1]);
    return range(0, 200).filter(x => {
        let v = x;
        for (const m of steps) {
            if (m[1]) v += Number(m[1]);
            else if (m[2]) v -= Number(m[2]);
            else if (m[0].startsWith('חיברתי')) v += v;
            else { if (v % 2) return false; v /= 2; }
            if (v < 0) return false;
        }
        return v === r;
    });
}

/** Two amounts with the given total and difference: try every split of the total. */
function sumDifference(text: string): number[] {
    const [s, d] = nums(text);
    const askBig = /(הגדול|לרוני|הכחולה)\?$/.test(text);
    return range(0, s).filter(small => s - small - small === d).map(small => (askBig ? s - small : small));
}

/** Lines, fences and stairs, simulated one child, post or floor at a time. */
function position(text: string): number[] {
    const n = nums(text);
    if (text.includes('מהסוף. כמה ילדים')) {
        const [a, b] = n;
        // lines in these stems are under 30 children; 60 leaves room for a wrong reading to show up
        return range(1, 60).filter(len => {
            const line = range(1, len); // places from the front
            return line.includes(a) && line.slice().reverse().indexOf(a) + 1 === b;
        });
    }
    if (text.includes('באיזה מקום רוני מהסוף')) {
        const [len, a] = n;
        const fromBack = range(1, len).reverse();
        return [fromBack.indexOf(a) + 1];
    }
    if (text.includes('בין רוני לגל')) {
        const [a, b] = n;
        return [range(1, 60).filter(p => p > Math.min(a, b) && p < Math.max(a, b)).length];
    }
    if (text.includes('עמוד כל')) {
        const [L, g] = n;
        let posts = 0;
        for (let m = 0; m <= L; m++) if (m % g === 0) posts++;
        return [posts];
    }
    if (text.includes('מדרגות')) {
        const [g, a, b] = n;
        let steps = 0;
        for (let floor = a; floor < b; floor++) steps += g;
        return [steps];
    }
    throw new Error(`unknown position stem: ${text}`);
}

/** Lists every case and counts them. */
function counting(text: string): number[] {
    const n = nums(text);
    if (text.includes('לחצו ידיים') || text.includes('בטורניר')) {
        const pairs = new Set<string>();
        for (const i of range(1, n[0])) for (const j of range(1, n[0])) if (i !== j) pairs.add([i, j].sort().join('-'));
        return [pairs.size];
    }
    if (text.includes('מטבעות של 2 שקלים ושל 5')) {
        const target = n[0];
        let ways = 0;
        for (const fives of range(0, 20)) for (const twos of range(0, 50)) if (5 * fives + 2 * twos === target) ways++;
        return [ways];
    }
    if (text.includes('דו־ספרתיים')) {
        const digits = new Set(n.slice(0, 3));
        const twice = text.includes('מותר');
        return [range(10, 99).filter(m => {
            const t = Math.floor(m / 10), u = m % 10;
            return digits.has(t) && digits.has(u) && (twice || t !== u);
        }).length];
    }
    if (text.includes('חולצות')) {
        const [a, b] = n;
        const looks: string[] = [];
        for (const shirt of range(1, a)) for (const pants of range(1, b)) looks.push(`${shirt}/${pants}`);
        return [looks.length];
    }
    throw new Error(`unknown counting stem: ${text}`);
}

/** Totals reachable with `k` odd numbers from `odd` and `m` even numbers from `even` (repeats allowed). */
function reachable(k: number, m: number, odd: readonly number[], even: readonly number[]): Set<number> {
    let sums = new Set([0]);
    const add = (pool: readonly number[]) => { sums = new Set([...sums].flatMap(x => pool.map(p => x + p))); };
    for (let i = 0; i < k; i++) add(odd);
    for (let i = 0; i < m; i++) add(even);
    return sums;
}

/** Which offered totals or landing spots are possible: build every possible one and look the options up. */
function parity(item: PrepItem): number[] {
    const text = item.stem.text ?? '';
    const n = nums(text);
    if (text.includes('צפרדע')) {
        const [s, j] = n;
        const spots = new Set<number>();
        for (let at = s + j; at <= 200; at += j) spots.add(at);
        return item.options.map(Number).filter(o => spots.has(o));
    }
    const bounded = text.includes('בין 1 ל־9');
    const odds = bounded ? [1, 3, 5, 7, 9] : range(0, 60).filter(x => x % 2 === 1);
    const k = n[0], m = /אי־זוגיים ו־/.test(text) ? n[1] : 0;
    const sums = reachable(k, m, odds, [2, 4, 6, 8]);
    return item.options.map(Number).filter(o => sums.has(o));
}

/** Fills every empty bottom brick with 0–100 and keeps the fillings that match every shown brick. */
function pyramid(item: PrepItem): number[] {
    const rows = (item.stem.pictureLines ?? []).map(l => l.split('\u2003\u2003').map(c => (/^\d+$/.test(c) ? Number(c) : c)));
    const [top, mid, bottom] = rows;
    const holes = bottom.flatMap((c, i) => (typeof c === 'number' ? [] : [i]));
    const answers = new Set<number>();
    const fit = (b: number[]) => {
        const m = [b[0] + b[1], b[1] + b[2]];
        if (mid.some((c, i) => typeof c === 'number' && c !== m[i])) return;
        const t = m[0] + m[1];
        if (typeof top[0] === 'number' && top[0] !== t) return;
        const ask = [...top, ...mid, ...bottom].indexOf('?');
        answers.add([t, ...m, ...b][ask]);
    };
    // no brick can be bigger than a shown top brick
    const most = typeof top[0] === 'number' ? top[0] : 100;
    const b = [...bottom];
    const tryFrom = (h: number) => {
        if (h === holes.length) { fit(b as number[]); return; }
        for (let v = 0; v <= most; v++) { b[holes[h]] = v; tryFrom(h + 1); }
    };
    tryFrom(0);
    return [...answers];
}

const WEEK = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

/** Walks the days one by one. */
function calendar(item: PrepItem): (number | string)[] {
    const text = item.stem.text ?? '';
    const n = nums(text);
    if (text.includes('בחודש')) {
        let date = n[0];
        for (let i = 0; i < n[2]; i++) date = date === n[1] ? 1 : date + 1;
        return [date];
    }
    let day = WEEK.findIndex(d => text.startsWith(`היום ${d}.`));
    const back = text.includes('לפני');
    for (let i = 0; i < n[0]; i++) day = back ? (day + 6) % 7 : (day + 1) % 7;
    return [WEEK[day]];
}

const SOLVERS: Partial<Record<PrepItem['kind'], (item: PrepItem) => (number | string)[]>> = {
    'math-backwards': it => backwards(it.stem.text ?? ''),
    'math-sum-difference': it => sumDifference(it.stem.text ?? ''),
    'math-position': it => position(it.stem.text ?? ''),
    'math-counting': it => counting(it.stem.text ?? ''),
    'math-parity': parity,
    'math-pyramid': pyramid,
    'math-calendar': calendar,
};

/** Every value the story allows (a well-made item has exactly one); null for kinds this file does not cover. */
export function reasoningSolutions(item: PrepItem): (number | string)[] | null {
    const solve = SOLVERS[item.kind];
    return solve ? [...new Set(solve(item))] : null;
}

/** Option indices that hold a value the story allows; null for kinds this file does not cover. */
export function reasoningOracle(item: PrepItem): number[] | null {
    const answers = reasoningSolutions(item)?.map(String);
    return answers ? item.options.flatMap((o, i) => (answers.includes(o) ? [i] : [])) : null;
}
