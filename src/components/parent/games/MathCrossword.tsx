import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RotateCcw, ArrowRight, Sparkles, Delete } from 'lucide-react';
import { MathText } from '../../common/MathText';
import { createGameResult, type GameComponentProps } from './registry';
import { useParentEconomy } from '../../../hooks/useParentEconomy';
import {
  generateCrossword,
  checkCrossword,
  type CrosswordMode,
  type CrosswordPuzzle,
} from './crosswordEngine';

const CROSSWORD_BASE_SCORE = 50;
const T = 'parent.games.items.mathCrossword';

function findFirstBlank(p: CrosswordPuzzle): [number, number] | null {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (!p.grid[r][c].isGiven && p.grid[r][c].type !== 'empty') {
        return [r, c];
      }
    }
  }
  return null;
}

function crosswordCellClass(empty: boolean, given: boolean, sel: boolean, wrong: boolean): string {
  if (empty) return 'border-transparent bg-transparent cursor-default';
  if (given) return 'border-slate-200 bg-slate-200 text-slate-700';
  if (sel) return 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-400';
  if (wrong) return 'border-rose-400 bg-rose-50 text-rose-700';
  return 'border-slate-300 bg-white text-slate-900 hover:border-indigo-300';
}

export function MathCrossword({ onExit, onCoinsEarned }: GameComponentProps) {
  const { t } = useTranslation();
  const { recordGameResult } = useParentEconomy();

  const [mode, setMode] = useState<CrosswordMode>('daily');
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle>(() => generateCrossword('daily'));
  const [userAnswers, setUserAnswers] = useState<string[][]>(() =>
    puzzle.grid.map((row) => row.map((c) => (c.isGiven ? c.char : ''))),
  );
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(() => findFirstBlank(puzzle));
  const [wrongCells, setWrongCells] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);
  const recordedRef = useRef(false);

  const initPuzzle = useCallback((newPuzzle: CrosswordPuzzle) => {
    setPuzzle(newPuzzle);
    setUserAnswers(newPuzzle.grid.map((row) => row.map((c) => (c.isGiven ? c.char : ''))));
    setSelectedCell(findFirstBlank(newPuzzle));
    setWrongCells(new Set());
    setWon(false);
    recordedRef.current = false;
  }, []);

  const switchMode = useCallback((newMode: CrosswordMode) => {
    setMode(newMode);
    initPuzzle(generateCrossword(newMode));
  }, [initPuzzle]);

  const handleDigit = useCallback((digit: string) => {
    if (!selectedCell || won) return;
    const [r, c] = selectedCell;
    if (puzzle.grid[r][c].isGiven || puzzle.grid[r][c].type === 'empty') return;
    setUserAnswers((prev) => prev.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? digit : v)) : row)));
    setWrongCells((prev) => { const next = new Set(prev); next.delete(`${r}-${c}`); return next; });
  }, [selectedCell, won, puzzle]);

  const handleClear = () => {
    if (!selectedCell || won) return;
    const [r, c] = selectedCell;
    setUserAnswers((prev) => prev.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? '' : v)) : row)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleDigit]);

  const handleCheck = useCallback(() => {
    if (won) return;
    const res = checkCrossword(puzzle, userAnswers);
    setWrongCells(new Set(res.results.filter((r) => !r.correct).map((r) => `${r.row}-${r.col}`)));
    if (res.solved) {
      setWon(true);
      if (!recordedRef.current) {
        recordedRef.current = true;
        const outcome = recordGameResult(createGameResult('math-crossword', { score: CROSSWORD_BASE_SCORE, won: true }));
        onCoinsEarned?.(outcome.coinsEarned.coins);
      }
    }
  }, [won, puzzle, userAnswers, recordGameResult, onCoinsEarned]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-md mx-auto" dir="rtl">
      <div className="flex w-full items-center justify-between">
        <button type="button" onClick={onExit} data-testid="crossword-exit"
          className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowRight className="h-4 w-4" />
          <span>{t('parent.exit')}</span>
        </button>
        <div className="flex gap-2">
          {(['daily', 'free'] as const).map((m) => (
            <button key={m} type="button" data-testid={`crossword-mode-${m}`} onClick={() => switchMode(m)}
              className={`px-3 py-1 text-sm rounded-full font-medium ${mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {t(`${T}.mode${m === 'daily' ? 'Daily' : 'Free'}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">{t(`${T}.howTo`)}</p>

      {won && (
        <div data-testid="crossword-solved" className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-800 font-semibold flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <span>{t(`${T}.solved`)}</span>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5 p-3 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner" dir="ltr">
        {puzzle.grid.flatMap((row, r) =>
          row.map((cell, c) => {
            const sel = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const wrong = wrongCells.has(`${r}-${c}`);
            const empty = cell.type === 'empty';
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-testid={`crossword-cell-${r}-${c}`}
                disabled={empty || cell.isGiven || won}
                onClick={() => setSelectedCell([r, c])}
                className={`h-11 w-11 sm:h-12 sm:w-12 rounded-lg font-bold text-lg flex items-center justify-center transition border ${crosswordCellClass(empty, cell.isGiven, sel, wrong)}`}
              >
                {sel && <span data-testid="crossword-cell-selected" className="sr-only" />}
                {wrong && <span data-testid="crossword-cell-wrong" className="sr-only" />}
                <MathText>{empty ? '' : cell.isGiven ? cell.char : userAnswers[r][c]}</MathText>
              </button>
            );
          }),
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" data-testid="crossword-check" onClick={handleCheck} disabled={won}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow hover:bg-indigo-700 disabled:opacity-50">
          <Check className="h-4 w-4" />
          <span>{t(`${T}.check`)}</span>
        </button>
        <button type="button" data-testid="crossword-clear" disabled={!selectedCell || won} onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 disabled:opacity-40">
          <Delete className="h-4 w-4" />
          <span>{t(`${T}.clear`)}</span>
        </button>
        {(won || mode === 'free') && (
          <button type="button" data-testid="crossword-new-free" onClick={() => { setMode('free'); initPuzzle(generateCrossword('free')); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-800 rounded-xl font-medium hover:bg-amber-200">
            <RotateCcw className="h-4 w-4" />
            <span>{t(`${T}.newPuzzle`)}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 w-full max-w-xs" dir="ltr">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
          <button key={d} type="button" data-testid={`crossword-digit-${d}`} onClick={() => handleDigit(String(d))} disabled={won}
            className="h-10 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-slate-800 hover:bg-slate-200 active:scale-95 transition">
            <MathText>{d}</MathText>
          </button>
        ))}
      </div>
    </div>
  );
}
