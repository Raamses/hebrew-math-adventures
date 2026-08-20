import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Flame, Play, RotateCcw, SkipForward, Trophy, Zap } from 'lucide-react';

import type { GameComponentProps } from './registry';
import {
  appendDigit,
  BLITZ_DURATION_MS,
  BLITZ_TICK_MS,
  checkAnswer,
  computeScoreDelta,
  createInitialState,
  deleteDigit,
  difficultyForElapsed,
  finishGame,
  generateNextQuestion,
  generateShareText,
  isNewHighScore,
  loadHighScore,
  saveHighScore,
  skipQuestion,
  startGame,
  submitAnswer,
  tick,
  type BlitzHighScore,
  type BlitzState,
  type Rng,
} from './blitzEngine';

const T = 'parent.games.items.parentBlitz';

const KEYPAD_KEYS: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/* ── Component ───────────────────────────────────────────────────── */

export function ParentBlitz({ onExit }: GameComponentProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<BlitzState>(createInitialState);
  const [highScore, setHighScore] = useState<BlitzHighScore | null>(null);
  const rngRef = useRef<Rng>(Math.random);
  const savedRef = useRef(false);

  /* ── Load high score on mount ───────────────────────────────────── */

  useEffect(() => {
    setHighScore(loadHighScore());
  }, []);

  /* ── Timer interval ─────────────────────────────────────────────── */

  useEffect(() => {
    if (state.phase !== 'playing') return;
    const interval = setInterval(() => {
      setState((s) => tick(s, Date.now(), rngRef.current));
    }, BLITZ_TICK_MS);
    return () => clearInterval(interval);
  }, [state.phase]);

  /* ── Save high score on finish ──────────────────────────────────── */

  useEffect(() => {
    if (state.phase === 'finished' && !savedRef.current) {
      savedRef.current = true;
      const result: BlitzHighScore = {
        score: state.score,
        correct: state.correct,
        attempted: state.attempted,
        bestStreak: state.bestStreak,
        achievedAt: new Date().toISOString(),
      };
      if (isNewHighScore(result, highScore)) {
        saveHighScore(result);
        setHighScore(result);
      }
    }
  }, [state.phase, state.score, state.correct, state.attempted, state.bestStreak, highScore]);

  /* ── Physical keyboard support ──────────────────────────────────── */

  useEffect(() => {
    if (state.phase !== 'playing') return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (/^[0-9]$/.test(key)) {
        e.preventDefault();
        setState((s) => appendDigit(s, key));
      } else if (key === 'Backspace') {
        e.preventDefault();
        setState((s) => deleteDigit(s));
      } else if (key === 'Enter') {
        e.preventDefault();
        setState((s) => submitAnswer(s, Date.now(), rngRef.current));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.phase]);

  /* ── Handlers ──────────────────────────────────────────────────── */

  const handleStart = useCallback(() => {
    savedRef.current = false;
    setState(startGame(Date.now(), rngRef.current));
  }, []);

  const handleReplay = useCallback(() => {
    savedRef.current = false;
    setState(startGame(Date.now(), rngRef.current));
  }, []);

  const handleDigit = useCallback((digit: string) => {
    setState((s) => appendDigit(s, digit));
  }, []);

  const handleBackspace = useCallback(() => {
    setState((s) => deleteDigit(s));
  }, []);

  const handleSubmit = useCallback(() => {
    setState((s) => submitAnswer(s, Date.now(), rngRef.current));
  }, []);

  const handleSkip = useCallback(() => {
    setState((s) => skipQuestion(s, Date.now(), rngRef.current));
  }, []);

  /* ── Derived ────────────────────────────────────────────────────── */

  const isHighScore = state.phase === 'finished' && highScore !== null && state.score === highScore.score && state.score > 0;
  const timerPercent = state.phase === 'playing'
    ? Math.max(0, Math.min(100, (state.remainingMs / BLITZ_DURATION_MS) * 100))
    : 0;
  const secondsLeft = Math.ceil(state.remainingMs / 1000);

  /* ── Render: Idle ───────────────────────────────────────────────── */

  if (state.phase === 'idle') {
    return (
      <div
        data-testid="parent-blitz-root"
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
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Zap className="h-6 w-6" aria-hidden="true" />
          </span>
        </header>

        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700">{t(`${T}.howToPlay`)}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500">
            <li>• {t(`${T}.rules.time`)}</li>
            <li>• {t(`${T}.rules.scoring`)}</li>
            <li>• {t(`${T}.rules.streak`)}</li>
          </ul>
        </div>

        {highScore && (
          <div
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-700"
            data-testid="parent-blitz-high-score"
          >
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">
              {t(`${T}.results.previousBest`, { score: highScore.score })}
            </span>
          </div>
        )}

        <button
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 text-base font-bold text-white shadow-sm transition active:scale-95"
          data-testid="parent-blitz-start"
          onClick={handleStart}
          type="button"
        >
          <Play className="h-5 w-5" aria-hidden="true" />
          {t(`${T}.start`)}
        </button>
      </div>
    );
  }

  /* ── Render: Playing ───────────────────────────────────────────── */

  if (state.phase === 'playing') {
    return (
      <div
        data-testid="parent-blitz-root"
        className="flex flex-col gap-3 rounded-2xl bg-white p-4"
      >
        {/* Timer bar */}
        <div data-testid="parent-blitz-timer-bar" className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span
              className="flex items-center gap-1 text-sm font-medium text-slate-600"
              role="timer"
              aria-label={t(`${T}.hud.timerLabel`, { seconds: secondsLeft })}
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span data-testid="parent-blitz-time-remaining" className="tabular-nums">
                {secondsLeft}
              </span>
            </span>
            <span className="text-sm font-bold text-slate-800 tabular-nums" data-testid="parent-blitz-score">
              {state.score}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-100 ease-linear"
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>

        {/* Streak indicator */}
        <div className="flex items-center justify-center gap-1" aria-live="polite">
          <span
            className="flex items-center gap-1 text-sm font-medium"
            data-testid="parent-blitz-streak"
            data-streak={state.streak}
          >
            <Flame className={`h-4 w-4 ${state.streak >= 3 ? 'text-orange-500' : 'text-slate-400'}`} aria-hidden="true" />
            <span className="tabular-nums text-slate-600">{state.streak}</span>
          </span>
        </div>

        {/* Feedback flash */}
        {state.lastResult && (
          <div
            className={`text-center text-sm font-medium ${
              state.lastResult === 'correct' ? 'text-emerald-600' : 'text-rose-500'
            }`}
            aria-live="polite"
            data-testid="parent-blitz-feedback"
            data-result={state.lastResult}
          >
            {state.lastResult === 'correct'
              ? t(`${T}.feedback.correct`)
              : t(`${T}.feedback.wrong`, { answer: state.history[state.history.length - 1]?.questionId ?? '' })}
          </div>
        )}

        {/* Question card — dir=ltr is essential inside RTL page */}
        <div
          className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-6"
          dir="ltr"
          data-testid="parent-blitz-question"
        >
          <span className="text-3xl font-bold tabular-nums text-slate-800">
            {state.question?.display}
          </span>
        </div>

        {/* Input display — dir=ltr */}
        <div
          className="flex items-center justify-center rounded-xl border-2 border-slate-300 bg-white py-3"
          dir="ltr"
          data-testid="parent-blitz-input"
        >
          <span className="text-2xl font-bold tabular-nums text-slate-800">
            {state.input || <span className="text-slate-300">?</span>}
          </span>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2" dir="ltr" data-testid="parent-blitz-keypad">
          {KEYPAD_KEYS.slice(0, 9).map((key) => (
            <button
              className="flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-800 shadow-sm transition active:scale-95"
              data-testid={`parent-blitz-key-${key}`}
              key={key}
              onClick={() => handleDigit(key)}
              type="button"
            >
              {key}
            </button>
          ))}
          <button
            aria-label={t(`${T}.keypad.backspace`)}
            className="flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-600 shadow-sm transition active:scale-95"
            data-testid="parent-blitz-key-backspace"
            onClick={handleBackspace}
            type="button"
          >
            ⌫
          </button>
          <button
            className="flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-800 shadow-sm transition active:scale-95"
            data-testid="parent-blitz-key-0"
            onClick={() => handleDigit('0')}
            type="button"
          >
            0
          </button>
          <button
            aria-label={t(`${T}.keypad.submit`)}
            className="flex h-14 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm transition active:scale-95"
            data-testid="parent-blitz-key-submit"
            onClick={handleSubmit}
            type="button"
          >
            ✓
          </button>
        </div>

        {/* Skip button */}
        <button
          className="flex h-10 items-center justify-center gap-1 rounded-lg text-sm font-medium text-slate-500 transition hover:bg-slate-100"
          data-testid="parent-blitz-skip"
          onClick={handleSkip}
          type="button"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          {t(`${T}.skip`)}
        </button>
      </div>
    );
  }

  /* ── Render: Finished ───────────────────────────────────────────── */

  const accuracy = state.attempted > 0
    ? Math.round((state.correct / state.attempted) * 100)
    : 0;

  return (
    <div
      data-testid="parent-blitz-root"
      className="flex flex-col gap-4 rounded-2xl bg-white p-4"
    >
      <section
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        data-testid="parent-blitz-results"
      >
        <h3 className="text-center text-lg font-bold text-slate-800">
          {t(`${T}.results.heading`)}
        </h3>

        {isHighScore && (
          <div
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-700"
            data-testid="parent-blitz-new-record"
          >
            <Trophy className="h-5 w-5" aria-hidden="true" />
            <span className="font-bold">{t(`${T}.results.newRecord`)}</span>
          </div>
        )}

        <div className="text-center">
          <span className="text-sm text-slate-500">{t(`${T}.results.finalScore`)}</span>
          <p
            className="text-4xl font-bold tabular-nums text-slate-800"
            data-testid="parent-blitz-final-score"
          >
            {state.score}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-slate-500">{t(`${T}.results.accuracy`)}</dt>
            <dd className="text-lg font-bold text-slate-800" data-testid="parent-blitz-accuracy">
              {accuracy}%
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t(`${T}.hud.score`)}</dt>
            <dd className="text-lg font-bold text-slate-800" data-testid="parent-blitz-correct">
              {state.correct}/{state.attempted}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t(`${T}.results.bestStreak`)}</dt>
            <dd className="text-lg font-bold text-slate-800" data-testid="parent-blitz-best-streak">
              {state.bestStreak}
            </dd>
          </div>
        </dl>

        {highScore && !isHighScore && (
          <p className="text-center text-sm text-slate-500" data-testid="parent-blitz-previous-best">
            {t(`${T}.results.previousBest`, { score: highScore.score })}
          </p>
        )}

        <div className="flex gap-2">
          <button
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-bold text-white shadow-sm transition active:scale-95"
            data-testid="parent-blitz-replay"
            onClick={handleReplay}
            type="button"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t(`${T}.replay`)}
          </button>
          <button
            className="flex h-11 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 active:scale-95"
            data-testid="parent-blitz-exit"
            onClick={onExit}
            type="button"
          >
            {t(`${T}.done`)}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ParentBlitz;
