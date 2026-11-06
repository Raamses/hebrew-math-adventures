import { describe, expect, it } from 'vitest';
import { generateCrossword, checkCrossword } from '../crosswordEngine';

describe('crosswordEngine', () => {
  it('generates a 5x5 grid with horizontal and vertical equations', () => {
    const puzzle = generateCrossword('daily', { date: '2026-11-03' });
    expect(puzzle.grid.length).toBe(5);
    for (const row of puzzle.grid) {
      expect(row.length).toBe(5);
    }
    expect(puzzle.equations.horizontal).toBeDefined();
    expect(puzzle.equations.vertical).toBeDefined();
    expect(puzzle.mode).toBe('daily');
    expect(puzzle.date).toBe('2026-11-03');
  });

  it('is deterministic: same mode and date produce identical puzzles', () => {
    const p1 = generateCrossword('daily', { date: '2026-11-03' });
    const p2 = generateCrossword('daily', { date: '2026-11-03' });
    expect(p1.seed).toBe(p2.seed);
    expect(p1.grid).toEqual(p2.grid);
    expect(p1.equations).toEqual(p2.equations);
  });

  it('daily puzzles change across different dates', () => {
    const p1 = generateCrossword('daily', { date: '2026-11-03' });
    const p2 = generateCrossword('daily', { date: '2026-11-04' });
    expect(p1.seed).not.toBe(p2.seed);
  });

  it('free-play with explicit seed is reproducible', () => {
    const p1 = generateCrossword('free', { seed: 'custom-crossword-seed-42' });
    const p2 = generateCrossword('free', { seed: 'custom-crossword-seed-42' });
    expect(p1.seed).toBe(p2.seed);
    expect(p1.grid).toEqual(p2.grid);
  });

  it('round-trip: joined equation cell chars reproduce the equation strings', () => {
    const puzzle = generateCrossword('daily', { date: '2026-11-03' });
    const horizontalJoined = puzzle.grid[0].map((c) => c.char).join('');
    expect(horizontalJoined).toBe(puzzle.equations.horizontal.text);

    const verticalJoined = [0, 1, 2, 3, 4].map((r) => puzzle.grid[r][0].char).join('');
    expect(verticalJoined).toBe(puzzle.equations.vertical.text);
  });

  it('checkCrossword returns solved true when all answers match solution', () => {
    const puzzle = generateCrossword('daily', { date: '2026-11-03' });
    const correctAnswers = puzzle.grid.map((row) => row.map((c) => c.solution));
    const result = checkCrossword(puzzle, correctAnswers);
    expect(result.solved).toBe(true);
    expect(result.results.every((r) => r.correct)).toBe(true);
  });

  it('checkCrossword flags wrong cells correctly and returns solved false', () => {
    const puzzle = generateCrossword('daily', { date: '2026-11-03' });
    const answers = puzzle.grid.map((row) => row.map((c) => c.solution));
    const expected = puzzle.grid[0][0].solution;
    answers[0][0] = expected === '9' ? '8' : '9';
    const result = checkCrossword(puzzle, answers);
    expect(result.solved).toBe(false);
    const cellResult = result.results.find((r) => r.row === 0 && r.col === 0);
    expect(cellResult?.correct).toBe(false);
  });
});
