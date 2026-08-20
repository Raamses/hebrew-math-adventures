import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-i18next before importing the component.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        let result = key;
        for (const [k, v] of Object.entries(opts)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return key;
    },
    i18n: { dir: () => 'rtl', language: 'he' },
  }),
}));

// Mock framer-motion as passthrough.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons as simple spans.
vi.mock('lucide-react', () => {
  const icons = ['CalendarDays', 'Check', 'Copy', 'Eraser', 'Flame', 'Share2', 'Trophy', 'Zap', 'Layers', 'Puzzle', 'Grid3x3'];
  const mock: Record<string, () => any> = {};
  for (const name of icons) {
    mock[name] = () => <span data-testid={`icon-${name}`} />;
  }
  return mock;
});

// Mock localStorage.
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.open for WhatsApp share.
let openedUrl: string | null = null;
window.open = (url: string) => { openedUrl = url; return null; };

// Import after mocks are set up.
import { Sudoku } from '../Sudoku';
import { generatePuzzle, COIN_REWARDS, checkWin } from '../sudokuEngine';

/* ── Component tests ─────────────────────────────────────────────── */

describe('Sudoku component', () => {
  const onExit = vi.fn();

  beforeEach(() => {
    localStorageMock.clear();
    onExit.mockClear();
    openedUrl = null;
  });

  it('renders the difficulty selector initially', () => {
    render(<Sudoku onExit={onExit} />);
    expect(screen.getByTestId('sudoku-root')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-difficulty-selector')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-difficulty-easy')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-difficulty-medium')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-difficulty-hard')).toBeInTheDocument();
  });

  it('shows coin rewards per difficulty', () => {
    render(<Sudoku onExit={onExit} />);
    expect(screen.getByTestId('sudoku-difficulty-easy')).toHaveTextContent(`🪙 ${COIN_REWARDS.easy}`);
    expect(screen.getByTestId('sudoku-difficulty-medium')).toHaveTextContent(`🪙 ${COIN_REWARDS.medium}`);
    expect(screen.getByTestId('sudoku-difficulty-hard')).toHaveTextContent(`🪙 ${COIN_REWARDS.hard}`);
  });

  it('starts a game when difficulty is selected', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    expect(screen.getByTestId('sudoku-grid')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-keypad')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-timer')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-mistakes')).toBeInTheDocument();
  });

  it('renders an 9x9 grid (81 cells)', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-medium'));

    for (let i = 0; i < 81; i++) {
      expect(screen.getByTestId(`sudoku-cell-${i}`)).toBeInTheDocument();
    }
  });

  it('disables given cells', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    // Find at least one given cell (should be disabled).
    const givenCells = screen.getAllByTestId(/sudoku-cell-\d+/).filter(
      (el) => el.getAttribute('data-state') === 'given',
    );
    expect(givenCells.length).toBeGreaterThan(0);
    expect((givenCells[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('selects an empty cell and inputs a number', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    // Find an empty cell.
    const emptyCells = screen.getAllByTestId(/sudoku-cell-\d+/).filter(
      (el) => el.getAttribute('data-state') === 'empty',
    );
    expect(emptyCells.length).toBeGreaterThan(0);

    await user.click(emptyCells[0]);
    expect(emptyCells[0]).toHaveAttribute('data-state', 'selected');

    await user.click(screen.getByTestId('sudoku-key-5'));
    expect(emptyCells[0]).toHaveTextContent('5');
  });

  it('erase clears a filled cell', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    const emptyCells = screen.getAllByTestId(/sudoku-cell-\d+/).filter(
      (el) => el.getAttribute('data-state') === 'empty',
    );

    await user.click(emptyCells[0]);
    await user.click(screen.getByTestId('sudoku-key-3'));
    expect(emptyCells[0]).toHaveTextContent('3');

    await user.click(emptyCells[0]);
    await user.click(screen.getByTestId('sudoku-erase'));
    expect(emptyCells[0]).toHaveTextContent('');
  });

  it('shows wrong state for incorrect value', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    // Generate puzzle to know the solution.
    const puzzle = generatePuzzle('easy', new Date());

    // Find an empty cell and its correct value.
    let emptyIdx = -1;
    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        emptyIdx = i;
        break;
      }
    }
    expect(emptyIdx).toBeGreaterThanOrEqual(0);

    const correctValue = puzzle.solution[emptyIdx];
    const wrongValue = correctValue === 1 ? 2 : 1;

    const cell = screen.getByTestId(`sudoku-cell-${emptyIdx}`);
    await user.click(cell);
    await user.click(screen.getByTestId(`sudoku-key-${wrongValue}`));

    expect(cell).toHaveAttribute('data-state', 'wrong');
  });

  it('shows mistakes counter incrementing', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    const mistakesEl = screen.getByTestId('sudoku-mistakes');
    expect(mistakesEl).toHaveAttribute('data-mistakes', '0');

    // Make a wrong move.
    const puzzle = generatePuzzle('easy', new Date());
    let emptyIdx = -1;
    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        emptyIdx = i;
        break;
      }
    }

    const correctValue = puzzle.solution[emptyIdx];
    const wrongValue = correctValue === 1 ? 2 : 1;

    await user.click(screen.getByTestId(`sudoku-cell-${emptyIdx}`));
    await user.click(screen.getByTestId(`sudoku-key-${wrongValue}`));

    expect(screen.getByTestId('sudoku-mistakes')).toHaveAttribute('data-mistakes', '1');
  });

  it('exits when exit button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows puzzle number after starting', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-medium'));
    expect(screen.getByTestId('sudoku-puzzle-number')).toBeInTheDocument();
  });

  it('shows keypad with 9 number buttons', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-hard'));

    for (let i = 1; i <= 9; i++) {
      expect(screen.getByTestId(`sudoku-key-${i}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('sudoku-erase')).toBeInTheDocument();
  });

  it('supports physical keyboard input', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    // Find an empty cell.
    const emptyCells = screen.getAllByTestId(/sudoku-cell-\d+/).filter(
      (el) => el.getAttribute('data-state') === 'empty',
    );

    await user.click(emptyCells[0]);

    // Type a number via keyboard.
    await user.keyboard('7');
    expect(emptyCells[0]).toHaveTextContent('7');
  });

  it('shows result panel after winning', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    // Get the puzzle and solve it by filling all empty cells correctly.
    const puzzle = generatePuzzle('easy', new Date());

    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        const cell = screen.getByTestId(`sudoku-cell-${i}`);
        await user.click(cell);
        await user.click(screen.getByTestId(`sudoku-key-${puzzle.solution[i]}`));
      }
    }

    // Should show the result panel.
    expect(screen.getByTestId('sudoku-result')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-result')).toHaveAttribute('data-status', 'won');
  });

  it('shows coin reward after winning', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    const puzzle = generatePuzzle('easy', new Date());

    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        const cell = screen.getByTestId(`sudoku-cell-${i}`);
        await user.click(cell);
        await user.click(screen.getByTestId(`sudoku-key-${puzzle.solution[i]}`));
      }
    }

    expect(screen.getByTestId('sudoku-coin-reward')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-stat-coins')).toHaveTextContent(`+${COIN_REWARDS.easy} 🪙`);
  });

  it('shows share buttons after winning', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-medium'));

    const puzzle = generatePuzzle('medium', new Date());

    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        const cell = screen.getByTestId(`sudoku-cell-${i}`);
        await user.click(cell);
        await user.click(screen.getByTestId(`sudoku-key-${puzzle.solution[i]}`));
      }
    }

    expect(screen.getByTestId('sudoku-share-whatsapp')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-share-copy')).toBeInTheDocument();
    expect(screen.getByTestId('sudoku-share-text')).toBeInTheDocument();
  });

  it('opens WhatsApp share link', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    const puzzle = generatePuzzle('easy', new Date());

    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        const cell = screen.getByTestId(`sudoku-cell-${i}`);
        await user.click(cell);
        await user.click(screen.getByTestId(`sudoku-key-${puzzle.solution[i]}`));
      }
    }

    await user.click(screen.getByTestId('sudoku-share-whatsapp'));
    expect(openedUrl).toContain('wa.me');
    expect(openedUrl).toContain('text=');
  });

  it('new game button returns to difficulty selector', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    const puzzle = generatePuzzle('easy', new Date());

    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        const cell = screen.getByTestId(`sudoku-cell-${i}`);
        await user.click(cell);
        await user.click(screen.getByTestId(`sudoku-key-${puzzle.solution[i]}`));
      }
    }

    await user.click(screen.getByTestId('sudoku-new-difficulty'));
    expect(screen.getByTestId('sudoku-difficulty-selector')).toBeInTheDocument();
  });

  it('calls onExit from result panel', async () => {
    const user = userEvent.setup();
    render(<Sudoku onExit={onExit} />);

    await user.click(screen.getByTestId('sudoku-difficulty-easy'));

    const puzzle = generatePuzzle('easy', new Date());

    for (let i = 0; i < 81; i++) {
      if (puzzle.puzzle[i] === 0) {
        const cell = screen.getByTestId(`sudoku-cell-${i}`);
        await user.click(cell);
        await user.click(screen.getByTestId(`sudoku-key-${puzzle.solution[i]}`));
      }
    }

    // Click exit from the result panel (there are two exit buttons, the one in the result section).
    const exitButtons = screen.getAllByTestId('sudoku-exit');
    const resultExit = exitButtons[exitButtons.length - 1];
    await user.click(resultExit);
    expect(onExit).toHaveBeenCalled();
  });
});
