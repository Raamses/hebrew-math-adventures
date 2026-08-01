import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDailyChallenge, getStreakMultiplier, type DailyChallenge } from '../data/dailyChallenges';
import { getDailyQuests, type DailyQuest, type QuestMetric } from '../data/dailyQuests';
import { useProfile } from './ProfileContext';

interface DailyProgress {
  dailyStamps: string[]; // dates completed (YYYY-MM-DD)
  totalCoinsEarned: number;
  dailyChallengeCorrect: number; // accumulated correct answers for today's challenge
  dailyChallengeDate: string; // date of current challenge progress (resets daily)
  questProgress?: Record<string, number>;  // questId → progress count
  questClaimed?: string[];                  // claimed quest IDs
  questDate?: string;                       // date of current quest progress (resets daily)
}

interface QuestContextType {
  todayChallenge: DailyChallenge;
  hasCompletedToday: boolean;
  dailyStreak: number;
  dailyProgress: DailyProgress;
  dailyChallengeCorrect: number; // accumulated correct answers today
  addDailyChallengeCorrect: (count: number) => void; // add correct answers
  completeDailyChallenge: () => { reward: number; bonus: number; total: number; newStreak: number } | null;
  stampAlbumProgress: number; // 0-7 for current week
  // Quest system
  todayQuests: DailyQuest[];
  questProgress: Record<string, number>;
  questClaimed: string[];
  recordQuestEvent: (metric: QuestMetric, amount?: number) => void;
  claimQuest: (questId: string) => void;
}

const STORAGE_KEY = 'hebrew-math-daily-progress';

const QuestContext = createContext<QuestContextType | undefined>(undefined);

const EMPTY_PROGRESS: DailyProgress = { dailyStamps: [], totalCoinsEarned: 0, dailyChallengeCorrect: 0, dailyChallengeDate: '', questProgress: {}, questClaimed: [], questDate: '' };

function loadProgress(profileId: string): DailyProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    const all = JSON.parse(raw);
    const entry = all[profileId];
    if (!entry || !Array.isArray(entry.dailyStamps)) {
      return { ...EMPTY_PROGRESS };
    }
    return {
      dailyStamps: entry.dailyStamps,
      totalCoinsEarned: entry.totalCoinsEarned || 0,
      dailyChallengeCorrect: entry.dailyChallengeCorrect || 0,
      dailyChallengeDate: entry.dailyChallengeDate || '',
      questProgress: entry.questProgress || {},
      questClaimed: entry.questClaimed || [],
      questDate: entry.questDate || '',
    };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function saveProgress(profileId: string, progress: DailyProgress) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[profileId] = progress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage might be unavailable
  }
}

/** Compute consecutive-day streak from a sorted list of date strings. */
function computeStreak(stamps: string[]): number {
  if (stamps.length === 0) return 0;
  const sorted = [...stamps].sort();
  const today = new Date().toISOString().slice(0, 10);

  // If the last stamp is today, streak includes today.
  // If the last stamp is yesterday, streak is still alive.
  const last = sorted[sorted.length - 1];
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (last !== today && last !== yesterday) return 0;

  let streak = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const curr = new Date(sorted[i + 1]).getTime();
    const prev = new Date(sorted[i]).getTime();
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export const QuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfile, unlockBadge, addGems } = useProfile();
  const todayChallenge = getDailyChallenge();
  const todayStr = todayChallenge.date;
  const todayQuests = useMemo(() => getDailyQuests(), []);

  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => {
    if (!profile) return { ...EMPTY_PROGRESS };
    const loaded = loadProgress(profile.id);
    // Reset daily challenge progress if it's from a different day
    if (loaded.dailyChallengeDate !== todayStr) {
      loaded.dailyChallengeCorrect = 0;
      loaded.dailyChallengeDate = todayStr;
    }
    // Reset quest progress if it's from a different day
    if (loaded.questDate !== todayStr) {
      loaded.questProgress = {};
      loaded.questClaimed = [];
      loaded.questDate = todayStr;
    }
    saveProgress(profile.id, loaded);
    return loaded;
  });

  // Reload when profile changes
  useEffect(() => {
    if (profile) {
      const loaded = loadProgress(profile.id);
      // Reset daily challenge progress if it's from a different day
      if (loaded.dailyChallengeDate !== todayStr) {
        loaded.dailyChallengeCorrect = 0;
        loaded.dailyChallengeDate = todayStr;
      }
      // Reset quest progress if it's from a different day
      if (loaded.questDate !== todayStr) {
        loaded.questProgress = {};
        loaded.questClaimed = [];
        loaded.questDate = todayStr;
      }
      saveProgress(profile.id, loaded);
      setDailyProgress(loaded);
    } else {
      setDailyProgress({ ...EMPTY_PROGRESS });
    }
  }, [profile?.id]);

  const hasCompletedToday = dailyProgress.dailyStamps.includes(todayStr);
  const dailyStreak = computeStreak(dailyProgress.dailyStamps);

  // Stamp album: count stamps in the last 7 days
  const stampAlbumProgress = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    return dailyProgress.dailyStamps.filter((d) => d >= sevenDaysAgo).length;
  }, [dailyProgress.dailyStamps]);

  // Ref to track accumulated correct answers WITHOUT relying on React state (avoids stale closures)
  const dailyCorrectRef = React.useRef(0);
  const dailyDateRef = React.useRef('');

  // Sync ref from loaded state when dailyProgress changes
  useEffect(() => {
    dailyCorrectRef.current = dailyProgress.dailyChallengeCorrect;
    dailyDateRef.current = dailyProgress.dailyChallengeDate;
  }, [dailyProgress]);

  // Accumulate correct answers for today's challenge (persists across sessions)
  // Uses ref to avoid stale closure — multiple calls within the same render cycle will accumulate correctly
  const addDailyChallengeCorrect = useCallback((count: number) => {
    if (!profile) return;
    if (dailyProgress.dailyStamps.includes(todayStr)) return; // already completed
    // Use ref for the current accumulated value to avoid stale closure
    const currentCorrect = dailyDateRef.current === todayStr ? dailyCorrectRef.current : 0;
    const newCorrect = currentCorrect + count;
    dailyCorrectRef.current = newCorrect;
    dailyDateRef.current = todayStr;
    const newProgress: DailyProgress = {
      ...dailyProgress,
      dailyChallengeCorrect: newCorrect,
      dailyChallengeDate: todayStr,
    };
    setDailyProgress(newProgress);
    saveProgress(profile.id, newProgress);
  }, [profile, dailyProgress, todayStr]);

  const completeDailyChallenge = useCallback(() => {
    if (!profile) return null;
    if (dailyProgress.dailyStamps.includes(todayStr)) return null;

    const newStamps = [...dailyProgress.dailyStamps, todayStr];
    const newStreak = computeStreak(newStamps);
    const multiplier = getStreakMultiplier(newStreak);
    const baseReward = todayChallenge.reward;
    const bonus = Math.round(baseReward * (multiplier - 1));
    const total = baseReward + bonus;

    const newProgress: DailyProgress = {
      dailyStamps: newStamps,
      totalCoinsEarned: dailyProgress.totalCoinsEarned + total,
      dailyChallengeCorrect: dailyProgress.dailyChallengeCorrect,
      dailyChallengeDate: todayStr,
    };

    setDailyProgress(newProgress);
    saveProgress(profile.id, newProgress);

    // Also update profile coins and daily fields
    updateProfile(profile.id, {
      coins: (profile.coins || 0) + total,
      dailyStamps: newStamps,
      lastDailyDate: todayStr,
    });

    // Unlock streak-based badges
    if (newStreak >= 3) {
      unlockBadge('dedicated');
    }
    if (newStreak >= 7) {
      unlockBadge('streak_star');
    }

    return { reward: baseReward, bonus, total, newStreak };
  }, [profile, dailyProgress, todayChallenge, todayStr, updateProfile, unlockBadge]);

  // --- Quest System ---
  // Use a ref for batching quest events to avoid re-render thrashing on every bubble pop.
  const questEventBatchRef = useRef<Record<string, number>>({});
  const questFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flush batched quest progress to state + localStorage
  const flushQuestProgress = useCallback(() => {
    if (!profile) return;
    const batch = questEventBatchRef.current;
    if (Object.keys(batch).length === 0) return;
    questEventBatchRef.current = {};
    setDailyProgress(prev => {
      const newQuestProgress = { ...(prev.questProgress || {}) };
      for (const [qid, inc] of Object.entries(batch)) {
        newQuestProgress[qid] = (newQuestProgress[qid] || 0) + inc;
      }
      const newProgress = { ...prev, questProgress: newQuestProgress, questDate: todayStr };
      saveProgress(profile.id, newProgress);
      return newProgress;
    });
  }, [profile, todayStr]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (questFlushTimerRef.current) {
        clearTimeout(questFlushTimerRef.current);
      }
      // Flush any remaining batched progress
      if (profile) {
        const batch = questEventBatchRef.current;
        if (Object.keys(batch).length > 0) {
          const loaded = loadProgress(profile.id);
          const newQuestProgress = { ...(loaded.questProgress || {}) };
          for (const [qid, inc] of Object.entries(batch)) {
            newQuestProgress[qid] = (newQuestProgress[qid] || 0) + inc;
          }
          loaded.questProgress = newQuestProgress;
          loaded.questDate = todayStr;
          saveProgress(profile.id, loaded);
        }
      }
    };
  }, [profile, todayStr]);

  const recordQuestEvent = useCallback((metric: QuestMetric, amount = 1) => {
    if (!profile) return;
    // Find today's quests matching this metric
    for (const q of todayQuests) {
      if (q.metric === metric) {
        // Cap progress at target
        const current = questEventBatchRef.current[q.id] || 0;
        questEventBatchRef.current[q.id] = current + amount;
      }
    }
    // Debounce flush: 2 seconds
    if (questFlushTimerRef.current) {
      clearTimeout(questFlushTimerRef.current);
    }
    questFlushTimerRef.current = setTimeout(() => flushQuestProgress(), 2000);
  }, [profile, todayQuests, flushQuestProgress]);

  const claimQuest = useCallback((questId: string) => {
    if (!profile) return;
    const quest = todayQuests.find(q => q.id === questId);
    if (!quest) return;
    const progress = (dailyProgress.questProgress || {})[questId] || 0;
    if (progress < quest.target) return; // not complete
    const claimed = dailyProgress.questClaimed || [];
    if (claimed.includes(questId)) return; // already claimed
    // Award gems
    addGems(quest.gemReward);
    // Mark as claimed
    const newClaimed = [...claimed, questId];
    setDailyProgress(prev => {
      const newProgress = { ...prev, questClaimed: newClaimed, questDate: todayStr };
      saveProgress(profile.id, newProgress);
      return newProgress;
    });
  }, [profile, todayQuests, dailyProgress, addGems, todayStr]);

  const value: QuestContextType = {
    todayChallenge,
    hasCompletedToday,
    dailyStreak,
    dailyProgress,
    dailyChallengeCorrect: dailyProgress.dailyChallengeDate === todayStr ? dailyProgress.dailyChallengeCorrect : 0,
    addDailyChallengeCorrect,
    completeDailyChallenge,
    stampAlbumProgress: Math.min(stampAlbumProgress, 7),
    todayQuests,
    questProgress: dailyProgress.questProgress || {},
    questClaimed: dailyProgress.questClaimed || [],
    recordQuestEvent,
    claimQuest,
  };

  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
};

export const useQuest = () => {
  const ctx = useContext(QuestContext);
  if (!ctx) throw new Error('useQuest must be used within a QuestProvider');
  return ctx;
};