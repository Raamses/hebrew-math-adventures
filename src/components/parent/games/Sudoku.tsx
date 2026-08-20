import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Eraser, Share2, Trophy } from 'lucide-react';

import type { GameComponentProps } from './registry';
import {
  COIN_REWARDS,
  checkWin,
  findConflicts,
  formatTime,
  freshStats,
  generatePuzzle,
  generateShareText,
  loadProgress,
  saveProgress,
  updateStats,
  type Difficulty,
  type SudokuPuzzle,
  type SudokuProgress,
} from './sudokuEngine';

/* ── Constants ───────────────────────────────────────────────────── */

const T = 'parent.games.items.sudoku';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const DIFFICULTY_ACCENT: Record<Difficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  hard: 'bg-rose-100 text-rose-700 border-rose-300',
};

/* ── Component ───────────────────────────────────────────────────── */

export function Sudoku({ onExit }: GameComponentProps) {
  const { t } = useTranslation();

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<SudokuPuzzle | null>(null);
  const [board, setBoard] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [progress, setProgress] = useState<SudokuProgress | null>(null);
  const [copied, setCopied] = useState(false);
  const [coinReward, setCoinReward] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  /* ── Difficulty selection ───────────────────────────────────────── */

  const handleDifficultySelect = useCallback(
    (diff: Difficulty) => {
      const newPuzzle = generatePuzzle(diff, new Date());
      setPuzzle(newPuzzle);
      setBoard([...newPuzzle.puzzle]);
      setDifficulty(diff);
      setSelectedCell(null);
      setCoinReward(0);

      const stored = loadProgress();
      const existing = stored && stored.difficulty === diff;

      if (existing && stored!.status === 'won') {
        // Already completed today for this difficulty.
        setProgress(stored!);
        setBoard(stored!.board);
        setElapsedMs(stored!.finishedAt - stored!.startedAt);
      } else {
        const now = Date.now();
        setElapsedMs(0);
        const newProgress: SudokuProgress = {
          board: [...newPuzzle.puzzle],
          status: 'playing',
          difficulty: diff,
          startedAt: now,
          finishedAt: 0,
          mistakes: 0,
          stats: stored?.stats ?? freshStats(),
        };
        setProgress(newProgress);
        saveProgress(newProgress);
      }
    },
    [],
  );

  /* ── Timer ──────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!progress || progress.status !== 'playing') return;
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - progress.startedAt);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [progress]);

  /* ── Cell selection ─────────────────────────────────────────────── */

  const handleCellClick = useCallback(
    (index: number) => {
      if (!puzzle || !progress || progress.status === 'won') return;
      if (puzzle.givenIndices.has(index)) return; // Can't edit given cells.
      setSelectedCell(index);
    },
    [puzzle, progress],
  );

  /* ── Number input ───────────────────────────────────────────────── */

  const handleNumberInput = useCallback(
    (value: number) => {
      if (!puzzle || !progress || progress.status === 'won') return;
      if (selectedCell === null) return;
      if (puzzle.givenIndices.has(selectedCell)) return;

      const newBoard = [...board];
      const prevValue = newBoard[selectedCell];
      newBoard[selectedCell] = value;

      // Count mistakes: if placing a wrong number (not matching solution).
      let newMistakes = progress.mistakes;
      if (value !== 0 && value !== puzzle.solution[selectedCell] && prevValue !== value) {
        newMistakes += 1;
      }

      const won = checkWin(newBoard, puzzle.solution);
      const now = Date.now();

      const newProgress: SudokuProgress = {
        ...progress,
        board: newBoard,
        mistakes: newMistakes,
        status: won ? 'won' : 'playing',
        finishedAt: won ? now : 0,
        stats: won
          ? updateStats(progress.stats, difficulty, true, now - progress.startedAt)
          : progress.stats,
      };

      setBoard(newBoard);
      setProgress(newProgress);
      saveProgress(newProgress);

      if (won) {
        setSelectedCell(null);
        setElapsedMs(now - progress.startedAt);
        setCoinReward(COIN_REWARDS[difficulty]);
      }
    },
    [board, puzzle, progress, selectedCell, difficulty],
  );

  /* ── Erase cell ──────────────────────────────────────────────────── */

  const handleErase = useCallback(() => {
    if (!puzzle || !progress || progress.status === 'won') return;
    if (selectedCell === null) return;
    if (puzzle.givenIndices.has(selectedCell)) return;

    const newBoard = [...board];
    newBoard[selectedCell] = 0;
    setBoard(newBoard);

    const newProgress = { ...progress, board: newBoard };
    setProgress(newProgress);
    saveProgress(newProgress);
  }, [board, puzzle, progress, selectedCell]);

  /* ── Physical keyboard support ──────────────────────────────────── */

  useEffect(() => {
    if (!puzzle || !progress || progress.status === 'won') return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        e.preventDefault();
        handleNumberInput(parseInt(key, 10));
      } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
        e.preventDefault();
        handleErase();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [puzzle, progress, handleNumberInput, handleErase]);

  /* ── Share ──────────────────────────────────────────────────────── */

  const shareText = useMemo(() => {
    if (!progress || progress.status !== 'won' || !puzzle) return '';
    return generateShareText(
      difficulty,
      puzzle.puzzleNumber,
      progress.mistakes,
      elapsedMs,
      true,
    );
  }, [progress, puzzle, difficulty, elapsedMs]);

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

  /* ── Derived ────────────────────────────────────────────────────── */

  const conflicts = useMemo(() => {
    if (!puzzle) return new Set<number>();
    return new Set(findConflicts(board, puzzle.givenIndices));
  }, [board, puzzle]);

  const isWon = progress?.status === 'won';
  const showDifficultySelect = puzzle === null;

  /* ── Render: Difficulty selector ───────────────────────────────── */

  if (showDifficultySelect) {
    return (
      <div
        data-testid="sudoku-root"
        className="flex flex-col gap-4 rounded-2xl bg-white p-4"
      >
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-slate-800">
            {t(`${T}.title`)}
          </h2>
          <p className="text-sm text-slate-500">
            {t(`${T}.description`)}
          </p>
        </header>

        <div className="flex flex-col gap-2" data-testid="sudoku-difficulty-selector">
          <p className="text-sm font-medium text-slate-700">
            {t(`${T}.selectDifficulty`)}
          </p>
          {DIFFICULTIES.map((diff) => {
            const stored = loadProgress();
            const completedToday = stored?.difficulty === diff && stored.status === 'won';

            return (
              <button
                key={diff}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-start transition active:scale-[0.98] ${
                  DIFFICULTY_ACCENT[diff]
                }`}
                data-testid={`sudoku-difficulty-${diff}`}
                onClick={() => handleDifficultySelect(diff)}
                type="button"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">
                    {t(`${T}.difficulty.${diff}`)}
                  </span>
                  <span className="text-xs opacity-70">
                    {t(`${T}.difficulty.${diff}Desc`)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-medium opacity-70">
                    🪙 {COIN_REWARDS[diff]}
                  </span>
                  {completedToday && (
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          className="h-11 rounded-md border-2 border-slate-300 bg-white text-sm font-semibold text-slate-700 active:scale-95"
          data-testid="sudoku-exit"
          onClick={onExit}
          type="button"
        >
          {t(`${T}.done`)}
        </button>
      </div>
    );
  }

  /* ── Render: Game board ──────────────────────────────────────────── */

  const finished = isWon;

  return (
    <div
      data-testid="sudoku-root"
      className="flex flex-col gap-3 rounded-2xl bg-white p-3"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-800">
            {t(`${T}.title`)}
          </h2>
          <span className="text-xs text-slate-500" data-testid="sudoku-puzzle-number">
            {t(`${T}.puzzleNumber`, { number: puzzle!.puzzleNumber })} · {t(`${T}.difficulty.${difficulty}`)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <span
            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium tabular-nums text-slate-600"
            data-testid="sudoku-timer"
          >
            {formatTime(elapsedMs)}
          </span>
          {/* Mistakes */}
          <span
            className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-600"
            data-testid="sudoku-mistakes"
            data-mistakes={progress?.mistakes ?? 0}
          >
            ❌ {progress?.mistakes ?? 0}
          </span>
        </div>
      </header>

      {/* Coin reward badge */}
      {finished && coinReward > 0 && (
        <div
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-700"
          data-testid="sudoku-coin-reward"
        >
          <Trophy className="h-5 w-5" aria-hidden="true" />
          <span className="font-bold">
            +{coinReward} 🪙 {t(`${T}.coinsEarned`)}
          </span>
        </div>
      )}

      {/* Sudoku grid — dir=ltr is essential inside RTL page */}
      <div
        className="mx-auto grid grid-cols-9 gap-0.5"
        dir="ltr"
        data-testid="sudoku-grid"
      >
        {board.map((value, index) => {
          const row = Math.floor(index / 9);
          const col = index % 9;
          const isGiven = puzzle!.givenIndices.has(index);
          const isSelected = selectedCell === index;
          const isConflict = conflicts.has(index);
          const isWrong = value !== 0 && value !== puzzle!.solution[index] && !isGiven;

          // Thick borders for 3x3 box separators.
          const borderClasses: string[] = [];
          if (col % 3 === 0 && col > 0) borderClasses.push('border-l-2 border-l-slate-400');
          if (row % 3 === 0 && row > 0) borderClasses.push('border-t-2 border-t-slate-400');

          const base =
            'flex h-8 w-8 items-center justify-center text-sm font-bold tabular-nums select-none sm:h-10 sm:w-10 sm:text-base';
          const look = isGiven
            ? 'bg-slate-100 text-slate-800'
            : isWrong
              ? 'bg-rose-100 text-rose-700'
              : isConflict
                ? 'bg-amber-50 text-amber-800'
                : isSelected
                  ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-400'
                  : value !== 0
                    ? 'bg-white text-slate-800'
                    : 'bg-white text-slate-300';

          return (
            <button
              aria-label={
                value !== 0
                  ? `Row ${row + 1}, Col ${col + 1}: ${value}`
                  : `Row ${row + 1}, Col ${col + 1}: empty`
              }
              className={`${base} ${look} ${borderClasses.join(' ')}`}
              data-testid={`sudoku-cell-${index}`}
              data-state={
                isGiven ? 'given' : isWrong ? 'wrong' : isSelected ? 'selected' : value !== 0 ? 'filled' : 'empty'
              }
              data-value={value}
              key={index}
              onClick={() => handleCellClick(index)}
              type="button"
              disabled={isGiven}
            >
              {value !== 0 ? value : ''}
            </button>
          );
        })}
      </div>

      {/* Number keypad — dir=ltr */}
      {!finished && (
        <div className="flex flex-col items-center gap-1.5" dir="ltr" data-testid="sudoku-keypad">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-lg font-bold text-slate-800 shadow-sm transition active:scale-95 sm:h-12 sm:w-12"
                data-testid={`sudoku-key-${num}`}
                key={num}
                onClick={() => handleNumberInput(num)}
                type="button"
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex w-full gap-1.5">
            <button
              aria-label={t(`${T}.erase`)}
              className="flex h-10 w-16 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-600 shadow-sm transition active:scale-95"
              data-testid="sudoku-erase"
              onClick={handleErase}
              type="button"
            >
              <Eraser className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Result panel */}
      {finished && (
        <section
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          data-testid="sudoku-result"
          data-status="won"
        >
          <h3 className="text-center text-lg font-bold text-slate-800">
            {t(`${T}.win.title`)}
          </h3>
          <p className="text-center text-sm text-slate-600">
            {t(`${T}.win.subtitle`, {
              time: formatTime(elapsedMs),
              mistakes: progress?.mistakes ?? 0,
            })}
          </p>

          {/* Stats */}
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-slate-500">{t(`${T}.stats.time`)}</dt>
              <dd className="text-lg font-bold text-slate-800" data-testid="sudoku-stat-time">
                {formatTime(elapsedMs)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t(`${T}.stats.mistakes`)}</dt>
              <dd className="text-lg font-bold text-slate-800" data-testid="sudoku-stat-mistakes">
                {progress?.mistakes ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t(`${T}.stats.coins`)}</dt>
              <dd className="text-lg font-bold text-slate-800" data-testid="sudoku-stat-coins">
                +{coinReward} 🪙
              </dd>
            </div>
          </dl>

          {/* Best time for this difficulty */}
          {(progress?.stats[difficulty].bestTimeMs ?? 0) > 0 && (
            <p className="text-center text-sm text-slate-500" data-testid="sudoku-best-time">
              {t(`${T}.bestTime`, { time: formatTime(progress!.stats[difficulty].bestTimeMs) })}
            </p>
          )}

          {/* Share text */}
          <pre
            className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-center text-base leading-tight"
            data-testid="sudoku-share-text"
            dir="ltr"
          >
            {shareText}
          </pre>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-bold text-white shadow-sm active:scale-95"
              data-testid="sudoku-share-whatsapp"
              onClick={shareToWhatsApp}
              type="button"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {t(`${T}.share.whatsapp`)}
            </button>
            <button
              aria-label={t(`${T}.share.copy`)}
              className="flex h-11 w-14 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-slate-700 active:scale-95"
              data-testid="sudoku-share-copy"
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

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              className="h-11 flex-1 rounded-md bg-indigo-600 text-sm font-bold text-white shadow-sm active:scale-95"
              data-testid="sudoku-new-difficulty"
              onClick={() => {
                setPuzzle(null);
                setProgress(null);
                setBoard([]);
                setSelectedCell(null);
                setCoinReward(0);
                setElapsedMs(0);
              }}
              type="button"
            >
              {t(`${T}.newGame`)}
            </button>
            <button
              className="h-11 rounded-md border-2 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 active:scale-95"
              data-testid="sudoku-exit"
              onClick={onExit}
              type="button"
            >
              {t(`${T}.done`)}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default Sudoku;
