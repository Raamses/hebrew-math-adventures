export interface BadgeStats {
  totalCorrect: number;
  totalBubblesPopped: number;
  maxCombo: number;
  bossesDefeated: number;
  perfectSessions: number;
  dailyStreak: number;
  daysPlayed: number;
  totalSessionTime: number; // seconds
}

export interface Badge {
  id: string;
  emoji: string;
  nameKey: string;
  descriptionKey: string;
  check: (stats: BadgeStats) => boolean;
  /** Optional progress function for partial progress display */
  progress?: (stats: BadgeStats) => { current: number; target: number };
}

export const BADGES: Badge[] = [
  {
    id: 'first_steps',
    emoji: '🌟',
    nameKey: 'badges.first_steps.name',
    descriptionKey: 'badges.first_steps.desc',
    check: (s) => s.totalCorrect >= 10,
    progress: (s) => ({ current: Math.min(s.totalCorrect, 10), target: 10 }),
  },
  {
    id: 'sharp_shooter',
    emoji: '🎯',
    nameKey: 'badges.sharp_shooter.name',
    descriptionKey: 'badges.sharp_shooter.desc',
    check: (s) => s.totalCorrect >= 50,
    progress: (s) => ({ current: Math.min(s.totalCorrect, 50), target: 50 }),
  },
  {
    id: 'century',
    emoji: '💯',
    nameKey: 'badges.century.name',
    descriptionKey: 'badges.century.desc',
    check: (s) => s.totalCorrect >= 100,
    progress: (s) => ({ current: Math.min(s.totalCorrect, 100), target: 100 }),
  },
  {
    id: 'on_fire',
    emoji: '🔥',
    nameKey: 'badges.on_fire.name',
    descriptionKey: 'badges.on_fire.desc',
    check: (s) => s.maxCombo >= 10,
    progress: (s) => ({ current: Math.min(s.maxCombo, 10), target: 10 }),
  },
  {
    id: 'lightning',
    emoji: '⚡',
    nameKey: 'badges.lightning.name',
    descriptionKey: 'badges.lightning.desc',
    check: (s) => s.totalSessionTime > 0 && s.totalCorrect / s.totalSessionTime >= 0.5,
    // ~answer every 2s or faster; approximated as correct/sec >= 0.5
  },
  {
    id: 'boss_slayer',
    emoji: '👑',
    nameKey: 'badges.boss_slayer.name',
    descriptionKey: 'badges.boss_slayer.desc',
    check: (s) => s.bossesDefeated >= 3,
    progress: (s) => ({ current: Math.min(s.bossesDefeated, 3), target: 3 }),
  },
  {
    id: 'perfectionist',
    emoji: '💎',
    nameKey: 'badges.perfectionist.name',
    descriptionKey: 'badges.perfectionist.desc',
    check: (s) => s.perfectSessions >= 3,
    progress: (s) => ({ current: Math.min(s.perfectSessions, 3), target: 3 }),
  },
  {
    id: 'dedicated',
    emoji: '📅',
    nameKey: 'badges.dedicated.name',
    descriptionKey: 'badges.dedicated.desc',
    check: (s) => s.dailyStreak >= 3,
    progress: (s) => ({ current: Math.min(s.dailyStreak, 3), target: 3 }),
  },
  {
    id: 'weekly_warrior',
    emoji: '🗓️',
    nameKey: 'badges.weekly_warrior.name',
    descriptionKey: 'badges.weekly_warrior.desc',
    check: (s) => s.daysPlayed >= 7,
    progress: (s) => ({ current: Math.min(s.daysPlayed, 7), target: 7 }),
  },
  {
    id: 'bubble_master',
    emoji: '🫧',
    nameKey: 'badges.bubble_master.name',
    descriptionKey: 'badges.bubble_master.desc',
    check: (s) => s.totalBubblesPopped >= 500,
    progress: (s) => ({ current: Math.min(s.totalBubblesPopped, 500), target: 500 }),
  },
  {
    id: 'streak_star',
    emoji: '🏆',
    nameKey: 'badges.streak_star.name',
    descriptionKey: 'badges.streak_star.desc',
    check: (s) => s.dailyStreak >= 7,
    progress: (s) => ({ current: Math.min(s.dailyStreak, 7), target: 7 }),
  },
  {
    id: 'superstar',
    emoji: '⭐',
    nameKey: 'badges.superstar.name',
    descriptionKey: 'badges.superstar.desc',
    check: (s) => s.totalCorrect >= 500,
    progress: (s) => ({ current: Math.min(s.totalCorrect, 500), target: 500 }),
  },
];

export const BADGE_MAP: Record<string, Badge> = Object.fromEntries(
  BADGES.map((b) => [b.id, b]),
);