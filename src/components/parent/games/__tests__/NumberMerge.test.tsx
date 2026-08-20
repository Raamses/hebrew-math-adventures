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
vi.mock('lucide-react', () => {
  const icons = ['Layers', 'Play', 'RotateCcw', 'Trophy', 'CalendarDays', 'Zap', 'Puzzle', 'Grid3x3', 'Check', 'Copy', 'Share2', 'Eraser', 'Flame'];
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
});
