import { describe, expect, it, beforeEach } from 'vitest';
import {
  addRandomTile,
  applyMove,
  calculateCoinReward,
  canMove,
  COIN_REWARDS,
  continueAfterWin,
  createEmptyBoard,
  createInitialState,
  findEmptyCells,
  generateShareText,
  getBestTile,
  GRID_SIZE,
  hasWon,
  isGameOver,
  isNewHighScore,
  loadHighScore,
  MERGE_STORAGE_KEY,
  mulberry32,
  performMove,
  saveHighScore,
  startGame,
  WINNING_TILE,
  type Board,
  type Direction,
  type GameState,
  type Tile,
} from '../mergeEngine';

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Create a tile with the given value at the given position. */
function tile(value: number, row: number, col: number, id: number): Tile {
  return { value, row, col, id };
}

/** Create a board from a 4x4 array of (value | null), assigning sequential ids. */
function boardFromValues(values: (number | null)[][]): Board {
  let id = 0;
  return values.map((row, r) =>
    row.map((v, c) => (v === null ? null : tile(v, r, c, id++)),
    ),
  );
}

/** Deterministic RNG that always returns 0 (picks first empty cell, value=2). */
const rngZero = () => 0;

/** Deterministic RNG that always returns 0.99 (picks last empty cell, value=4). */
const rngOne = () => 0.99;

/* ── Board Helpers ───────────────────────────────────────────────── */

describe('mergeEngine — createEmptyBoard', () => {
  it('creates a 4x4 board of nulls', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(GRID_SIZE);
    for (const row of board) {
      expect(row).toHaveLength(GRID_SIZE);
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });
});

describe('mergeEngine — findEmptyCells', () => {
  it('finds all empty cells on an empty board', () => {
    const board = createEmptyBoard();
    expect(findEmptyCells(board)).toHaveLength(16);
  });

  it('finds no empty cells on a full board', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [2, 4, 8, 16],
      [32, 64, 128, 256],
    ];
    expect(findEmptyCells(boardFromValues(values))).toHaveLength(0);
  });

  it('finds the correct empty cells', () => {
    const values = [
      [2, null, 4, null],
      [8, 16, null, 32],
      [null, 2, 4, 8],
      [16, 32, 64, null],
    ];
    const empties = findEmptyCells(boardFromValues(values));
    expect(empties).toHaveLength(5);
    expect(empties).toContainEqual({ row: 0, col: 1 });
    expect(empties).toContainEqual({ row: 0, col: 3 });
    expect(empties).toContainEqual({ row: 1, col: 2 });
    expect(empties).toContainEqual({ row: 2, col: 0 });
    expect(empties).toContainEqual({ row: 3, col: 3 });
  });
});

describe('mergeEngine — getBestTile', () => {
  it('returns 0 for an empty board', () => {
    expect(getBestTile(createEmptyBoard())).toBe(0);
  });

  it('returns the highest tile value', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 4],
      [8, 16, 32, 512],
    ];
    expect(getBestTile(boardFromValues(values))).toBe(512);
  });
});

/* ── Random Tile Placement ───────────────────────────────────────── */

describe('mergeEngine — addRandomTile', () => {
  it('adds a tile to an empty board', () => {
    const board = createEmptyBoard();
    const { board: newBoard, nextTileId } = addRandomTile(board, rngZero, 0);
    const empties = findEmptyCells(newBoard);
    expect(empties).toHaveLength(15);
    expect(nextTileId).toBe(1);
  });

  it('places a tile with value 4 when rng < 0.1 (10% chance)', () => {
    const board = createEmptyBoard();
    const { board: newBoard } = addRandomTile(board, rngZero, 0);
    // rng()=0 → 0 < 0.1 → true → value=4
    const tiles = newBoard.flat().filter((t) => t !== null);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.value).toBe(4);
    expect(tiles[0]!.isNew).toBe(true);
  });

  it('places a tile with value 2 when rng >= 0.1 (90% chance)', () => {
    const board = createEmptyBoard();
    const { board: newBoard } = addRandomTile(board, rngOne, 0);
    // rng()=0.99 → 0.99 < 0.1 → false → value=2
    const tiles = newBoard.flat().filter((t) => t !== null);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.value).toBe(2);
  });

  it('does not modify the input board', () => {
    const board = createEmptyBoard();
    addRandomTile(board, rngZero, 0);
    expect(findEmptyCells(board)).toHaveLength(16);
  });

  it('returns unchanged board when full', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [2, 4, 8, 16],
      [32, 64, 128, 256],
    ];
    const board = boardFromValues(values);
    const result = addRandomTile(board, rngZero, 100);
    expect(result.board).toBe(board);
    expect(result.nextTileId).toBe(100);
  });
});

/* ── Move / Slide / Merge Logic ──────────────────────────────────── */

describe('mergeEngine — performMove (left)', () => {
  it('slides tiles to the left', () => {
    const values = [
      [null, null, null, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, moved, scoreGained } = performMove(
      board,
      'left',
      rngZero,
      100,
    );
    expect(moved).toBe(true);
    expect(scoreGained).toBe(0);
    expect(newBoard[0][0]).not.toBeNull();
    expect(newBoard[0][0]!.value).toBe(2);
  });

  it('merges two equal tiles', () => {
    const values = [
      [2, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, scoreGained, moved } = performMove(
      board,
      'left',
      rngZero,
      100,
    );
    expect(moved).toBe(true);
    expect(scoreGained).toBe(4);
    expect(newBoard[0][0]).not.toBeNull();
    expect(newBoard[0][0]!.value).toBe(4);
    // Merged tile has mergedFrom set
    expect(newBoard[0][0]!.mergedFrom).toBeDefined();
    expect(newBoard[0][0]!.mergedFrom!.length).toBe(2);
  });

  it('does not double-merge: [2, 2, 2, 2] → [4, 4, null, null]', () => {
    const values = [
      [2, 2, 2, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, scoreGained } = performMove(
      board,
      'left',
      rngZero,
      100,
    );
    expect(scoreGained).toBe(8); // 4 + 4
    expect(newBoard[0][0]!.value).toBe(4);
    expect(newBoard[0][1]!.value).toBe(4);
    // After the move, a random tile is added in one of the empty positions.
    // Positions [0][2] and [0][3] are empty before random tile, one gets filled.
    const emptyCount = [2, 3].filter(c => newBoard[0][c] === null).length;
    expect(emptyCount).toBe(1); // One stays empty, one gets a new tile.
  });

  it('merges [2, 2, 4, null] → [4, 4, null, null]', () => {
    const values = [
      [2, 2, 4, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, scoreGained } = performMove(
      board,
      'left',
      rngZero,
      100,
    );
    expect(scoreGained).toBe(4);
    expect(newBoard[0][0]!.value).toBe(4);
    expect(newBoard[0][1]!.value).toBe(4);
    // A random tile is also added after the move.
  });
});

describe('mergeEngine — performMove (right)', () => {
  it('slides tiles to the right', () => {
    const values = [
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, moved } = performMove(
      board,
      'right',
      rngZero,
      100,
    );
    expect(moved).toBe(true);
    expect(newBoard[0][3]).not.toBeNull();
    expect(newBoard[0][3]!.value).toBe(2);
  });

  it('merges [null, 2, 2, null] → [null, null, null, 4]', () => {
    const values = [
      [null, 2, 2, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, scoreGained } = performMove(
      board,
      'right',
      rngZero,
      100,
    );
    expect(scoreGained).toBe(4);
    expect(newBoard[0][3]!.value).toBe(4);
    // A random tile is also added after the move.
  });
});

describe('mergeEngine — performMove (up)', () => {
  it('slides tiles up', () => {
    const values = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [2, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, moved } = performMove(
      board,
      'up',
      rngZero,
      100,
    );
    expect(moved).toBe(true);
    expect(newBoard[0][0]).not.toBeNull();
    expect(newBoard[0][0]!.value).toBe(2);
  });

  it('merges vertically', () => {
    const values = [
      [2, null, null, null],
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, scoreGained } = performMove(
      board,
      'up',
      rngZero,
      100,
    );
    expect(scoreGained).toBe(4);
    expect(newBoard[0][0]!.value).toBe(4);
  });
});

describe('mergeEngine — performMove (down)', () => {
  it('slides tiles down', () => {
    const values = [
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, moved } = performMove(
      board,
      'down',
      rngZero,
      100,
    );
    expect(moved).toBe(true);
    expect(newBoard[3][0]).not.toBeNull();
    expect(newBoard[3][0]!.value).toBe(2);
  });

  it('merges down', () => {
    const values = [
      [2, null, null, null],
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const { board: newBoard, scoreGained } = performMove(
      board,
      'down',
      rngZero,
      100,
    );
    expect(scoreGained).toBe(4);
    expect(newBoard[3][0]!.value).toBe(4);
  });
});

describe('mergeEngine — performMove (no movement)', () => {
  it('returns moved=false when nothing can move', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, 4],
    ];
    const board = boardFromValues(values);
    const { moved, scoreGained } = performMove(
      board,
      'left',
      rngZero,
      100,
    );
    expect(moved).toBe(false);
    expect(scoreGained).toBe(0);
  });
});

/* ── Game State ──────────────────────────────────────────────────── */

describe('mergeEngine — createInitialState', () => {
  it('creates an idle state with empty board', () => {
    const state = createInitialState();
    expect(state.phase).toBe('idle');
    expect(state.score).toBe(0);
    expect(state.won).toBe(false);
    expect(state.bestTile).toBe(0);
    expect(findEmptyCells(state.board)).toHaveLength(16);
  });
});

describe('mergeEngine — startGame', () => {
  it('places two tiles on the board', () => {
    const rng = mulberry32(42);
    const state = startGame(rng);
    expect(state.phase).toBe('playing');
    expect(state.score).toBe(0);
    const tiles = state.board.flat().filter((t) => t !== null);
    expect(tiles).toHaveLength(2);
  });

  it('uses the rng for deterministic tile placement', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const state1 = startGame(rng1);
    const state2 = startGame(rng2);
    expect(state1.board).toEqual(state2.board);
  });
});

describe('mergeEngine — applyMove', () => {
  it('applies a move and updates score', () => {
    const rng = mulberry32(42);
    const state = startGame(rng);
    const newState = applyMove(state, 'left', rng);
    expect(newState).not.toBe(state);
    expect(newState.phase).toBe('playing');
  });

  it('does not change state on invalid move', () => {
    const rng = mulberry32(42);
    // Full board with no merges — construct manually
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, 4],
    ];
    const board = boardFromValues(values);
    const state: GameState = {
      phase: 'playing',
      board,
      score: 100,
      bestScore: 200,
      won: false,
      bestTile: 256,
      nextTileId: 100,
    };
    const newState = applyMove(state, 'left', rng);
    expect(newState).toBe(state);
  });

  it('detects win when 2048 is reached', () => {
    const values = [
      [1024, 1024, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const board = boardFromValues(values);
    const state: GameState = {
      phase: 'playing',
      board,
      score: 0,
      bestScore: 0,
      won: false,
      bestTile: 1024,
      nextTileId: 100,
    };
    const rng = mulberry32(42);
    const newState = applyMove(state, 'left', rng);
    expect(newState.phase).toBe('won');
    expect(newState.won).toBe(true);
    expect(newState.bestTile).toBe(2048);
  });
});

describe('mergeEngine — continueAfterWin', () => {
  it('returns to playing phase', () => {
    const state: GameState = {
      phase: 'won',
      board: createEmptyBoard(),
      score: 100,
      bestScore: 100,
      won: true,
      bestTile: 2048,
      nextTileId: 100,
    };
    const newState = continueAfterWin(state);
    expect(newState.phase).toBe('playing');
    expect(newState.won).toBe(true);
  });

  it('does nothing if not in won phase', () => {
    const state: GameState = {
      phase: 'playing',
      board: createEmptyBoard(),
      score: 100,
      bestScore: 100,
      won: false,
      bestTile: 0,
      nextTileId: 100,
    };
    expect(continueAfterWin(state)).toBe(state);
  });
});

/* ── Game Over Detection ────────────────────────────────────────── */

describe('mergeEngine — isGameOver', () => {
  it('returns false when empty cells exist', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, null],
    ];
    expect(isGameOver(boardFromValues(values))).toBe(false);
  });

  it('returns false when adjacent tiles can merge', () => {
    const values = [
      [2, 2, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, 4],
    ];
    expect(isGameOver(boardFromValues(values))).toBe(false);
  });

  it('returns true when board is full with no merges', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, 4],
    ];
    expect(isGameOver(boardFromValues(values))).toBe(true);
  });

  it('detects vertical merges', () => {
    const values = [
      [2, 4, 8, 16],
      [2, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, 4],
    ];
    expect(isGameOver(boardFromValues(values))).toBe(false);
  });
});

describe('mergeEngine — hasWon', () => {
  it('returns true when 2048 is on the board', () => {
    const values = [
      [2048, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    expect(hasWon(boardFromValues(values))).toBe(true);
  });

  it('returns false when 2048 is not on the board', () => {
    const values = [
      [1024, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    expect(hasWon(boardFromValues(values))).toBe(false);
  });
});

describe('mergeEngine — canMove', () => {
  it('returns true when empty cells exist', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, null],
    ];
    expect(canMove(boardFromValues(values))).toBe(true);
  });

  it('returns false when game is over', () => {
    const values = [
      [2, 4, 8, 16],
      [32, 64, 128, 2],
      [4, 8, 16, 32],
      [64, 128, 256, 4],
    ];
    expect(canMove(boardFromValues(values))).toBe(false);
  });
});

/* ── Coin Rewards ───────────────────────────────────────────────── */

describe('mergeEngine — calculateCoinReward', () => {
  it('returns 0 for tiles below 128', () => {
    expect(calculateCoinReward(2)).toBe(0);
    expect(calculateCoinReward(64)).toBe(0);
    expect(calculateCoinReward(127)).toBe(0);
  });

  it('returns 2 for tile 128', () => {
    expect(calculateCoinReward(128)).toBe(2);
  });

  it('returns 5 for tile 256', () => {
    expect(calculateCoinReward(256)).toBe(5);
  });

  it('returns 10 for tile 512', () => {
    expect(calculateCoinReward(512)).toBe(10);
  });

  it('returns 20 for tile 1024', () => {
    expect(calculateCoinReward(1024)).toBe(20);
  });

  it('returns 50 for tile 2048', () => {
    expect(calculateCoinReward(2048)).toBe(50);
  });

  it('returns highest threshold reward for tiles between thresholds', () => {
    expect(calculateCoinReward(200)).toBe(2); // above 128, below 256
    expect(calculateCoinReward(500)).toBe(5); // above 256, below 512
  });
});

/* ── Persistence ────────────────────────────────────────────────── */

describe('mergeEngine — high score persistence', () => {
  const store: Record<string, string> = {};
  const mockStorage: Storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: () => null,
    length: 0,
  };

  beforeEach(() => {
    mockStorage.clear();
  });

  it('returns null when no high score is stored', () => {
    expect(loadHighScore(mockStorage)).toBeNull();
  });

  it('saves and loads a high score', () => {
    const result = {
      score: 500,
      bestTile: 256,
      achievedAt: '2026-01-01T00:00:00.000Z',
    };
    saveHighScore(result, mockStorage);
    const loaded = loadHighScore(mockStorage);
    expect(loaded).not.toBeNull();
    expect(loaded!.score).toBe(500);
    expect(loaded!.bestTile).toBe(256);
  });

  it('does not overwrite a higher score with a lower one', () => {
    saveHighScore(
      { score: 1000, bestTile: 512, achievedAt: '2026-01-01T00:00:00.000Z' },
      mockStorage,
    );
    saveHighScore(
      { score: 500, bestTile: 256, achievedAt: '2026-01-02T00:00:00.000Z' },
      mockStorage,
    );
    const loaded = loadHighScore(mockStorage);
    expect(loaded!.score).toBe(1000);
  });

  it('overwrites a lower score with a higher one', () => {
    saveHighScore(
      { score: 500, bestTile: 256, achievedAt: '2026-01-01T00:00:00.000Z' },
      mockStorage,
    );
    saveHighScore(
      { score: 1000, bestTile: 512, achievedAt: '2026-01-02T00:00:00.000Z' },
      mockStorage,
    );
    const loaded = loadHighScore(mockStorage);
    expect(loaded!.score).toBe(1000);
  });

  it('isNewHighScore returns true for first score', () => {
    expect(isNewHighScore({ score: 100 }, null)).toBe(true);
  });

  it('isNewHighScore returns false for zero score', () => {
    expect(isNewHighScore({ score: 0 }, null)).toBe(false);
  });

  it('isNewHighScore returns true when beating existing', () => {
    const existing = { score: 100, bestTile: 128, achievedAt: '2026-01-01T00:00:00.000Z' };
    expect(isNewHighScore({ score: 200 }, existing)).toBe(true);
    expect(isNewHighScore({ score: 50 }, existing)).toBe(false);
  });
});

/* ── Share Text ─────────────────────────────────────────────────── */

describe('mergeEngine — generateShareText', () => {
  it('generates share text with score and best tile', () => {
    const text = generateShareText(500, 256, false);
    expect(text).toContain('500');
    expect(text).toContain('256');
  });

  it('uses trophy emoji for win', () => {
    const text = generateShareText(1000, 2048, true);
    expect(text).toContain('🏆');
  });

  it('uses target emoji for no win', () => {
    const text = generateShareText(100, 64, false);
    expect(text).toContain('🎯');
  });
});
