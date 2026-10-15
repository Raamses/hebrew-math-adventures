import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Play, RotateCcw, Trophy } from 'lucide-react';

import type { GameComponentProps } from './registry';
import {
  applyMove,
  calculateCoinReward,
  continueAfterWin,
  createInitialState,
  generateShareText,
  GRID_SIZE,
  isNewHighScore,
  loadHighScore,
  mulberry32,
  saveHighScore,
  startGame,
  type Direction,
  type GameState,
  type HighScore,
  type Tile,
} from './mergeEngine';

const T = 'parent.games.items.numberMerge';

/** Minimum swipe distance in pixels to register a move. */
const SWIPE_THRESHOLD = 30;

/** Tailwind classes for each tile value. */
const TILE_STYLES: Record<number, string> = {
  2: 'bg-slate-100 text-slate-700',
  4: 'bg-slate-200 text-slate-700',
  8: 'bg-amber-100 text-amber-800',
  16: 'bg-amber-200 text-amber-900',
  32: 'bg-orange-200 text-orange-900',
  64: 'bg-orange-300 text-orange-900',
  128: 'bg-yellow-200 text-yellow-900',
  256: 'bg-yellow-300 text-yellow-900',
  512: 'bg-lime-200 text-lime-900',
  1024: 'bg-emerald-200 text-emerald-900',
  2048: 'bg-emerald-400 text-white',
};

/** Font size for large tile values (to fit 4 digits). */
const TILE_FONT_SIZE: Record<number, string> = {
  2: 'text-2xl',
  4: 'text-2xl',
  8: 'text-2xl',
  16: 'text-2xl',
  32: 'text-2xl',
  64: 'text-2xl',
  128: 'text-xl',
  256: 'text-xl',
  512: 'text-xl',
  1024: 'text-lg',
  2048: 'text-lg',
};

function tileStyle(value: number): string {
  return (
    TILE_STYLES[value] ??
    (value > 2048 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700')
  );
}

function tileFontSize(value: number): string {
  return TILE_FONT_SIZE[value] ?? 'text-base';
}

/* ── Touch / Swipe Detection ───────────────────────────────────── */

interface TouchStart {
  x: number;
  y: number;
}

function getDirection(
  dx: number,
  dy: number,
): Direction | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < SWIPE_THRESHOLD && absY < SWIPE_THRESHOLD) return null;
  if (absX > absY) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

/* ── Component ───────────────────────────────────────────────────── */

export function NumberMerge({ onExit }: GameComponentProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<GameState>(createInitialState);
  const [highScore, setHighScore] = useState<HighScore | null>(null);
  const [coinReward, setCoinReward] = useState(0);
  const [copied, setCopied] = useState(false);
  const rngRef = useRef(mulberry32(Date.now()));
  const savedRef = useRef(false);
  const touchStartRef = useRef<TouchStart | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  /* ── Load high score on mount ───────────────────────────────────── */

  useEffect(() => {
    setHighScore(loadHighScore());
  }, []);

  /* ── Save high score on game end ────────────────────────────────── */

  useEffect(() => {
    if ((state.phase === 'over' || state.phase === 'won') && !savedRef.current) {
      savedRef.current = true;
      const result: HighScore = {
        score: state.score,
        bestTile: state.bestTile,
        achievedAt: new Date().toISOString(),
      };
      if (isNewHighScore(result, highScore)) {
        saveHighScore(result);
        setHighScore(result);
      }
      setCoinReward(calculateCoinReward(state.bestTile));
    }
  }, [state.phase, state.score, state.bestTile, highScore]);

  /* ── Keyboard support ──────────────────────────────────────────── */

  useEffect(() => {
    if (state.phase !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        setState((s) => applyMove(s, dir, rngRef.current));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.phase]);

  /* ── Touch handlers ────────────────────────────────────────────── */

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (state.phase !== 'playing') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [state.phase]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (state.phase !== 'playing') return;
    const start = touchStartRef.current;
    if (!start) return;
    touchStartRef.current = null;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dir = getDirection(dx, dy);
    if (dir) {
      setState((s) => applyMove(s, dir, rngRef.current));
    }
  }, [state.phase]);

  /* ── Action handlers ───────────────────────────────────────────── */

  const handleStart = useCallback(() => {
    savedRef.current = false;
    setCoinReward(0);
    setCopied(false);
    rngRef.current = mulberry32(Date.now() ^ Math.floor(Math.random() * 1_000_000));
    setState(startGame(rngRef.current));
  }, []);

  const handleReplay = useCallback(() => {
    savedRef.current = false;
    setCoinReward(0);
    setCopied(false);
    rngRef.current = mulberry32(Date.now() ^ Math.floor(Math.random() * 1_000_000));
    setState(startGame(rngRef.current));
  }, []);

  const handleContinue = useCallback(() => {
    setState((s) => continueAfterWin(s));
  }, []);

  const handleShare = useCallback(() => {
    const text = generateShareText(state.score, state.bestTile, state.won);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [state.score, state.bestTile, state.won]);

  const handleCopy = useCallback(() => {
    const text = generateShareText(state.score, state.bestTile, state.won);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Ignore clipboard errors.
    });
  }, [state.score, state.bestTile, state.won]);

  /* ── Derived ────────────────────────────────────────────────────── */

  const isNewRecord =
    (state.phase === 'over' || state.phase === 'won') &&
    highScore !== null &&
    state.score === highScore.score &&
    state.score > 0;

  /* ── Render: Idle ───────────────────────────────────────────────── */

  if (state.phase === 'idle') {
    return (
      <div
        data-testid="game-number-merge"
        className="flex flex-col gap-4 rounded-2xl bg-white p-4"
      >
        <header className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800">
              {t(`${T}.title`)}
            </h2>
            <p className="text-sm text-slate-500">
              {t(`${T}.description`)}
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Layers className="h-6 w-6" aria-hidden="true" />
          </span>
        </header>

        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700">{t(`${T}.howToPlay`)}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500">
            <li>• {t(`${T}.rules.swipe`)}</li>
            <li>• {t(`${T}.rules.merge`)}</li>
            <li>• {t(`${T}.rules.target`)}</li>
          </ul>
        </div>

        {highScore && highScore.score > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700"
            data-testid="number-merge-high-score"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              {t(`${T}.bestScore`, { score: highScore.score })}
            </span>
          </div>
        )}

        <button
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-white shadow-sm transition active:scale-95"
          data-testid="number-merge-start"
          onClick={handleStart}
          type="button"
        >
          <Play className="h-5 w-5" aria-hidden="true" />
          {t(`${T}.start`)}
        </button>
      </div>
    );
  }

  /* ── Render: Playing / Won / Over ──────────────────────────────── */

  const isFinished = state.phase === 'over' || state.phase === 'won';

  return (
    <div
      data-testid="game-number-merge"
      className="flex flex-col gap-3 rounded-2xl bg-white p-4"
    >
      {/* Score bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-500">{t(`${T}.scoreLabel`)}</span>
          <span
            className="text-xl font-bold tabular-nums text-slate-800"
            data-testid="number-merge-score"
          >
            {state.score}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-slate-500">{t(`${T}.bestLabel`)}</span>
          <span
            className="text-xl font-bold tabular-nums text-slate-800"
            data-testid="number-merge-best-score"
          >
            {state.bestScore}
          </span>
        </div>
      </div>

      {/* Game board — dir=ltr is essential inside RTL page */}
      <div
        ref={boardRef}
        className="relative mx-auto select-none touch-none rounded-xl bg-slate-200 p-2"
        dir="ltr"
        data-testid="number-merge-board"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ width: 'fit-content' }}
      >
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            const tile = state.board[row][col];
            return (
              <div
                key={idx}
                className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-300/40 sm:h-20 sm:w-20"
                data-testid={`number-merge-cell-${row}-${col}`}
              >
                {tile && (
                  <TileView tile={tile} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Swipe hint while playing */}
      {state.phase === 'playing' && (
        <p className="text-center text-xs text-slate-400" data-testid="number-merge-hint">
          {t(`${T}.swipeHint`)}
        </p>
      )}

      {/* Coin reward badge */}
      {isFinished && coinReward > 0 && (
        <div
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-700"
          data-testid="number-merge-coin-reward"
        >
          <Trophy className="h-5 w-5" aria-hidden="true" />
          <span className="font-bold">
            +{coinReward} 🪙 {t(`${T}.coinsEarned`)}
          </span>
        </div>
      )}

      {/* Win overlay */}
      {state.phase === 'won' && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          data-testid="number-merge-win-overlay"
        >
          <h3 className="text-center text-lg font-bold text-emerald-800">
            {t(`${T}.win.title`)}
          </h3>
          <p className="text-center text-sm text-emerald-700">
            {t(`${T}.win.subtitle`, { tile: state.bestTile })}
          </p>
          <div className="flex gap-2">
            <button
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm transition active:scale-95"
              data-testid="number-merge-continue"
              onClick={handleContinue}
              type="button"
            >
              {t(`${T}.continue`)}
            </button>
            <button
              className="flex h-11 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 active:scale-95"
              data-testid="number-merge-exit-win"
              onClick={onExit}
              type="button"
            >
              {t(`${T}.done`)}
            </button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {state.phase === 'over' && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          data-testid="number-merge-over-overlay"
        >
          <h3 className="text-center text-lg font-bold text-slate-800">
            {t(`${T}.over.title`)}
          </h3>

          {isNewRecord && (
            <div
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700"
              data-testid="number-merge-new-record"
            >
              <Trophy className="h-5 w-5" aria-hidden="true" />
              <span className="font-bold">{t(`${T}.over.newRecord`)}</span>
            </div>
          )}

          <div className="text-center">
            <span className="text-sm text-slate-500">{t(`${T}.over.finalScore`)}</span>
            <p
              className="text-4xl font-bold tabular-nums text-slate-800"
              data-testid="number-merge-final-score"
            >
              {state.score}
            </p>
          </div>

          {highScore && !isNewRecord && (
            <p className="text-center text-sm text-slate-500" data-testid="number-merge-previous-best">
              {t(`${T}.bestScore`, { score: highScore.score })}
            </p>
          )}

          <div className="flex gap-2">
            <button
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm transition active:scale-95"
              data-testid="number-merge-replay"
              onClick={handleReplay}
              type="button"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t(`${T}.replay`)}
            </button>
            <button
              className="flex h-11 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 active:scale-95"
              data-testid="number-merge-exit"
              onClick={onExit}
              type="button"
            >
              {t(`${T}.done`)}
            </button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 active:scale-95"
              data-testid="number-merge-share-whatsapp"
              onClick={handleShare}
              type="button"
            >
              {t(`${T}.share.whatsapp`)}
            </button>
            <button
              className="flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 active:scale-95"
              data-testid="number-merge-share-copy"
              onClick={handleCopy}
              type="button"
            >
              {copied ? t(`${T}.share.copied`) : t(`${T}.share.copy`)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tile View ────────────────────────────────────────────────────── */

function TileView({ tile }: { tile: Tile }) {
  return (
    <div
      className={[
        'flex h-full w-full items-center justify-center rounded-lg font-bold transition-all',
        'duration-150 ease-out',
        tile.isNew ? 'scale-90 animate-pulse' : '',
        tileStyle(tile.value),
        tileFontSize(tile.value),
      ].join(' ')}
      data-testid={`number-merge-tile-${tile.value}`}
      data-tile-id={tile.id}
    >
      {tile.value}
    </div>
  );
}

export default NumberMerge;
