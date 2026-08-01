import { describe, it, expect } from 'vitest';
import { getDailyQuests } from '../dailyQuests';

describe('dailyQuests', () => {
  it('returns exactly 3 quests', () => {
    const quests = getDailyQuests();
    expect(quests).toHaveLength(3);
  });

  it('same date → same quests (deterministic)', () => {
    const date = new Date('2026-08-01');
    const q1 = getDailyQuests(date);
    const q2 = getDailyQuests(date);
    expect(q1).toEqual(q2);
  });

  it('different dates may produce different quests', () => {
    const q1 = getDailyQuests(new Date('2026-08-01'));
    const q2 = getDailyQuests(new Date('2026-08-02'));
    // They might be the same by chance, but the IDs should differ (different date prefix)
    expect(q1[0].id).not.toBe(q2[0].id);
  });

  it('each quest has valid metric', () => {
    const quests = getDailyQuests();
    const validMetrics = ['correct_answers', 'games_finished', 'combo_reached', 'boss_defeated', 'daily_challenge'];
    for (const q of quests) {
      expect(validMetrics).toContain(q.metric);
    }
  });

  it('each quest has target > 0', () => {
    const quests = getDailyQuests();
    for (const q of quests) {
      expect(q.target).toBeGreaterThan(0);
    }
  });

  it('each quest has gemReward > 0', () => {
    const quests = getDailyQuests();
    for (const q of quests) {
      expect(q.gemReward).toBeGreaterThan(0);
    }
  });

  it('quest IDs contain date prefix', () => {
    const date = new Date('2026-08-01');
    const quests = getDailyQuests(date);
    for (const q of quests) {
      expect(q.id.startsWith('2026-08-01:')).toBe(true);
    }
  });

  it('no duplicate quests for same date', () => {
    const date = new Date('2026-08-01');
    const quests = getDailyQuests(date);
    const metrics = quests.map(q => `${q.metric}:${q.target}`);
    expect(new Set(metrics).size).toBe(metrics.length);
  });
});