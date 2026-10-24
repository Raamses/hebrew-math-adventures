import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProfileProvider, useProfile } from '../ProfileContext';
import { QuestProvider, useQuest } from '../QuestContext';
import { rolloverQuests } from '../../lib/questRollover';
import { getWeekStartISO } from '../../components/parent/games/parentEconomyEngine';
import { STORAGE_KEYS } from '../../lib/worldConfig';

// Combined hook to access both contexts in the same provider tree
const useBoth = () => ({
  quest: useQuest(),
  profile: useProfile(),
});

const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProfileProvider>
      <QuestProvider>{children}</QuestProvider>
    </ProfileProvider>
  );
  return Wrapper;
};

describe('QuestContext — weeklyGoal and week start', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getWeekStartISO determinism & Jerusalem time zone', () => {
    it('Sunday rollover: derives correct week start before and after midnight', () => {
      // Before midnight on Sunday in Asia/Jerusalem (+03:00)
      const sunBeforeMidnight = new Date('2026-10-18T23:59:00+03:00');
      expect(getWeekStartISO(sunBeforeMidnight)).toBe('2026-10-18');

      // Saturday before midnight -> belongs to week of 2026-10-18
      const satBeforeMidnight = new Date('2026-10-24T23:59:00+03:00');
      expect(getWeekStartISO(satBeforeMidnight)).toBe('2026-10-18');

      // Sunday 00:01 IL -> new week starts 2026-10-25
      const sunAfterMidnight = new Date('2026-10-25T00:01:00+03:00');
      expect(getWeekStartISO(sunAfterMidnight)).toBe('2026-10-25');
    });

    it('handles DST spring-forward and fall-back under Asia/Jerusalem', () => {
      // Spring-forward: 2026-03-27 02:00->03:00 IL (Friday), week start 2026-03-22
      const springForward = new Date('2026-03-27T02:30:00+02:00');
      expect(getWeekStartISO(springForward)).toBe('2026-03-22');

      // Fall-back: 2026-10-25 02:00->01:00 IL on Sunday itself, week start 2026-10-25
      const fallBackSunday = new Date('2026-10-25T01:30:00+03:00');
      expect(getWeekStartISO(fallBackSunday)).toBe('2026-10-25');

      // Monday after fall-back: 2026-10-26 -> 2026-10-25
      const fallBackMonday = new Date('2026-10-26T00:01:00+02:00');
      expect(getWeekStartISO(fallBackMonday)).toBe('2026-10-25');
    });

    it('supports explicit weekStartDay: Monday 00:01 IL with weekStartDay=0 returns previous Sunday', () => {
      const mondayIL = new Date('2026-10-19T00:01:00+03:00');
      expect(getWeekStartISO(mondayIL, 0)).toBe('2026-10-18');
    });
  });

  describe('rolloverQuests pure helper', () => {
    it('selectively purges non-weekly and stale weekly quests on rollover', () => {
      const prevWeek = '2026-10-11';
      const currentWeek = '2026-10-18';
      const progress = {
        dailyStamps: [],
        totalCoinsEarned: 0,
        dailyChallengeCorrect: 0,
        dailyChallengeDate: '2026-10-18',
        questProgress: {
          pop15: 3,
          pop25: 1,
          [`weekly-goal-${prevWeek}`]: 2,
          [`weekly-goal-${currentWeek}`]: 7,
        },
        questClaimed: ['pop15', `weekly-goal-${currentWeek}`],
        questDate: '2026-10-18',
      };

      const rolled = rolloverQuests(progress, '2026-10-19', currentWeek);

      // Non-weekly keys removed
      expect(rolled.questProgress).not.toHaveProperty('pop15');
      expect(rolled.questProgress).not.toHaveProperty('pop25');
      // Stale weekly key dropped
      expect(rolled.questProgress).not.toHaveProperty(`weekly-goal-${prevWeek}`);
      // Current weekly key preserved
      expect(rolled.questProgress[`weekly-goal-${currentWeek}`]).toBe(7);
      // Claimed array preserved current weekly key, stripped others
      expect(rolled.questClaimed).toEqual([`weekly-goal-${currentWeek}`]);
      expect(rolled.questDate).toBe('2026-10-19');
    });

    it('returns unmodified progress when questDate === todayStr', () => {
      const currentWeek = '2026-10-18';
      const progress = {
        dailyStamps: [],
        totalCoinsEarned: 0,
        dailyChallengeCorrect: 0,
        dailyChallengeDate: '2026-10-19',
        questProgress: {
          pop15: 3,
          [`weekly-goal-${currentWeek}`]: 7,
        },
        questClaimed: ['pop15'],
        questDate: '2026-10-19',
      };

      const rolled = rolloverQuests(progress, '2026-10-19', currentWeek);
      expect(rolled).toBe(progress);
    });
  });

  describe('QuestProvider selective midnight purge', () => {
    it('preserves weekly-goal progress and claimed state across midnight rollover without wholesale wipe', async () => {
      const profileId = 'test-weekly-kid';
      const currentWeek = getWeekStartISO();
      const prevWeek = '2026-10-04'; // Clearly stale week

      const profiles = [{
        id: profileId,
        name: 'TestKid',
        age: 7,
        avatarId: '👧',
        mascotId: 'owl',
        themeId: 'default',
        streak: 0,
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        settings: { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
        capabilities: { age: 7, estimatedLevel: 1, strengths: [], weaknesses: [], masteryScore: {} },
        arcadeStats: {},
        coins: 0,
        gems: 0,
        pet: { species: 'owl', name: 'Buddy', happiness: 60, unlockedTricks: [], lastFedDate: null },
        weeklyGoal: {
          weekStart: currentWeek,
          target: 20,
          skillKey: 'addition',
        },
      }];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));

      const yesterday = '2026-10-01';
      const todayStr = new Date().toISOString().slice(0, 10);

      const allProgress: Record<string, any> = {};
      allProgress[profileId] = {
        dailyStamps: [],
        totalCoinsEarned: 0,
        dailyChallengeCorrect: 0,
        dailyChallengeDate: yesterday,
        questProgress: {
          pop15: 3,
          pop25: 1,
          [`weekly-goal-${prevWeek}`]: 2,
          [`weekly-goal-${currentWeek}`]: 7,
        },
        questClaimed: ['pop15', `weekly-goal-${currentWeek}`],
        questDate: yesterday,
      };
      localStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify(allProgress));

      const { result } = renderHook(() => useBoth(), { wrapper: createWrapper() });

      act(() => {
        result.current.profile.switchProfile(profileId);
      });

      // After profile switch and rollover:
      const progress = result.current.quest.questProgress;
      const claimed = result.current.quest.questClaimed;

      // Non-weekly keys removed
      expect(progress.pop15).toBeUndefined();
      expect(progress.pop25).toBeUndefined();
      expect(claimed.includes('pop15')).toBe(false);

      // Stale weekly-goal dropped
      expect(progress[`weekly-goal-${prevWeek}`]).toBeUndefined();
      expect(claimed.includes(`weekly-goal-${prevWeek}`)).toBe(false);

      // Current week weekly-goal preserved in BOTH questProgress AND questClaimed
      expect(progress[`weekly-goal-${currentWeek}`]).toBe(7);
      expect(claimed).toContain(`weekly-goal-${currentWeek}`);

      // questDate updated to todayStr
      expect(result.current.quest.dailyProgress.questDate).toBe(todayStr);

      // No wholesale wipe: total weekly-goal progress value is intact
      expect(progress[`weekly-goal-${currentWeek}`]).toBe(7);
    });
  });
});
