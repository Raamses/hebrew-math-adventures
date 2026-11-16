import { describe, it, expect } from 'vitest';
import { derivePrepTypeProgress, recentPrepMistakes } from '../engine/progress';
import { PREP_SCHEMA_VERSION, type PrepAttempt, type PrepProgressState, type SkillTag } from '../types';

function attempt(overrides: Partial<PrepAttempt> = {}): PrepAttempt {
    return {
        itemId: 'item-1',
        section: 'math',
        skill: 'add',
        correct: true,
        ms: 1000,
        at: 1,
        ...overrides,
    };
}

function stateWith(attempts: readonly PrepAttempt[]): PrepProgressState {
    return {
        schemaVersion: PREP_SCHEMA_VERSION,
        skills: {},
        attempts,
        mocks: [],
        seenIds: [],
    };
}

describe('gifted-prep progress model', () => {
    it('empty state produces empty arrays', () => {
        const empty = stateWith([]);
        expect(derivePrepTypeProgress(empty)).toEqual([]);
        expect(recentPrepMistakes(empty)).toEqual([]);
    });

    it('groups attempts per skill, output in SKILL_TAGS declaration order', () => {
        const state = stateWith([
            attempt({ skill: 'sub', itemId: 's1' }),
            attempt({ skill: 'add', itemId: 'a1' }),
            attempt({ skill: 'sub', itemId: 's2' }),
        ]);
        const result = derivePrepTypeProgress(state);
        expect(result.map(r => r.skill)).toEqual<SkillTag[]>(['add', 'sub']);
        expect(result[0].attempts).toBe(1);
        expect(result[1].attempts).toBe(2);
    });

    it('rounds accuracy to 2 decimals', () => {
        const state = stateWith([
            attempt({ skill: 'add', correct: true }),
            attempt({ skill: 'add', correct: false }),
            attempt({ skill: 'add', correct: false }),
        ]);
        const [entry] = derivePrepTypeProgress(state);
        expect(entry.correct).toBe(1);
        expect(entry.accuracy).toBe(0.33);
    });

    it('median: odd count picks the middle value', () => {
        const state = stateWith([
            attempt({ skill: 'add', ms: 300 }),
            attempt({ skill: 'add', ms: 100 }),
            attempt({ skill: 'add', ms: 200 }),
        ]);
        expect(derivePrepTypeProgress(state)[0].medianMs).toBe(200);
    });

    it('median: even count rounds the mean of the two middle values', () => {
        const state = stateWith([
            attempt({ skill: 'sub', ms: 100 }),
            attempt({ skill: 'sub', ms: 201 }),
        ]);
        expect(derivePrepTypeProgress(state)[0].medianMs).toBe(151);
    });

    it('median: negative ms clamps to 0 for the math, but mistakes keep the logged ms', () => {
        const state = stateWith([
            attempt({ skill: 'word-problem', ms: -20, correct: false, itemId: 'w1' }),
            attempt({ skill: 'word-problem', ms: 40, correct: true, itemId: 'w2' }),
        ]);
        const [entry] = derivePrepTypeProgress(state);
        expect(entry.medianMs).toBe(20);
        expect(entry.mistakes[0].ms).toBe(-20);
    });

    it('per-skill mistakes are newest first and capped at 10', () => {
        const wrongAttempts = Array.from({ length: 12 }, (_, i) =>
            attempt({ skill: 'compare', correct: false, itemId: `item-${i + 1}`, at: i + 1 }));
        const state = stateWith(wrongAttempts);
        const [entry] = derivePrepTypeProgress(state);
        expect(entry.mistakes).toHaveLength(10);
        expect(entry.mistakes[0].itemId).toBe('item-12');
        expect(entry.mistakes[9].itemId).toBe('item-3');
    });

    it('recentPrepMistakes orders newest first across skills and defaults to a cap of 20', () => {
        const wrongAttempts = Array.from({ length: 25 }, (_, i) =>
            attempt({ skill: i % 2 === 0 ? 'add' : 'sub', correct: false, itemId: `m-${i + 1}`, at: i + 1 }));
        const state = stateWith([
            attempt({ skill: 'add', correct: true, itemId: 'ok-1', at: 0 }),
            ...wrongAttempts,
        ]);
        const result = recentPrepMistakes(state);
        expect(result).toHaveLength(20);
        expect(result[0].itemId).toBe('m-25');
        expect(result[19].itemId).toBe('m-6');
    });

    it('recentPrepMistakes respects a custom cap', () => {
        const state = stateWith([
            attempt({ correct: false, itemId: 'first', at: 1 }),
            attempt({ correct: false, itemId: 'second', at: 2 }),
            attempt({ correct: false, itemId: 'third', at: 3 }),
        ]);
        const result = recentPrepMistakes(state, 2);
        expect(result.map(m => m.itemId)).toEqual(['third', 'second']);
    });
});
