import { describe, expect, it } from 'vitest';
import {
    buildAdaptiveMath, MATH_ORIGINAL_TYPES, NUMBER_SENSE_TAGS, ORIGINAL_FLOOR, ORIGINAL_TOTAL,
    originalTypeCounts, SESSION_COUNT, type MathOriginalType,
} from '../engine/adaptive';
import { difficultyAt, stemKey } from '../engine/sections';
import { mulberry32 } from '../engine/prng';
import { PREP_SCHEMA_VERSION, type PrepAttempt, type PrepProgressState, type SkillTag } from '../types';

const ORIGINAL_SKILLS: readonly SkillTag[] = ['add', 'sub', 'missing-number', 'word-problem', 'picture-puzzle'];

function attempt(skill: SkillTag, correct: boolean): PrepAttempt {
    return { itemId: `${skill}-${String(correct)}`, section: 'math', skill, correct, ms: 100, at: 0 };
}

function makeState(attempts: readonly PrepAttempt[]): PrepProgressState {
    return { schemaVersion: PREP_SCHEMA_VERSION, skills: {}, attempts, mocks: [], seenIds: [] };
}

const ALL_ZERO = makeState(ORIGINAL_SKILLS.map(s => attempt(s, false)));
const ALL_ONE = makeState(ORIGINAL_SKILLS.map(s => attempt(s, true)));
const ALL_NULL = makeState([]);
const WEAK_WORD = makeState(ORIGINAL_SKILLS.map(s => attempt(s, s !== 'word-problem')));
const MIXED_STATES = [ALL_ZERO, ALL_ONE, ALL_NULL, WEAK_WORD];

function typeOf(skill: SkillTag): MathOriginalType | undefined {
    if (skill === 'add' || skill === 'sub') return 'exercise';
    if (skill === 'missing-number' || skill === 'word-problem' || skill === 'picture-puzzle') return skill;
    return undefined;
}

describe('buildAdaptiveMath', () => {
    it('is deterministic for the same seed and state', () => {
        const a = buildAdaptiveMath(mulberry32(42), ALL_NULL);
        const b = buildAdaptiveMath(mulberry32(42), ALL_NULL);
        expect(b).toEqual(a);
    });

    it('has 16 items: 10 original-type + 6 number-sense (each number-sense skill once, each original type >= 2)', () => {
        const items = buildAdaptiveMath(mulberry32(7), WEAK_WORD);
        expect(items).toHaveLength(SESSION_COUNT);
        const originalCounts: Partial<Record<MathOriginalType, number>> = {};
        const senseSeen = new Set<string>();
        for (const item of items) {
            const type = typeOf(item.skill);
            if (type) originalCounts[type] = (originalCounts[type] ?? 0) + 1;
            else senseSeen.add(item.skill);
        }
        let originalTotal = 0;
        for (const type of MATH_ORIGINAL_TYPES) {
            expect(originalCounts[type] ?? 0).toBeGreaterThanOrEqual(ORIGINAL_FLOOR);
            originalTotal += originalCounts[type] ?? 0;
        }
        expect(originalTotal).toBe(ORIGINAL_TOTAL);
        expect(senseSeen.size).toBe(NUMBER_SENSE_TAGS.length);
        for (const tag of NUMBER_SENSE_TAGS) expect(senseSeen.has(tag)).toBe(true);
    });

    it('keeps the floor (each original type >= 2, sum 10) for 10k seeds over mixed states', () => {
        const N = 10000;
        for (let seed = 1; seed <= N; seed++) {
            const state = MIXED_STATES[seed % MIXED_STATES.length];
            const counts = originalTypeCounts(mulberry32(seed), state);
            let sum = 0;
            for (const type of MATH_ORIGINAL_TYPES) {
                expect(counts[type]).toBeGreaterThanOrEqual(ORIGINAL_FLOOR);
                sum += counts[type];
            }
            expect(sum).toBe(ORIGINAL_TOTAL);
        }
    });

    it('weights weak types higher (weak word-problem beats exercise); neutral state is near-even', () => {
        const N = 10000;
        let weakWordSum = 0, weakExerciseSum = 0, neutralWordSum = 0, neutralExerciseSum = 0;
        for (let seed = 1; seed <= N; seed++) {
            const weak = originalTypeCounts(mulberry32(seed), WEAK_WORD);
            weakWordSum += weak['word-problem'];
            weakExerciseSum += weak.exercise;
            const neutral = originalTypeCounts(mulberry32(seed), ALL_NULL);
            neutralWordSum += neutral['word-problem'];
            neutralExerciseSum += neutral.exercise;
        }
        const weakWordMean = weakWordSum / N;
        const weakExerciseMean = weakExerciseSum / N;
        const neutralWordMean = neutralWordSum / N;
        const neutralExerciseMean = neutralExerciseSum / N;
        expect(weakWordMean).toBeGreaterThan(weakExerciseMean + 0.15);
        expect(weakWordMean).toBeGreaterThan(2.5);
        expect(weakExerciseMean).toBeLessThan(2.6);
        expect(Math.abs(neutralWordMean - neutralExerciseMean)).toBeLessThan(0.1);
    });

    it('builds 25 seeds with no duplicate stems and the expected difficulty ramp', () => {
        for (let seed = 1; seed <= 25; seed++) {
            const items = buildAdaptiveMath(mulberry32(seed), ALL_NULL);
            expect(items).toHaveLength(SESSION_COUNT);
            const keys = new Set<string>();
            items.forEach((item, i) => {
                expect(keys.has(stemKey(item))).toBe(false);
                keys.add(stemKey(item));
                expect(item.difficulty).toBe(difficultyAt(i, SESSION_COUNT));
                expect(item.options).toHaveLength(4);
                expect(item.answerIndex).toBeGreaterThanOrEqual(0);
                expect(item.answerIndex).toBeLessThan(4);
            });
        }
    });
});
