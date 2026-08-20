/**
 * Sudoku Engine — pure functions, no React.
 *
 * Procedural Sudoku generation with daily seed, three difficulty levels,
 * validation, and shareable results. Follows the pattern established by
 * equationEngine.ts: mulberry32 PRNG, dateToSeed(), pure deterministic functions.
 *
 * Board representation: number[81] where 0 = empty cell.
 * Index = row * 9 + col.
 */

/* ── Types ───────────────────────────────────────────────────────── */

export type Difficulty = 'easy' | 'medium' | 'hard';

export type CellState = 'correct' | 'wrong' | 'empty';

export interface SudokuPuzzle {
  /** 81 cells, 0 = empty. The puzzle as presented to the player. */
  puzzle: number[];
  /** 81 cells, the full solution. */
  solution: number[];
  /** Difficulty level. */
  difficulty: Difficulty;
  /** Days since epoch — used for display and seeding. */
  puzzleNumber: number;
  /** Pre-filled cell indices (given clues). */
  givenIndices: Set<number>;
}

export interface SudokuProgress {
  /** 81 cells, 0 = empty. Player's current board state. */
  board: number[];
  /** Whether the game is complete. */
  status: 'playing' | 'won';
  /** Difficulty played. */
  difficulty: Difficulty;
  /** Time started (ms epoch). */
  startedAt: number;
  /** Time finished (ms epoch, 0 if not finished). */
  finishedAt: number;
  /** Number of mistakes made. */
  mistakes: number;
  /** Per-difficulty stats. */
  stats: SudokuStats;
}

export interface SudokuStats {
  easy: { played: number; won: number; bestTimeMs: number };
  medium: { played: number; won: number; bestTimeMs: number };
  hard: { played: number; won: number; bestTimeMs: number };
}

/* ── Constants ───────────────────────────────────────────────────── */

/** Number of cells to remove per difficulty (out of 81). */
export const DIFFICULTY_REMOVALS: Record<Difficulty, number> = {
  easy: 35,
  medium: 45,
  hard: 52,
};

/** Coin rewards per difficulty cleared. */
export const COIN_REWARDS: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
};

const BOARD_SIZE = 81;
const BOX_SIZE = 3;
const GRID_SIZE = 9;

/* ── Seeded PRNG (mulberry32) ────────────────────────────────────── */

/**
 * Small, fast, deterministic PRNG. Same implementation as equationEngine.
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
 * Convert a Date to a day-count since epoch (same as equationEngine).
 */
export function dateToSeed(date: Date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) - 10957;
}

/* ── Board Helpers ──────────────────────────────────────────────── */

/** Create an empty board (all zeros). */
export function createEmptyBoard(): number[] {
  return new Array(BOARD_SIZE).fill(0);
}

/** Get the row index for a cell index. */
export function rowOf(index: number): number {
  return Math.floor(index / GRID_SIZE);
}

/** Get the column index for a cell index. */
export function colOf(index: number): number {
  return index % GRID_SIZE;
}

/** Get the box index (0-8) for a cell index. */
export function boxOf(index: number): number {
  const r = rowOf(index);
  const c = colOf(index);
  return Math.floor(r / BOX_SIZE) * BOX_SIZE + Math.floor(c / BOX_SIZE);
}

/** Get all indices in the same row, column, and box as the given index (excluding itself). */
export function getPeers(index: number): number[] {
  const peers = new Set<number>();
  const row = rowOf(index);
  const col = colOf(index);
  const box = boxOf(index);

  for (let i = 0; i < BOARD_SIZE; i++) {
    if (i === index) continue;
    if (rowOf(i) === row || colOf(i) === col || boxOf(i) === box) {
      peers.add(i);
    }
  }
  return [...peers];
}

/** Check if placing a value at index is valid (no conflict with peers). */
export function isValidPlacement(board: number[], index: number, value: number): boolean {
  if (value === 0) return true;
  for (const peer of getPeers(index)) {
    if (board[peer] === value) return false;
  }
  return true;
}

/** Check if a board is fully solved. */
export function isSolved(board: number[]): boolean {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] === 0) return false;
    if (!isValidPlacement(board, i, board[i])) return false;
  }
  return true;
}

/** Find the first empty cell, or -1 if none. */
export function findEmpty(board: number[]): number {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] === 0) return i;
  }
  return -1;
}

/* ── Sudoku Generation ─────────────────────────────────────────── */

/**
 * Fill a board using backtracking with the given RNG.
 * Mutates the board in place. Returns true if successful.
 */
function fillBoard(board: number[], rng: () => number): boolean {
  const index = findEmpty(board);
  if (index === -1) return true;

  // Shuffle digits 1-9 for randomised filling.
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }

  for (const d of digits) {
    if (isValidPlacement(board, index, d)) {
      board[index] = d;
      if (fillBoard(board, rng)) return true;
      board[index] = 0;
    }
  }
  return false;
}

/**
 * Generate a complete valid Sudoku solution.
 */
function generateSolution(rng: () => number): number[] {
  const board = createEmptyBoard();
  fillBoard(board, rng);
  return board;
}

/**
 * Remove cells from a solved board to create a puzzle.
 * Uses symmetric removal for aesthetic appeal.
 * Ensures the puzzle has a unique solution via count-solutions check.
 */
function removeCells(
  solution: number[],
  removals: number,
  rng: () => number,
): number[] {
  const puzzle = [...solution];

  // Generate all cell indices and shuffle.
  const indices = Array.from({ length: BOARD_SIZE }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let removed = 0;
  for (const idx of indices) {
    if (removed >= removals) break;
    if (puzzle[idx] === 0) continue;

    // Try symmetric removal (idx and its mirror).
    const mirror = BOARD_SIZE - 1 - idx;
    const saved1 = puzzle[idx];
    const saved2 = puzzle[mirror];

    puzzle[idx] = 0;
    if (mirror !== idx && puzzle[mirror] !== 0) {
      puzzle[mirror] = 0;
    }

    // Check uniqueness: if still unique, keep the removal.
    if (countSolutions(puzzle, 2) === 1) {
      removed += mirror !== idx && saved2 !== 0 ? 2 : 1;
    } else {
      // Revert.
      puzzle[idx] = saved1;
      puzzle[mirror] = saved2;
    }
  }

  return puzzle;
}

/**
 * Count the number of solutions (up to limit) for a given board.
 * Used to verify uniqueness of the puzzle.
 */
function countSolutions(board: number[], limit: number = 2): number {
  const copy = [...board];
  return countSolutionsHelper(copy, limit);
}

function countSolutionsHelper(board: number[], limit: number): number {
  const index = findEmpty(board);
  if (index === -1) return 1;

  let count = 0;
  for (let d = 1; d <= 9; d++) {
    if (isValidPlacement(board, index, d)) {
      board[index] = d;
      count += countSolutionsHelper(board, limit - count);
      board[index] = 0;
      if (count >= limit) return count;
    }
  }
  return count;
}

/**
 * Generate the daily Sudoku puzzle. Same date + difficulty → same puzzle for everyone.
 */
export function generatePuzzle(
  difficulty: Difficulty = 'medium',
  seedDate: Date = new Date(),
): SudokuPuzzle {
  const daySeed = dateToSeed(seedDate);
  // Combine date seed with difficulty hash for distinct puzzles per difficulty.
  const difficultyHash: Record<Difficulty, number> = {
    easy: 1000,
    medium: 2000,
    hard: 3000,
  };
  const seed = daySeed + difficultyHash[difficulty];
  const rng = mulberry32(seed);

  const solution = generateSolution(rng);
  const puzzle = removeCells(solution, DIFFICULTY_REMOVALS[difficulty], rng);

  const givenIndices = new Set<number>();
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (puzzle[i] !== 0) givenIndices.add(i);
  }

  return {
    puzzle,
    solution,
    difficulty,
    puzzleNumber: daySeed,
    givenIndices,
  };
}

/* ── Validation ────────────────────────────────────────────────── */

/**
 * Check if the player's board matches the solution.
 * Returns 'won' if all cells are correctly filled, 'playing' otherwise.
 */
export function checkWin(board: number[], solution: number[]): boolean {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== solution[i]) return false;
  }
  return true;
}

/**
 * Validate a cell against the solution.
 * Returns 'correct' if the value matches, 'wrong' if not, 'empty' if 0.
 */
export function validateCell(
  value: number,
  index: number,
  solution: number[],
): CellState {
  if (value === 0) return 'empty';
  return value === solution[index] ? 'correct' : 'wrong';
}

/**
 * Find all cells with wrong values.
 */
export function findWrongCells(board: number[], solution: number[]): number[] {
  const wrong: number[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== 0 && board[i] !== solution[i]) {
      wrong.push(i);
    }
  }
  return wrong;
}

/**
 * Find all cells that conflict with the current board state (row/col/box conflicts).
 * Excludes given (pre-filled) cells.
 */
export function findConflicts(board: number[], givenIndices: Set<number>): number[] {
  const conflicts = new Set<number>();
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] === 0 || givenIndices.has(i)) continue;
    for (const peer of getPeers(i)) {
      if (givenIndices.has(peer)) continue;
      if (board[peer] !== 0 && board[peer] === board[i]) {
        conflicts.add(i);
        conflicts.add(peer);
      }
    }
  }
  return [...conflicts];
}

/* ── Share Text Generation ───────────────────────────────────────── */

const DIFFICULTY_EMOJI: Record<Difficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

/**
 * Generate the shareable text for a completed Sudoku game.
 */
export function generateShareText(
  difficulty: Difficulty,
  puzzleNumber: number,
  mistakes: number,
  timeMs: number,
  won: boolean,
): string {
  const minutes = Math.floor(timeMs / 60_000);
  const seconds = Math.floor((timeMs % 60_000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const status = won ? '🏆' : '😢';
  const diffEmoji = DIFFICULTY_EMOJI[difficulty];

  return `סודוקו #${puzzleNumber} ${diffEmoji} ${status}\n⏱️ ${timeStr} · ❌ ${mistakes} טעויות`;
}

/* ── LocalStorage Persistence ───────────────────────────────────── */

const STORAGE_KEY = 'sudoku-progress';

interface StoredProgress {
  date: string;
  board: number[];
  status: 'playing' | 'won';
  difficulty: Difficulty;
  startedAt: number;
  finishedAt: number;
  mistakes: number;
  stats: SudokuStats;
}

function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function freshStats(): SudokuStats {
  return {
    easy: { played: 0, won: 0, bestTimeMs: 0 },
    medium: { played: 0, won: 0, bestTimeMs: 0 },
    hard: { played: 0, won: 0, bestTimeMs: 0 },
  };
}

export function loadProgress(date: Date = new Date()): SudokuProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredProgress;
    if (stored.date !== todayKey(date)) return null;
    return {
      board: stored.board,
      status: stored.status,
      difficulty: stored.difficulty,
      startedAt: stored.startedAt,
      finishedAt: stored.finishedAt,
      mistakes: stored.mistakes,
      stats: stored.stats ?? freshStats(),
    };
  } catch {
    return null;
  }
}

export function saveProgress(progress: SudokuProgress, date: Date = new Date()): void {
  const stored: StoredProgress = {
    date: todayKey(date),
    board: progress.board,
    status: progress.status,
    difficulty: progress.difficulty,
    startedAt: progress.startedAt,
    finishedAt: progress.finishedAt,
    mistakes: progress.mistakes,
    stats: progress.stats,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore quota / privacy mode errors.
  }
}

/**
 * Update stats after a completed game.
 */
export function updateStats(
  stats: SudokuStats,
  difficulty: Difficulty,
  won: boolean,
  timeMs: number,
): SudokuStats {
  const newStats: SudokuStats = JSON.parse(JSON.stringify(stats));
  newStats[difficulty].played += 1;
  if (won) {
    newStats[difficulty].won += 1;
    if (newStats[difficulty].bestTimeMs === 0 || timeMs < newStats[difficulty].bestTimeMs) {
      newStats[difficulty].bestTimeMs = timeMs;
    }
  }
  return newStats;
}

/**
 * Format time in MM:SS format.
 */
export function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
