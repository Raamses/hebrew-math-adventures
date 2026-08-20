import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarDays, Zap, Layers, Puzzle, Grid3x3 } from 'lucide-react';

import { EquationOfTheDay } from './EquationOfTheDay';
import { ParentBlitz } from './ParentBlitz';
import { Sudoku } from './Sudoku';

/** Stable, URL-safe identifiers. Never localise or reuse these. */
export type GameId =
  | 'equation-of-the-day'
  | 'parent-blitz'
  | 'number-merge'
  | 'sudoku'
  | 'math-crossword';

export type GameStatus = 'available' | 'coming_soon';

/** Props every playable game receives from ParentGamesHub. */
export interface GameComponentProps {
  /** Return to the game list. The hub also renders its own back button. */
  onExit: () => void;
}

interface GameBase {
  id: GameId;
  /**
   * camelCase segment under `parent.games.items` in the translation files.
   * Kept separate from `id` so translation keys survive an id rename.
   */
  i18nKey: string;
  icon: LucideIcon;
  /** Tailwind classes for the card's icon tile. */
  accentClass: string;
}

interface AvailableGame extends GameBase {
  status: 'available';
  component: ComponentType<GameComponentProps>;
}

interface ComingSoonGame extends GameBase {
  status: 'coming_soon';
  component?: never;
}

/**
 * Discriminated union: an `available` game must supply a component, and a
 * `coming_soon` game must not. The compiler enforces both.
 */
export type GameDefinition = AvailableGame | ComingSoonGame;

export const GAMES: readonly GameDefinition[] = [
  {
    id: 'equation-of-the-day',
    i18nKey: 'equationOfTheDay',
    status: 'available',
    icon: CalendarDays,
    accentClass: 'bg-indigo-100 text-indigo-600',
    component: EquationOfTheDay,
  },
  {
    id: 'parent-blitz',
    i18nKey: 'parentBlitz',
    status: 'available',
    icon: Zap,
    accentClass: 'bg-amber-100 text-amber-600',
    component: ParentBlitz,
  },
  {
    id: 'sudoku',
    i18nKey: 'sudoku',
    status: 'available',
    icon: Grid3x3,
    accentClass: 'bg-teal-100 text-teal-600',
    component: Sudoku,
  },
  {
    id: 'number-merge',
    i18nKey: 'numberMerge',
    status: 'coming_soon',
    icon: Layers,
    accentClass: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'math-crossword',
    i18nKey: 'mathCrossword',
    status: 'coming_soon',
    icon: Puzzle,
    accentClass: 'bg-rose-100 text-rose-600',
  },
] as const;

export function getGameById(id: GameId | null): GameDefinition | undefined {
  if (!id) return undefined;
  return GAMES.find((game) => game.id === id);
}

/** Translation key helpers — the single source of truth for key shape. */
export function gameTitleKey(game: GameDefinition): string {
  return `parent.games.items.${game.i18nKey}.title`;
}

export function gameDescriptionKey(game: GameDefinition): string {
  return `parent.games.items.${game.i18nKey}.description`;
}
