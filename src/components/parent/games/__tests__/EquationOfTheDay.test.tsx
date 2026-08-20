import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-i18next before importing the component.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        // Return key with interpolated values for testing.
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
  const icons = ['CalendarDays', 'Check', 'Copy', 'Delete', 'Flame', 'Share2'];
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

// Note: navigator.clipboard is handled by userEvent.setup() internally.

// Import after mocks are set up.
import { EquationOfTheDay } from '../EquationOfTheDay';
import {
  generatePuzzle,
  scoreGuess,
  validateGuess,
  dateToSeed,
  generateShareText,
  computeStreak,
  MAX_GUESSES,
} from '../equationEngine';

/* ── Engine unit tests ───────────────────────────────────────────── */

describe('equationEngine', () => {
  describe('generatePuzzle', () => {
    it('returns a valid equation with = sign', () => {
      const puzzle = generatePuzzle(new Date('2026-08-20'));
      expect(puzzle.solution).toContain('=');
      expect(puzzle.length).toBe(puzzle.solution.length);
      expect(puzzle.length).toBeGreaterThanOrEqual(6);
      expect(puzzle.length).toBeLessThanOrEqual(9);
    });

    it('is deterministic for the same date', () => {
      const date = new Date('2026-08-20');
      const p1 = generatePuzzle(date);
      const p2 = generatePuzzle(date);
      expect(p1.solution).toBe(p2.solution);
    });

    it('produces different puzzles for different dates', () => {
      const p1 = generatePuzzle(new Date('2026-08-20'));
      const p2 = generatePuzzle(new Date('2026-08-21'));
      // Very unlikely to be the same.
      expect(p1.solution).not.toBe(p2.solution);
    });

    it('puzzleNumber matches dateToSeed', () => {
      const date = new Date('2026-08-20');
      const puzzle = generatePuzzle(date);
      expect(puzzle.puzzleNumber).toBe(dateToSeed(date));
    });

    it('the equation is mathematically valid', () => {
      const puzzle = generatePuzzle(new Date('2026-08-20'));
      const [left, right] = puzzle.solution.split('=');
      // eslint-disable-next-line no-eval
      const result = eval(left);
      expect(result).toBe(parseInt(right, 10));
    });
  });

  describe('validateGuess', () => {
    it('returns null for a correct guess', () => {
      const solution = '6+7=13';
      expect(validateGuess('6+7=13', solution)).toBeNull();
    });

    it('returns null for a valid but wrong guess', () => {
      const solution = '6+7=13';
      expect(validateGuess('8+5=13', solution)).toBeNull();
    });

    it('returns wrongLength for mismatched length', () => {
      const solution = '6+7=13';
      expect(validateGuess('6+7=1', solution)).toBe('wrongLength');
      expect(validateGuess('6+7=133', solution)).toBe('wrongLength');
    });

    it('returns noEquals when = is missing', () => {
      const solution = '6+7=13';
      expect(validateGuess('6+714', solution)).toBe('noEquals');
    });

    it('returns wrongResult when equation is mathematically wrong', () => {
      const solution = '6+7=13';
      expect(validateGuess('6+7=12', solution)).toBe('wrongResult');
    });

    it('returns invalidRight when right side is not a number', () => {
      const solution = '6+7=13';
      expect(validateGuess('6+7=1+', solution)).toBe('invalidRight');
    });

    it('returns invalidLeft for invalid left side', () => {
      const solution = '6+7=13';
      expect(validateGuess('++6=16', solution)).toBe('invalidLeft');
    });
  });

  describe('scoreGuess', () => {
    it('marks all correct when guess equals solution', () => {
      const states = scoreGuess('6+7=13', '6+7=13');
      expect(states).toEqual(['correct', 'correct', 'correct', 'correct', 'correct', 'correct']);
    });

    it('marks absent when character not in solution', () => {
      const states = scoreGuess('9*9=99', '6+7=13');
      // 9 and * are not in solution; = is in solution at position 3
      // So positions 0,1,2,4,5 should be absent, position 3 should be correct
      expect(states[0]).toBe('absent'); // 9
      expect(states[1]).toBe('absent'); // *
      expect(states[2]).toBe('absent'); // 9
      expect(states[3]).toBe('correct'); // = matches
      expect(states[4]).toBe('absent'); // 9
      expect(states[5]).toBe('absent'); // 9
    });

    it('marks present for right character wrong position', () => {
      const states = scoreGuess('7+6=13', '6+7=13');
      // Position 0: 7 vs 6 → 7 is present (exists at position 2)
      // Position 2: 6 vs 7 → 6 is present (exists at position 0)
      expect(states[0]).toBe('present');
      expect(states[2]).toBe('present');
    });

    it('handles duplicate characters correctly', () => {
      // Solution has one '3'. Guess has two '3's.
      const states = scoreGuess('3+3=33', '6+7=13');
      // Only one '3' should be marked (present or correct), the other absent.
      const threes = [states[0], states[2], states[4], states[5]];
      const nonAbsent = threes.filter((s) => s !== 'absent');
      expect(nonAbsent.length).toBe(1);
    });

    it('returns same length as guess', () => {
      const solution = '6+7=13';
      const guess = '8+5=13';
      const states = scoreGuess(guess, solution);
      expect(states.length).toBe(guess.length);
    });
  });

  describe('generateShareText', () => {
    it('includes puzzle number and emoji grid', () => {
      const text = generateShareText(['6+7=13'], '6+7=13', 42);
      expect(text).toContain('#42');
      expect(text).toContain('🟩');
    });

    it('uses 😢 for lost games', () => {
      const guesses = ['8+5=13', '9+4=13', '7+6=13', '5+8=13', '4+9=13', '3+10=13'];
      const text = generateShareText(guesses, '6+7=13', 42);
      expect(text).toContain('😢');
    });

    it('uses 🏆 for won games', () => {
      const text = generateShareText(['6+7=13'], '6+7=13', 42);
      expect(text).toContain('🏆');
    });
  });

  describe('computeStreak', () => {
    it('returns 1 for first win', () => {
      expect(computeStreak(null, new Date('2026-08-20'), true)).toBe(1);
    });

    it('returns 0 for first loss', () => {
      expect(computeStreak(null, new Date('2026-08-20'), false)).toBe(0);
    });

    it('increments streak when won yesterday', () => {
      const today = new Date('2026-08-20');
      const yesterday = new Date('2026-08-19');
      const stored = {
        date: yesterday.toISOString().slice(0, 10),
        streak: 3,
      };
      expect(computeStreak(stored, today, true)).toBe(4);
    });

    it('keeps streak when lost but played yesterday', () => {
      const today = new Date('2026-08-20');
      const yesterday = new Date('2026-08-19');
      const stored = {
        date: yesterday.toISOString().slice(0, 10),
        streak: 3,
      };
      expect(computeStreak(stored, today, false)).toBe(3);
    });

    it('resets to 1 when gap and won', () => {
      const today = new Date('2026-08-20');
      const oldDate = new Date('2026-08-15');
      const stored = {
        date: oldDate.toISOString().slice(0, 10),
        streak: 5,
      };
      expect(computeStreak(stored, today, true)).toBe(1);
    });

    it('returns stored streak when already played today', () => {
      const today = new Date('2026-08-20');
      const stored = {
        date: today.toISOString().slice(0, 10),
        streak: 7,
      };
      expect(computeStreak(stored, today, true)).toBe(7);
    });
  });
});

/* ── Component tests ─────────────────────────────────────────────── */

describe('EquationOfTheDay component', () => {
  const onExit = vi.fn();

  beforeEach(() => {
    store['eod-progress'] = JSON.stringify({
      date: '2000-01-01', // far past — ensures fresh game
      guesses: [],
      status: 'playing',
      streak: 0,
      played: 0,
      wins: 0,
      maxStreak: 0,
    });
    onExit.mockClear();
    openedUrl = null;
  });

  it('renders the game container', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    expect(screen.getByTestId('game-equation-of-the-day')).toBeInTheDocument();
  });

  it('shows the puzzle number', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    expect(screen.getByTestId('eq-puzzle-number')).toBeInTheDocument();
  });

  it('shows the streak badge', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    expect(screen.getByTestId('eq-streak')).toBeInTheDocument();
  });

  it('renders the equation grid with 6 rows', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    expect(screen.getByTestId('eq-grid')).toBeInTheDocument();
    for (let i = 0; i < MAX_GUESSES; i++) {
      expect(screen.getByTestId(`eq-row-${i}`)).toBeInTheDocument();
    }
  });

  it('renders the on-screen keyboard', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    expect(screen.getByTestId('eq-keyboard')).toBeInTheDocument();
    expect(screen.getByTestId('eq-key-1')).toBeInTheDocument();
    expect(screen.getByTestId('eq-key-+')).toBeInTheDocument();
    expect(screen.getByTestId('eq-key-=')).toBeInTheDocument();
    expect(screen.getByTestId('eq-backspace')).toBeInTheDocument();
    expect(screen.getByTestId('eq-submit')).toBeInTheDocument();
  });

  it('disables submit until row is full', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    const submit = screen.getByTestId('eq-submit') as HTMLButtonElement;
    expect(submit).toBeDisabled();
  });

  it('types characters via keyboard buttons', async () => {
    const user = userEvent.setup();
    render(<EquationOfTheDay onExit={onExit} />);

    // Get the puzzle solution to know the length.
    const puzzle = generatePuzzle(new Date());
    const len = puzzle.length;

    // Type the correct solution.
    for (let i = 0; i < len; i++) {
      const ch = puzzle.solution[i];
      await user.click(screen.getByTestId(`eq-key-${ch}`));
    }

    // Submit should now be enabled.
    const submit = screen.getByTestId('eq-submit') as HTMLButtonElement;
    expect(submit).not.toBeDisabled();

    // Submit the correct answer.
    await user.click(submit);

    // Should show the result panel (won).
    expect(screen.getByTestId('eq-result')).toBeInTheDocument();
    expect(screen.getByTestId('eq-result')).toHaveAttribute('data-status', 'won');
  });

  it('shows error for invalid equation', async () => {
    const user = userEvent.setup();
    render(<EquationOfTheDay onExit={onExit} />);

    const puzzle = generatePuzzle(new Date());
    const len = puzzle.length;

    // Type something that's the right length but mathematically wrong.
    // We need a string of the right length that has = but wrong result.
    // Use the solution format but swap a digit.
    const wrongGuess = puzzle.solution.split('');
    // Change the last digit to something wrong.
    const lastDigit = wrongGuess[wrongGuess.length - 1];
    const newDigit = lastDigit === '0' ? '1' : '0';
    wrongGuess[wrongGuess.length - 1] = newDigit;
    const wrongStr = wrongGuess.join('');

    for (let i = 0; i < len; i++) {
      const ch = wrongStr[i];
      await user.click(screen.getByTestId(`eq-key-${ch}`));
    }

    await user.click(screen.getByTestId('eq-submit'));

    // Should show an error.
    expect(screen.getByTestId('eq-error')).toBeInTheDocument();
  });

  it('backspace removes the last character', async () => {
    const user = userEvent.setup();
    render(<EquationOfTheDay onExit={onExit} />);

    await user.click(screen.getByTestId('eq-key-1'));
    await user.click(screen.getByTestId('eq-key-2'));
    await user.click(screen.getByTestId('eq-backspace'));

    // The active row should show only '1' in the first cell.
    const cell = screen.getByTestId('eq-cell-0-0');
    expect(cell).toHaveTextContent('1');
    const cell2 = screen.getByTestId('eq-cell-0-1');
    expect(cell2).toHaveTextContent('');
  });

  it('shows share buttons after winning', async () => {
    const user = userEvent.setup();
    render(<EquationOfTheDay onExit={onExit} />);

    const puzzle = generatePuzzle(new Date());
    const len = puzzle.length;

    for (let i = 0; i < len; i++) {
      const ch = puzzle.solution[i];
      await user.click(screen.getByTestId(`eq-key-${ch}`));
    }
    await user.click(screen.getByTestId('eq-submit'));

    expect(screen.getByTestId('eq-share-whatsapp')).toBeInTheDocument();
    expect(screen.getByTestId('eq-share-copy')).toBeInTheDocument();
    expect(screen.getByTestId('eq-share-text')).toBeInTheDocument();
    expect(screen.getByTestId('eq-solution')).toBeInTheDocument();
  });

  it('opens WhatsApp share link', async () => {
    const user = userEvent.setup();
    render(<EquationOfTheDay onExit={onExit} />);

    const puzzle = generatePuzzle(new Date());
    for (let i = 0; i < puzzle.length; i++) {
      await user.click(screen.getByTestId(`eq-key-${puzzle.solution[i]}`));
    }
    await user.click(screen.getByTestId('eq-submit'));

    await user.click(screen.getByTestId('eq-share-whatsapp'));
    expect(openedUrl).toContain('wa.me');
    expect(openedUrl).toContain('text=');
  });

  it('calls onExit when exit button is clicked', async () => {
    const user = userEvent.setup();
    render(<EquationOfTheDay onExit={onExit} />);

    const puzzle = generatePuzzle(new Date());
    for (let i = 0; i < puzzle.length; i++) {
      await user.click(screen.getByTestId(`eq-key-${puzzle.solution[i]}`));
    }
    await user.click(screen.getByTestId('eq-submit'));

    await user.click(screen.getByTestId('eq-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('shows guesses left message', () => {
    render(<EquationOfTheDay onExit={onExit} />);
    expect(screen.getByTestId('eq-guesses-left')).toBeInTheDocument();
  });
});
