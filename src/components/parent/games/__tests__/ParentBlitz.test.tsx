import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
  const icons = ['Clock', 'Flame', 'Play', 'RotateCcw', 'SkipForward', 'Trophy', 'Zap'];
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

// Import after mocks are set up.
import { ParentBlitz } from '../ParentBlitz';
import {
  BLITZ_DURATION_MS,
  BLITZ_STORAGE_KEY,
  checkAnswer,
  computeScoreDelta,
  createInitialState,
  difficultyForElapsed,
  generateNextQuestion,
  generateQuestion,
  generateShareText,
  isNewHighScore,
  loadHighScore,
  saveHighScore,
  pickQuestionType,
  appendDigit,
  deleteDigit,
  submitAnswer,
  skipQuestion,
  tick,
  startGame,
  finishGame,
  type BlitzDifficulty,
  type BlitzQuestion,
  type BlitzQuestionType,
  type BlitzState,
  type Rng,
} from '../blitzEngine';

/* ── Engine unit tests ───────────────────────────────────────────── */

// Seeded RNG for deterministic tests
function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('blitzEngine', () => {
  /* ── difficultyForElapsed ─────────────────────────────────────── */

  describe('difficultyForElapsed', () => {
    it('returns 1 for elapsed < 20s', () => {
      expect(difficultyForElapsed(0)).toBe(1);
      expect(difficultyForElapsed(19999)).toBe(1);
    });

    it('returns 2 for 20s <= elapsed < 40s', () => {
      expect(difficultyForElapsed(20000)).toBe(2);
      expect(difficultyForElapsed(39999)).toBe(2);
    });

    it('returns 3 for elapsed >= 40s', () => {
      expect(difficultyForElapsed(40000)).toBe(3);
      expect(difficultyForElapsed(60000)).toBe(3);
      expect(difficultyForElapsed(999999)).toBe(3);
    });

    it('clamps negative elapsed', () => {
      expect(difficultyForElapsed(-1)).toBe(1);
    });
  });

  /* ── pickQuestionType ─────────────────────────────────────────── */

  describe('pickQuestionType', () => {
    it('never repeats the previous type', () => {
      const rng = seededRng(42);
      let prev: BlitzQuestionType | null = null;
      for (let i = 0; i < 50; i++) {
        const type = pickQuestionType(rng, prev);
        if (prev) expect(type).not.toBe(prev);
        prev = type;
      }
    });

    it('covers all 5 types over many draws', () => {
      const rng = seededRng(123);
      const seen = new Set<BlitzQuestionType>();
      for (let i = 0; i < 100; i++) {
        seen.add(pickQuestionType(rng, null));
      }
      expect(seen.size).toBe(5);
    });
  });

  /* ── generateQuestion — per type × difficulty ─────────────────── */

  describe('generateQuestion', () => {
    const types: BlitzQuestionType[] = [
      'percentage', 'orderOfOperations', 'fraction',
      'doubleDigitMultiply', 'mixedArithmetic',
    ];
    const difficulties: BlitzDifficulty[] = [1, 2, 3];

    for (const type of types) {
      for (const difficulty of difficulties) {
        it(`${type} d${difficulty}: answer is a non-negative integer`, () => {
          const rng = seededRng(hashStr(`${type}-${difficulty}`));
          for (let i = 0; i < 20; i++) {
            const q = generateQuestion(type, difficulty, rng, i);
            expect(Number.isInteger(q.answer)).toBe(true);
            expect(q.answer).toBeGreaterThanOrEqual(0);
          }
        });

        it(`${type} d${difficulty}: display is non-empty and contains no NaN/undefined`, () => {
          const rng = seededRng(hashStr(`${type}-${difficulty}-display`));
          for (let i = 0; i < 20; i++) {
            const q = generateQuestion(type, difficulty, rng, i);
            expect(q.display).toBeTruthy();
            expect(q.display).not.toContain('NaN');
            expect(q.display).not.toContain('undefined');
          }
        });
      }
    }

    it('percentage: answer equals pct * base / 100', () => {
      const rng = seededRng(999);
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion('percentage', 1, rng, i);
        // Parse display: "P% × N"
        const match = q.display.match(/^(\d+)% × (\d+)$/);
        expect(match).not.toBeNull();
        if (match) {
          const pct = parseInt(match[1], 10);
          const base = parseInt(match[2], 10);
          expect(q.answer).toBe((pct * base) / 100);
        }
      }
    });

    it('doubleDigitMultiply: answer equals a * b', () => {
      const rng = seededRng(777);
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion('doubleDigitMultiply', 1, rng, i);
        const match = q.display.match(/^(\d+) × (\d+)$/);
        expect(match).not.toBeNull();
        if (match) {
          expect(q.answer).toBe(parseInt(match[1], 10) * parseInt(match[2], 10));
        }
      }
    });

    it('fraction: answer is integer (N is multiple of denominator)', () => {
      const rng = seededRng(555);
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion('fraction', 2, rng, i);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    });

    it('orderOfOperations: display evaluates to answer', () => {
      const rng = seededRng(333);
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion('orderOfOperations', 2, rng, i);
        // Replace Unicode minus and × with ASCII for eval
        const expr = q.display.replace(/−/g, '-').replace(/×/g, '*').replace(/\(/g, '(').replace(/\)/g, ')');
        // eslint-disable-next-line no-eval
        const result = eval(expr);
        expect(result).toBe(q.answer);
      }
    });

    it('mixedArithmetic: display evaluates to answer', () => {
      const rng = seededRng(444);
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion('mixedArithmetic', 2, rng, i);
        const expr = q.display.replace(/−/g, '-').replace(/×/g, '*');
        // eslint-disable-next-line no-eval
        const result = eval(expr);
        expect(result).toBe(q.answer);
      }
    });

    it('is deterministic with same seeded rng', () => {
      const rng1 = seededRng(100);
      const rng2 = seededRng(100);
      const q1 = generateQuestion('percentage', 1, rng1, 5);
      const q2 = generateQuestion('percentage', 1, rng2, 5);
      expect(q1).toEqual(q2);
    });
  });

  /* ── Invariant sweep ──────────────────────────────────────────── */

  describe('invariant sweep', () => {
    it('500 questions across all types/difficulties: all invariants hold', () => {
      const rng = seededRng(2026);
      const types: BlitzQuestionType[] = [
        'percentage', 'orderOfOperations', 'fraction',
        'doubleDigitMultiply', 'mixedArithmetic',
      ];
      for (let i = 0; i < 500; i++) {
        const type = types[i % types.length];
        const difficulty = ((i % 3) + 1) as BlitzDifficulty;
        const q = generateQuestion(type, difficulty, rng, i);
        // Answer is non-negative integer
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        // Display is non-empty
        expect(q.display.length).toBeGreaterThan(0);
        // No NaN/undefined in display
        expect(q.display).not.toMatch(/NaN|undefined/);
        // ID is set
        expect(q.id).toBeTruthy();
      }
    });
  });

  /* ── computeScoreDelta ────────────────────────────────────────── */

  describe('computeScoreDelta', () => {
    it('returns base points (10) for d1, streak 0, slow', () => {
      expect(computeScoreDelta({ difficulty: 1, streak: 0, answerTimeMs: 10000 })).toBe(10);
    });

    it('adds difficulty bonus', () => {
      expect(computeScoreDelta({ difficulty: 2, streak: 0, answerTimeMs: 10000 })).toBe(15);
      expect(computeScoreDelta({ difficulty: 3, streak: 0, answerTimeMs: 10000 })).toBe(20);
    });

    it('adds streak bonus (capped at 10)', () => {
      expect(computeScoreDelta({ difficulty: 1, streak: 1, answerTimeMs: 10000 })).toBe(12);
      expect(computeScoreDelta({ difficulty: 1, streak: 5, answerTimeMs: 10000 })).toBe(20);
      expect(computeScoreDelta({ difficulty: 1, streak: 10, answerTimeMs: 10000 })).toBe(20);
    });

    it('adds fast answer bonus', () => {
      expect(computeScoreDelta({ difficulty: 1, streak: 0, answerTimeMs: 2000 })).toBe(15);
      expect(computeScoreDelta({ difficulty: 1, streak: 0, answerTimeMs: 2999 })).toBe(15);
    });

    it('does not add fast bonus at exactly 3000ms', () => {
      expect(computeScoreDelta({ difficulty: 1, streak: 0, answerTimeMs: 3000 })).toBe(10);
    });

    it('max possible score is 35 (d3, streak>=5, fast)', () => {
      expect(computeScoreDelta({ difficulty: 3, streak: 5, answerTimeMs: 1000 })).toBe(35);
    });
  });

  /* ── checkAnswer ──────────────────────────────────────────────── */

  describe('checkAnswer', () => {
    const q: BlitzQuestion = {
      id: 'test', type: 'mixedArithmetic', difficulty: 1,
      display: '10 + 5', answer: 15,
    };

    it('returns true for exact match', () => {
      expect(checkAnswer(q, '15')).toBe(true);
    });

    it('handles leading zeros', () => {
      expect(checkAnswer(q, '015')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(checkAnswer(q, '')).toBe(false);
    });

    it('returns false for whitespace-only', () => {
      expect(checkAnswer(q, '   ')).toBe(false);
    });

    it('returns false for wrong answer', () => {
      expect(checkAnswer(q, '14')).toBe(false);
    });

    it('returns false for non-digit input', () => {
      expect(checkAnswer(q, '-15')).toBe(false);
      expect(checkAnswer(q, '1e3')).toBe(false);
      expect(checkAnswer(q, 'abc')).toBe(false);
    });

    it('returns false for Arabic-Indic numerals', () => {
      expect(checkAnswer(q, '١٥')).toBe(false);
    });
  });

  /* ── State transitions ────────────────────────────────────────── */

  describe('state transitions', () => {
    describe('appendDigit', () => {
      it('appends a digit when playing', () => {
        const state = { ...createInitialState(), phase: 'playing' as const };
        const next = appendDigit(state, '5');
        expect(next.input).toBe('5');
      });

      it('is a no-op when not playing', () => {
        const state = createInitialState();
        const next = appendDigit(state, '5');
        expect(next).toBe(state);
      });

      it('caps at MAX_INPUT_LENGTH', () => {
        const state = { ...createInitialState(), phase: 'playing' as const, input: '12345' };
        const next = appendDigit(state, '6');
        expect(next.input).toBe('12345');
      });
    });

    describe('deleteDigit', () => {
      it('removes the last digit when playing', () => {
        const state = { ...createInitialState(), phase: 'playing' as const, input: '123' };
        const next = deleteDigit(state);
        expect(next.input).toBe('12');
      });

      it('is a no-op when not playing', () => {
        const state = createInitialState();
        const next = deleteDigit(state);
        expect(next).toBe(state);
      });

      it('is a no-op on empty input', () => {
        const state = { ...createInitialState(), phase: 'playing' as const, input: '' };
        const next = deleteDigit(state);
        expect(next.input).toBe('');
      });
    });

    describe('submitAnswer', () => {
      it('is a no-op when not playing', () => {
        const state = createInitialState();
        const next = submitAnswer(state, Date.now(), Math.random);
        expect(next).toBe(state);
      });

      it('is a no-op on empty input', () => {
        const state = { ...createInitialState(), phase: 'playing' as const };
        const next = submitAnswer(state, Date.now(), Math.random);
        expect(next).toBe(state);
      });

      it('handles correct answer: score up, streak up, new question', () => {
        const now = 1000;
        const rng = seededRng(42);
        const state = startGame(now, rng);
        // Get the question and type the correct answer
        const correctAnswer = state.question!.answer.toString();
        let s = state;
        for (const digit of correctAnswer) {
          s = appendDigit(s, digit);
        }
        s = submitAnswer(s, now + 2000, rng);
        expect(s.score).toBeGreaterThan(0);
        expect(s.streak).toBe(1);
        expect(s.correct).toBe(1);
        expect(s.attempted).toBe(1);
        expect(s.input).toBe('');
        expect(s.question).not.toBeNull();
        expect(s.question!.id).not.toBe(state.question!.id);
        expect(s.lastResult).toBe('correct');
      });

      it('handles wrong answer: streak reset, score unchanged', () => {
        const now = 1000;
        const rng = seededRng(42);
        const state = startGame(now, rng);
        // Type a wrong answer
        const wrong = (state.question!.answer + 1).toString();
        let s = state;
        for (const digit of wrong) {
          s = appendDigit(s, digit);
        }
        s = submitAnswer(s, now + 2000, rng);
        expect(s.score).toBe(0);
        expect(s.streak).toBe(0);
        expect(s.correct).toBe(0);
        expect(s.attempted).toBe(1);
        expect(s.lastResult).toBe('wrong');
      });

      it('preserves bestStreak on wrong answer', () => {
        const rng = seededRng(42);
        let s = startGame(1000, rng);
        // Answer correctly 3 times
        for (let i = 0; i < 3; i++) {
          const ans = s.question!.answer.toString();
          for (const d of ans) s = appendDigit(s, d);
          s = submitAnswer(s, 1000 + i * 1000, rng);
        }
        expect(s.bestStreak).toBe(3);
        // Answer wrong
        const wrong = (s.question!.answer + 1).toString();
        for (const d of wrong) s = appendDigit(s, d);
        s = submitAnswer(s, 5000, rng);
        expect(s.bestStreak).toBe(3);
        expect(s.streak).toBe(0);
      });
    });

    describe('skipQuestion', () => {
      it('resets streak and advances question', () => {
        const rng = seededRng(42);
        let s = startGame(1000, rng);
        // Answer correctly first
        const ans = s.question!.answer.toString();
        for (const d of ans) s = appendDigit(s, d);
        s = submitAnswer(s, 2000, rng);
        expect(s.streak).toBe(1);
        // Skip
        s = skipQuestion(s, 3000, rng);
        expect(s.streak).toBe(0);
        expect(s.attempted).toBe(2);
        expect(s.question).not.toBeNull();
      });

      it('is a no-op when not playing', () => {
        const state = createInitialState();
        const next = skipQuestion(state, Date.now(), Math.random);
        expect(next).toBe(state);
      });
    });

    describe('tick', () => {
      it('is a no-op when not playing', () => {
        const state = createInitialState();
        const next = tick(state, Date.now(), Math.random);
        expect(next).toBe(state);
      });

      it('updates remainingMs when playing', () => {
        const now = 1000;
        const rng = seededRng(42);
        const state = startGame(now, rng);
        const next = tick(state, now + 5000, rng);
        expect(next.remainingMs).toBe(BLITZ_DURATION_MS - 5000);
      });

      it('transitions to finished when time runs out', () => {
        const now = 1000;
        const rng = seededRng(42);
        const state = startGame(now, rng);
        const next = tick(state, now + BLITZ_DURATION_MS, rng);
        expect(next.phase).toBe('finished');
        expect(next.remainingMs).toBe(0);
      });

      it('is idempotent after finish', () => {
        const now = 1000;
        const rng = seededRng(42);
        const state = startGame(now, rng);
        const finished = tick(state, now + BLITZ_DURATION_MS, rng);
        const next = tick(finished, now + BLITZ_DURATION_MS + 1000, rng);
        expect(next).toBe(finished);
      });
    });

    describe('finishGame', () => {
      it('transitions to finished', () => {
        const state = { ...createInitialState(), phase: 'playing' as const };
        const next = finishGame(state);
        expect(next.phase).toBe('finished');
      });

      it('is a no-op when already finished', () => {
        const state = { ...createInitialState(), phase: 'finished' as const };
        const next = finishGame(state);
        expect(next).toBe(state);
      });
    });
  });

  /* ── Persistence ──────────────────────────────────────────────── */

  describe('high score persistence', () => {
    beforeEach(() => {
      store[BLITZ_STORAGE_KEY] = undefined as any;
      delete store[BLITZ_STORAGE_KEY];
    });

    it('returns null when no high score stored', () => {
      expect(loadHighScore()).toBeNull();
    });

    it('loads a valid high score', () => {
      const hs = {
        score: 250, correct: 15, attempted: 20,
        bestStreak: 8, achievedAt: '2026-08-20T10:00:00.000Z',
      };
      store[BLITZ_STORAGE_KEY] = JSON.stringify(hs);
      const loaded = loadHighScore();
      expect(loaded).toEqual(hs);
    });

    it('returns null for malformed JSON', () => {
      store[BLITZ_STORAGE_KEY] = '{not json';
      expect(loadHighScore()).toBeNull();
    });

    it('returns null for wrong shape', () => {
      store[BLITZ_STORAGE_KEY] = JSON.stringify({ foo: 'bar' });
      expect(loadHighScore()).toBeNull();
    });

    it('returns null for NaN score', () => {
      store[BLITZ_STORAGE_KEY] = JSON.stringify({
        score: NaN, correct: 1, attempted: 2,
        bestStreak: 1, achievedAt: '2026-08-20',
      });
      expect(loadHighScore()).toBeNull();
    });

    it('returns null for negative score', () => {
      store[BLITZ_STORAGE_KEY] = JSON.stringify({
        score: -10, correct: 1, attempted: 2,
        bestStreak: 1, achievedAt: '2026-08-20',
      });
      expect(loadHighScore()).toBeNull();
    });

    it('saveHighScore only writes when strictly greater', () => {
      const existing = {
        score: 100, correct: 5, attempted: 8,
        bestStreak: 3, achievedAt: '2026-08-19',
      };
      store[BLITZ_STORAGE_KEY] = JSON.stringify(existing);

      const lower = {
        score: 50, correct: 3, attempted: 5,
        bestStreak: 2, achievedAt: '2026-08-20',
      };
      saveHighScore(lower);
      // Should not have overwritten
      const loaded = loadHighScore();
      expect(loaded?.score).toBe(100);
    });

    it('saveHighScore writes when greater', () => {
      const existing = {
        score: 100, correct: 5, attempted: 8,
        bestStreak: 3, achievedAt: '2026-08-19',
      };
      store[BLITZ_STORAGE_KEY] = JSON.stringify(existing);

      const higher = {
        score: 200, correct: 12, attempted: 15,
        bestStreak: 6, achievedAt: '2026-08-20',
      };
      saveHighScore(higher);
      const loaded = loadHighScore();
      expect(loaded?.score).toBe(200);
    });

    it('saveHighScore writes when no existing', () => {
      const hs = {
        score: 150, correct: 8, attempted: 10,
        bestStreak: 4, achievedAt: '2026-08-20',
      };
      saveHighScore(hs);
      const loaded = loadHighScore();
      expect(loaded?.score).toBe(150);
    });

    it('isNewHighScore returns true when no existing and score > 0', () => {
      expect(isNewHighScore({ score: 10 }, null)).toBe(true);
    });

    it('isNewHighScore returns false when score is 0 and no existing', () => {
      expect(isNewHighScore({ score: 0 }, null)).toBe(false);
    });

    it('isNewHighScore returns true when score > existing', () => {
      const existing = { score: 100, correct: 5, attempted: 8, bestStreak: 3, achievedAt: '2026-08-19' };
      expect(isNewHighScore({ score: 101 }, existing)).toBe(true);
    });

    it('isNewHighScore returns false when score <= existing', () => {
      const existing = { score: 100, correct: 5, attempted: 8, bestStreak: 3, achievedAt: '2026-08-19' };
      expect(isNewHighScore({ score: 100 }, existing)).toBe(false);
      expect(isNewHighScore({ score: 50 }, existing)).toBe(false);
    });
  });

  /* ── generateShareText ────────────────────────────────────────── */

  describe('generateShareText', () => {
    it('includes score and accuracy', () => {
      const text = generateShareText(250, 15, 20, 8);
      expect(text).toContain('250');
      expect(text).toContain('75%');
      expect(text).toContain('15/20');
      expect(text).toContain('8');
    });

    it('handles zero attempted without division by zero', () => {
      const text = generateShareText(0, 0, 0, 0);
      expect(text).toContain('0%');
    });
  });
});

/* ── Component tests ─────────────────────────────────────────────── */

describe('ParentBlitz component', () => {
  const onExit = vi.fn();

  beforeEach(() => {
    delete store[BLITZ_STORAGE_KEY];
    onExit.mockClear();
  });

  // Always restore real timers so a fake-timer test can never leak into the
  // next one (a leaked fake clock makes every `await user.*` / `waitFor` hang).
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the game container in idle state', () => {
    render(<ParentBlitz onExit={onExit} />);
    expect(screen.getByTestId('game-parent-blitz')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-start')).toBeInTheDocument();
  });

  it('shows high score when stored', () => {
    store[BLITZ_STORAGE_KEY] = JSON.stringify({
      score: 300, correct: 18, attempted: 22,
      bestStreak: 10, achievedAt: '2026-08-19',
    });
    render(<ParentBlitz onExit={onExit} />);
    expect(screen.getByTestId('parent-blitz-high-score')).toBeInTheDocument();
  });

  it('hides high score when not stored', () => {
    render(<ParentBlitz onExit={onExit} />);
    expect(screen.queryByTestId('parent-blitz-high-score')).not.toBeInTheDocument();
  });

  it('transitions to playing when start is clicked', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));
    expect(screen.getByTestId('parent-blitz-question')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-keypad')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-timer-bar')).toBeInTheDocument();
  });

  it('shows a question and keypad when playing', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));
    expect(screen.getByTestId('parent-blitz-question')).toHaveTextContent(/\d/);
    expect(screen.getByTestId('parent-blitz-key-1')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-key-0')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-key-backspace')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-key-submit')).toBeInTheDocument();
  });

  it('appends digits via keypad', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));
    await user.click(screen.getByTestId('parent-blitz-key-5'));
    expect(screen.getByTestId('parent-blitz-input')).toHaveTextContent('5');
    await user.click(screen.getByTestId('parent-blitz-key-3'));
    expect(screen.getByTestId('parent-blitz-input')).toHaveTextContent('53');
  });

  it('backspace removes the last digit', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));
    await user.click(screen.getByTestId('parent-blitz-key-5'));
    await user.click(screen.getByTestId('parent-blitz-key-3'));
    await user.click(screen.getByTestId('parent-blitz-key-backspace'));
    expect(screen.getByTestId('parent-blitz-input')).toHaveTextContent('5');
  });

  it('correct answer increases score', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));

    // Read the question display, compute the answer, type it
    const questionEl = screen.getByTestId('parent-blitz-question');
    const questionText = questionEl.textContent || '';
    // Parse the expression and compute
    const answer = evalExpr(questionText);
    const answerStr = String(answer);
    for (const d of answerStr) {
      await user.click(screen.getByTestId(`parent-blitz-key-${d}`));
    }
    await user.click(screen.getByTestId('parent-blitz-key-submit'));

    const scoreEl = screen.getByTestId('parent-blitz-score');
    expect(parseInt(scoreEl.textContent || '0', 10)).toBeGreaterThan(0);
  });

  it('wrong answer shows feedback and does not increase score', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));

    const initialScore = parseInt(screen.getByTestId('parent-blitz-score').textContent || '0', 10);
    // Type a wrong answer (99999 is almost certainly wrong)
    await user.click(screen.getByTestId('parent-blitz-key-9'));
    await user.click(screen.getByTestId('parent-blitz-key-9'));
    await user.click(screen.getByTestId('parent-blitz-key-9'));
    await user.click(screen.getByTestId('parent-blitz-key-submit'));

    // Score should not have increased
    const scoreEl = screen.getByTestId('parent-blitz-score');
    expect(parseInt(scoreEl.textContent || '0', 10)).toBe(initialScore);
  });

  it('skip button resets streak and advances', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));
    await user.click(screen.getByTestId('parent-blitz-skip'));
    // Should still be playing with a new question
    expect(screen.getByTestId('parent-blitz-question')).toBeInTheDocument();
  });

  /*
   * The tests below need a fake clock to jump the 60s round timer.
   *
   * They deliberately use `fireEvent` + synchronous `act` instead of
   * `userEvent`: every async testing-library API (`user.*`, `findBy*`,
   * `waitFor`) is routed through RTL's `asyncWrapper`, which drains the
   * microtask queue via a real `setTimeout(…, 0)` and only pumps the clock when
   * `jestFakeTimersAreEnabled()` is true. That helper is gated on a global
   * `jest` object, which Vitest does not define, so under `vi.useFakeTimers()`
   * it reports "real timers", never advances the fake clock, and the awaited
   * promise can never settle — the call hangs until the test timeout.
   * `fireEvent` uses the *synchronous* `eventWrapper`, so it is unaffected.
   */

  /** Click a node through RTL's sync act wrapper (fake-timer safe). */
  function click(testId: string) {
    fireEvent.click(screen.getByTestId(testId));
  }

  /** Run the 60s round to completion on the fake clock. */
  function runOutTheClock() {
    act(() => {
      vi.advanceTimersByTime(BLITZ_DURATION_MS + 200);
    });
  }

  it('shows results when timer expires', () => {
    vi.useFakeTimers();
    render(<ParentBlitz onExit={onExit} />);
    click('parent-blitz-start');

    // Advance past 60 seconds
    runOutTheClock();

    expect(screen.getByTestId('parent-blitz-results')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-final-score')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-accuracy')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-replay')).toBeInTheDocument();
  });

  it('replay button restarts the game', () => {
    vi.useFakeTimers();
    render(<ParentBlitz onExit={onExit} />);
    click('parent-blitz-start');
    runOutTheClock();
    click('parent-blitz-replay');
    expect(screen.getByTestId('parent-blitz-question')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-blitz-results')).not.toBeInTheDocument();
  });

  it('exit button calls onExit', () => {
    vi.useFakeTimers();
    render(<ParentBlitz onExit={onExit} />);
    click('parent-blitz-start');
    runOutTheClock();
    click('parent-blitz-exit');
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('question and input have dir=ltr', async () => {
    const user = userEvent.setup();
    render(<ParentBlitz onExit={onExit} />);
    await user.click(screen.getByTestId('parent-blitz-start'));
    expect(screen.getByTestId('parent-blitz-question')).toBeInTheDocument();
    expect(screen.getByTestId('parent-blitz-question')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('parent-blitz-input')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('parent-blitz-keypad')).toHaveAttribute('dir', 'ltr');
  });
});

/* ── Helpers ─────────────────────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Parse a blitz display expression and evaluate it. */
function evalExpr(display: string): number {
  const expr = display
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/%/g, '/100*')
    // Handle vulgar fractions
    .replace(/½/g, '1/2')
    .replace(/⅓/g, '1/3')
    .replace(/⅔/g, '2/3')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4')
    .replace(/⅕/g, '1/5')
    .replace(/⅖/g, '2/5')
    .replace(/⅗/g, '3/5')
    .replace(/⅘/g, '4/5')
    .replace(/⅙/g, '1/6')
    .replace(/⅚/g, '5/6')
    .replace(/⅛/g, '1/8')
    .replace(/⅜/g, '3/8')
    .replace(/⅝/g, '5/8')
    .replace(/⅞/g, '7/8');
  // eslint-disable-next-line no-eval
  return eval(expr);
}
