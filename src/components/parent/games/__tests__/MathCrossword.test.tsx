import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MathCrossword } from '../MathCrossword';
import { generateCrossword } from '../crosswordEngine';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => 'rtl', language: 'he' },
  }),
}));

describe('MathCrossword component', () => {
  it('renders 5x5 cells, check button, and keypad', () => {
    const onExit = vi.fn();
    render(<MathCrossword onExit={onExit} />);

    expect(screen.getByTestId('crossword-cell-0-0')).toBeInTheDocument();
    expect(screen.getByTestId('crossword-check')).toBeInTheDocument();
    expect(screen.getByTestId('crossword-clear')).toBeInTheDocument();
    expect(screen.getByTestId('crossword-mode-daily')).toBeInTheDocument();
    expect(screen.getByTestId('crossword-mode-free')).toBeInTheDocument();
    expect(screen.getByTestId('crossword-exit')).toBeInTheDocument();

    for (let d = 0; d <= 9; d++) {
      expect(screen.getByTestId(`crossword-digit-${d}`)).toBeInTheDocument();
    }
  });

  it('switches modes when mode buttons are clicked', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<MathCrossword onExit={onExit} />);

    const freeBtn = screen.getByTestId('crossword-mode-free');
    await user.click(freeBtn);
    expect(screen.getByTestId('crossword-new-free')).toBeInTheDocument();

    const dailyBtn = screen.getByTestId('crossword-mode-daily');
    await user.click(dailyBtn);
    expect(screen.getByTestId('crossword-cell-0-0')).toBeInTheDocument();
  });

  it('calls onExit when exit button is clicked', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<MathCrossword onExit={onExit} />);

    await user.click(screen.getByTestId('crossword-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('completes the puzzle via real engine solution and awards coins on win', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const onCoinsEarned = vi.fn();
    render(<MathCrossword onExit={onExit} onCoinsEarned={onCoinsEarned} />);

    const expectedPuzzle = generateCrossword('daily');
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = expectedPuzzle.grid[r][c];
        if (!cell.isGiven && cell.type !== 'empty') {
          await user.click(screen.getByTestId(`crossword-cell-${r}-${c}`));
          await user.click(screen.getByTestId(`crossword-digit-${cell.solution}`));
        }
      }
    }

    await user.click(screen.getByTestId('crossword-check'));

    expect(screen.getByTestId('crossword-solved')).toBeInTheDocument();
    expect(onCoinsEarned).toHaveBeenCalledTimes(1);
    expect(onCoinsEarned).toHaveBeenCalledWith(10);
  });
});
