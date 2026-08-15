---
type: domain
project: hebrew-math-adventures
updated: 2026-08-08
status: active
tags: [domain, quests, daily, engagement, retention, gamification]
---

# Daily Quests & Daily Challenge System

**This is the canonical documentation for the daily engagement loop** — the daily challenge, daily quests, streak bonuses, and the stamp album. All logic lives in `src/context/QuestContext.tsx` with data in `src/data/dailyChallenges.ts` and `src/data/dailyQuests.ts`.

## Purpose
Drive daily habit formation (retention) for kids. Every day the game offers a **deterministic daily challenge** plus **3 rotating daily quests**, with streak bonuses that reward consecutive-day play. No backend needed — everything is seeded from the calendar date.

## Daily Challenge

Source: `src/data/dailyChallenges.ts` → `getDailyChallenge()`

- **Deterministic per date**: seeded from the ISO date string (`YYYY-MM-DD`), so every kid gets the *same* challenge each day. No backend.
- **Fields**: `mode` (zen/classic/blitz/survival), `problemType` (addition_simple / sub_simple / multiplication / series / compare), `target` (10–19 correct answers), `timeLimit` (blitz=60s, survival=none, else 90s), `reward` (10–18 coins).
- **Selection**: `seed = sum of date digits`; `mode = MODES[seed % 4]`, `type = PROBLEM_TYPES[seed % 5]`, `target = 10 + (seed % 10)`.

## Streak Bonus Multiplier

Source: `getStreakMultiplier(streak)` in `dailyChallenges.ts`

| Consecutive days | Multiplier |
|---|---|
| 0–2 | 1× |
| 3–6 | 1.5× |
| 7+ | 2× |

Applied to the daily challenge base reward: `bonus = round(baseReward × (multiplier − 1))`, `total = baseReward + bonus`.

## Daily Quests

Source: `src/data/dailyQuests.ts` → `getDailyQuests()`

### Quest metrics (`QuestMetric`)
| Metric | Meaning |
|---|---|
| `correct_answers` | Pop N correct bubbles |
| `games_finished` | Finish N games |
| `combo_reached` | Reach a combo of N |
| `boss_defeated` | Defeat a boss |
| `daily_challenge` | Complete the daily challenge |

### Quest pool (6 possible quests)
| Metric | Target | Icon |
|---|---|---|
| `correct_answers` | 15 | 🎯 |
| `correct_answers` | 25 | 🫧 |
| `combo_reached` | 5 | ⚡ |
| `games_finished` | 2 | 🎮 |
| `boss_defeated` | 1 | 🛡️ |
| `daily_challenge` | 1 | 📅 |

### Daily selection (3 quests/day)
- Seeded from the date: `seed = sum of date digits`.
- 3 slots; slot `i` picks `idx = (seed + i*7) % 6`, skipping already-used indices.
- **Gem rewards scale by slot**: `gemReward = 3 + slot*2` → 3, 5, 7 gems.
- Quest `id` is `${iso}:${slot}` (unique per day per slot).

## QuestContext (`src/context/QuestContext.tsx`)

`QuestProvider` + `useQuest()` hook. Persists per-profile in `localStorage` under key `hebrew-math-daily-progress` (keyed by `profileId`).

### State shape (`DailyProgress`)
```ts
{
  dailyStamps: string[];        // dates completed (YYYY-MM-DD)
  totalCoinsEarned: number;
  dailyChallengeCorrect: number; // accumulated correct answers today
  dailyChallengeDate: string;    // resets daily
  questProgress?: Record<string, number>; // questId → progress
  questClaimed?: string[];       // claimed quest IDs
  questDate?: string;            // resets daily
}
```

### Key behaviors
- **Daily reset**: on load, if `dailyChallengeDate`/`questDate` ≠ today, progress is zeroed and the date is updated.
- **Streak computation** (`computeStreak`): counts consecutive days ending today or yesterday; a gap breaks the streak.
- **Stamp album**: `stampAlbumProgress` counts stamps in the last 7 days (capped at 7).
- **`addDailyChallengeCorrect(count)`**: accumulates correct answers for today's challenge using a **ref** (not state) to avoid stale closures — multiple calls within one render cycle accumulate correctly.
- **`completeDailyChallenge()`**: stamps today, computes streak + multiplier, awards coins (updates profile `coins`), and unlocks badges: `dedicated` at streak ≥ 3, `streak_star` at streak ≥ 7.
- **Quest event batching**: `recordQuestEvent(metric, amount)` batches progress into a ref and **flushes to state + localStorage after a 2s debounce** (avoids re-render thrashing on every bubble pop). Flushes remaining batch on unmount.
- **`claimQuest(questId)`**: only if progress ≥ target and not already claimed; awards gems via `addGems`.

### Badges unlocked
| Badge | Condition |
|---|---|
| `dedicated` | Streak ≥ 3 |
| `streak_star` | Streak ≥ 7 |

## UI
- `src/components/quests/QuestPanel.tsx` — quest list + claim UI.
- `src/components/pet/DailyQuestList.tsx` — daily quest list in the pet screen.
- i18n keys: `quest.pop15`, `quest.pop25`, `quest.combo5`, `quest.play2`, `quest.boss1`, `quest.daily` (+ `_d` descriptions), `daily.title`, `daily.description`.

## Tests
- `src/context/__tests__/QuestContext.quest.test.tsx` — context behavior.
- `src/data/__tests__/dailyQuests.test.ts` — quest selection determinism.

## Related
- [[domain/analytics]] — `streak_milestone` event fires on streak thresholds.
- [[rules/game-flow]] — how quests integrate with game flow.
