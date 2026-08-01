export type QuestMetric = 'correct_answers' | 'games_finished' | 'combo_reached' | 'boss_defeated' | 'daily_challenge';

export interface DailyQuest {
  id: string;
  metric: QuestMetric;
  target: number;
  gemReward: number;
  titleKey: string;
  descKey: string;
  icon: string;
}

const POOL: Omit<DailyQuest, 'id' | 'gemReward'>[] = [
  { metric: 'correct_answers', target: 15, titleKey: 'quest.pop15',  descKey: 'quest.pop15_d',  icon: '🎯' },
  { metric: 'correct_answers', target: 25, titleKey: 'quest.pop25',  descKey: 'quest.pop25_d',  icon: '🫧' },
  { metric: 'combo_reached',   target: 5,  titleKey: 'quest.combo5', descKey: 'quest.combo5_d', icon: '⚡' },
  { metric: 'games_finished',  target: 2,  titleKey: 'quest.play2',  descKey: 'quest.play2_d',  icon: '🎮' },
  { metric: 'boss_defeated',   target: 1,  titleKey: 'quest.boss1',  descKey: 'quest.boss1_d',  icon: '🛡️' },
  { metric: 'daily_challenge', target: 1,  titleKey: 'quest.daily',  descKey: 'quest.daily_d',  icon: '📅' },
];

export function getDailyQuests(date?: Date): DailyQuest[] {
  const iso = (date || new Date()).toISOString().slice(0, 10);
  const seed = iso.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
  const picks: DailyQuest[] = [];
  const used = new Set<number>();
  for (let slot = 0; slot < 3; slot++) {
    let idx = (seed + slot * 7) % POOL.length;
    while (used.has(idx)) idx = (idx + 1) % POOL.length;
    used.add(idx);
    picks.push({ ...POOL[idx], id: `${iso}:${slot}`, gemReward: 3 + slot * 2 });
  }
  return picks;
}