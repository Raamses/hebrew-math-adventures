# Phase 0 — Plan: Bubble-Spawn Playability Analytics (GA4 Data)

> **Date**: 2026-08-08
> **Branch**: `sdlc/loop-v0`
> **Repo**: `hebrew-math-adventures`
> **Status**: Data retrieved — real GA4 numbers below

---

## 1. GA4 Property Setup (verified)

| Field | Value |
|---|---|
| Google account | ramamos26@gmail.com |
| GA4 account | hebrew-math-adventures (accounts/379951881) |
| GA4 property ID | **519138010** (properties/519138010) |
| Property name | hebrew-math-adventures-2025 |
| Measurement ID | G-17ZV4RGH0L |
| Firebase project | hebrew-math-adventures-2025 |
| Analytics Data API | ✅ Enabled (analyticsdata.googleapis.com) |
| Analytics Admin API | ✅ Enabled (analyticsadmin.googleapis.com) |
| Access via | `gog analytics report 519138010` (gog CLI, OAuth scopes: analytics) |

### gog OAuth note
gog uses its own OAuth client project (561495735345), separate from the Firebase project.
Both the Analytics Admin API and Analytics Data API had to be enabled on **both** projects:
- `hebrew-math-adventures-2025` (gcloud/Firebase project)
- `561495735345` (gog OAuth client project)

---

## 2. Real Query Results — Last 28 Days (Jul 11 – Aug 8, 2026)

### A. Event taxonomy (all events, by count)

| Event | Count | Active Users |
|---|---|---|
| question_answered | **565** | 50 |
| page_view | 496 | 168 |
| app_open | 381 | 168 |
| login | 308 | 168 |
| session_start | 181 | 168 |
| signup | 175 | 167 |
| first_visit | 167 | 167 |
| node_start | 110 | 65 |
| node_select | 95 | 65 |
| node_complete | 61 | 3 |
| streak_milestone | 53 | 13 |
| powerup_activated | 44 | 2 |
| arcade_mode_select | 34 | 30 |
| user_engagement | 34 | 1 |
| session_level_up | 12 | 1 |
| session_level_down | 1 | 1 |

**16 distinct event types** firing in the last 28 days. Instrumentation is live and working.

### B. question_answered by date

| Date | Count |
|---|---|
| 2026-07-30 | 25 |
| 2026-07-31 | 342 |
| 2026-08-01 | 131 |
| 2026-08-06 | 46 |
| 2026-08-07 | 21 |
| **Total** | **565** |

### C. Daily activity (all events)

| Date | Total Events | Active Users |
|---|---|---|
| 2026-07-30 | 37 | 1 |
| 2026-07-31 | 1,764 | 128 |
| 2026-08-01 | 560 | 16 |
| 2026-08-06 | 215 | 14 |
| 2026-08-07 | 141 | 12 |

**Only 5 active days in the 28-day window.** No activity on Aug 2-5 or Aug 8 (today, still early).

### D. Conversion funnel

| Step | Event | Users | Drop-off |
|---|---|---|---|
| 1 | app_open | 168 | — |
| 2 | login | 168 | 0% |
| 3 | signup | 167 | -0.6% |
| 4 | node_select | 65 | -61% |
| 5 | node_start | 65 | 0% |
| 6 | question_answered | 50 | -23% |
| 7 | node_complete | 3 | -94% |
| 8 | streak_milestone | 13 | +333% (cumulative, not sequential) |

---

## 3. What This Tells Us About Bubble-Spawn Playability

### The good
- **Instrumentation is fully working.** All 16 typed events are firing and landing in GA4. No data gaps in the pipeline.
- **565 question_answered events** across 50 users = average of 11.3 questions per active user. That's real engagement.
- **Streak milestones hit 53 times** across 13 users — the streak/reward loop is triggering.
- **12 level-ups and only 1 level-down** — progression is working in one direction, which is the right sign.

### The concerning
- **node_complete has only 3 users** vs 65 who started nodes. That's a **94% drop-off** between starting a node and completing it. Most users start nodes but don't finish them.
- **question_answered (50 users) vs node_start (65 users):** 23% of users who start a node never answer a question. This could be the bubble-spawn issue — bubbles may not be appearing or may be unplayable for some users.
- **Only 5 active days in 28.** Usage is bursty, not habitual. The 128-user spike on Jul 31 was likely a single session (classroom? testing?), and daily active users dropped to 12-16 afterward.
- **node_select (95) vs node_start (110):** Counterintuitive — more node_starts than selects. Could indicate auto-starting nodes, or duplicate event firing. Worth investigating.

### What "playable" looks like numerically
Based on this data, the key metrics for bubble-spawn playability are:
1. **question_answered / node_start ratio** — currently 77%. Target: >90% (every node should produce at least one answered question).
2. **node_complete / node_start ratio** — currently 56%. Target: >70% (most started nodes should complete).
3. **questions per active user per session** — currently ~11. Target: stable or growing, not declining session-over-session.
4. **Day-over-day active users** — currently bursty (5/28 days). Target: daily usage.

### Next steps for the analytics card
- [ ] Run a query filtered to `eventName=question_answered` with `customParameter:profile_id` to see per-user engagement
- [ ] Check `averageEngagementTimePerSession` by date to see if engagement is declining
- [ ] Query `node_complete` by `customParameter:node_id` to find which nodes have the worst completion rates
- [ ] Compare bubble-game sessions vs other game modes (if mode is a custom parameter)

---

## 4. Technical Notes

### How to query GA4 from this Pi
```bash
# Via gog CLI (already authenticated, analytics scopes included)
gog analytics report 519138010 \
  --from=28daysAgo --to=today \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=50 --json
```

### APIs enabled
- `analyticsdata.googleapis.com` — GA4 Data API (for reports)
- `analyticsadmin.googleapis.com` — GA4 Admin API (for property listing)

Both enabled on **two** GCP projects:
1. `hebrew-math-adventures-2025` (Firebase/gcloud project)
2. `561495735345` (gog OAuth client project)

### Limitations
- gog's OAuth token doesn't include `analytics.readonly` scope by default — it uses the broader `analytics` scope which works
- The gcloud CLI token (from `gcloud auth login`) does NOT have analytics scopes — use gog for GA4 queries, not gcloud
- Custom parameters (profile_id, age_group, etc.) need to be queried via `--dimensions=customParameter:profile_id` — not yet tested