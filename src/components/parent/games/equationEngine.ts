/**
 * Equation of the Day — engine logic (pure functions, no React).
 *
 * All functions are deterministic and testable. The daily puzzle is seeded
 * from the date so every profile sees the same equation on a given day.
 */

/* ── Types ───────────────────────────────────────────────────────── */

export type CellState = 'correct' | 'present' | 'absent';

export interface Puzzle {
  /** Full equation string, e.g. `8+4*2=16`. */
  solution: string;
  /** Number of characters in the solution (left side + `=` + right side). */
  length: number;
  /** Days since epoch — used for display and seeding. */
  puzzleNumber: number;
}

export interface GameProgress {
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
  played: number;
  wins: number;
  maxStreak: number;
}

/* ── Constants ───────────────────────────────────────────────────── */

export const MAX_GUESSES = 6;
export const OPERATORS = ['+', '-', '*', '/'] as const;
export const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const ALL_CHARS = [...DIGITS, ...OPERATORS, '='] as const;

/* ── Seeded PRNG (mulberry32) ────────────────────────────────────── */

/**
 * Small, fast, deterministic PRNG. Good enough for puzzle generation —
 * we don't need cryptographic strength.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a Date (or ISO date string) to a day-count since epoch.
 * Only the calendar date matters — time-of-day is truncated.
 */
export function dateToSeed(date: Date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // Days since 2000-01-01 (arbitrary epoch, avoids Y2K38).
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) - 10957;
}

/* ── Equation Generation ────────────────────────────────────────── */

/**
 * Evaluate a simple arithmetic expression with +, -, *, / and integer operands.
 * Returns null if the expression is invalid or produces a non-integer.
 * Uses a standard shunting-yard / two-stack approach.
 */
function evaluate(expr: string): number | null {
  const tokens = expr.match(/\d+|[+\-*/]/g);
  if (!tokens) return null;

  // Dijkstra's shunting-yard → RPN → evaluate.
  const output: string[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

  for (const tok of tokens) {
    if (/\d/.test(tok)) {
      output.push(tok);
    } else {
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        prec[ops[ops.length - 1]] >= prec[tok]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(tok);
    }
  }
  while (ops.length) output.push(ops.pop()!);

  const stack: number[] = [];
  for (const tok of output) {
    if (/\d/.test(tok)) {
      stack.push(parseInt(tok, 10));
    } else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return null;
      let r: number;
      switch (tok) {
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        case '*': r = a * b; break;
        case '/':
          if (b === 0 || a % b !== 0) return null;
          r = a / b; break;
        default: return null;
      }
      stack.push(r);
    }
  }
  const result = stack.pop();
  if (result === undefined || !Number.isInteger(result) || stack.length > 0) return null;
  return result;
}

/**
 * Generate a random arithmetic expression (left side of the equation).
 * Length is the number of characters in the left side (before `=`).
 */
function generateLeftSide(rng: () => number, targetLen: number): string {
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // Start with a 1-2 digit number.
  let expr = String(Math.floor(rng() * 90) + 10); // 10-99
  if (rng() < 0.3) expr = String(Math.floor(rng() * 9) + 1); // 1-9

  while (expr.length < targetLen) {
    const remaining = targetLen - expr.length;
    const op = pick(OPERATORS);

    if (remaining <= 1) break;

    // Decide operand length (1 or 2 digits) based on remaining space.
    const operandLen = remaining - 1 >= 2 && rng() < 0.5 ? 2 : 1;
    let operand: string;
    if (operandLen === 2) {
      operand = String(Math.floor(rng() * 90) + 10);
    } else {
      operand = String(Math.floor(rng() * 10));
    }

    // For division, ensure the operand divides evenly later — we validate at the end.
    const addition = op + operand;
    if (expr.length + addition.length > targetLen) continue;
    expr += addition;
  }

  return expr;
}

/**
 * Generate the daily puzzle. Same date → same puzzle for everyone.
 */
export function generatePuzzle(seedDate: Date = new Date()): Puzzle {
  const seed = dateToSeed(seedDate);
  const rng = mulberry32(seed);

  // Try different target lengths (5-7 chars on the left side).
  const targetLengths = [6, 5, 7];

  for (const targetLen of targetLengths) {
    // Try up to 200 times per length.
    for (let attempt = 0; attempt < 200; attempt++) {
      const leftSide = generateLeftSide(rng, targetLen);
      if (leftSide.length !== targetLen) continue;

      const result = evaluate(leftSide);
      if (result === null || result < 0 || result > 999) continue;

      const resultStr = String(result);
      const solution = `${leftSide}=${resultStr}`;
      const totalLen = solution.length;

      // Reject if total length is too short or too long.
      if (totalLen < 6 || totalLen > 9) continue;

      // Reject trivial equations like `0+0=0`.
      if (result === 0 && /^0\+0$/.test(leftSide)) continue;

      // Reject if the equation is too simple (single operation with 1-digit operands).
      const opCount = (leftSide.match(/[+\-*/]/g) || []).length;
      if (opCount === 0) continue;

      return { solution, length: totalLen, puzzleNumber: seed };
    }
  }

  // Fallback — should never happen, but guarantees a valid puzzle.
  return { solution: '6+7=13', length: 6, puzzleNumber: seed };
}

/* ── Guess Validation ───────────────────────────────────────────── */

/**
 * Check if a guess is a syntactically valid equation string.
 * Must contain exactly one `=`, valid arithmetic on the left, and the
 * left side must evaluate to the right side.
 */
export function validateGuess(guess: string, solution: string): string | null {
  if (!guess.includes('=')) return 'noEquals';
  if (guess.length !== solution.length) return 'wrongLength';

  const [left, right] = guess.split('=');
  if (!left || !right) return 'noEquals';

  // Right side must be a number.
  if (!/^\d+$/.test(right)) return 'invalidRight';

  // Left side must be valid arithmetic.
  const result = evaluate(left);
  if (result === null) return 'invalidLeft';

  // Must equal the right side.
  if (result !== parseInt(right, 10)) return 'wrongResult';

  return null; // valid
}

/* ── Color Feedback (Nerdle-style) ───────────────────────────────── */

/**
 * Score a guess against the solution, returning per-character states.
 *
 * Algorithm (Nerdle rules):
 * 1. First pass: mark exact matches as 'correct' and remove from pool.
 * 2. Second pass: mark characters that exist elsewhere as 'present'.
 * 3. Remaining characters are 'absent'.
 */
export function scoreGuess(guess: string, solution: string): CellState[] {
  const result: CellState[] = new Array(guess.length).fill('absent');
  const solutionChars = solution.split('');
  const used = new Array(solution.length).fill(false);

  // Pass 1: exact matches.
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === solutionChars[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Pass 2: present but wrong position.
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < solution.length; j++) {
      if (!used[j] && guess[i] === solutionChars[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

/* ── Share Text Generation ───────────────────────────────────────── */

const EMOJI_MAP: Record<CellState, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
};

/**
 * Generate the shareable emoji grid for a completed game.
 */
export function generateShareText(
  guesses: string[],
  solution: string,
  puzzleNumber: number,
): string {
  const lines = guesses.map((g) => {
    const states = scoreGuess(g, solution);
    return states.map((s) => EMOJI_MAP[s]).join('');
  });
  const status = guesses[guesses.length - 1] === solution ? '🏆' : '😢';
  return `תרגיל היום #${puzzleNumber} ${status}\n${lines.join('\n')}`;
}

/* ── LocalStorage Persistence ───────────────────────────────────── */

const STORAGE_KEY = 'eod-progress';

interface StoredProgress {
  date: string;       // ISO date string (YYYY-MM-DD)
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
  streak: number;
  played: number;
  wins: number;
  maxStreak: number;
}

function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function loadProgress(date: Date = new Date()): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshProgress();
    const stored = JSON.parse(raw) as StoredProgress;
    if (stored.date !== todayKey(date)) return freshProgress();
    return {
      guesses: stored.guesses ?? [],
      status: stored.status ?? 'playing',
      played: stored.played ?? 0,
      wins: stored.wins ?? 0,
      maxStreak: stored.maxStreak ?? 0,
    };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(
  progress: GameProgress,
  streak: number,
  date: Date = new Date(),
): void {
  const stored: StoredProgress = {
    date: todayKey(date),
    guesses: progress.guesses,
    status: progress.status,
    streak,
    played: progress.played,
    wins: progress.wins,
    maxStreak: progress.maxStreak,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

/**
 * Compute the current streak given the stored data and today's result.
 *
 * Streak semantics (Nerdle-style, ADR 2026-08-equation-streak-loss-breaks):
 *   - already played today  -> return stored streak unchanged (idempotent)
 *   - won today, last played yesterday -> streak + 1 (continuation)
 *   - LOST today            -> streak breaks to 0, regardless of gap
 *   - won today after a gap -> streak restarts at 1
 *
 * A loss BREAKS the streak. The previous behaviour returned the stored
 * streak on a yesterday-loss, which meant a player could lose every
 * other day and keep an unbroken counter — the streak stopped meaning
 * "consecutive wins" and became "days played with at least one win".
 */
export function computeStreak(
  stored: { date: string; streak: number } | null,
  today: Date,
  won: boolean,
): number {
  const todayStr = todayKey(today);
  if (stored?.date === todayStr) return stored.streak; // already counted
  if (!won) return 0; // a loss always breaks the streak
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = todayKey(yesterday);
  if (stored?.date === yesterdayStr) return stored.streak + 1;
  return 1; // won today, but there was a gap -> restart at 1
}

function freshProgress(): GameProgress {
  return { guesses: [], status: 'playing', played: 0, wins: 0, maxStreak: 0 };
}
