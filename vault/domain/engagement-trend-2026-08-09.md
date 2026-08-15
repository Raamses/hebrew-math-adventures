---
type: domain
project: hebrew-math-adventures
created: 2026-08-09
updated: 2026-08-09
status: active
tags: [domain, analytics, ga4, engagement, trend]
query_date: 2026-08-09
query_range: 28daysAgo → today (2026-07-12 → 2026-08-09)
ga4_property: "519138010"
---

# Engagement Time Trend by Date

**Source:** GA4 Data API via `gog analytics report 519138010`
**Queried:** 2026-08-09 09:40 GMT+3

## Summary Table

| Date | Active Users | Sessions | Engagement Duration (s) | Avg Session Duration (s) | Engagement Rate |
|---|---|---|---|---|---|
| 2026-07-30 | 1 | 1 | 119 | 138.4 | 100% |
| 2026-07-31 | 128 | 134 | 3,189 | 94.2 | 100% |
| 2026-08-01 | 16 | 21 | 2,064 | 383.3 | 100% |
| 2026-08-06 | 14 | 14 | 260 | 30.7 | 100% |
| 2026-08-07 | 12 | 12 | 139 | 20.3 | 100% |
| **Total** | **171** | **182** | **5,771** | — | — |

## Key Findings

### 1. Only 5 active days in 28-day window
No usage on 23 of 28 days. Usage is **bursty, not habitual** — consistent with classroom/testing sessions rather than daily individual use.

### 2. Two distinct usage phases

**Phase A — Spike (Jul 30–Aug 1):** Likely a classroom/testing event
- Jul 31 saw 128 active users (the big spike), 134 sessions, 3,189s engagement
- Aug 1 had 16 users but **highest avg session duration: 383s (6.4 min/user)**
- 342 `question_answered` events on Jul 31, 131 on Aug 1
- Power-ups used heavily (44 total: 37 on Aug 1, 7 on Jul 31)

**Phase B — Organic (Aug 6–7):** Smaller, regular usage
- 12–14 users/day, dropping slightly
- Avg session duration **collapsing**: 30.7s → 20.3s (−34% day-over-day)
- Engagement duration: 260s → 139s (−47% day-over-day)
- Questions answered: 46 → 21 (−54% day-over-day)

### 3. Engagement time per user is declining sharply

| Date | Engagement/User (s) | Trend |
|---|---|---|
| Jul 30 | 119 | baseline (single user) |
| Jul 31 | 24.9 | spike day — short per-user sessions |
| Aug 1 | 129.0 | **peak** — deep engagement, small group |
| Aug 6 | 18.6 | declining |
| Aug 7 | 11.6 | **lowest** — concerning |

### 4. Event-level engagement breakdown (top events by engagement duration)

| Date | Event | Engagement (s) | Event Count |
|---|---|---|---|
| Jul 31 | question_answered | 1,684 | 342 |
| Aug 01 | question_answered | 1,233 | 131 |
| Jul 31 | signup | 409 | 132 |
| Jul 31 | node_select | 394 | 61 |
| Aug 01 | powerup_activated | 389 | 37 |
| Jul 31 | user_engagement | 259 | 18 |
| Jul 31 | arcade_mode_select | 209 | 22 |
| Aug 01 | node_select | 180 | 23 |
| Aug 06 | question_answered | 137 | 46 |
| Jul 30 | question_answered | 95 | 25 |

**Observation:** `question_answered` dominates engagement time, which is expected for an educational game. But `node_complete` is nearly absent (only 1 event on Aug 6, 1 on Aug 7, 59 on Aug 1) — confirming the 94% node-start → node-complete drop-off problem already flagged in the analytics domain doc.

### 5. Session duration trend (Jul 31 → Aug 7)

```
Aug 1:  383s ████████████████████████████████████████  peak
Jul 30: 138s ██████████████
Jul 31:  94s █████████
Aug 6:   31s ███
Aug 7:   20s ██                                          lowest
```

## Diagnosis

1. **Spike day (Jul 31)** was likely a classroom session — 128 users, lots of signups (132), short per-user engagement (~25s each). Many users just opened the app and explored.

2. **Aug 1** was the best quality day — fewer users (16) but deep engagement (383s avg session, 131 questions answered, 59 node completions, 12 level-ups, 37 power-up activations).

3. **Aug 6–7** shows organic usage collapsing — both user count and per-user engagement time are dropping. The ~20s avg session on Aug 7 suggests users open the app, see one question, and leave.

4. **No daily return habit.** 23/28 days with zero usage means there's no retention loop. The game is used when externally motivated (classroom) but doesn't pull users back on its own.

## Recommendations

### Immediate (this week)
- **Investigate the Aug 6–7 session quality collapse.** 20s sessions mean users aren't even completing a single node. Check for a regression in bubble spawn or gameplay that might have landed around Aug 5–6.
- **Add a `session_end` event** with total `duration_seconds` to get cleaner per-session engagement data than the auto `user_engagement` event provides.

### Short-term (next 2 weeks)
- **Implement daily return triggers.** The streak system exists (53 `streak_milestone` events) but isn't driving daily visits. Consider push notifications or a "come back tomorrow" prompt.
- **Track session-level engagement.** The current event taxonomy captures per-action data but not session-level duration. A `session_end` event with `duration_seconds` and `questions_answered` would make trend analysis much cleaner.

### Analytics instrumentation
- **Add `customParameter:mode` as a GA4 dimension** (pending parent card 69e7a84e). This will let us break engagement by game mode (practice vs arcade vs lesson) and see which modes retain users longest.
- **Consider a weekly automated query** via cron + `gog analytics report` to track this trend continuously without manual card creation.
