import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProfileProvider, useProfile } from '../ProfileContext';
import { QuestProvider, useQuest } from '../QuestContext';

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

describe('QuestContext — quest system', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recordQuestEvent increments progress after flush', async () => {
    const { result } = renderHook(() => useBoth(), { wrapper: createWrapper() });

    // Create a profile first
    await act(async () => {
      await result.current.profile.createProfile('TestKid', 7, '👧', 'owl');
    });

    // Record a quest event
    act(() => {
      result.current.quest.recordQuestEvent('correct_answers', 1);
    });

    // Wait for debounce flush (2 seconds)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2500));
    });

    // Check that progress was recorded for matching quests
    const correctAnswerQuests = result.current.quest.todayQuests.filter(q => q.metric === 'correct_answers');
    for (const q of correctAnswerQuests) {
      expect(result.current.quest.questProgress[q.id] || 0).toBeGreaterThan(0);
    }
  });

  it('claimQuest gives gems and marks claimed', async () => {
    // Pre-populate localStorage with a profile AND quest progress before rendering
    const profileId = 'test-claim-profile';
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
    }];
    localStorage.setItem('hebrew-math-profiles', JSON.stringify(profiles));

    // Get today's quests to know which quest to set up
    const { getDailyQuests } = await import('../../data/dailyQuests');
    const todayQuests = getDailyQuests();
    const quest = todayQuests[0];

    const STORAGE_KEY = 'hebrew-math-daily-progress';
    const all: Record<string, any> = {};
    all[profileId] = {
      dailyStamps: [],
      totalCoinsEarned: 0,
      dailyChallengeCorrect: 0,
      dailyChallengeDate: new Date().toISOString().slice(0, 10),
      questProgress: { [quest.id]: quest.target },
      questClaimed: [],
      questDate: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    const { result } = renderHook(() => useBoth(), { wrapper: createWrapper() });

    // Switch to the pre-populated profile
    act(() => {
      result.current.profile.switchProfile(profileId);
    });

    const gemsBefore = result.current.profile.profile?.gems || 0;
    expect(gemsBefore).toBe(0);

    // Claim the quest
    act(() => {
      result.current.quest.claimQuest(quest.id);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.profile.profile?.gems || 0).toBeGreaterThan(gemsBefore);
    expect(result.current.quest.questClaimed).toContain(quest.id);
  });

  it('cannot claim incomplete quest', async () => {
    const { result } = renderHook(() => useBoth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.profile.createProfile('TestKid', 7, '👧', 'owl');
    });

    const quest = result.current.quest.todayQuests[0];
    const gemsBefore = result.current.profile.profile?.gems || 0;

    // Don't set any progress - quest should be incomplete
    act(() => {
      result.current.quest.claimQuest(quest.id);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Gems should not have changed
    expect(result.current.profile.profile?.gems || 0).toBe(gemsBefore);
    expect(result.current.quest.questClaimed).not.toContain(quest.id);
  });

  it('cannot claim already-claimed quest', async () => {
    // Pre-populate with already-claimed quest
    const profileId = 'test-claimed-profile';
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
      gems: 5,
      pet: { species: 'owl', name: 'Buddy', happiness: 60, unlockedTricks: [], lastFedDate: null },
    }];
    localStorage.setItem('hebrew-math-profiles', JSON.stringify(profiles));

    const { getDailyQuests } = await import('../../data/dailyQuests');
    const todayQuests = getDailyQuests();
    const quest = todayQuests[0];

    const STORAGE_KEY = 'hebrew-math-daily-progress';
    const all: Record<string, any> = {};
    all[profileId] = {
      dailyStamps: [],
      totalCoinsEarned: 0,
      dailyChallengeCorrect: 0,
      dailyChallengeDate: new Date().toISOString().slice(0, 10),
      questProgress: { [quest.id]: quest.target },
      questClaimed: [quest.id], // already claimed
      questDate: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    const { result } = renderHook(() => useBoth(), { wrapper: createWrapper() });

    act(() => {
      result.current.profile.switchProfile(profileId);
    });

    const gemsBefore = result.current.profile.profile?.gems || 0;

    act(() => {
      result.current.quest.claimQuest(quest.id);
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Gems should not have changed (already claimed)
    expect(result.current.profile.profile?.gems || 0).toBe(gemsBefore);
  });

  it('progress resets on date change', async () => {
    const { result } = renderHook(() => useBoth(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.profile.createProfile('TestKid', 7, '👧', 'owl');
    });

    // Set old date progress
    const STORAGE_KEY = 'hebrew-math-daily-progress';
    const profileId = result.current.profile.profile!.id;
    const all: Record<string, any> = {};
    all[profileId] = {
      dailyStamps: [],
      totalCoinsEarned: 0,
      dailyChallengeCorrect: 0,
      dailyChallengeDate: '2026-01-01',
      questProgress: { 'old-quest:0': 10 },
      questClaimed: ['old-quest:0'],
      questDate: '2026-01-01', // Old date
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Switch profile to trigger reload
    act(() => {
      result.current.profile.switchProfile(profileId);
    });

    // The todayQuests IDs won't match 'old-quest:0', and questProgress should be reset
    expect(result.current.quest.todayQuests.length).toBe(3);
    expect(result.current.quest.questProgress).toEqual({});
    expect(result.current.quest.questClaimed).toEqual([]);
  });
});