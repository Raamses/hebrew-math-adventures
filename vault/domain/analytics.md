---
type: domain
project: hebrew-math-adventures
updated: 2026-08-09
status: active
tags: [domain, analytics, ga4, telemetry, instrumentation]
---

# Analytics & Telemetry — GA4 Integration

**This is the canonical documentation for game analytics.** The instrumentation is live and verified; the data is flowing to a real GA4 property.

## GA4 Property

| Field | Value |
|---|---|
| Google account | ramamos26@gmail.com |
| GA4 account | hebrew-math-adventures (accounts/379951881) |
| GA4 property ID | **519138010** |
| Property name | hebrew-math-adventures-2025 |
| Measurement ID | `G-17ZV4RGH0L` |
| Firebase project | hebrew-math-adventures-2025 |
| Data API | `analyticsdata.googleapis.com` ✅ enabled |
| Admin API | `analyticsadmin.googleapis.com` ✅ enabled |

### How to query from this Pi
```bash
# Via gog CLI (authenticated with analytics scopes)
gog analytics report 519138010 \
  --from=28daysAgo --to=today \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=50 --json
```

**Note:** gog uses its own OAuth client project (561495735345), separate from the Firebase project. Both the Analytics Admin API and Analytics Data API must be enabled on **both** projects. Do not use `gcloud` for GA4 queries — its token lacks analytics scopes.

### Automated daily snapshots (cron)

A cron job runs `scripts/ga4-snapshot.sh` daily at 09:00 GMT+3, querying GA4 and writing a dated Markdown snapshot to `vault/snapshots/`.

Each snapshot includes:
- **Daily overview** — active users, sessions, events, engagement duration by date
- **Event breakdown** — all events with counts and active users for the window
- **Events by date** — date × event cross-tab
- **28-day funnel** — always-included trend context with key metric ratios
- **Key metrics** — node_complete/node_start ratio, question_answered/node_start ratio, etc.

```bash
# Manual run (default: 1-day window)
./scripts/ga4-snapshot.sh

# Custom window
./scripts/ga4-snapshot.sh 7   # last 7 days
```

Snapshots: `vault/snapshots/ga4-YYYY-MM-DD.md`
Cron: `0 9 * * * .../scripts/ga4-snapshot.sh >> .../scripts/ga4-snapshot.log 2>&1`

## Event Taxonomy

Source: `src/types/analytics.ts` (typed), `src/hooks/useAnalytics.ts` (emission)

### Lifecycle events
| Event | Trigger | Parameters |
|---|---|---|
| `login` | Profile load | `profile_id`, `age_group`, `mascot_id`, `age`, `avatar_id` |
| `signup` | New profile created | `profile_id`, `age_group`, `age` |
| `app_open` | App mounted | `page_title` |
| `mascot_change` | Mascot swapped | `profile_id`, `old_mascot`, `new_mascot` |

### Progression events
| Event | Trigger | Parameters |
|---|---|---|
| `node_select` | Node tapped on map | `node_id`, `unit_id`, `node_type`, `is_locked` |
| `node_start` | Node gameplay begins | `node_id`, `unit_id`, `node_type`, `target_level` |
| `node_complete` | Node finished | `node_id`, `unit_id`, `stars_earned`, `total_mistakes`, `success`, `duration_seconds` |
| `streak_milestone` | Streak hits threshold | `streak_count`, `profile_id` |
| `session_level_up` | Adaptive difficulty increase | (mode-specific) |
| `session_level_down` | Adaptive difficulty decrease | (mode-specific) |

### Performance events
| Event | Trigger | Parameters |
|---|---|---|
| `question_answered` | Each answer submission | `equation`, `is_correct`, `response_time_ms`, `attempt_count`, `mode`, `node_id` |

### Engagement events
| Event | Trigger | Parameters |
|---|---|---|
| `page_view` | Route change | `page_title` |
| `arcade_mode_select` | Arcade mode chosen | `mode` (TIME_ATTACK / SURVIVAL / MEMORY / INVADERS) |
| `powerup_activated` | Power-up used | (mode-specific) |
| `user_engagement` | Firebase auto-collected | (automatic) |

### Legacy (unused)
| Event | Status |
|---|---|
| `level_start` | Not emitted — replaced by `node_start` |
| `level_complete` | Not emitted — replaced by `node_complete` |
| `level_failed` | Not emitted |

## Real Data — 28-day window (queried 2026-08-08)

### Funnel
| Step | Event | Users | Drop-off |
|---|---|---|---|
| 1 | `app_open` | 168 | — |
| 2 | `login` | 168 | 0% |
| 3 | `signup` | 167 | -0.6% |
| 4 | `node_select` | 65 | -61% |
| 5 | `node_start` | 65 | 0% |
| 6 | `question_answered` | 50 | -23% |
| 7 | `node_complete` | 3 | **-94%** |

### Key metrics
- **565** `question_answered` events across **50** active users (avg 11.3 questions/user)
- **53** `streak_milestone` events across **13** users
- **12** `session_level_up` vs **1** `session_level_down` (progression is one-directional ✅)
- **Only 5 active days in 28** — usage is bursty, not habitual
- **44** `powerup_activated` across **2** users (most users don't use power-ups)

### Concerning signals
1. **94% node-start → node-complete drop-off.** Most users start nodes but don't finish them. Could be: bubble-spawn playability, difficulty too high, or session interruptions.
2. **23% of node starters never answer a question.** Bubbles may not be appearing or may be unplayable for some users.
3. **5/28 active days.** The 128-user spike on Jul 31 was likely a classroom/testing session; organic DAU is 12-16.
4. **`node_select` (95) < `node_start` (110).** More starts than selects — possible auto-start or duplicate event firing.

### Playability metrics defined
Based on the real data, these are the key metrics for bubble-spawn playability:

| Metric | Current | Target | How to measure |
|---|---|---|---|
| `question_answered / node_start` ratio | 77% | >90% | GA4: eventCount ratio |
| `node_complete / node_start` ratio | 56% | >70% | GA4: eventCount ratio |
| Questions per active user per session | ~11 | stable/growing | GA4: eventCount / activeUsers |
| Day-over-day active users | 5/28 days | daily | GA4: activeUsers by date |
| `session_level_up / session_level_down` ratio | 12:1 | >3:1 | GA4: eventCount ratio |

## Architecture

```
src/lib/firebase.ts        → GA4 init, measurement ID, env-safe fallback
src/types/analytics.ts     → typed AnalyticsEvent + AnalyticsParams
src/hooks/useAnalytics.ts  → useAnalytics() hook, logEvent()
src/lib/logger.ts          → console fallback when GA4 not initialized
```

### Fallback behavior
When Firebase Analytics is not initialized (missing env vars, dev mode), events are logged to console via `logger.log('[Analytics Dev Mock] Event: ...')`. No data is lost — it's visible in dev tools.

### Custom parameters not yet queried
The event params include rich custom data (`profile_id`, `node_id`, `equation`, `response_time_ms`, `age_group`) that can be used as GA4 custom dimensions. These have not yet been tested as queryable dimensions via the Data API — worth testing `--dimensions=customParameter:profile_id` in a future query.
## Engagement Trend Report (2026-08-09)

Full engagement time trend by date analysis: [[engagement-trend-2026-08-09]]

Key takeaway: 5/28 active days, engagement per user declining from 129s (Aug 1) to 11.6s (Aug 7). Session duration collapsed 383s → 20s over the same period. Recommendations include investigating Aug 5–6 regression, adding `session_end` event, and implementing daily return triggers.
