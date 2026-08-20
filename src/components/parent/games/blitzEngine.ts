/**
 * Parent Blitz — engine logic (pure functions, no React).
 *
 * 60-second rapid-fire mental math for parents. All functions are
 * deterministic and testable. Question generators guarantee non-negative
 * integer answers so the UI only needs a numeric keypad.
 */

/* ── Types ───────────────────────────────────────────────────────── */

export type BlitzQuestionType =
  | 'percentage'
  | 'orderOfOperations'
  | 'fraction'
  | 'doubleDigitMultiply'
  | 'mixedArithmetic';

export type BlitzDifficulty = 1 | 2 | 3;

/** Injected for determinism in tests. Contract: returns [0, 1). */
export type Rng = () => number;

export interface BlitzQuestion {
  readonly id: string;
  readonly type: BlitzQuestionType;
  readonly difficulty: BlitzDifficulty;
  /** Language-neutral, LTR math expression: "15% × 240", "4 + 3 × 5" */
  readonly display: string;
  /** Always a non-negative integer. */
  readonly answer: number;
}

export type BlitzPhase = 'idle' | 'playing' | 'finished';

export interface BlitzAttempt {
  readonly questionId: string;
  readonly type: BlitzQuestionType;
  readonly difficulty: BlitzDifficulty;
  readonly given: number | null;   // null = skipped
  readonly correct: boolean;
  readonly answerTimeMs: number;
  readonly pointsAwarded: number;
}

export interface BlitzState {
  readonly phase: BlitzPhase;
  readonly question: BlitzQuestion | null;
  readonly input: string;
  readonly score: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly correct: number;
  readonly attempted: number;
  /** Wall-clock deadline (ms epoch). Null when not playing. */
  readonly endsAt: number | null;
  readonly remainingMs: number;
  /** When the current question was shown — for the speed bonus. */
  readonly questionShownAt: number;
  readonly history: readonly BlitzAttempt[];
  readonly lastResult: 'correct' | 'wrong' | null;
}

export interface BlitzHighScore {
  readonly score: number;
  readonly correct: number;
  readonly attempted: number;
  readonly bestStreak: number;
  readonly achievedAt: string; // ISO 8601
}

/* ── Constants ───────────────────────────────────────────────────── */

export const BLITZ_DURATION_MS = 60_000;
export const BLITZ_TICK_MS = 100;
export const BLITZ_STORAGE_KEY = 'parentBlitz.highScore.v1';

export const BASE_POINTS = 10;
export const DIFFICULTY_BONUS = 5;             // (difficulty - 1) * this
export const STREAK_BONUS_STEP = 2;
export const MAX_STREAK_BONUS = 10;            // caps at streak 5 (5*2=10)
export const FAST_ANSWER_MS = 3_000;
export const FAST_ANSWER_BONUS = 5;

/** Elapsed-time thresholds where difficulty steps up. */
export const DIFFICULTY_WINDOWS_MS: readonly [number, number] = [20_000, 40_000];

export const MAX_INPUT_LENGTH = 5;

/* ── Helpers ─────────────────────────────────────────────────────── */

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/* ── Difficulty ─────────────────────────────────────────────────── */

export function difficultyForElapsed(elapsedMs: number): BlitzDifficulty {
  if (elapsedMs < DIFFICULTY_WINDOWS_MS[0]) return 1;
  if (elapsedMs < DIFFICULTY_WINDOWS_MS[1]) return 2;
  return 3;
}

/* ── Question Type Selection ────────────────────────────────────── */

const ALL_TYPES: readonly BlitzQuestionType[] = [
  'percentage',
  'orderOfOperations',
  'fraction',
  'doubleDigitMultiply',
  'mixedArithmetic',
];

export function pickQuestionType(
  rng: Rng,
  previous?: BlitzQuestionType | null,
): BlitzQuestionType {
  const pool = previous
    ? ALL_TYPES.filter((t) => t !== previous)
    : ALL_TYPES;
  return pick(rng, pool);
}

/* ── Question Generators ────────────────────────────────────────── */

// Unicode vulgar fraction glyphs for display
const VULGAR_FRACTIONS: Record<string, string> = {
  '1/2': '½',
  '1/3': '⅓',
  '2/3': '⅔',
  '1/4': '¼',
  '3/4': '¾',
  '1/5': '⅕',
  '2/5': '⅖',
  '3/5': '⅗',
  '4/5': '⅘',
  '1/6': '⅙',
  '5/6': '⅚',
  '1/8': '⅛',
  '3/8': '⅜',
  '5/8': '⅝',
  '7/8': '⅞',
};

function vulgarFraction(num: number, den: number): string {
  const key = `${num}/${den}`;
  return VULGAR_FRACTIONS[key] ?? `${num}/${den}`;
}

/** Percentage: "What is P% of N?" → integer answer */
function genPercentage(rng: Rng, difficulty: BlitzDifficulty, id: string): BlitzQuestion {
  // Choose percentage and base so the answer is always an integer.
  const pctOptions: Record<BlitzDifficulty, number[]> = {
    1: [10, 25, 50],
    2: [5, 15, 20, 75],
    3: [12, 35, 65, 80],
  };

  const pct = pick(rng, pctOptions[difficulty]);
  // Pick base as a multiple of 100/gcd(pct,100) to guarantee integer answer.
  const divisor = 100 / gcd(pct, 100);
  const baseMultiplier = randInt(rng, 1, difficulty === 3 ? 9 : 5);
  const base = baseMultiplier * divisor;
  const answer = (pct * base) / 100;

  const display = `${pct}% × ${base}`;
  return { id, type: 'percentage', difficulty, display, answer };
}

/** Order of operations: "a + b × c" etc. → integer answer */
function genOrderOfOperations(rng: Rng, difficulty: BlitzDifficulty, id: string): BlitzQuestion {
  let display: string;
  let answer: number;

  if (difficulty === 1) {
    // a + b × c (or a - b × c)
    const a = randInt(rng, 1, 20);
    const b = randInt(rng, 2, 9);
    const c = randInt(rng, 2, 9);
    const op = pick(rng, ['+', '-']);
    if (op === '+') {
      display = `${a} + ${b} × ${c}`;
      answer = a + b * c;
    } else {
      // Ensure non-negative
      const product = b * c;
      const safeA = Math.max(a, product + 1);
      display = `${safeA} − ${b} × ${c}`;
      answer = safeA - product;
    }
  } else if (difficulty === 2) {
    // a + b × c − d
    const a = randInt(rng, 10, 50);
    const b = randInt(rng, 2, 12);
    const c = randInt(rng, 2, 9);
    const d = randInt(rng, 1, 20);
    const product = b * c;
    const safeD = Math.min(d, a + product);
    display = `${a} + ${b} × ${c} − ${safeD}`;
    answer = a + product - safeD;
  } else {
    // (a + b) × c − d
    const a = randInt(rng, 1, 15);
    const b = randInt(rng, 1, 15);
    const c = randInt(rng, 2, 8);
    const d = randInt(rng, 1, 30);
    const sum = a + b;
    const product = sum * c;
    const safeD = Math.min(d, product);
    display = `(${a} + ${b}) × ${c} − ${safeD}`;
    answer = product - safeD;
  }

  return { id, type: 'orderOfOperations', difficulty, display, answer };
}

/** Fraction: "¾ × N" → integer answer */
function genFraction(rng: Rng, difficulty: BlitzDifficulty, id: string): BlitzQuestion {
  const fractionSets: Record<BlitzDifficulty, [number, number][]> = {
    1: [[1, 2], [1, 3], [1, 4]],
    2: [[2, 3], [3, 5], [3, 4]],
    3: [[4, 5], [2, 5], [3, 8], [5, 6]],
  };

  const [num, den] = pick(rng, fractionSets[difficulty]);
  // Choose N as a multiple of den to guarantee integer answer.
  const k = randInt(rng, 1, difficulty === 3 ? 12 : 8);
  const n = den * k;
  const answer = (num * n) / den;
  const vFrac = vulgarFraction(num, den);
  const display = `${vFrac} × ${n}`;

  return { id, type: 'fraction', difficulty, display, answer };
}

/** Double-digit multiply: "12 × 7" etc. → integer answer */
function genDoubleDigitMultiply(rng: Rng, difficulty: BlitzDifficulty, id: string): BlitzQuestion {
  let a: number, b: number;

  if (difficulty === 1) {
    // 11-19 × 2-9
    a = randInt(rng, 11, 19);
    b = randInt(rng, 2, 9);
  } else if (difficulty === 2) {
    // 11-25 × 11-19
    a = randInt(rng, 11, 25);
    b = randInt(rng, 11, 19);
  } else {
    // 21-49 × 11-29
    a = randInt(rng, 21, 49);
    b = randInt(rng, 11, 29);
  }

  const answer = a * b;
  const display = `${a} × ${b}`;

  return { id, type: 'doubleDigitMultiply', difficulty, display, answer };
}

/** Mixed arithmetic: "25 + 17 - 8" etc. → integer answer */
function genMixedArithmetic(rng: Rng, difficulty: BlitzDifficulty, id: string): BlitzQuestion {
  let display: string;
  let answer: number;

  if (difficulty === 1) {
    // 2-term ±
    const a = randInt(rng, 10, 99);
    const b = randInt(rng, 1, a); // ensure non-negative
    const op = pick(rng, ['+', '-']);
    display = `${a} ${op === '+' ? '+' : '−'} ${b}`;
    answer = op === '+' ? a + b : a - b;
  } else if (difficulty === 2) {
    // 3-term ±
    const a = randInt(rng, 10, 50);
    const b = randInt(rng, 1, 30);
    const c = randInt(rng, 1, a + b); // ensure non-negative
    display = `${a} + ${b} − ${c}`;
    answer = a + b - c;
  } else {
    // 3-term with ×
    const a = randInt(rng, 5, 20);
    const b = randInt(rng, 2, 8);
    const c = randInt(rng, 2, 8);
    const product = b * c;
    const d = randInt(rng, 1, Math.max(1, a + product - 1));
    const safeD = Math.min(d, a + product);
    display = `${a} + ${b} × ${c} − ${safeD}`;
    answer = a + product - safeD;
  }

  return { id, type: 'mixedArithmetic', difficulty, display, answer };
}

const GENERATORS: Record<
  BlitzQuestionType,
  (rng: Rng, difficulty: BlitzDifficulty, id: string) => BlitzQuestion
> = {
  percentage: genPercentage,
  orderOfOperations: genOrderOfOperations,
  fraction: genFraction,
  doubleDigitMultiply: genDoubleDigitMultiply,
  mixedArithmetic: genMixedArithmetic,
};

export function generateQuestion(
  type: BlitzQuestionType,
  difficulty: BlitzDifficulty,
  rng: Rng,
  idSeed: number,
): BlitzQuestion {
  const id = `blitz-${idSeed}`;
  return GENERATORS[type](rng, difficulty, id);
}

export function generateNextQuestion(
  rng: Rng,
  elapsedMs: number,
  previous?: BlitzQuestionType | null,
  idSeed?: number,
): BlitzQuestion {
  const difficulty = difficultyForElapsed(elapsedMs);
  const type = pickQuestionType(rng, previous);
  const seed = idSeed ?? Math.floor(rng() * 1_000_000);
  return generateQuestion(type, difficulty, rng, seed);
}

/* ── Scoring ─────────────────────────────────────────────────────── */

export interface ScoreDeltaInput {
  readonly difficulty: BlitzDifficulty;
  readonly streak: number;        // streak BEFORE this answer
  readonly answerTimeMs: number;
}

export function computeScoreDelta(input: ScoreDeltaInput): number {
  const difficultyBonus = (input.difficulty - 1) * DIFFICULTY_BONUS;
  const streakBonus = Math.min(input.streak * STREAK_BONUS_STEP, MAX_STREAK_BONUS);
  const fastBonus = input.answerTimeMs < FAST_ANSWER_MS ? FAST_ANSWER_BONUS : 0;
  return BASE_POINTS + difficultyBonus + streakBonus + fastBonus;
}

/* ── Answer Checking ─────────────────────────────────────────────── */

export function checkAnswer(question: BlitzQuestion, input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '') return false;
  // Reject non-digit input (no signs, no exponents, no Arabic-Indic)
  if (!/^\d+$/.test(trimmed)) return false;
  const given = parseInt(trimmed, 10);
  if (!Number.isFinite(given) || given < 0) return false;
  return given === question.answer;
}

/* ── State Transitions ──────────────────────────────────────────── */

export function createInitialState(): BlitzState {
  return {
    phase: 'idle',
    question: null,
    input: '',
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    attempted: 0,
    endsAt: null,
    remainingMs: BLITZ_DURATION_MS,
    questionShownAt: 0,
    history: [],
    lastResult: null,
  };
}

export function startGame(now: number, rng: Rng): BlitzState {
  const question = generateNextQuestion(rng, 0, null, 0);
  return {
    ...createInitialState(),
    phase: 'playing',
    question,
    endsAt: now + BLITZ_DURATION_MS,
    remainingMs: BLITZ_DURATION_MS,
    questionShownAt: now,
  };
}

export function appendDigit(state: BlitzState, digit: string): BlitzState {
  if (state.phase !== 'playing') return state;
  if (state.input.length >= MAX_INPUT_LENGTH) return state;
  return { ...state, input: state.input + digit };
}

export function deleteDigit(state: BlitzState): BlitzState {
  if (state.phase !== 'playing') return state;
  if (state.input.length === 0) return state;
  return { ...state, input: state.input.slice(0, -1) };
}

export function clearInput(state: BlitzState): BlitzState {
  if (state.phase !== 'playing') return state;
  return { ...state, input: '' };
}

export function submitAnswer(state: BlitzState, now: number, rng: Rng): BlitzState {
  if (state.phase !== 'playing') return state;
  if (state.input === '') return state;
  if (!state.question) return state;

  const isCorrect = checkAnswer(state.question, state.input);
  const answerTimeMs = now - state.questionShownAt;
  const points = isCorrect
    ? computeScoreDelta({
        difficulty: state.question.difficulty,
        streak: state.streak,
        answerTimeMs,
      })
    : 0;

  const attempt: BlitzAttempt = {
    questionId: state.question.id,
    type: state.question.type,
    difficulty: state.question.difficulty,
    given: parseInt(state.input, 10),
    correct: isCorrect,
    answerTimeMs,
    pointsAwarded: points,
  };

  const newStreak = isCorrect ? state.streak + 1 : 0;
  const newBestStreak = Math.max(state.bestStreak, newStreak);
  const remaining = Math.max(0, (state.endsAt ?? now) - now);

  // Generate next question (or null if time's up)
  const elapsedMs = BLITZ_DURATION_MS - remaining;
  const nextQuestion = remaining > 0
    ? generateNextQuestion(rng, elapsedMs, state.question.type, state.attempted + 1)
    : null;

  return {
    ...state,
    question: nextQuestion,
    input: '',
    score: state.score + points,
    streak: newStreak,
    bestStreak: newBestStreak,
    correct: state.correct + (isCorrect ? 1 : 0),
    attempted: state.attempted + 1,
    remainingMs: remaining,
    questionShownAt: now,
    history: [...state.history, attempt],
    lastResult: isCorrect ? 'correct' : 'wrong',
    phase: remaining > 0 ? 'playing' : 'finished',
  };
}

export function skipQuestion(state: BlitzState, now: number, rng: Rng): BlitzState {
  if (state.phase !== 'playing') return state;
  if (!state.question) return state;

  const attempt: BlitzAttempt = {
    questionId: state.question.id,
    type: state.question.type,
    difficulty: state.question.difficulty,
    given: null,
    correct: false,
    answerTimeMs: now - state.questionShownAt,
    pointsAwarded: 0,
  };

  const remaining = Math.max(0, (state.endsAt ?? now) - now);
  const elapsedMs = BLITZ_DURATION_MS - remaining;
  const nextQuestion = remaining > 0
    ? generateNextQuestion(rng, elapsedMs, state.question.type, state.attempted + 1)
    : null;

  return {
    ...state,
    question: nextQuestion,
    input: '',
    streak: 0,
    attempted: state.attempted + 1,
    remainingMs: remaining,
    questionShownAt: now,
    history: [...state.history, attempt],
    lastResult: 'wrong',
    phase: remaining > 0 ? 'playing' : 'finished',
  };
}

export function tick(state: BlitzState, now: number, _rng: Rng): BlitzState {
  if (state.phase !== 'playing') return state;
  const remaining = Math.max(0, (state.endsAt ?? now) - now);
  if (remaining === 0) {
    return { ...state, remainingMs: 0, phase: 'finished' };
  }
  return { ...state, remainingMs: remaining };
}

export function finishGame(state: BlitzState): BlitzState {
  if (state.phase === 'finished') return state;
  return { ...state, phase: 'finished', remainingMs: 0 };
}

/* ── Persistence ────────────────────────────────────────────────── */

export function loadHighScore(storage?: Storage): BlitzHighScore | null {
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return null;
    const raw = s.getItem(BLITZ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate field-by-field
    if (
      typeof parsed?.score !== 'number' ||
      !Number.isFinite(parsed.score) ||
      parsed.score < 0 ||
      typeof parsed?.correct !== 'number' ||
      typeof parsed?.attempted !== 'number' ||
      typeof parsed?.bestStreak !== 'number' ||
      typeof parsed?.achievedAt !== 'string'
    ) {
      return null;
    }
    return {
      score: parsed.score,
      correct: parsed.correct,
      attempted: parsed.attempted,
      bestStreak: parsed.bestStreak,
      achievedAt: parsed.achievedAt,
    };
  } catch {
    return null;
  }
}

export function isNewHighScore(
  result: Pick<BlitzHighScore, 'score'>,
  existing: BlitzHighScore | null,
): boolean {
  if (!existing) return result.score > 0;
  return result.score > existing.score;
}

export function saveHighScore(
  result: BlitzHighScore,
  storage?: Storage,
): BlitzHighScore {
  const existing = loadHighScore(storage);
  if (!isNewHighScore(result, existing)) {
    return existing ?? result;
  }
  try {
    const s = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (s) {
      s.setItem(BLITZ_STORAGE_KEY, JSON.stringify(result));
    }
  } catch {
    // Ignore quota / privacy mode errors.
  }
  return result;
}

/* ── Share Text ─────────────────────────────────────────────────── */

export function generateShareText(
  score: number,
  correct: number,
  attempted: number,
  bestStreak: number,
): string {
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  return `בליץ הורים 🧠\nניקוד: ${score} | נכונות: ${accuracy}% (${correct}/${attempted}) | רצף: ${bestStreak}`;
}
