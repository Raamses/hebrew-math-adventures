import he from '@/i18n/locales/he.json';
import type { Difficulty, PrepItem, PrepKind, SkillTag } from '../types';
import { numericDistractors } from './distractors';
import { intBetween, mulberry32, pick, shuffleOptions, type Rng } from './prng';
import { addExplanation, missingExplanation, subExplanation, wordExplanation } from './arithmeticExplain';

/**
 * Stage-A style arithmetic (grade 2, numbers to 100; vault/rules/math-curriculum.md level 3):
 * exercises, missing number and word problems, each as 4-option multiple choice.
 * Pure and seeded: the same seed always gives the same item.
 */

type Op = '+' | '-';

interface Equation { a: number; b: number; op: Op; result: number }

/** difficulty 1: no carry/borrow; 2: carry/borrow; 3: larger tens with carry/borrow. */
function equation(rng: Rng, difficulty: Difficulty): Equation {
    const op: Op = rng() < 0.5 ? '+' : '-';
    for (;;) {
        const a = difficulty === 1 ? intBetween(rng, 11, 89) : intBetween(rng, 15, 95);
        const b = difficulty === 3 ? intBetween(rng, 15, 59) : intBetween(rng, 2, 39);
        const carry = op === '+' ? (a % 10) + (b % 10) >= 10 : (a % 10) < (b % 10);
        const result = op === '+' ? a + b : a - b;
        if (result < 0 || result > 100 || (op === '-' && result === 0)) continue;
        if ((difficulty === 1) === carry) continue;
        return { a, b, op, result };
    }
}

const fmt = (e: Equation) => `${e.a} ${e.op} ${e.b}`;

function build(
    rng: Rng, seed: number, kind: PrepKind, skill: SkillTag, difficulty: Difficulty,
    stem: PrepItem['stem'], answer: number, wrongOp: number | undefined, explanation: string,
): PrepItem {
    const wrong = numericDistractors(rng, { answer, wrongOp });
    const { options, answerIndex } = shuffleOptions(rng, [answer, ...wrong].map(String), 0);
    return {
        id: `${kind}:${difficulty}:${seed}`, kind, section: 'math', skill, difficulty,
        stem, options, answerIndex, explanation, source: 'procedural', seed,
    };
}

export function exerciseItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const e = equation(rng, difficulty);
    const other = e.op === '+' ? e.a - e.b : e.a + e.b;
    const explanation = e.op === '+' ? addExplanation(e.a, e.b) : subExplanation(e.a, e.b);
    return build(rng, seed, 'math-exercise', e.op === '+' ? 'add' : 'sub', difficulty,
        { text: 'כמה זה?', equation: `${fmt(e)} = ?` }, e.result, other >= 0 ? other : undefined, explanation);
}

export function missingItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const e = equation(rng, difficulty);
    const hideFirst = rng() < 0.5;
    const answer = hideFirst ? e.a : e.b;
    const shown = hideFirst ? `? ${e.op} ${e.b} = ${e.result}` : `${e.a} ${e.op} ? = ${e.result}`;
    // The classic slip: doing the operation you see instead of its inverse.
    const slip = e.op === '+' ? e.result + (hideFirst ? e.b : e.a) : (hideFirst ? e.result - e.b : e.a + e.result);
    return build(rng, seed, 'math-missing', 'missing-number', difficulty,
        { text: 'איזה מספר חסר?', equation: shown }, answer, slip >= 0 && slip <= 200 ? slip : undefined,
        missingExplanation(e.a, e.b, e.op, e.result, hideFirst));
}

interface WordTemplate { key: keyof typeof he.wordProblems; op: Op; n1: [number, number]; n2: [number, number] }

/** Gender-neutral +/- templates from the existing word-problem bank (src/data/wordProblemTemplates.ts). */
const WORD_TEMPLATES: readonly WordTemplate[] = [
    { key: 'apples_add', op: '+', n1: [5, 40], n2: [3, 30] },
    { key: 'candies_sub', op: '-', n1: [20, 60], n2: [4, 19] },
    { key: 'shopping_add', op: '+', n1: [6, 30], n2: [5, 25] },
    { key: 'shopping_compare', op: '-', n1: [40, 90], n2: [10, 39] },
    { key: 'measure_height', op: '+', n1: [8, 35], n2: [6, 30] },
    { key: 'measure_length', op: '-', n1: [50, 99], n2: [12, 45] },
    { key: 'time_travel', op: '+', n1: [10, 45], n2: [5, 30] },
    { key: 'multistep_lost_found', op: '-', n1: [30, 80], n2: [5, 25] },
    { key: 'sports_goals', op: '+', n1: [2, 9], n2: [1, 9] },
];

export function wordItem(seed: number, difficulty: Difficulty): PrepItem {
    const rng = mulberry32(seed);
    const tpl = pick(rng, WORD_TEMPLATES);
    const n1 = intBetween(rng, ...tpl.n1);
    const n2 = intBetween(rng, ...tpl.n2);
    const answer = tpl.op === '+' ? n1 + n2 : n1 - n2;
    const text = he.wordProblems[tpl.key].replace('{{n1}}', String(n1)).replace('{{n2}}', String(n2));
    const other = tpl.op === '+' ? Math.abs(n1 - n2) : n1 + n2;
    return build(rng, seed, 'math-word', 'word-problem', difficulty, { text }, answer, other,
        wordExplanation(n1, n2, tpl.op, answer));
}

const MAKERS = [exerciseItem, exerciseItem, missingItem, wordItem] as const;

/** A balanced mix: half exercises, a quarter missing number, a quarter word problems. */
export function mathItem(seed: number, difficulty: Difficulty): PrepItem {
    return MAKERS[seed % MAKERS.length](seed, difficulty);
}
