import type { Difficulty, PrepItem } from '../types';
import { numericDistractors } from './distractors';
import { intBetween, mulberry32, pick, shuffleOptions, shuffled, type Rng } from './prng';
import { ltr } from './arithmeticExplain';
import mathNiqqud from '../content/he/math-niqqud.json';

/**
 * Stage-A "picture puzzles" (חידות בציורים, on the Ministry's grade-2 key): every picture stands for a number;
 * the child reads 1–2 picture equations and finds one picture's value. Original puzzle shapes, numbers to 20,
 * seeded. Each puzzle has exactly one solution (checked by a brute-force solver in the tests).
 */

const ICONS = ['🍎', '🍌', '⭐', '🐟', '🎈', '🍓', '⚽', '🌸'] as const;

type Shape = 'double' | 'triple' | 'pair' | 'chain' | 'back';

const SHAPES: Readonly<Record<Difficulty, readonly Shape[]>> = {
    1: ['double', 'double', 'triple'],
    2: ['triple', 'pair', 'chain'],
    3: ['pair', 'chain', 'back'],
};

interface Puzzle {
    readonly lines: string[];
    readonly ask: string;
    readonly answer: number;
    /** The typical slip for this shape (e.g. not halving), used as one distractor. */
    readonly slip: number;
    readonly explanation: string;
}

function puzzle(rng: Rng, shape: Shape, x: string, y: string): Puzzle {
    const a = intBetween(rng, 2, 9);
    let b = intBetween(rng, 1, 9);
    if (b === a) b = a === 9 ? 1 : a + 1;
    switch (shape) {
        case 'double':
            return {
                lines: [`${x} + ${x} = ${2 * a}`], ask: x, answer: a, slip: 2 * a,
                explanation: `שני ${x} ביחד הם ${2 * a}. איזה מספר ועוד אותו מספר הוא ${2 * a}? ${ltr(`${a} + ${a} = ${2 * a}`)}, אז ${ltr(`${x} = ${a}`)}.`,
            };
        case 'triple': {
            const t = intBetween(rng, 2, 6);
            return {
                lines: [`${x} + ${x} + ${x} = ${3 * t}`], ask: x, answer: t, slip: 3 * t,
                explanation: `שלושה ${x} ביחד הם ${3 * t}. ${ltr(`${t} + ${t} + ${t} = ${3 * t}`)}, אז ${ltr(`${x} = ${t}`)}.`,
            };
        }
        case 'pair':
            return {
                lines: [`${x} + ${x} = ${2 * a}`, `${x} + ${y} = ${a + b}`], ask: y, answer: b, slip: a,
                explanation: `מהשורה הראשונה ${ltr(`${x} = ${a}`)}, כי ${ltr(`${a} + ${a} = ${2 * a}`)}. `
                    + `בשורה השנייה ${ltr(`${a} + ${y} = ${a + b}`)}, אז ${ltr(`${y} = ${a + b} − ${a} = ${b}`)}.`,
            };
        case 'chain': {
            // Numbers stay within 20: 2·a2 <= 14, so b2 = min(b, 20 - 2·a2) is always >= 6 and 2·a2 + b2 <= 20
            const a2 = Math.min(a, 7);
            const b2 = Math.min(b, 20 - 2 * a2);
            return {
                lines: [`${x} + ${x} = ${2 * a2}`, `${x} + ${x} + ${y} = ${2 * a2 + b2}`], ask: y, answer: b2, slip: a2 + b2,
                explanation: `בשורה השנייה יש את אותם שני ${x} מהשורה הראשונה, והם ${2 * a2}. `
                    + `${ltr(`${2 * a2} + ${y} = ${2 * a2 + b2}`)}, אז ${ltr(`${y} = ${2 * a2 + b2} − ${2 * a2} = ${b2}`)}.`,
            };
        }
        case 'back':
            return {
                lines: [`${y} + ${y} = ${2 * b}`, `${x} + ${y} = ${a + b}`], ask: x, answer: a, slip: b,
                explanation: `מהשורה הראשונה ${ltr(`${y} = ${b}`)}. בשורה השנייה ${ltr(`${x} + ${b} = ${a + b}`)}, `
                    + `אז ${ltr(`${x} = ${a + b} − ${b} = ${a}`)}.`,
            };
    }
}

export function pictureItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const [x, y] = shuffled(rng, ICONS);
    const p = puzzle(rng, pick(rng, SHAPES[difficulty]), x, y);
    const wrong = numericDistractors(rng, { answer: p.answer, wrongOp: p.slip, max: 20 });
    const { options, answerIndex } = shuffleOptions(rng, [p.answer, ...wrong].map(String), 0);
    return {
        id: `math-picture:${difficulty}:${seed}`,
        kind: 'math-picture',
        section: 'math',
        skill: 'picture-puzzle',
        difficulty,
        stem: {
            text: `כל ציור הוא מספר. כמה שווה ${p.ask}?`,
            textNiqqud: `${mathNiqqud.stems.picture} ${p.ask}?`,
            pictureLines: p.lines,
        },
        options,
        answerIndex,
        explanation: p.explanation,
        source: 'procedural',
        seed,
    };
}
