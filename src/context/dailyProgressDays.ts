import { getDailyChallenge } from '../data/dailyChallenges';
import { getDailyQuests } from '../data/dailyQuests';
import { israelDay, shiftDay, utcDay } from '../lib/israelDate';

export interface DailyProgress {
  dailyStamps: string[]; // dates completed (YYYY-MM-DD, Israel day)
  totalCoinsEarned: number;
  dailyChallengeCorrect: number; // accumulated correct answers for today's challenge
  dailyChallengeDate: string; // date of current challenge progress (resets daily)
  questProgress?: Record<string, number>;  // questId → progress count
  questClaimed?: string[];                  // claimed quest IDs
  questDate?: string;                       // date of current quest progress (resets daily)
  /** 'il' once the day keys are Israel days. Absent = saved before 2026-11-16, keyed by the UTC day. */
  dayKey?: 'il';
}

/**
 * Carry progress saved under UTC day keys over to Israel day keys, once.
 *
 * The rule: nothing done today is lost or done twice, and nothing is paid for work the kid did not do.
 * - When the UTC day and the Israel day are the same (Israel 02:00/03:00 to midnight), every key already means
 *   the same day, so nothing changes.
 * - Between Israel midnight and UTC midnight (00:00 to 02:00/03:00 Israel time), the old code still treated the
 *   UTC day as today, one day behind Israel. Its "today" was a different day's content: the daily seed changes
 *   every day, so the challenge and each quest slot usually mean something else on the Israel day.
 *   - The completed stamp moves to the Israel day (today's challenge counts as done, the streak chain is unbroken,
 *     no coins are paid). The UTC stamp stays as well.
 *   - The challenge's correct-answer count moves only if the Israel day's challenge is the same (mode, problem
 *     type and target); otherwise it stays on the old day and the provider resets it.
 *   - Quest progress and claims move slot by slot only where the Israel day's quest has the same metric and
 *     target; the rest stays on the old day's ids, which no longer match any quest.
 *
 * Saved data has no time of day, so a stamp made late in the Israel evening and one made after Israel midnight
 * look the same. Both count as today, which is what the kid saw just before the switch.
 *
 * Other day-keyed stores are not migrated (pet.lastFedDate, the parent streak's lastPlayedDate, the Equation and
 * Sudoku stored date): in that window they can differ by one day once, see the ADR 2026-11-israel-midnight-day.
 */
export function migrateUtcDayKeys(p: DailyProgress, now: Date | number = Date.now()): DailyProgress {
  if (p.dayKey === 'il') return p;
  const out: DailyProgress = { ...p, dayKey: 'il' };
  const u = utcDay(now);
  const il = israelDay(now);
  if (u === il) return out;

  if (p.dailyStamps.includes(u) && !p.dailyStamps.includes(il)) out.dailyStamps = [...p.dailyStamps, il];

  const oldC = getDailyChallenge(new Date(`${u}T12:00:00Z`));
  const newC = getDailyChallenge(new Date(now));
  const sameChallenge = oldC.mode === newC.mode && oldC.problemType === newC.problemType && oldC.target === newC.target;
  if (sameChallenge && p.dailyChallengeDate === u) out.dailyChallengeDate = il;

  if (p.questDate === u) {
    const oldQ = getDailyQuests(new Date(`${u}T12:00:00Z`));
    const newQ = getDailyQuests(new Date(now));
    const carry = new Map<string, string>();
    oldQ.forEach((q, slot) => {
      const n = newQ[slot];
      if (n && n.metric === q.metric && n.target === q.target) carry.set(q.id, n.id);
    });
    out.questDate = il;
    out.questProgress = Object.fromEntries(
      Object.entries(p.questProgress ?? {}).flatMap(([id, n]) => (carry.has(id) ? [[carry.get(id) as string, n]] : [])),
    );
    out.questClaimed = (p.questClaimed ?? []).flatMap(id => (carry.has(id) ? [carry.get(id) as string] : []));
  }
  return out;
}

/**
 * Consecutive-day streak of daily-challenge stamps, alive if the last stamp is today or yesterday (Israel days).
 * Duplicate stamps count once (the old version let a repeated stamp break the chain).
 */
export function computeStreak(stamps: string[], now: Date | number = Date.now()): number {
  if (stamps.length === 0) return 0;
  const sorted = [...new Set(stamps)].sort();
  const today = israelDay(now);
  const last = sorted[sorted.length - 1];
  if (last !== today && last !== shiftDay(today, -1)) return 0;

  let streak = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (shiftDay(sorted[i], 1) !== sorted[i + 1]) break;
    streak++;
  }
  return streak;
}
