/**
 * Number Merge (2048 style) — engine logic (pure functions, no React).
 *
 * All functions are deterministic and testable. The RNG is injected
 * so tests can produce repeatable game sequences. Follows the pattern
 * established by blitzEngine.ts and sudokuEngine.ts.
 *
 * Board representation: a 4×4 grid of `Tile | null`. Index [row][col].
 * Tiles carry a unique `id` so the UI can track them across moves for
 * animation purposes.
 */

/* ── Types ───────────────────────────────────────────────────────── */

/** A single tile on the board. */
export interface Tile {
  /** Power-of-2 value: 2, 4, 8, … 2048. */
  readonly value: number;
  /** Zero-based row index (0 = top). */
  readonly row: number;
  /** Zero-based column index (0 = left). */
  readonly col: number;
  /** Unique monotonic id — used as React key and for animation tracking. */
  readonly id: number;
  /** True if this tile was just spawned by addRandomTile. */
  readonly isNew?: boolean;
  /** Source tile ids that merged to create this tile (empty if not a merge). */
  readonly mergedFrom?: readonly [number, number];
}

/** 4×4 grid; null = empty cell. */
export type Board = readonly (Tile | null)[][];

/** Mutable version used internally during slide/merge operations. */
type MutableBoard = (Tile | null)[][];

export type Direction = 'up' | 'down' | 'left' | 'right';

export type GamePhase = 'idle' | 'playing' | 'won' | 'over';

export interface GameState {
  readonly phase: GamePhase;
  readonly board: Board;
  readonly score: number;
  readonly bestScore: number;
  /** True once the player has reached 2048 (kept going). */
  readonly won: boolean;
  /** Highest tile value currently on the board. */
  readonly bestTile: number;
  /** Monotonic tile id counter. */
  readonly nextTileId: number;
}

export interface HighScore {
  readonly score: number;
  readonly bestTile: number;
  readonly achievedAt: string; // ISO 8601
}

/** Injected for determinism in tests. Contract: returns [0, 1). */
export type Rng = () => number;

/* ── Constants ───────────────────────────────────────────────────── */

export const GRID_SIZE = 4;
export const WINNING_TILE = 2048;
export const NEW_TILE_VALUES: readonly number[] = [2, 4];
export const NEW_TILE_4_PROBABILITY = 0.1;

export const MERGE_STORAGE_KEY = 'numberMerge.highScore.v1';

/** Coin rewards based on the highest tile reached. */
export const COIN_REWARDS: Readonly<Record<number, number>> = {
  128: 2,
  256: 5,
  512: 10,
  1024: 20,
  2048: 50,
};

/** Sorted thresholds for coin reward lookup. */
const COIN_THRESHOLDS: readonly number[] = Object.keys(COIN_REWARDS)
  .map(Number)
  .sort((a, b) => a - b);

/* ── Seeded PRNG (mulberry32) ────────────────────────────────────── */

/**
 * Small, fast, deterministic PRNG. Same implementation as equationEngine
 * and sudokuEngine.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Board Helpers ──────────────────────────────────────────────── */

/** Create an empty board (all nulls). */
export function createEmptyBoard(): Board {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );
}

/** Deep-copy a board (shallow tiles are fine — tiles are immutable). */
function cloneBoard(board: Board): MutableBoard {
  return board.map((row) => [...row]);
}

/** Find all empty cell coordinates on the board. */
export function findEmptyCells(board: Board): readonly { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === null) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/** Get the highest tile value on the board (0 if empty). */
export function getBestTile(board: Board): number {
  let best = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = board[r][c];
      if (tile && tile.value > best) best = tile.value;
    }
  }
  return best;
}

/* ── Random Tile Placement ──────────────────────────────────────── */

/**
 * Add a single random tile (2 or 4) to a random empty cell.
 * Returns a new board; does not mutate the input.
 * Returns the input board unchanged if no empty cells exist.
 */
export function addRandomTile(board: Board, rng: Rng, nextId: number): {
  board: Board;
  nextTileId: number;
} {
  const empties = findEmptyCells(board);
  if (empties.length === 0) return { board, nextTileId: nextId };

  const cell = empties[Math.floor(rng() * empties.length)];
  const value = rng() < NEW_TILE_4_PROBABILITY ? 4 : 2;
  const tile: Tile = {
    value,
    row: cell.row,
    col: cell.col,
    id: nextId,
    isNew: true,
  };

  const newBoard = cloneBoard(board);
  newBoard[cell.row][cell.col] = tile;
  return { board: newBoard, nextTileId: nextId + 1 };
}

/* ── Slide + Merge Logic ────────────────────────────────────────── */

/**
 * Result of a single move operation.
 */
export interface MoveResult {
  readonly board: Board;
  readonly scoreGained: number;
  readonly moved: boolean;
  readonly nextTileId: number;
}

/**
 * Slide and merge a single line (row or column) in the "forward" direction.
 * The line is processed left-to-right: tiles slide toward index 0,
 * equal adjacent tiles merge (each tile merges at most once per move).
 *
 * @param line  Array of tiles or nulls (length = GRID_SIZE).
 * @param nextId  Current tile id counter (for new merged tile ids).
 * @returns The processed line, score gained, updated id counter.
 */
function slideLine(
  line: (Tile | null)[],
  nextId: number,
): { line: (Tile | null)[]; scoreGained: number; nextId: number } {
  // Step 1: compact — remove nulls, keep tiles in order.
  const tiles = line.filter((t): t is Tile => t !== null);

  // Step 2: merge — walk left-to-right, merge equal adjacent.
  const result: (Tile | null)[] = [];
  let scoreGained = 0;
  let id = nextId;

  let i = 0;
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      // Merge tiles[i] and tiles[i+1] into a new tile.
      const mergedValue = tiles[i].value * 2;
      const mergedTile: Tile = {
        value: mergedValue,
        row: 0, // row/col set by caller
        col: 0,
        id,
        mergedFrom: [tiles[i].id, tiles[i + 1].id],
      };
      id++;
      scoreGained += mergedValue;
      result.push(mergedTile);
      i += 2; // Skip both merged tiles.
    } else {
      result.push(tiles[i]);
      i++;
    }
  }

  // Step 3: pad with nulls to GRID_SIZE.
  while (result.length < GRID_SIZE) {
    result.push(null);
  }

  return { line: result, scoreGained, nextId: id };
}

/**
 * Extract a line from the board in the direction of movement.
 * For 'left' and 'up', lines are already in forward order.
 * For 'right' and 'down', lines are reversed so slide-to-front = slide-to-edge.
 */
function getLine(board: Board, index: number, direction: Direction): (Tile | null)[] {
  const line: (Tile | null)[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    switch (direction) {
      case 'left':
        line.push(board[index][i]);
        break;
      case 'right':
        line.push(board[index][GRID_SIZE - 1 - i]);
        break;
      case 'up':
        line.push(board[i][index]);
        break;
      case 'down':
        line.push(board[GRID_SIZE - 1 - i][index]);
        break;
    }
  }
  return line;
}

/**
 * Write a processed line back into the board in the correct orientation.
 */
function setLine(
  board: MutableBoard,
  index: number,
  direction: Direction,
  line: (Tile | null)[],
): void {
  for (let i = 0; i < GRID_SIZE; i++) {
    let tile = line[i];
    if (tile) {
      // Update row/col to the correct position.
      switch (direction) {
        case 'left':
          tile = { ...tile, row: index, col: i };
          break;
        case 'right':
          tile = { ...tile, row: index, col: GRID_SIZE - 1 - i };
          break;
        case 'up':
          tile = { ...tile, row: i, col: index };
          break;
        case 'down':
          tile = { ...tile, row: GRID_SIZE - 1 - i, col: index };
          break;
      }
    }
    switch (direction) {
      case 'left':
        board[index][i] = tile;
        break;
      case 'right':
        board[index][GRID_SIZE - 1 - i] = tile;
        break;
      case 'up':
        board[i][index] = tile;
        break;
      case 'down':
        board[GRID_SIZE - 1 - i][index] = tile;
        break;
    }
  }
}

/**
 * Check whether two boards are different (used to detect if a move changed anything).
 */
function boardsDiffer(a: Board, b: Board): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const ta = a[r][c];
      const tb = b[r][c];
      if (ta === null && tb === null) continue;
      if (ta === null || tb === null) return true;
      if (ta.id !== tb.id) return true;
    }
  }
  return false;
}

/**
 * Perform a move in the given direction: slide + merge all lines,
 * then add a random tile if anything moved.
 *
 * @param board  Current board state.
 * @param direction  Swipe direction.
 * @param rng  Random number generator.
 * @param nextTileId  Current tile id counter.
 * @returns MoveResult with new board, score gained, and whether anything moved.
 */
export function performMove(
  board: Board,
  direction: Direction,
  rng: Rng,
  nextTileId: number,
): MoveResult {
  const newBoard = cloneBoard(board);
  let totalScore = 0;
  let id = nextTileId;

  for (let i = 0; i < GRID_SIZE; i++) {
    const line = getLine(newBoard, i, direction);
    const { line: processed, scoreGained, nextId } = slideLine(line, id);
    setLine(newBoard, i, direction, processed);
    totalScore += scoreGained;
    id = nextId;
  }

  const moved = boardsDiffer(board, newBoard);

  if (!moved) {
    return { board, scoreGained: 0, moved: false, nextTileId: nextTileId };
  }

  // Add a random tile after a successful move.
  const { board: withNewTile, nextTileId: updatedId } = addRandomTile(
    newBoard,
    rng,
    id,
  );

  return {
    board: withNewTile,
    scoreGained: totalScore,
    moved: true,
    nextTileId: updatedId,
  };
}

/* ── Game State Transitions ─────────────────────────────────────── */

/** Create the initial idle state with an empty board. */
export function createInitialState(): GameState {
  return {
    phase: 'idle',
    board: createEmptyBoard(),
    score: 0,
    bestScore: loadHighScore()?.score ?? 0,
    won: false,
    bestTile: 0,
    nextTileId: 0,
  };
}

/**
 * Start a new game: place two random tiles and set phase to 'playing'.
 */
export function startGame(rng: Rng): GameState {
  const base = createInitialState();
  let board = base.board;
  let nextTileId = base.nextTileId;

  // Place two initial tiles.
  const r1 = addRandomTile(board, rng, nextTileId);
  board = r1.board;
  nextTileId = r1.nextTileId;
  const r2 = addRandomTile(board, rng, nextTileId);
  board = r2.board;
  nextTileId = r2.nextTileId;

  return {
    ...base,
    phase: 'playing',
    board,
    bestTile: getBestTile(board),
    nextTileId,
  };
}

/**
 * Apply a move to the game state. Handles score, win/over detection,
 * and best score persistence.
 */
export function applyMove(
  state: GameState,
  direction: Direction,
  rng: Rng,
): GameState {
  if (state.phase !== 'playing') return state;

  const result = performMove(state.board, direction, rng, state.nextTileId);
  if (!result.moved) return state;

  const newScore = state.score + result.scoreGained;
  const newBestTile = getBestTile(result.board);
  const newBestScore = Math.max(state.bestScore, newScore);
  const reachedWin = !state.won && newBestTile >= WINNING_TILE;
  const gameOver = isGameOver(result.board);

  let phase: GamePhase = 'playing';
  if (reachedWin) {
    phase = 'won';
  } else if (gameOver) {
    phase = 'over';
  }

  return {
    ...state,
    board: result.board,
    score: newScore,
    bestScore: newBestScore,
    bestTile: newBestTile,
    won: state.won || reachedWin,
    phase,
    nextTileId: result.nextTileId,
  };
}

/**
 * Continue playing after reaching 2048 (dismiss the win overlay).
 */
export function continueAfterWin(state: GameState): GameState {
  if (state.phase !== 'won') return state;
  return { ...state, phase: 'playing' };
}

/* ── Game Over Detection ────────────────────────────────────────── */

/**
 * Check if the board is completely stuck: no empty cells and no
 * adjacent equal tiles in any direction.
 */
export function isGameOver(board: Board): boolean {
  // Any empty cell means moves are possible.
  if (findEmptyCells(board).length > 0) return false;

  // Check for adjacent equal tiles horizontally and vertically.
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = board[r][c];
      if (!tile) return false; // shouldn't happen, but safe
      // Check right neighbor.
      if (c + 1 < GRID_SIZE) {
        const right = board[r][c + 1];
        if (right && right.value === tile.value) return false;
      }
      // Check bottom neighbor.
      if (r + 1 < GRID_SIZE) {
        const below = board[r + 1][c];
        if (below && below.value === tile.value) return false;
      }
    }
  }
  return true;
}

/**
 * Check if the board contains a tile >= WINNING_TILE.
 */
export function hasWon(board: Board): boolean {
  return getBestTile(board) >= WINNING_TILE;
}

/**
 * Check if any move is possible on the board (inverse of isGameOver).
 */
export function canMove(board: Board): boolean {
  return !isGameOver(board);
}

/* ── Coin Rewards ───────────────────────────────────────────────── */

/**
 * Calculate coin reward based on the highest tile reached.
 * Returns the reward for the highest threshold met.
 * @param bestTile  Highest tile value on the board.
 * @returns Number of coins (0 if below the lowest threshold).
 */
export function calculateCoinReward(bestTile: number): number {
  let reward = 0;
  for (const threshold of COIN_THRESHOLDS) {
    if (bestTile >= threshold) {
      reward = COIN_REWARDS[threshold];
    }
  }
  return reward;
}

/* ── Persistence ────────────────────────────────────────────────── */

/**
 * Load the high score from localStorage.
 * Returns null if no score is stored or the data is invalid.
 */
export function loadHighScore(storage?: Storage): HighScore | null {
  try {
    const s =
      storage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return null;
    const raw = s.getItem(MERGE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.score !== 'number' ||
      !Number.isFinite(parsed.score) ||
      parsed.score < 0 ||
      typeof parsed?.bestTile !== 'number' ||
      typeof parsed?.achievedAt !== 'string'
    ) {
      return null;
    }
    return {
      score: parsed.score,
      bestTile: parsed.bestTile,
      achievedAt: parsed.achievedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a result is a new high score.
 */
export function isNewHighScore(
  result: Pick<HighScore, 'score'>,
  existing: HighScore | null,
): boolean {
  if (!existing) return result.score > 0;
  return result.score > existing.score;
}

/**
 * Save a high score to localStorage if it beats the existing one.
 */
export function saveHighScore(
  result: HighScore,
  storage?: Storage,
): HighScore {
  const existing = loadHighScore(storage);
  if (!isNewHighScore(result, existing)) {
    return existing ?? result;
  }
  try {
    const s =
      storage ??
      (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (s) {
      s.setItem(MERGE_STORAGE_KEY, JSON.stringify(result));
    }
  } catch {
    // Ignore quota / privacy mode errors.
  }
  return result;
}

/* ── Share Text Generation ──────────────────────────────────────── */

/**
 * Generate shareable text for the game result.
 */
export function generateShareText(
  score: number,
  bestTile: number,
  won: boolean,
): string {
  const emoji = won ? '🏆' : '🎯';
  return `מיזוג מספרים ${emoji}\nניקוד: ${score} | אריח מקסימלי: ${bestTile}`;
}
