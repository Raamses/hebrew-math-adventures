import { describe, it, expect } from 'vitest';
import {
    HIGHLIVE_SECONDS,
    KID_REWARD_COINS,
    KID_REWARD_GEMS,
    PARENT_BLITZ_SECONDS,
    PARENT_REWARD_COINS,
    RELAY_QUESTION_COUNT,
    createFamilyRelayState,
    currentKidQuestion,
    currentParentQuestion,
    finishRelay,
    generateKidQuestions,
    getVictoryPayload,
    startHighFivePass,
    startParentBlitz,
    submitKidAnswer,
    submitParentAnswer,
    tickHighFive,
    tickParentBlitz,
    type FamilyRelayState,
} from '../familyRelayEngine';

function seededRng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x1_0000_0000;
    };
}

function answerAllKid(state: FamilyRelayState, correct: boolean): FamilyRelayState {
    let s = state;
    while (s.phase === 'kidShields') {
        const q = currentKidQuestion(s);
        if (!q) break;
        s = submitKidAnswer(s, correct ? q.answer : q.answer + 1);
    }
    return s;
}

function answerAllParent(state: FamilyRelayState, correct: boolean): FamilyRelayState {
    let s = state;
    for (let i = 0; i < RELAY_QUESTION_COUNT; i++) {
        const q = currentParentQuestion(s);
        if (!q) break;
        s = submitParentAnswer(s, correct ? q.answer : q.answer + 1);
    }
    return s;
}

describe('family relay state creation', () => {
    it('builds four kid questions with three unique distractors each', () => {
        const s = createFamilyRelayState(3, seededRng(1));
        expect(s.phase).toBe('kidShields');
        expect(s.questions).toHaveLength(RELAY_QUESTION_COUNT);
        expect(s.kidIndex).toBe(0);
        expect(s.kidCorrect).toBe(0);
        for (const q of s.questions) {
            expect(typeof q.a).toBe('number');
            expect(typeof q.b).toBe('number');
            expect(['+', '-', '×', '÷']).toContain(q.op);
            expect(typeof q.answer).toBe('number');
            expect(q.distractors).toHaveLength(3);
            expect(new Set(q.distractors).size).toBe(3);
            expect(q.distractors).not.toContain(q.answer);
        }
    });

    it('generates questions at the requested level', () => {
        const s = createFamilyRelayState(1, seededRng(2));
        for (const q of s.questions) {
            if (q.op === '+') expect(q.a + q.b).toBeLessThanOrEqual(10);
            if (q.op === '-') {
                expect(q.a).toBeLessThanOrEqual(10);
                expect(q.answer).toBeGreaterThanOrEqual(0);
            }
        }
    });

    it('is deterministic for a fixed seed', () => {
        const a = generateKidQuestions(3, 4, seededRng(12));
        const b = generateKidQuestions(3, 4, seededRng(12));
        expect(a).toEqual(b);
    });
});

describe('full flow', () => {
    it('walks kid -> high five -> parent blitz -> victory', () => {
        let s = createFamilyRelayState(3, seededRng(3));
        s = answerAllKid(s, true);
        expect(s.phase).toBe('highFivePass');
        expect(s.secondsLeft).toBe(HIGHLIVE_SECONDS);
        expect(s.kidCorrect).toBe(RELAY_QUESTION_COUNT);

        s = tickHighFive(s, 2);
        expect(s.phase).toBe('highFivePass');
        expect(s.secondsLeft).toBe(HIGHLIVE_SECONDS - 2);

        s = tickHighFive(s, HIGHLIVE_SECONDS - 2);
        expect(s.phase).toBe('parentBlitz');
        expect(s.secondsLeft).toBe(PARENT_BLITZ_SECONDS);

        s = answerAllParent(s, true);
        expect(s.phase).toBe('parentBlitz');
        expect(s.blitzCorrect).toBe(RELAY_QUESTION_COUNT);

        s = finishRelay(s);
        expect(s.phase).toBe('victory');
        expect(getVictoryPayload(s)).toEqual({
            relayId: s.relayId,
            kidRewards: { coins: KID_REWARD_COINS, gems: KID_REWARD_GEMS },
            parentRewards: { coins: PARENT_REWARD_COINS },
        });
    });

    it('supports explicit startHighFivePass and startParentBlitz for tests', () => {
        let s = createFamilyRelayState(1, seededRng(5));
        s = startHighFivePass(s);
        expect(s.phase).toBe('highFivePass');
        expect(s.secondsLeft).toBe(HIGHLIVE_SECONDS);

        s = startParentBlitz(s);
        expect(s.phase).toBe('parentBlitz');
        expect(s.secondsLeft).toBe(PARENT_BLITZ_SECONDS);
    });

    it('finishes via early finish and via parent blitz timeout', () => {
        let early = createFamilyRelayState(2, seededRng(4));
        early = answerAllKid(early, true);
        early = startParentBlitz(early);
        early = finishRelay(early);
        expect(early.phase).toBe('victory');

        let timeout = createFamilyRelayState(2, seededRng(4));
        timeout = answerAllKid(timeout, true);
        timeout = startParentBlitz(timeout);
        timeout = tickParentBlitz(timeout, 10);
        expect(timeout.secondsLeft).toBe(PARENT_BLITZ_SECONDS - 10);
        timeout = tickParentBlitz(timeout, PARENT_BLITZ_SECONDS - 10);
        expect(timeout.phase).toBe('victory');
    });
});

describe('idempotency', () => {
    it('returns the same reference after victory', () => {
        let s = createFamilyRelayState(2, seededRng(6));
        s = answerAllKid(s, true);
        s = startParentBlitz(s);
        s = answerAllParent(s, true);
        s = finishRelay(s);

        expect(submitKidAnswer(s, 0)).toBe(s);
        expect(submitParentAnswer(s, 0)).toBe(s);
        expect(tickHighFive(s, 1)).toBe(s);
        expect(tickParentBlitz(s, 1)).toBe(s);
        expect(finishRelay(s)).toBe(s);
    });
});

describe('privacy invariant', () => {
    it('does not serialize parent fields during kid phases or in currentKidQuestion', () => {
        let s = createFamilyRelayState(3, seededRng(7));
        for (const json of [JSON.stringify(s), JSON.stringify(currentKidQuestion(s))]) {
            expect(json).not.toContain('parentAnswers');
            expect(json).not.toContain('blitzCorrect');
            expect(json).not.toContain('parentRewards');
        }

        s = answerAllKid(s, true);
        expect(s.phase).toBe('highFivePass');
        const passJson = JSON.stringify(s);
        expect(passJson).not.toContain('parentAnswers');
        expect(passJson).not.toContain('blitzCorrect');
        expect(passJson).not.toContain('parentRewards');
    });

    it('produces exact victory reward payload', () => {
        let s = createFamilyRelayState(2, seededRng(8));
        s = answerAllKid(s, true);
        s = startParentBlitz(s);
        s = answerAllParent(s, true);
        s = finishRelay(s);

        const payload = getVictoryPayload(s);
        expect(payload.kidRewards).toEqual({ coins: KID_REWARD_COINS, gems: KID_REWARD_GEMS });
        expect(payload.parentRewards).toEqual({ coins: PARENT_REWARD_COINS });
        expect(getVictoryPayload(finishRelay(s))).toEqual(payload);
    });
});

describe('grading', () => {
    it('grades kid answers correctly and incorrectly', () => {
        const base = createFamilyRelayState(2, seededRng(9));
        const q = currentKidQuestion(base);
        expect(q).not.toBeNull();
        if (!q) return;

        const wrong = submitKidAnswer(base, q.answer + 1);
        expect(wrong.kidCorrect).toBe(0);
        expect(wrong.kidIndex).toBe(1);

        const right = submitKidAnswer(base, q.answer);
        expect(right.kidCorrect).toBe(1);
        expect(right.kidIndex).toBe(1);
    });

    it('grades parent blitz answers correctly and incorrectly', () => {
        let s = createFamilyRelayState(2, seededRng(10));
        s = answerAllKid(s, true);
        s = startParentBlitz(s);

        const first = currentParentQuestion(s);
        expect(first).not.toBeNull();
        if (!first) return;
        s = submitParentAnswer(s, first.answer + 1);
        expect(s.blitzCorrect).toBe(0);

        const second = currentParentQuestion(s);
        expect(second).not.toBeNull();
        if (!second) return;
        s = submitParentAnswer(s, second.answer);
        expect(s.blitzCorrect).toBe(1);
    });
});
