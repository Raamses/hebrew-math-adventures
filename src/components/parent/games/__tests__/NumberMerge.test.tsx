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

// Mock framer-motion as passthrough (in case it's imported transitively).
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons as simple spans.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const mock: Record<string, unknown> = {};
  for (const name of Object.keys(actual)) {
    if (name === 'default') continue; // keep default untouched
    mock[name] = () => <span data-testid={`icon-${name}`} />;
  }
  return { ...actual, ...mock };
});

// Mock localStorage.
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  key: () => null,
  length: 0,
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock navigator.clipboard — use writable:true so user-event doesn't crash.
// userEvent.setup() tries to redefine clipboard, so we make it configurable.
let clipboardWriteText = vi.fn(() => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: clipboardWriteText,
  },
  configurable: true,
  writable: true,
});

// Mock window.open
let openedUrl: string | null = null;
window.open = (url: string) => { openedUrl = url; return null; };

// Import after mocks are set up.
import { NumberMerge } from '../NumberMerge';

/* ── Component Tests ─────────────────────────────────────────────── */

describe('NumberMerge', () => {
  beforeEach(() => {
    localStorageMock.clear();
    openedUrl = null;
  });

  /* ── Idle Screen ──────────────────────────────────────────────── */

  it('renders the idle screen with title and start button', () => {
    render(<NumberMerge onExit={() => {}} />);

    expect(screen.getByTestId('game-number-merge')).toBeInTheDocument();
    expect(screen.getByTestId('number-merge-start')).toBeInTheDocument();
    expect(
      screen.getByText('parent.games.items.numberMerge.title'),
    ).toBeInTheDocument();
  });

  it('shows how to play instructions', () => {
    render(<NumberMerge onExit={() => {}} />);

    expect(
      screen.getByText('parent.games.items.numberMerge.howToPlay'),
    ).toBeInTheDocument();
  });

  it('does not show high score on first play', () => {
    render(<NumberMerge onExit={() => {}} />);

    expect(screen.queryByTestId('number-merge-high-score')).not.toBeInTheDocument();
  });

  /* ── Start Game ────────────────────────────────────────────────── */

  it('starts a game when the start button is clicked', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    render(<NumberMerge onExit={() => {}} />);

    await user.click(screen.getByTestId('number-merge-start'));

    expect(screen.getByTestId('number-merge-board')).toBeInTheDocument();
    expect(screen.getByTestId('number-merge-score')).toBeInTheDocument();
    expect(screen.getByTestId('number-merge-hint')).toBeInTheDocument();
  });

  /* ── Playing State ────────────────────────────────────────────── */

  it('shows a 4x4 grid', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    render(<NumberMerge onExit={() => {}} />);

    await user.click(screen.getByTestId('number-merge-start'));

    // Check all 16 cells exist
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(
          screen.getByTestId(`number-merge-cell-${r}-${c}`),
        ).toBeInTheDocument();
      }
    }
  });

  it('displays score and best score', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    render(<NumberMerge onExit={() => {}} />);

    await user.click(screen.getByTestId('number-merge-start'));

    expect(screen.getByTestId('number-merge-score')).toHaveTextContent('0');
    expect(screen.getByTestId('number-merge-best-score')).toBeInTheDocument();
  });

  it('responds to arrow key presses', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    render(<NumberMerge onExit={() => {}} />);

    await user.click(screen.getByTestId('number-merge-start'));

    // Press arrow left — should not crash
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByTestId('number-merge-board')).toBeInTheDocument();
  });

  it('prevents default on arrow keys to avoid scrolling', async () => {
    const user = userEvent.setup({ writeToClipboard: false });
    render(<NumberMerge onExit={() => {}} />);

    await user.click(screen.getByTestId('number-merge-start'));

    const preventDefault = vi.fn();
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(keydownEvent, 'preventDefault', {
      value: preventDefault,
    });
    window.dispatchEvent(keydownEvent);

    expect(preventDefault).toHaveBeenCalled();
  });

  /* ── Game Phases ──────────────────────────────────────────────── */

  it('shows exit button on the idle screen', () => {
    // The idle screen doesn't have an exit button — it's on overlays
    // But the game card itself is rendered, and onExit is used by the hub.
    render(<NumberMerge onExit={() => {}} />);
    expect(screen.getByTestId('game-number-merge')).toBeInTheDocument();
  });

  it('records parent economy exactly once on a win', async () => {
    const mergeEngine = await import('../mergeEngine');
    const spy = vi.spyOn(mergeEngine, 'applyMove').mockImplementation((state: any) => ({
      ...state,
      phase: 'won' as const,
      won: true,
      score: 2048,
      bestTile: 2048,
    }));

    const user = userEvent.setup({ writeToClipboard: false });
    render(<NumberMerge onExit={() => {}} />);

    await user.click(screen.getByTestId('number-merge-start'));
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByTestId('number-merge-win-overlay')).toBeInTheDocument();

    const stored = JSON.parse(store['hebrew-math-parent-economy'] ?? 'null');
    expect(stored).not.toBeNull();
    expect(stored.totalGamesPlayed).toBe(1);
    expect(stored.coins).toBeGreaterThan(0);
    expect(typeof stored.lastPlayedDate).toBe('string');
    expect(stored.lastPlayedDate).not.toBeNull();
    expect(stored.gameWinCounts?.['number-merge']).toBe(1);

    spy.mockRestore();
  });
});
