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

const SOLVERS: Partial<Record<PrepItem['kind'], (text: string) => number[]>> = {
    'math-backwards': backwards,
    'math-sum-difference': sumDifference,
    'math-position': position,
    'math-counting': counting,
};

/** Every value the story allows (a well-made item has exactly one); null for kinds this file does not cover. */
export function reasoningSolutions(item: PrepItem): number[] | null {
    const solve = SOLVERS[item.kind];
    return solve ? [...new Set(solve(item.stem.text ?? ''))] : null;
}

/** Option indices that hold a value the story allows; null for kinds this file does not cover. */
export function reasoningOracle(item: PrepItem): number[] | null {
    const answers = reasoningSolutions(item);
    return answers && item.options.flatMap((o, i) => (answers.includes(Number(o)) ? [i] : []));
}
