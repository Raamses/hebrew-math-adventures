import { describe, it, expect } from 'vitest';
import { backwardsItem, coinWays, countingItem, positionItem, sumDifferenceItem } from '../engine/mathReasoning';
import { calendarItem, parityItem, pyramidItem } from '../engine/mathReasoning2';
import { clueHolds, cluesItem, hiddenDigitItem, machineItem } from '../engine/mathReasoning3';
import { scalesItem, triangleItem } from '../engine/mathReasoning4';
import { logicItem } from '../engine/mathReasoning5';
import { stripNiqqud as strip } from '../engine/niqqud';
import { pyramidText } from '../engine/mistakeDetails';
import { hasNiqqud, stripNiqqud } from '../engine/niqqud';
import type { Difficulty, PrepItem } from '../types';
import { logicGrid, reasoningOracle, reasoningSolutions } from './reasoningOracles';

const SEEDS = Number(process.env.PREP_SWEEP ?? 10_000);
const DIFFS: Difficulty[] = [1, 2, 3];
const MAKERS = {
    backwardsItem, sumDifferenceItem, positionItem, countingItem, parityItem, pyramidItem, calendarItem,
    machineItem, hiddenDigitItem, cluesItem, scalesItem, triangleItem, logicItem,
};
const WEEK = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

/** `a + b − c = d` with any number of terms, evaluated left to right. */
function chainHolds(eq: string): boolean {
    const m = eq.match(/^(\d+(?: [+−] \d+)+) = (\d+)$/);
    if (!m) return false;
    const tokens = m[1].split(' ');
    let v = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
        const n = Number(tokens[i + 1]);
        if (n === 0) return false;
        v = tokens[i] === '+' ? v + n : v - n;
    }
    return v === Number(m[2]);
}

/** Everything wrong with one item, as messages (empty = fine); the sweep asserts the collected list is empty. */
function problems(item: PrepItem): string[] {
    const out: string[] = [];
    const say = (ok: boolean, msg: string) => { if (!ok) out.push(`${item.id}: ${msg} | ${item.stem.text} [${item.options}]`); };
    say(item.options.length === 4 && new Set(item.options).size === 4, 'options not 4 distinct');
    say(item.options.every(o => /^\d+$/.test(o) && Number(o) <= 100) || item.options.every(o => WEEK.includes(o))
        || (item.kind === 'math-scales' && item.options.every(o => !/[\d\u05D0-\u05EA]/.test(o)))
        || (item.kind === 'math-logic' && item.optionsNiqqud?.length === 4),
        'options are neither whole numbers 0–100, day names, (scales) pictures nor (who has what) vocalized words');
    say(!item.stem.triangle || (item.stem.triangle.length === 6 && item.stem.triangle.filter(c => c === '?').length <= 1), 'triangle is not 6 circles with at most one "?"');
    say(!item.optionsNiqqud || item.optionsNiqqud.every((o, i) => hasNiqqud(o) && strip(o) === item.options[i]), 'option niqqud twin differs');
    say((item.stem.pyramid ?? []).flat().every(c => c === '' || c === '?' || (/^\d+$/.test(c) && Number(c) <= 100)), 'pyramid brick is not a number 0–100, "?" or empty');
    say(!item.stem.pyramid || item.stem.pyramid.every((r, i) => r.length === i + 1), 'pyramid rows are not 1, 2, 3 bricks');
    say((item.stem.pictureLines ?? []).every(l => (l.match(/\d+/g) ?? []).every(n => Number(n) <= 100)), 'picture number over 100');
    say((item.stem.equation?.match(/\d+/g) ?? []).every(n => Number(n) <= 100), 'equation number over 100');
    say(!item.stem.pyramid || item.stem.pyramid.flat().filter(c => c === '?').length === 1, 'pyramid does not ask exactly one brick');
    const story = reasoningSolutions(item);
    say(story !== null && story.length === 1, `the story allows ${JSON.stringify(story)}`);
    const right = reasoningOracle(item);
    say(right !== null && right.length === 1 && right[0] === item.answerIndex, `defensible ${JSON.stringify(right)} vs key ${item.answerIndex}`);
    const text = item.stem.text ?? '';
    say(!/\{\{|\}\}/.test(text), 'leftover placeholder');
    say(!hasNiqqud(text) && hasNiqqud(item.stem.textNiqqud ?? '') && stripNiqqud(item.stem.textNiqqud ?? '') === text, 'niqqud twin differs');
    say((text.match(/\d+/g) ?? []).every(n => Number(n) <= 100), 'stem number over 100');
    for (const [, eq] of item.explanation.matchAll(/⁦([^⁩]+)⁩/g)) say(chainHolds(eq), `explanation step ${eq}`);
    say(!/=/.test(item.explanation.replace(/⁦[^⁩]*⁩/g, '')), 'bare "=" in explanation');
    say(new RegExp(`(^|\\D)${item.options[item.answerIndex]}(\\D|$)`).test(item.explanation), 'explanation never names the answer');
    return out;
}

describe('C3 reasoning types: 10k-seed sweep per type and difficulty', () => {
    for (const [name, make] of Object.entries(MAKERS)) {
        it.each(DIFFS)(`${name} d%i: one answer the story allows, it is the key, 4 distinct options`, d => {
            const found: string[] = [];
            for (let seed = 1; seed <= SEEDS && found.length < 5; seed++) found.push(...problems(make(seed, d)));
            expect(found).toEqual([]);
        }, 120_000);
    }

    it('is deterministic per seed and spreads the answer slot', () => {
        for (const make of Object.values(MAKERS)) {
            expect(make(123, 2)).toEqual(make(123, 2));
            const pos = [0, 0, 0, 0];
            for (let seed = 1; seed <= 2000; seed++) pos[make(seed, 2).answerIndex]++;
            pos.forEach(c => expect(c).toBeGreaterThan(350));
        }
    });
});

/** Which template a stem came from, by a phrase only that template uses. */
const VARIANTS: Readonly<Record<string, readonly [string, RegExp][]>> = {
    machineItem: [['pairs', /^\d+ → \d+$/]],
    logicItem: [['what', /איזו חיה יש/], ['who', /למי יש/]],
    scalesItem: [['order', /הכי (כבד|קל)/], ['mixed', /קל יותר/], ['trade', /שוקלים/]],
    triangleItem: [['given', /בכל צלע הוא \d+\. איזה/], ['equal', /שווה/], ['corners', /בפינות/]],
    cluesItem: [['two', /^[^.]+\.( [^.]+\.){2} איזה/], ['three', /^[^.]+\.( [^.]+\.){3} איזה/], ['digitSum', /מקבלים/]],
    hiddenDigitItem: [['onesPlus', /^\d⭐ \+ \d\d = /], ['twoPlaces', /^⭐\d \+ \d⭐ = /], ['carry', /^\d⭐ \+ \d\d = /], ['minus', / − /]],
    parityItem: [['odd2', /חיבר \d+ מספרים אי־זוגיים\. /], ['oddBound', /אי־זוגיים, וכל/], ['mixed', /אי־זוגיים ו־/], ['frog', /צפרדע/]],
    pyramidItem: [['top', /^\? \/ ◻ ◻ \/ \d+ \d+ \d+$/], ['down', /^\d+ \/ \d+ ◻ \/ ◻ \? \d+$/], ['twice', /^\d+ \/ ◻ ◻ \/ \d+ \? \d+$/]],
    calendarItem: [['after', /איזה יום יהיה/], ['before', /היה לפני/], ['date', /בחודש/]],
    positionItem: [['total', /מהסוף\. כמה ילדים/], ['fromBack', /באיזה מקום/], ['between', /בין רוני לגל/], ['fence', /גדר/], ['floors', /מדרגות/]],
    countingItem: [['handshakes', /לחצו/], ['games', /בטורניר/], ['coins', /מטבעות/], ['digitsOnce', /אסור/], ['digitsTwice', /מותר/], ['outfits', /חולצות/]],
    sumDifferenceItem: [['numbers', /שני מספרים/], ['marbles', /גולות/], ['cookies', /עוגיות/]],
    backwardsItem: [['double', /לעצמו/], ['half', /החצי/], ['add', /הוספתי/], ['sub', /הורדתי/]],
};
const EXPECTED: Readonly<Record<string, Readonly<Record<Difficulty, readonly string[]>>>> = {
    machineItem: { 1: ['pairs'], 2: ['pairs'], 3: ['pairs'] },
    logicItem: { 1: ['what', 'who'], 2: ['what', 'who'], 3: ['what', 'who'] },
    scalesItem: { 1: ['order'], 2: ['order', 'trade'], 3: ['order', 'mixed', 'trade'] },
    triangleItem: { 1: ['given'], 2: ['equal'], 3: ['equal', 'corners'] },
    cluesItem: { 1: ['two'], 2: ['three', 'digitSum'], 3: ['three', 'digitSum'] },
    // onesPlus and carry share a shape; the carry itself is checked by the explanation sweep
    hiddenDigitItem: { 1: ['onesPlus', 'carry'], 2: ['onesPlus', 'carry', 'twoPlaces'], 3: ['onesPlus', 'carry', 'twoPlaces', 'minus'] },
    parityItem: { 1: ['odd2'], 2: ['oddBound', 'frog'], 3: ['mixed', 'oddBound', 'frog'] },
    pyramidItem: { 1: ['top'], 2: ['down'], 3: ['twice'] },
    calendarItem: { 1: ['after'], 2: ['after'], 3: ['after', 'before', 'date'] },
    positionItem: { 1: ['total', 'floors'], 2: ['total', 'fromBack', 'between', 'floors'], 3: ['fromBack', 'between', 'fence', 'floors'] },
    countingItem: {
        1: ['handshakes', 'digitsOnce', 'outfits'],
        2: ['handshakes', 'games', 'coins', 'digitsOnce', 'digitsTwice', 'outfits'],
        3: ['handshakes', 'games', 'coins', 'digitsOnce', 'digitsTwice'],
    },
    sumDifferenceItem: { 1: ['numbers', 'marbles', 'cookies'], 2: ['numbers', 'marbles', 'cookies'], 3: ['numbers', 'marbles', 'cookies'] },
    backwardsItem: { 1: ['add', 'sub'], 2: ['double', 'half', 'add', 'sub'], 3: ['double', 'half', 'add', 'sub'] },
};

describe('C3 reasoning types: levels', () => {
    it.each(DIFFS)('each level reaches exactly its templates (d%i)', d => {
        for (const [name, make] of Object.entries(MAKERS)) {
            const seen = new Set<string>();
            for (let seed = 1; seed <= 600; seed++) {
                const it = make(seed, d);
                const text = it.stem.pyramid ? pyramidText(it.stem.pyramid)
                    : it.kind === 'math-scales' || it.kind === 'math-triangle' ? [it.stem.text, ...(it.stem.pictureLines ?? [])].join(' | ')
                    : it.stem.equation ?? it.stem.pictureLines?.[0] ?? it.stem.text ?? '';
                VARIANTS[name].forEach(([v, re]) => { if (re.test(text)) seen.add(v); });
            }
            expect([...seen].sort(), `${name} d${d}`).toEqual([...EXPECTED[name][d]].sort());
        }
    });

    it('backwards: d1 has two +/- steps, d2 two steps with one doubling or halving, d3 three steps', () => {
        const steps = (t: string) => (t.match(/הוספתי|הורדתי|לעצמו|החצי/g) ?? []).length;
        for (let seed = 1; seed <= 500; seed++) {
            expect(steps(backwardsItem(seed, 1).stem.text!)).toBe(2);
            expect(backwardsItem(seed, 1).stem.text).not.toMatch(/לעצמו|החצי/);
            expect(steps(backwardsItem(seed, 2).stem.text!)).toBe(2);
            expect(backwardsItem(seed, 2).stem.text).toMatch(/לעצמו|החצי/);
            expect(steps(backwardsItem(seed, 3).stem.text!)).toBe(3);
        }
    });

    it('digits with a 0 appear from d2 (the "a number does not start with 0" trap)', () => {
        const zero = (d: Difficulty) => Array.from({ length: 300 }, (_, i) => countingItem(i + 1, d))
            .some(it => /דו־ספרתיים/.test(it.stem.text!) && /הספרות 0,/.test(it.stem.text!));
        expect(zero(1)).toBe(false);
        expect(zero(2)).toBe(true);
        expect(zero(3)).toBe(true);
    });
});

describe('C3 reasoning types: distractors are named wrong paths', () => {
    const wrongOf = (it: PrepItem) => it.options.filter((_, i) => i !== it.answerIndex).map(Number);
    const has = (make: (s: number, d: Difficulty) => PrepItem, d: Difficulty, slip: (it: PrepItem, n: number[]) => number | null) => {
        let hits = 0, total = 0;
        for (let seed = 1; seed <= 1000; seed++) {
            const it = make(seed, d);
            const want = slip(it, (it.stem.text!.match(/\d+/g) ?? []).map(Number));
            if (want === null) continue;
            total++;
            if (wrongOf(it).includes(want)) hits++;
        }
        return hits / total;
    };

    it('line: "counted Roni twice" (a + b) is always an option', () => {
        expect(has(positionItem, 1, (it, [a, b]) => (/מהסוף\. כמה/.test(it.stem.text!) ? a + b : null))).toBe(1);
    });
    it('fence: "counted the gaps, not the posts" is always an option', () => {
        expect(has(positionItem, 3, (it, [L, g]) => (/גדר/.test(it.stem.text!) ? L / g : null))).toBe(1);
    });
    it('handshakes: "counted every pair twice" is always an option', () => {
        expect(has(countingItem, 2, (it, [n]) => (/לחצו|בטורניר/.test(it.stem.text!) ? n * (n - 1) : null))).toBe(1);
    });
    it('sum and difference: "forgot to halve" (total minus difference) is always an option', () => {
        expect(has(sumDifferenceItem, 2, (_it, [s, d]) => s - d)).toBe(1);
    });
    it('backwards: "did the steps again instead of undoing them" is an option whenever it is a whole number in range', () => {
        expect(has(backwardsItem, 1, (it, n) => {
            const [a, b, r] = n;
            const t = it.stem.text!;
            const first = t.indexOf('הוספתי') !== -1 && (t.indexOf('הורדתי') === -1 || t.indexOf('הוספתי') < t.indexOf('הורדתי'));
            const v = first ? r + a - b : r - a + b;
            return v >= 0 && v <= 100 ? v : null;
        })).toBeGreaterThan(0.95);
    });
});

describe('C3 part 2: distractors are named wrong paths', () => {
    const wrong = (it: PrepItem) => it.options.filter((_, i) => i !== it.answerIndex);
    it('pyramid d3: "forgot the middle brick counts twice" (top − both corners) is always an option', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = pyramidItem(seed, 3);
            const [[top], , [a, , c]] = it.stem.pyramid!.map(r => r.map(Number));
            expect(wrong(it)).toContain(String(top - a - c));
        }
    });
    it('parity with a range: one option has the right kind (even/odd) but is too big', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = parityItem(seed, 3);
            if (/צפרדע/.test(it.stem.text!)) continue;
            const key = Number(it.options[it.answerIndex]);
            expect(wrong(it).map(Number).some(o => o % 2 === key % 2), it.stem.text).toBe(true);
        }
    });
    it('calendar: a day one off from the key is always an option (counted today as day 1)', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = calendarItem(seed, 2);
            const k = WEEK.indexOf(it.options[it.answerIndex]);
            expect(wrong(it).some(o => [1, 6].includes((WEEK.indexOf(o) - k + 7) % 7)), it.stem.text).toBe(true);
        }
    });
    it('calendar options carry niqqud twins', () => {
        const it = calendarItem(5, 1);
        expect(it.optionsNiqqud).toHaveLength(4);
    });
});

describe('C5: distractors are named wrong paths', () => {
    const wrong = (it: PrepItem) => it.options.filter((_, i) => i !== it.answerIndex);
    it('clues: with 3 clues, each wrong option breaks exactly one clue (the child missed that clue)', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = cluesItem(seed, 3);
            const t = it.stem.text!;
            const n = (re: RegExp) => Number(t.match(re)?.[1]);
            const clues = [
                ...(/הוא זוגי\./.test(t) ? [{ kind: 'even' as const, n: 0 }] : []),
                ...(/אי־זוגי\./.test(t) ? [{ kind: 'odd' as const, n: 0 }] : []),
                ...(/גדול מ־/.test(t) ? [{ kind: 'gt' as const, n: n(/גדול מ־(\d+)/) }] : []),
                ...(/קטן מ־/.test(t) ? [{ kind: 'lt' as const, n: n(/קטן מ־(\d+)/) }] : []),
                ...(/מקבלים/.test(t) ? [{ kind: 'digitSum' as const, n: n(/מקבלים (\d+)/) }] : []),
            ];
            expect(clues).toHaveLength(3);
            for (const v of wrong(it).map(Number)) expect(clues.filter(c => !clueHolds(c, v)), `${t} ${v}`).toHaveLength(1);
        }
    });
    it('clues with 2 clues (d1): two wrong options each break one clue, the third breaks both', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = cluesItem(seed, 1);
            const t = it.stem.text!;
            const n = (re: RegExp) => Number(t.match(re)?.[1]);
            const clues = [
                ...(/הוא זוגי\./.test(t) ? [{ kind: 'even' as const, n: 0 }] : []),
                ...(/אי־זוגי\./.test(t) ? [{ kind: 'odd' as const, n: 0 }] : []),
                ...(/גדול מ־/.test(t) ? [{ kind: 'gt' as const, n: n(/גדול מ־(\d+)/) }] : []),
                ...(/העשרות שלו היא/.test(t) ? [{ kind: 'tens' as const, n: n(/העשרות שלו היא (\d)/) }] : []),
                ...(/האחדות שלו היא/.test(t) ? [{ kind: 'ones' as const, n: n(/האחדות שלו היא (\d)/) }] : []),
            ];
            expect(clues).toHaveLength(2);
            const broken = wrong(it).map(Number).map(v => clues.filter(c => !clueHolds(c, v)).length).sort();
            expect(broken, t).toEqual([1, 1, 2]);
        }
    });
    it('machine with doubling: "took the first pair difference as the rule" is an option whenever it is a new number', () => {
        let checked = 0;
        for (let seed = 1; seed <= 1000; seed++) {
            const it = machineItem(seed, 3);
            const lines = it.stem.pictureLines!;
            const [i1, o1] = lines[0].split(' → ').map(Number);
            const q = Number(lines[3].split(' ')[0]);
            const slip = q + (o1 - i1);
            if (slip === Number(it.options[it.answerIndex]) || slip < 0 || slip > 100) continue;
            checked++;
            expect(wrong(it)).toContain(String(slip));
        }
        expect(checked).toBeGreaterThan(500);
    });
    it('hidden digit: options are always single digits', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            for (const d of [1, 2, 3] as const) expect(hiddenDigitItem(seed, d).options.every(o => /^\d$/.test(o))).toBe(true);
        }
    });
});

describe('C5 part B: named distractors and shape', () => {
    const wrong = (it: PrepItem) => it.options.filter((_, i) => i !== it.answerIndex);
    it('triangle corner sum: "one side" and "forgot to take away the six numbers" are options', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = triangleItem(seed, 3);
            if (!/בפינות/.test(it.stem.text!)) continue;
            const n = Number(it.stem.text!.match(/בכל צלע הוא (\d+)/)![1]);
            expect(wrong(it)).toContain(String(n));
            if (3 * n <= 110) expect(wrong(it)).toContain(String(3 * n));
        }
    });
    it('trading: "added the numbers instead of trading" is an option when it differs from the answer', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const it = scalesItem(seed, 3);
            if (!it.stem.pictureLines) continue;
            const added = it.stem.pictureLines.map(l => l.split(' = ')[1].split(' ').length).reduce((a, b) => a + b, 0);
            if (String(added) !== it.options[it.answerIndex]) expect(wrong(it)).toContain(String(added));
        }
    });
    it('ordering: the four options are the four things in the sentences', () => {
        for (let seed = 1; seed <= 500; seed++) {
            const it = scalesItem(seed, 1);
            for (const o of it.options) expect(it.stem.text).toContain(o);
        }
    });
});

describe('coinWays', () => {
    it('lists every way with 5s and 2s', () => {
        expect(coinWays(20)).toEqual([[0, 10], [2, 5], [4, 0]]);
        expect(coinWays(11)).toEqual([[1, 3]]);
        expect(coinWays(1)).toEqual([]);
    });
});

describe('C7 who has what: levels, needed clues, shape', () => {
    const clueLines = (t: string) => t.split('\n').filter(l => /^ל\S+ (יש|אין) \S+\.$/.test(l));
    it('d1 has two "has" clues, d2 one, d3 none; every clue is needed; the asked fact is never said', () => {
        for (const d of DIFFS) {
            for (let seed = 1; seed <= 1000; seed++) {
                const it = logicItem(seed, d);
                const t = it.stem.text!;
                const lines = clueLines(t);
                expect(lines.filter(l => / יש /.test(l)), t).toHaveLength(3 - d);
                expect(lines.some(l => / אין /.test(l)), t).toBe(true);
                // the explanation ends on the key, one ", אז ..." per deduction
                expect(it.explanation, t).toMatch(/^מוחקים מה שלא יכול להיות\.( [^.]+, אז (ל\S+ יש \S+|ה\S+ של \S+)\.)+$/);
                const key = it.options[it.answerIndex];
                // closed by the child's row ("... יש key") or by the pet's column ("הkey של ...")
                expect(it.explanation, t).toMatch(/איזו חיה/.test(t) ? new RegExp(`( יש ${key}| ה${key} של \\S+)\\.$`) : new RegExp(`(ל${key} יש \\S+|של ${key})\\.$`));
                // drop any one clue and the question no longer has one answer
                for (const l of lines) expect(logicGrid(t.replace(`${l}\n`, '')).length, `${t}\nwithout ${l}`).toBeGreaterThan(1);
                const asked = t.match(/איזו חיה יש ל(\S+)\?$/)?.[1];
                const pet = t.match(/למי יש (\S+)\?$/)?.[1];
                for (const l of lines.filter(x => / יש /.test(x))) expect(l, t).not.toMatch(asked ? new RegExp(`^ל${asked} `) : new RegExp(` ${pet}\.$`));
            }
        }
    });

    it('the options are the four children or the four pets of the first line, with niqqud twins', () => {
        for (let seed = 1; seed <= 500; seed++) {
            const it = logicItem(seed, 2);
            const first = it.stem.text!.split('\n')[0];
            const named = first.replace(/^.*?מהילדים /, '').split(/, | ו| יש חיה אחרת: |\./).filter(Boolean);
            for (const o of it.options) expect(named).toContain(o);
            expect(it.optionsNiqqud!.map(o => stripNiqqud(o))).toEqual(it.options);
        }
    });
});
