import { describe, expect, it } from 'vitest';
import {
    buildAdaptiveMath, MATH_ORIGINAL_TYPES, NUMBER_SENSE_TAGS, ORIGINAL_FLOOR, ORIGINAL_TOTAL,
    originalTypeCounts, REASONING_PER_SESSION, REASONING_TAGS, reasoningDifficulty, reasoningPicks,
    SESSION_COUNT, type MathOriginalType, type ReasoningTag,
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

const isReasoning = (skill: SkillTag): skill is ReasoningTag => (REASONING_TAGS as readonly SkillTag[]).includes(skill);

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

    it('has 18 items: 10 original-type + 6 number-sense (each once) + 2 different reasoning types', () => {
        const items = buildAdaptiveMath(mulberry32(7), WEAK_WORD);
        expect(SESSION_COUNT).toBe(18);
        expect(items).toHaveLength(SESSION_COUNT);
        const originalCounts: Partial<Record<MathOriginalType, number>> = {};
        const senseSeen = new Set<string>();
        const reasoning: SkillTag[] = [];
        for (const item of items) {
            const type = typeOf(item.skill);
            if (type) originalCounts[type] = (originalCounts[type] ?? 0) + 1;
            else if (isReasoning(item.skill)) reasoning.push(item.skill);
            else senseSeen.add(item.skill);
        }
        expect(reasoning).toHaveLength(REASONING_PER_SESSION);
        expect(new Set(reasoning).size).toBe(REASONING_PER_SESSION);
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
                // reasoning items follow the kid's level on that type (easy for a new kid), the rest the session ramp
                expect(item.difficulty).toBe(isReasoning(item.skill) ? 1 : difficultyAt(i, SESSION_COUNT));
                expect(item.options).toHaveLength(4);
                expect(item.answerIndex).toBeGreaterThanOrEqual(0);
                expect(item.answerIndex).toBeLessThan(4);
            });
        }
    });
});

describe('reasoning types in the adaptive session (C3)', () => {
    const answered = (skill: SkillTag, right: number, wrong: number) => [
        ...Array.from({ length: right }, () => attempt(skill, true)),
        ...Array.from({ length: wrong }, () => attempt(skill, false)),
    ];

    it('level: easy until 3 attempts and under 50%, middle from 50%, hardest from 80%', () => {
        expect(reasoningDifficulty(ALL_NULL, 'counting')).toBe(1);
        expect(reasoningDifficulty(makeState(answered('counting', 2, 0)), 'counting')).toBe(1);
        expect(reasoningDifficulty(makeState(answered('counting', 1, 2)), 'counting')).toBe(1);
        expect(reasoningDifficulty(makeState(answered('counting', 2, 2)), 'counting')).toBe(2);
        expect(reasoningDifficulty(makeState(answered('counting', 4, 1)), 'counting')).toBe(3);
        // another type's record does not move this one
        expect(reasoningDifficulty(makeState(answered('position', 5, 0)), 'counting')).toBe(1);
    });

    it('a session item uses that level', () => {
        const strong = makeState(REASONING_TAGS.flatMap(t => answered(t, 5, 0)));
        for (let seed = 1; seed <= 20; seed++) {
            const items = buildAdaptiveMath(mulberry32(seed), strong).filter(i => isReasoning(i.skill));
            items.forEach(i => expect(i.difficulty, i.id).toBe(3));
        }
    });

    it('draws a weak reasoning type more often, and every type still appears', () => {
        const weakCounting = makeState([
            ...answered('counting', 0, 4),
            ...REASONING_TAGS.filter(t => t !== 'counting').flatMap(t => answered(t, 4, 0)),
        ]);
        const hits: Record<string, number> = {};
        for (let seed = 1; seed <= 4000; seed++) {
            const picks = reasoningPicks(mulberry32(seed), weakCounting);
            expect(new Set(picks).size).toBe(REASONING_PER_SESSION);
            picks.forEach(p => { hits[p] = (hits[p] ?? 0) + 1; });
        }
        // weights 2 vs 1 (total 16 over 15 types), 2 drawn: the weak type is in about 24% of sessions, each strong one in about 12.6%
        expect(hits.counting).toBeGreaterThan(850);
        for (const t of REASONING_TAGS.filter(x => x !== 'counting')) expect(hits[t] ?? 0, t).toBeGreaterThan(400);
    });
});
