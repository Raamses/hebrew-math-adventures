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
 * The rule: right after the switch, the kid sees exactly what the old code showed a moment before. Nothing done
 * today is lost and nothing done today can be done again; the day then rolls over at the next Israel midnight.
 * - When the UTC day and the Israel day are the same (Israel 02:00/03:00 to midnight), every key already means
 *   the same day, so nothing changes.
 * - Between Israel midnight and UTC midnight (00:00 to 02:00/03:00 Israel time), the old code still treated the
 *   UTC day as today, one day behind Israel. Whatever it held as today moves to the Israel day: the challenge's
 *   correct-answer count, quest progress and claims (quest ids carry the day), and the completed stamp. The UTC
 *   stamp stays as well, so the streak chain is not broken.
 *
 * Saved data has no time of day, so a stamp made late in the Israel evening and one made after Israel midnight
 * look the same. Both are treated as today, which is what the kid saw before the switch.
 */
export function migrateUtcDayKeys(p: DailyProgress, now: Date | number = Date.now()): DailyProgress {
  if (p.dayKey === 'il') return p;
  const out: DailyProgress = { ...p, dayKey: 'il' };
  const u = utcDay(now);
  const il = israelDay(now);
  if (u === il) return out;

  const day = (d: string | undefined) => (d === u ? il : d);
  const id = (q: string) => (q.startsWith(`${u}:`) ? `${il}:${q.slice(u.length + 1)}` : q);
  out.dailyChallengeDate = day(p.dailyChallengeDate) ?? '';
  out.questDate = day(p.questDate);
  if (p.questProgress) {
    out.questProgress = Object.fromEntries(Object.entries(p.questProgress).map(([q, n]) => [id(q), n]));
  }
  if (p.questClaimed) out.questClaimed = p.questClaimed.map(id);
  if (p.dailyStamps.includes(u) && !p.dailyStamps.includes(il)) out.dailyStamps = [...p.dailyStamps, il];
  return out;
}

/** Consecutive-day streak of daily-challenge stamps, alive if the last stamp is today or yesterday (Israel days). */
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
