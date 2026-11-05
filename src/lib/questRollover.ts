export interface DailyProgress {
  dailyStamps: string[]; // dates completed (YYYY-MM-DD)
  totalCoinsEarned: number;
  dailyChallengeCorrect: number; // accumulated correct answers for today's challenge
  dailyChallengeDate: string; // date of current challenge progress (resets daily)
  questProgress?: Record<string, number>;  // questId → progress count
  questClaimed?: string[];                  // claimed quest IDs
  questDate?: string;                       // date of current quest progress (resets daily)
}

/**
 * Rollover quests selectively:
 * - On questDate mismatch, purge daily quests and stale weekly quests.
 * - Preserve current week's weekly goal quest in questProgress and questClaimed.
 */
export function rolloverQuests(
  progress: DailyProgress,
  todayStr: string,
  currentWeekStart: string,
): DailyProgress {
  if (progress.questDate === todayStr) {
    return progress;
  }
  const currentWeeklyKey = `weekly-goal-${currentWeekStart}`;
  const nextQuestProgress: Record<string, number> = {};
  if (progress.questProgress) {
    for (const [key, val] of Object.entries(progress.questProgress)) {
      if (key === currentWeeklyKey) {
        nextQuestProgress[key] = val;
      }
    }
  }

  const nextQuestClaimed = (progress.questClaimed || []).filter(
    (key) => key === currentWeeklyKey,
  );

  return {
    ...progress,
    questProgress: nextQuestProgress,
    questClaimed: nextQuestClaimed,
    questDate: todayStr,
  };
}
