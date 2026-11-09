/**
 * familyRelayEngine.ts — pure state machine for the W3D2 family co-op relay.
 *
 * Phases: kidShields -> highFivePass (5s) -> parentBlitz (30s) -> victory.
 * Randomness is injectable for deterministic tests; no React or localStorage.
 */

export type RelayPhase = 'kidShields' | 'highFivePass' | 'parentBlitz' | 'victory';

export type RelayOp = '+' | '-' | '×' | '÷';

export interface RelayQuestion {
    id: string;
    a: number;
    op: RelayOp;
    b: number;
    answer: number;
    distractors: [number, number, number];
}

export interface FamilyRelayState {
    relayId: string;
    estimatedLevel: number;
    phase: RelayPhase;
    questions: RelayQuestion[];
    kidIndex: number;
    kidCorrect: number;
    secondsLeft: number;
    parentAnswers?: (number | null)[];
    blitzCorrect?: number;
    relaysDone?: number;
    kidRewards?: { coins: number; gems: number };
    parentRewards?: { coins: number };
}

export interface CurrentKidQuestion {
    a: number;
    op: RelayOp;
    b: number;
    answer: number;
    distractors: [number, number, number];
    index: number;
    total: number;
}

export interface CurrentParentQuestion {
    a: number;
    op: RelayOp;
    b: number;
    answer: number;
    index: number;
    total: number;
}

export interface RelayVictoryPayload {
    relayId: string;
    kidRewards: { coins: number; gems: number };
    parentRewards: { coins: number };
}

export const RELAY_GAME_ID = 'family-relay';
export const RELAY_QUESTION_COUNT = 4;
export const KID_REWARD_COINS = 15;
export const KID_REWARD_GEMS = 5;
export const PARENT_REWARD_COINS = 15;
export const HIGHLIVE_SECONDS = 5;
export const PARENT_BLITZ_SECONDS = 30;

export type RelayRng = () => number;

type Equation = { a: number; op: RelayOp; b: number; answer: number };

function randomInt(rng: RelayRng, min: number, max: number): number {
    if (max < min) return min;
    return min + Math.floor(rng() * (max - min + 1));
}

function makeDistractors(answer: number, rng: RelayRng): [number, number, number] {
    const values = new Set<number>();
    let guard = 0;
    while (values.size < 3 && guard < 100) {
        guard++;
        const delta = randomInt(rng, 1, 9);
        const candidate = rng() < 0.5 ? answer - delta : answer + delta;
        if (candidate !== answer && candidate >= 0) values.add(candidate);
    }
    let fill = 1;
    while (values.size < 3) {
        const candidate = answer + fill;
        if (candidate !== answer) values.add(candidate);
        fill++;
    }
    const [x, y, z] = Array.from(values);
    return [x, y, z];
}

function additionWithin(rng: RelayRng, maxSum: number): Equation {
    const a = randomInt(rng, 1, Math.max(1, maxSum - 1));
    const b = randomInt(rng, 1, Math.max(1, maxSum - a));
    return { a, op: '+', b, answer: a + b };
}

function subtractionWithin(rng: RelayRng, max: number): Equation {
    const a = randomInt(rng, 2, max);
    const b = randomInt(rng, 1, a - 1);
    return { a, op: '-', b, answer: a - b };
}

function additionWithCarry(rng: RelayRng): Equation {
    const a = randomInt(rng, 6, 9);
    const b = randomInt(rng, 6, 9);
    return { a, op: '+', b, answer: a + b };
}

function subtractionWithBorrow(rng: RelayRng): Equation {
    const tens = randomInt(rng, 2, 6);
    const ones = randomInt(rng, 0, 8);
    const a = tens * 10 + ones;
    const bOnes = randomInt(rng, ones + 1, 9);
    const bTens = randomInt(rng, 0, tens - 1);
    const b = bTens * 10 + bOnes;
    return { a, op: '-', b, answer: a - b };
}

function multiplication(rng: RelayRng, level: number): Equation {
    const max = level >= 7 ? 10 : level >= 5 ? 6 : 5;
    const a = randomInt(rng, 2, max);
    const b = randomInt(rng, 2, max);
    return { a, op: '×', b, answer: a * b };
}

function division(rng: RelayRng, level: number): Equation {
    const divisorMax = level >= 7 ? 9 : 6;
    const b = randomInt(rng, 2, divisorMax);
    const answer = randomInt(rng, 2, 9);
    const a = b * answer;
    return { a, op: '÷', b, answer };
}

function generateOne(level: number, rng: RelayRng): Equation {
    const roll = rng();
    if (level <= 1) {
        return roll < 0.5 ? additionWithin(rng, 10) : subtractionWithin(rng, 10);
    }
    if (level === 2) {
        return roll < 0.5 ? additionWithin(rng, 20) : subtractionWithin(rng, 20);
    }
    if (level === 3) {
        if (roll < 0.4) return additionWithCarry(rng);
        if (roll < 0.8) return subtractionWithBorrow(rng);
        return additionWithin(rng, 30);
    }
    if (level === 4) {
        if (roll < 0.45) return additionWithCarry(rng);
        if (roll < 0.9) return subtractionWithBorrow(rng);
        return subtractionWithin(rng, 50);
    }
    if (roll < 0.45) return multiplication(rng, level);
    if (roll < 0.75) return division(rng, level);
    if (roll < 0.9) return additionWithin(rng, 100);
    return subtractionWithin(rng, 100);
}

export function generateKidQuestions(
    estimatedLevel: number,
    count: number = RELAY_QUESTION_COUNT,
    rng: RelayRng = Math.random,
): RelayQuestion[] {
    const safeLevel = Number.isFinite(estimatedLevel)
        ? Math.max(1, Math.min(10, Math.round(estimatedLevel)))
        : 1;
    const safeCount = Math.max(1, Math.floor(count));
    const seen = new Set<string>();
    const out: RelayQuestion[] = [];
    let attempts = 0;

    const build = (eq: Equation, idx: number): RelayQuestion => ({
        id: `q${idx + 1}`,
        a: eq.a,
        op: eq.op,
        b: eq.b,
        answer: eq.answer,
        distractors: makeDistractors(eq.answer, rng),
    });

    while (out.length < safeCount && attempts < safeCount * 20) {
        attempts++;
        const eq = generateOne(safeLevel, rng);
        const key = `${eq.a}${eq.op}${eq.b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(build(eq, out.length));
    }

    while (out.length < safeCount) {
        out.push(build(generateOne(safeLevel, rng), out.length));
    }

    return out;
}

function newRelayId(): string {
    try {
        const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
        if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    } catch {
        /* ignore */
    }
    return `relay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createFamilyRelayState(
    estimatedLevel: number,
    rng: RelayRng = Math.random,
): FamilyRelayState {
    const level = Number.isFinite(estimatedLevel)
        ? Math.max(1, Math.min(10, Math.round(estimatedLevel)))
        : 1;
    return {
        relayId: newRelayId(),
        estimatedLevel: level,
        phase: 'kidShields',
        questions: generateKidQuestions(level, RELAY_QUESTION_COUNT, rng),
        kidIndex: 0,
        kidCorrect: 0,
        secondsLeft: 0,
    };
}

export function currentKidQuestion(state: FamilyRelayState): CurrentKidQuestion | null {
    if (state.phase !== 'kidShields') return null;
    if (state.kidIndex < 0 || state.kidIndex >= state.questions.length) return null;
    const q = state.questions[state.kidIndex];
    return {
        a: q.a,
        op: q.op,
        b: q.b,
        answer: q.answer,
        distractors: q.distractors,
        index: state.kidIndex,
        total: state.questions.length,
    };
}

export function submitKidAnswer(state: FamilyRelayState, value: number | null): FamilyRelayState {
    if (state.phase !== 'kidShields') return state;
    const q = state.questions[state.kidIndex];
    if (!q) return state;
    const correct = value === q.answer;
    const kidCorrect = state.kidCorrect + (correct ? 1 : 0);
    const nextIndex = state.kidIndex + 1;
    if (nextIndex >= state.questions.length) {
        return {
            ...state,
            kidIndex: nextIndex,
            kidCorrect,
            phase: 'highFivePass',
            secondsLeft: HIGHLIVE_SECONDS,
        };
    }
    return { ...state, kidIndex: nextIndex, kidCorrect };
}

export function startHighFivePass(state: FamilyRelayState): FamilyRelayState {
    if (state.phase === 'highFivePass') return state;
    if (state.phase !== 'kidShields') return state;
    return { ...state, phase: 'highFivePass', secondsLeft: HIGHLIVE_SECONDS };
}

export function startParentBlitz(state: FamilyRelayState): FamilyRelayState {
    if (state.phase === 'parentBlitz' || state.phase === 'victory') return state;
    return {
        ...state,
        phase: 'parentBlitz',
        secondsLeft: PARENT_BLITZ_SECONDS,
        parentAnswers: state.parentAnswers ?? [],
        blitzCorrect: state.blitzCorrect ?? 0,
    };
}

export function tickHighFive(state: FamilyRelayState, elapsed: number): FamilyRelayState {
    if (state.phase !== 'highFivePass') return state;
    const next = state.secondsLeft - Math.max(0, elapsed);
    if (next <= 0) return startParentBlitz(state);
    return { ...state, secondsLeft: next };
}

export function currentParentQuestion(state: FamilyRelayState): CurrentParentQuestion | null {
    if (state.phase !== 'parentBlitz') return null;
    const answers = state.parentAnswers ?? [];
    const index = answers.length % state.questions.length;
    const q = state.questions[index];
    if (!q) return null;
    return {
        a: q.a,
        op: q.op,
        b: q.b,
        answer: q.answer,
        index,
        total: state.questions.length,
    };
}

export function submitParentAnswer(
    state: FamilyRelayState,
    value: number | null,
): FamilyRelayState {
    if (state.phase !== 'parentBlitz') return state;
    const answers = (state.parentAnswers ?? []).slice();
    const index = answers.length % state.questions.length;
    const q = state.questions[index];
    const correct = value === q.answer;
    answers.push(value);
    return {
        ...state,
        parentAnswers: answers,
        blitzCorrect: (state.blitzCorrect ?? 0) + (correct ? 1 : 0),
    };
}

export function tickParentBlitz(state: FamilyRelayState, elapsed: number): FamilyRelayState {
    if (state.phase !== 'parentBlitz') return state;
    const next = state.secondsLeft - Math.max(0, elapsed);
    if (next <= 0) return finishRelay(state);
    return { ...state, secondsLeft: next };
}

export function finishRelay(state: FamilyRelayState): FamilyRelayState {
    if (state.phase === 'victory') return state;
    return {
        ...state,
        phase: 'victory',
        secondsLeft: 0,
        parentAnswers: state.parentAnswers ?? [],
        blitzCorrect: state.blitzCorrect ?? 0,
        kidRewards: { coins: KID_REWARD_COINS, gems: KID_REWARD_GEMS },
        parentRewards: { coins: PARENT_REWARD_COINS },
        relaysDone: (state.relaysDone ?? 0) + 1,
    };
}

export function getVictoryPayload(state: FamilyRelayState): RelayVictoryPayload {
    return {
        relayId: state.relayId,
        kidRewards: state.kidRewards ?? { coins: KID_REWARD_COINS, gems: KID_REWARD_GEMS },
        parentRewards: state.parentRewards ?? { coins: PARENT_REWARD_COINS },
    };
}
