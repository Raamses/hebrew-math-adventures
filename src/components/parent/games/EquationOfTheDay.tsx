import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Delete, Flame, Share2 } from 'lucide-react';

import type { GameComponentProps } from './registry';
import {
  generatePuzzle,
  generateShareText,
  loadProgress,
  saveProgress,
  scoreGuess,
  validateGuess,
  computeStreak,
  MAX_GUESSES,
  type CellState,
  type GameProgress,
  type Puzzle,
} from './equationEngine';

/* ── Constants ───────────────────────────────────────────────────── */

const T = 'parent.games.items.equationOfTheDay';

const CELL_STATE_CLASS: Record<CellState, string> = {
  correct: 'border-emerald-500 bg-emerald-500 text-white',
  present: 'border-amber-500 bg-amber-500 text-white',
  absent: 'border-slate-400 bg-slate-400 text-white',
};

const KEY_STATE_CLASS: Record<string, string> = {
  correct: 'border-emerald-500 bg-emerald-100 text-emerald-800',
  present: 'border-amber-500 bg-amber-100 text-amber-800',
  absent: 'border-slate-300 bg-slate-200 text-slate-500',
  unused: 'border-slate-300 bg-white text-slate-800',
};

const KEY_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['+', '-', '*', '/', '='],
];

/* ── Helper: keyboard key test id ────────────────────────────────── */

function keyTestId(char: string): string {
  return `eq-key-${char}`;
}

/* ── Component ───────────────────────────────────────────────────── */

export function EquationOfTheDay({ onExit }: GameComponentProps) {
  const { t } = useTranslation();

  const puzzle: Puzzle = useMemo(() => generatePuzzle(), []);
  const [progress, setProgress] = useState<GameProgress>(() => loadProgress());
  const [current, setCurrent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(() => {
    try {
      const raw = localStorage.getItem('eod-progress');
      if (!raw) return 0;
      const stored = JSON.parse(raw);
      return stored.streak ?? 0;
    } catch {
      return 0;
    }
  });

  const finished = progress.status !== 'playing';
  const won = progress.status === 'won';

  /* ── Keyboard state colours ─────────────────────────────────────── */

  const keyStates = useMemo(() => {
    const states: Record<string, CellState | 'unused'> = {};
    for (const guess of progress.guesses) {
      const scores = scoreGuess(guess, puzzle.solution);
      for (let i = 0; i < guess.length; i++) {
        const ch = guess[i];
        const prev = states[ch];
        // Upgrade only: absent → present → correct.
        if (prev === 'correct') continue;
        if (prev === 'present' && scores[i] === 'absent') continue;
        states[ch] = scores[i];
      }
    }
    return states;
  }, [progress.guesses, puzzle.solution]);

  /* ── Share text ──────────────────────────────────────────────────── */

  const shareText = useMemo(() => {
    if (!finished) return '';
    return generateShareText(progress.guesses, puzzle.solution, puzzle.puzzleNumber);
  }, [finished, progress.guesses, puzzle.solution, puzzle.puzzleNumber]);

  /* ── Actions ─────────────────────────────────────────────────────── */

  const appendChar = useCallback((char: string) => {
    setError(null);
    setCurrent((prev) => {
      if (prev.length >= puzzle.length) return prev;
      return [...prev, char];
    });
  }, [puzzle.length]);

  const backspace = useCallback(() => {
    setError(null);
    setCurrent((prev) => prev.slice(0, -1));
  }, []);

  const submit = useCallback(() => {
    const guess = current.join('');
    const validationError = validateGuess(guess, puzzle.solution);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newGuesses = [...progress.guesses, guess];
    const isWin = guess === puzzle.solution;
    const isLoss = newGuesses.length >= MAX_GUESSES && !isWin;
    const newStatus: GameProgress['status'] = isWin ? 'won' : isLoss ? 'lost' : 'playing';

    // Compute streak update.
    const today = new Date();
    let storedStreakData: { date: string; streak: number } | null = null;
    try {
      const raw = localStorage.getItem('eod-progress');
      if (raw) storedStreakData = JSON.parse(raw);
    } catch { /* ignore */ }

    const newStreak = computeStreak(storedStreakData, today, isWin);
    const newPlayed = progress.played + 1;
    const newWins = progress.wins + (isWin ? 1 : 0);
    const newMaxStreak = Math.max(progress.maxStreak, newStreak);

    const newProgress: GameProgress = {
      guesses: newGuesses,
      status: newStatus,
      played: newPlayed,
      wins: newWins,
      maxStreak: newMaxStreak,
    };

    setProgress(newProgress);
    setStreak(newStreak);
    saveProgress(newProgress, newStreak, today);
    setCurrent([]);
  }, [current, progress, puzzle.solution, puzzle.puzzleNumber]);

  const shareToWhatsApp = useCallback(() => {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }, [shareText]);

  const copyShare = useCallback(() => {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* ignore */ });
  }, [shareText]);

  /* ── Physical keyboard support ──────────────────────────────────── */

  useEffect(() => {
    if (finished) return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[0-9+\-*/=]$/.test(key)) {
        e.preventDefault();
        appendChar(key);
      } else if (key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (key === 'Enter') {
        e.preventDefault();
        if (current.length === puzzle.length) submit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, appendChar, backspace, submit, current.length, puzzle.length]);

  /* ── Derived ────────────────────────────────────────────────────── */

  const submitDisabled = current.length !== puzzle.length;

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div
      data-testid="game-equation-of-the-day"
      className="flex flex-col gap-4 rounded-2xl bg-white p-4"
    >
      {/* Staggered reveal animation */}
      <style>{`
        @keyframes eq-pop {
          0%   { transform: scale(0.85); opacity: 0.4; }
          60%  { transform: scale(1.06); }
          100% { transform: scale(1); opacity: 1; }
        }
        .eq-reveal { animation: eq-pop 240ms ease-out both; }
      `}</style>

      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-800">
            {t('parent.games.items.equationOfTheDay.title')}
          </h2>
          <span className="text-xs text-slate-500" data-testid="eq-puzzle-number">
            {t(`${T}.puzzleNumber`, { number: puzzle.puzzleNumber })}
          </span>
        </div>

        <div
          className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-orange-600"
          data-testid="eq-streak"
          data-streak={streak}
        >
          <Flame className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-semibold">{streak}</span>
          <span className="sr-only">{t(`${T}.streak.label`)}</span>
        </div>
      </header>

      <p className="text-sm text-slate-600">{t(`${T}.instructions`)}</p>

      {/* Equation grid — dir=ltr is essential inside RTL page */}
      <div className="flex flex-col items-center gap-1.5" dir="ltr" data-testid="eq-grid">
        {Array.from({ length: MAX_GUESSES }, (_, row) => {
          const submitted = progress.guesses[row];
          const states = submitted ? scoreGuess(submitted, puzzle.solution) : null;
          const isActiveRow = !finished && row === progress.guesses.length;

          return (
            <div className="flex gap-1.5" key={row} data-testid={`eq-row-${row}`}>
              {Array.from({ length: puzzle.length }, (_, col) => {
                const state = states?.[col] ?? null;
                const char = submitted
                  ? (submitted[col] ?? '')
                  : isActiveRow
                    ? (current[col] ?? '')
                    : '';

                const base =
                  'flex h-11 w-8 items-center justify-center rounded-md border-2 text-lg font-bold tabular-nums select-none sm:h-12 sm:w-9';
                const look = state
                  ? `${CELL_STATE_CLASS[state]} eq-reveal`
                  : char
                    ? 'border-slate-400 bg-white text-slate-800'
                    : 'border-slate-200 bg-slate-50 text-slate-800';

                return (
                  <div
                    aria-label={
                      state ? t(`${T}.cellState.${state}`, { char }) : char || undefined
                    }
                    className={`${base} ${look}`}
                    data-state={state ?? (char ? 'filled' : 'empty')}
                    data-testid={`eq-cell-${row}-${col}`}
                    key={col}
                    style={state ? { animationDelay: `${col * 70}ms` } : undefined}
                  >
                    {char}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Error / guesses left */}
      <div aria-live="polite" className="min-h-[1.5rem] text-center">
        {error && (
          <span
            className="rounded-md bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700"
            data-testid="eq-error"
            data-error={error}
          >
            {t(`${T}.invalid.${error}`)}
          </span>
        )}
        {!error && !finished && (
          <span className="text-sm text-slate-500" data-testid="eq-guesses-left">
            {t(`${T}.guessesLeft`, { count: MAX_GUESSES - progress.guesses.length })}
          </span>
        )}
      </div>

      {/* On-screen keyboard */}
      {!finished && (
        <div className="flex flex-col items-center gap-2" dir="ltr" data-testid="eq-keyboard">
          {KEY_ROWS.map((row, rowIndex) => (
            <div className="flex flex-wrap justify-center gap-1.5" key={rowIndex}>
              {row.map((char) => (
                <button
                  className={`h-12 min-w-[2.25rem] flex-1 rounded-md border-2 px-2 text-lg font-bold tabular-nums shadow-sm transition-colors active:scale-95 ${
                    KEY_STATE_CLASS[keyStates[char] ?? 'unused']
                  }`}
                  data-testid={keyTestId(char)}
                  key={char}
                  onClick={() => appendChar(char)}
                  type="button"
                >
                  {char}
                </button>
              ))}
            </div>
          ))}

          <div className="mt-1 flex w-full gap-2">
            <button
              aria-label={t(`${T}.backspace`)}
              className="flex h-12 w-16 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-slate-700 shadow-sm active:scale-95"
              data-testid="eq-backspace"
              onClick={backspace}
              type="button"
            >
              <Delete className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              className="h-12 flex-1 rounded-md bg-indigo-600 text-base font-bold text-white shadow-sm transition-opacity active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="eq-submit"
              disabled={submitDisabled}
              onClick={submit}
              type="button"
            >
              {t(`${T}.submit`)}
            </button>
          </div>
        </div>
      )}

      {/* Result panel */}
      {finished && (
        <section
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          data-testid="eq-result"
          data-status={progress.status}
        >
          <h3 className="text-center text-lg font-bold text-slate-800">
            {won ? t(`${T}.win.title`) : t(`${T}.lose.title`)}
          </h3>
          <p className="text-center text-sm text-slate-600">
            {won
              ? t(`${T}.win.subtitle`, { count: progress.guesses.length })
              : t(`${T}.lose.subtitle`)}
          </p>

          <div className="text-center" dir="ltr">
            <span
              className="inline-block rounded-md bg-slate-100 px-3 py-1.5 text-lg font-bold tabular-nums text-slate-800"
              data-testid="eq-solution"
            >
              {puzzle.solution}
            </span>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-slate-500">{t(`${T}.stats.played`)}</dt>
              <dd className="text-lg font-bold text-slate-800" data-testid="eq-stat-played">
                {progress.played}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t(`${T}.stats.winRate`)}</dt>
              <dd className="text-lg font-bold text-slate-800" data-testid="eq-stat-winrate">
                {progress.played === 0 ? 0 : Math.round((progress.wins / progress.played) * 100)}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t(`${T}.streak.best`)}</dt>
              <dd className="text-lg font-bold text-slate-800" data-testid="eq-stat-best">
                {progress.maxStreak}
              </dd>
            </div>
          </dl>

          <pre
            className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-center text-base leading-tight"
            data-testid="eq-share-text"
            dir="ltr"
          >
            {shareText}
          </pre>

          <div className="flex gap-2">
            <button
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white shadow-sm active:scale-95"
              data-testid="eq-share-whatsapp"
              onClick={shareToWhatsApp}
              type="button"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {t(`${T}.share.whatsapp`)}
            </button>
            <button
              aria-label={t(`${T}.share.copy`)}
              className="flex h-11 w-14 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-slate-700 active:scale-95"
              data-testid="eq-share-copy"
              onClick={copyShare}
              type="button"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <p className="text-center text-xs text-slate-500" data-testid="eq-next-puzzle">
            {t(`${T}.nextPuzzle`)}
          </p>

          <button
            className="h-11 rounded-md border-2 border-slate-300 bg-white text-sm font-semibold text-slate-700 active:scale-95"
            data-testid="eq-exit"
            onClick={onExit}
            type="button"
          >
            {t(`${T}.done`)}
          </button>
        </section>
      )}
    </div>
  );
}

export default EquationOfTheDay;
