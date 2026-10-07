/**
 * Parity test: the shared evaluator (evalBlitzExpression) must agree with the
 * engine's own answers for every generated question shape.
 *
 * Guards the e2e parent-games Blitz answer-computation from silently drifting
 * from the engine: the e2e suite computes "what SHOULD the submitted answer
 * be" via evalBlitzExpression (e2e specs cannot import src modules at CI
 * time), so this unit test is that call site's correctness guarantee — it is
 * the test that would have caught the missed difficulty-1
 * orderOfOperations shape ('7 + 3 × 4' naively computing 10 instead of 19).
 */
import { describe, it, expect } from 'vitest';
import {
  generateQuestion,
  type BlitzDifficulty,
  type BlitzQuestionType,
} from '../blitzEngine';
import { evalBlitzExpression } from '../blitzEval';

const TYPES: BlitzQuestionType[] = [
  'percentage',
  'fraction',
  'doubleDigitMultiply',
  'mixedArithmetic',
  'orderOfOperations',
];
const DIFFICULTIES: BlitzDifficulty[] = [1, 2, 3];

/** Deterministic RNG so any failure is reproducible from the printed seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('evalBlitzExpression parity with blitzEngine.generateQuestion', () => {
  for (const type of TYPES) {
    for (const difficulty of DIFFICULTIES) {
      it(`agrees on ${type} difficulty ${difficulty} (15 seeded draws each)`, () => {
        for (let i = 0; i < 15; i++) {
          const seed = 1000 * i + difficulty * 7 + TYPES.indexOf(type) + 1;
          const rng = mulberry32(seed);
          const q = generateQuestion(type, difficulty, rng, i + 1);
          const ev = evalBlitzExpression(q.display);
          expect(
            ev,
            `type=${type} d=${difficulty} display="${q.display}" (seed ${seed})`,
          ).not.toBeNull();
          expect(
            ev,
            `type=${type} d=${difficulty} display="${q.display}"`,
          ).toBe(q.answer);
        }
      });
    }
  }

  it('computes precedence correctly on known shapes (the regression that started this)', () => {
    // The F-major e2e bug: '7 + 3 × 4' must be 19 (multiply first), not 10.
    expect(evalBlitzExpression('7 + 3 × 4')).toBe(19);
    expect(evalBlitzExpression('19 − 12 × 2')).toBe(-5);
    // flat4 explicit static vector (agy re-review nit): engine never emits
    // '+' before the trailing term, but the arm stays live and correct.
    expect(evalBlitzExpression('10 + 2 × 3 − 4')).toBe(12);
    expect(evalBlitzExpression('10 + 2 × 3 + 4')).toBe(20);
    expect(evalBlitzExpression('25% × 40')).toBe(10);
    expect(evalBlitzExpression('¾ × 12')).toBe(9);
    expect(evalBlitzExpression('(3 + 4) × 5 − 2')).toBe(33);
    expect(evalBlitzExpression('12 + 7 − 4')).toBe(15);
    expect(evalBlitzExpression('45 − 18')).toBe(27);
    expect(evalBlitzExpression('14 × 23')).toBe(322);
  });

  it('rejects unrecognised shapes instead of half-parsing them (anchored fallback)', () => {
    expect(evalBlitzExpression('7 + 3 ×')).toBeNull();
    expect(evalBlitzExpression('garbage')).toBeNull();
    expect(evalBlitzExpression('3 + 4 unknown 5 × 6')).toBeNull();
    expect(evalBlitzExpression('7 + 3 × 4 + junk')).toBeNull();
    expect(evalBlitzExpression('')).toBeNull();
    expect(evalBlitzExpression('7 +')).toBeNull();
  });
});