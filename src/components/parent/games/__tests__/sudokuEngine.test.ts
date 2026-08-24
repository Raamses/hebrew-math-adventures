import { describe, expect, it } from 'vitest';

import {
  COIN_REWARDS,
  DIFFICULTY_REMOVALS,
  checkWin,
  colOf,
  createEmptyBoard,
  dateToSeed,
  findConflicts,
  findWrongCells,
  formatTime,
  freshStats,
  generatePuzzle,
  generateShareText,
  getPeers,
  isSolved,
  isValidPlacement,
  loadProgress,
  rowOf,
  boxOf,
  updateStats,
  validateCell,
  type Difficulty,
} from '../sudokuEngine';

/* ── Board helpers ──────────────────────────────────────────────── */

describe('sudokuEngine — board helpers', () => {
  it('createEmptyBoard returns 81 zeros', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(81);
    expect(board.every((v) => v === 0)).toBe(true);
  });

  it('rowOf, colOf, boxOf return correct indices', () => {
    expect(rowOf(0)).toBe(0);
    expect(colOf(0)).toBe(0);
    expect(boxOf(0)).toBe(0);
    expect(rowOf(80)).toBe(8);
    expect(colOf(80)).toBe(8);
    expect(boxOf(80)).toBe(8);
    expect(rowOf(40)).toBe(4);
    expect(colOf(40)).toBe(4);
    expect(boxOf(40)).toBe(4);
    // Cell (2,3) → index 21
    expect(rowOf(21)).toBe(2);
    expect(colOf(21)).toBe(3);
    expect(boxOf(21)).toBe(1);
  });

  it('getPeers returns 20 peers for any cell', () => {
    const peers = getPeers(40); // center cell
    expect(peers).toHaveLength(20);
    expect(peers).not.toContain(40);
    // Cell (0,0) should have 20 peers
    expect(getPeers(0)).toHaveLength(20);
  });

  it('isValidPlacement returns true for empty board', () => {
    const board = createEmptyBoard();
    expect(isValidPlacement(board, 0, 5)).toBe(true);
  });

  it('isValidPlacement returns false for conflicting row', () => {
    const board = createEmptyBoard();
    board[0] = 5; // Row 0, Col 0
    board[3] = 5; // Row 0, Col 3 — same row
    expect(isValidPlacement(board, 1, 5)).toBe(false); // Row 0, Col 1
  });

  it('isValidPlacement returns false for conflicting col', () => {
    const board = createEmptyBoard();
    board[0] = 5; // Row 0, Col 0
    board[9] = 5; // Row 1, Col 0 — same col
    expect(isValidPlacement(board, 18, 5)).toBe(false); // Row 2, Col 0
  });

  it('isValidPlacement returns false for conflicting box', () => {
    const board = createEmptyBoard();
    board[0] = 5; // Row 0, Col 0 → Box 0
    board[10] = 5; // Row 1, Col 1 → Box 0
    expect(isValidPlacement(board, 20, 5)).toBe(false); // Row 2, Col 2 → Box 0
  });
});

/* ── Puzzle generation ──────────────────────────────────────────── */

describe('sudokuEngine — generatePuzzle', () => {
  it('returns a valid puzzle with 81 cells', () => {
    const puzzle = generatePuzzle('easy', new Date('2026-08-20'));
    expect(puzzle.puzzle).toHaveLength(81);
    expect(puzzle.solution).toHaveLength(81);
    expect(puzzle.difficulty).toBe('easy');
  });

  it('is deterministic for same date + difficulty', () => {
    const date = new Date('2026-08-20');
    const p1 = generatePuzzle('medium', date);
    const p2 = generatePuzzle('medium', date);
    expect(p1.puzzle).toEqual(p2.puzzle);
    expect(p1.solution).toEqual(p2.solution);
  });

  it('produces different puzzles for different difficulties', () => {
    const date = new Date('2026-08-20');
    const easy = generatePuzzle('easy', date);
    const hard = generatePuzzle('hard', date);
    expect(easy.puzzle).not.toEqual(hard.puzzle);
  });

  it('produces different puzzles for different dates', () => {
    const p1 = generatePuzzle('easy', new Date('2026-08-20'));
    const p2 = generatePuzzle('easy', new Date('2026-08-21'));
    expect(p1.puzzle).not.toEqual(p2.puzzle);
  });

  it('puzzleNumber matches dateToSeed', () => {
    const date = new Date('2026-08-20');
    const puzzle = generatePuzzle('medium', date);
    expect(puzzle.puzzleNumber).toBe(dateToSeed(date));
  });

  it('solution is a valid solved board', () => {
    const puzzle = generatePuzzle('hard', new Date('2026-08-20'));
    expect(isSolved(puzzle.solution)).toBe(true);
  });

  it('easy puzzle has more clues than hard puzzle', () => {
    const date = new Date('2026-08-20');
    const easy = generatePuzzle('easy', date);
    const hard = generatePuzzle('hard', date);
    const easyClues = easy.puzzle.filter((v) => v !== 0).length;
    const hardClues = hard.puzzle.filter((v) => v !== 0).length;
    expect(easyClues).toBeGreaterThan(hardClues);
  });

  it('givenIndices matches non-zero puzzle cells', () => {
    const puzzle = generatePuzzle('medium', new Date('2026-08-20'));
    const nonZero = puzzle.puzzle.filter((v) => v !== 0).length;
    expect(puzzle.givenIndices.size).toBe(nonZero);
  });
});

/* ── Validation ─────────────────────────────────────────────────── */

describe('sudokuEngine — validation', () => {
  it('checkWin returns true for correct board', () => {
    const puzzle = generatePuzzle('easy', new Date('2026-08-20'));
    expect(checkWin(puzzle.solution, puzzle.solution)).toBe(true);
  });

  it('checkWin returns false for incorrect board', () => {
    const puzzle = generatePuzzle('easy', new Date('2026-08-20'));
    const wrong = [...puzzle.solution];
    wrong[0] = wrong[0] === 1 ? 2 : 1;
    expect(checkWin(wrong, puzzle.solution)).toBe(false);
  });

  it('validateCell returns correct for matching value', () => {
    const solution = createEmptyBoard();
    solution[0] = 5;
    expect(validateCell(5, 0, solution)).toBe('correct');
  });

  it('validateCell returns wrong for non-matching value', () => {
    const solution = createEmptyBoard();
    solution[0] = 5;
    expect(validateCell(3, 0, solution)).toBe('wrong');
  });

  it('validateCell returns empty for 0', () => {
    const solution = createEmptyBoard();
    expect(validateCell(0, 0, solution)).toBe('empty');
  });

  it('findWrongCells returns indices of wrong values', () => {
    const solution = createEmptyBoard();
    solution[0] = 5;
    solution[1] = 3;
    const board = [...solution];
    board[0] = 6; // wrong
    // board[1] = 3 is correct
    const wrong = findWrongCells(board, solution);
    expect(wrong).toContain(0);
    expect(wrong).not.toContain(1);
  });

  it('findConflicts detects row conflicts', () => {
    const board = createEmptyBoard();
    board[0] = 5;
    board[3] = 5; // same row
    const given = new Set<number>();
    const conflicts = findConflicts(board, given);
    expect(conflicts).toContain(0);
    expect(conflicts).toContain(3);
  });

  it('findConflicts ignores given cells', () => {
    const board = createEmptyBoard();
    board[0] = 5;
    board[3] = 5; // same row
    const given = new Set<number>([0, 3]);
    const conflicts = findConflicts(board, given);
    expect(conflicts).toHaveLength(0);
  });

  it('isSolved returns false for incomplete board', () => {
    expect(isSolved(createEmptyBoard())).toBe(false);
  });
});

/* ── Share text ─────────────────────────────────────────────────── */

describe('sudokuEngine — generateShareText', () => {
  it('includes puzzle number and difficulty emoji', () => {
    const text = generateShareText('easy', 42, 0, 120000, true);
    expect(text).toContain('#42');
    expect(text).toContain('🟢');
    expect(text).toContain('🏆');
  });

  it('includes time in MM:SS format', () => {
    const text = generateShareText('medium', 42, 2, 195000, true);
    expect(text).toContain('3:15');
  });

  it('includes mistake count', () => {
    const text = generateShareText('hard', 42, 5, 300000, true);
    expect(text).toContain('5');
  });

  it('uses 😢 for lost games', () => {
    const text = generateShareText('easy', 42, 3, 600000, false);
    expect(text).toContain('😢');
  });
});

/* ── Stats ──────────────────────────────────────────────────────── */

describe('sudokuEngine — stats', () => {
  it('freshStats returns all zeros', () => {
    const stats = freshStats();
    expect(stats.easy.played).toBe(0);
    expect(stats.medium.won).toBe(0);
    expect(stats.hard.bestTimeMs).toBe(0);
  });

  it('updateStats increments played and won', () => {
    const stats = freshStats();
    const newStats = updateStats(stats, 'easy', true, 120000);
    expect(newStats.easy.played).toBe(1);
    expect(newStats.easy.won).toBe(1);
    expect(newStats.easy.bestTimeMs).toBe(120000);
  });

  it('updateStats updates best time only on win', () => {
    let stats = freshStats();
    stats = updateStats(stats, 'medium', true, 300000);
    stats = updateStats(stats, 'medium', true, 200000);
    expect(stats.medium.bestTimeMs).toBe(200000);
    stats = updateStats(stats, 'medium', false, 100000);
    expect(stats.medium.bestTimeMs).toBe(200000); // no update on loss
  });

  it('updateStats increments played on loss', () => {
    const stats = freshStats();
    const newStats = updateStats(stats, 'hard', false, 600000);
    expect(newStats.hard.played).toBe(1);
    expect(newStats.hard.won).toBe(0);
  });
});

/* ── Format time ────────────────────────────────────────────────── */

describe('sudokuEngine — formatTime', () => {
  it('formats 0 ms as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 65 seconds as 1:05', () => {
    expect(formatTime(65000)).toBe('1:05');
  });

  it('formats 10 minutes as 10:00', () => {
    expect(formatTime(600000)).toBe('10:00');
  });
});

/* ── Coin rewards ───────────────────────────────────────────────── */

describe('sudokuEngine — COIN_REWARDS', () => {
  it('easy gives 5 coins', () => {
    expect(COIN_REWARDS.easy).toBe(5);
  });

  it('medium gives 10 coins', () => {
    expect(COIN_REWARDS.medium).toBe(10);
  });

  it('hard gives 20 coins', () => {
    expect(COIN_REWARDS.hard).toBe(20);
  });
});

/* ── Difficulty removals ────────────────────────────────────────── */

describe('sudokuEngine — DIFFICULTY_REMOVALS', () => {
  it('easy removes fewer than medium', () => {
    expect(DIFFICULTY_REMOVALS.easy).toBeLessThan(DIFFICULTY_REMOVALS.medium);
  });

  it('medium removes fewer than hard', () => {
    expect(DIFFICULTY_REMOVALS.medium).toBeLessThan(DIFFICULTY_REMOVALS.hard);
  });
});

/* ── LocalStorage ───────────────────────────────────────────────── */

describe('sudokuEngine — localStorage', () => {
  it('loadProgress returns null when nothing stored', () => {
    // Note: tests that use localStorage should mock it, but this tests the null path.
    // In the test environment, localStorage may or may not have data from prior tests.
    // We just verify it doesn't throw.
    const result = loadProgress(new Date('1999-01-01'));
    // Should be null for a date that definitely has no stored progress.
    expect(result).toBeNull();
  });
});
