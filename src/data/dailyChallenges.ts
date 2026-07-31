// Deterministic daily challenge from date seed — no backend needed.
// Every kid gets the same challenge each day.

export interface DailyChallenge {
  date: string; // YYYY-MM-DD
  mode: 'zen' | 'classic' | 'blitz' | 'survival';
  problemType: string; // e.g. 'addition_simple', 'sub_simple', 'multiplication', 'series', 'compare'
  target: number; // e.g. 15 correct answers
  timeLimit?: number; // seconds, for blitz/survival
  reward: number; // coins awarded
  titleKey: string; // i18n key
  descriptionKey: string; // i18n key
}

const MODES = ['zen', 'classic', 'blitz', 'survival'] as const;
const PROBLEM_TYPES = ['addition_simple', 'sub_simple', 'multiplication', 'series', 'compare'];

export function getDailyChallenge(date?: Date): DailyChallenge {
  const today = (date || new Date()).toISOString().slice(0, 10);
  const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0);

  const dailyMode = MODES[seed % MODES.length];
  const dailyType = PROBLEM_TYPES[seed % PROBLEM_TYPES.length];
  const dailyTarget = 10 + (seed % 10); // 10-19
  const timeLimit =
    dailyMode === 'blitz' ? 60 : dailyMode === 'survival' ? undefined : 90;

  return {
    date: today,
    mode: dailyMode,
    problemType: dailyType,
    target: dailyTarget,
    timeLimit,
    reward: 10 + (seed % 5) * 2, // 10-18 coins
    titleKey: 'daily.title',
    descriptionKey: 'daily.description',
  };
}

/**
 * Streak bonus multiplier based on consecutive days completed.
 * 3+ days = 1.5x, 7+ days = 2x, otherwise 1x.
 */
export function getStreakMultiplier(streak: number): number {
  if (streak >= 7) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}