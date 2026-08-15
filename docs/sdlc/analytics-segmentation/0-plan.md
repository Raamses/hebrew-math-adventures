# Phase 9: Per-User Analytics Segmentation & Engagement Insights — Plan

**Model:** gemini-3.1-pro-high (via `ask-agy --card 145c3562-ca4e-49a2-9d89-5a0d079896a7`)
**Date:** 2026-08-15
**Branch:** sdlc/loop-v0
**Status:** Draft for review

> **Model attribution note:** The card requires delegation to a stronger model via `ask-claude --escalate --card`. Claude (both claude-opus-5 and claude-sonnet-5) hit session limits at 10:57 IDT — resets at 14:00 Asia/Jerusalem. Both attempts are recorded in `~/.openclaw/bin/model-usage.jsonl` with `actual: "unknown"`. Gemini CLI (`gemini`) is deprecated (IneligibleTierError). The fallback was `ask-agy` (Antigravity CLI, Gemini 3.1 Pro High), which successfully served the analysis (25,024 tokens, conversation `d2ec2df0-151e-4ea6-bb72-1238a5b92089`). The full Gemini analysis artifact is at `~/.gemini/antigravity-cli/brain/d2ec2df0-151e-4ea6-bb72-1238a5b92089/phase_9_analytics_plan.md`. This document is the board-facing deliverable built from that analysis, corrected and expanded with live verification findings.

---

## 1. Problem Statement

Hebrew Math Adventures has GA4 custom dimensions registered (14 total) and events flowing, but **no per-user segmentation capability exists**. The daily snapshot (`ga4-snapshot.sh`) captures aggregate event counts, and `vault/domain/analytics.md` documents the event taxonomy. However, there is no way to:

1. Identify which users are power users vs at-risk vs dormant
2. Break down node completion funnels by user segment
3. Generate a weekly report summarizing engagement patterns
4. Surface actionable insights about which nodes need attention

**Critical discovery (live verification):** `customEvent:profile_id` — the primary per-user dimension — shows `(not set)` for ALL 8,692 events across 524 users in the 28-day window. The client-side instrumentation worktree (`.worktrees/ga4-custom-dimensions`) has NOT been merged into `sdlc/loop-v0`. This means **no per-user segmentation is possible via GA4 Data API v1beta** until the instrumentation is merged and data starts flowing (24–48h latency after merge).

**Additional discovery (live verification):** GA4 Data API v1beta does NOT expose `clientId`, `userId`, `userPseudoId`, or `sessionId` as dimensions. The Gemini analysis incorrectly assumed `clientId` was available as a fallback. The only user-level dimensions available are `audienceId`, `firstSessionDate`, and device/geo dimensions (`deviceCategory`, `operatingSystem`, `country`, `region`, `city`). All 356 users fall into a single audience (`13270960451`), making audience-based segmentation useless.

**This means the plan must operate on a dual-track:**
- **Track A (immediate):** Build the analytics infrastructure, segmentation logic, and report generation using aggregate-level queries and synthetic test data. Scripts are ready to switch to per-user queries once `customEvent:profile_id` data flows.
- **Track B (prerequisite):** Merge the ga4-custom-dimensions worktree into `sdlc/loop-v0` so custom dimension data starts populating.

---

## 2. Current State Analysis

### 2.1 Existing Analytics Assets

| Asset | Path | Role |
|---|---|---|
| Snapshot cron | `scripts/ga4-snapshot.sh` | Daily bash at 09:00 GMT+3, queries GA4 via `gog` CLI, writes `vault/snapshots/ga4-YYYY-MM-DD.md` |
| CLI client | `gog analytics report 519138010` | Wrapper over GA4 Data API v1beta. Supports `--json`, `--plain` (TSV), dimensions, metrics |
| Client hook | `src/hooks/useAnalytics.ts` | React hook wrapping Firebase Analytics `logEvent` |
| Types | `src/types/analytics.ts` | Typed `AnalyticsEvent` + `AnalyticsParams` |
| Custom dims | `scripts/ga4/dimension-ids.json` (in worktree) | 14 registered dimensions: profile_id, node_id, equation, response_time_ms, mode, + 9 more |
| Domain docs | `vault/domain/analytics.md` | Full event taxonomy, real data, concerning signals |
| Analysis docs | `vault/snapshots/per-node-completion-analysis.md`, `engagement-trend.md` | Manual analysis snapshots |
| Phase 10 plan | `docs/sdlc/anomaly-detection/0-plan.md` | Anomaly detection with Bayesian smoothing, active-day windowing |

### 2.2 Real GA4 Data (7-day, queried live 2026-08-15 11:10 IDT)

| Event | Count | Active Users |
|---|---|---|
| `question_answered` | 1,268 | 173 |
| `app_open` | 959 | 354 |
| `node_complete` | 520 | 79 |
| `node_start` | 264 | 147 |
| `node_select` | 165 | 165 |
| `page_view` | 877 | 356 |
| `login` | 543 | 354 |
| `signup` | 362 | 354 |
| `first_visit` | 356 | 356 |
| `session_start` | 356 | 356 |

### 2.3 Custom Dimension Status (live verification)

```
$ gog analytics report 519138010 --from=28daysAgo --to=today \
  --dimensions=customEvent:profile_id --metrics=eventCount,activeUsers --max=20 --plain

CUSTOMEVENT:PROFILE_ID   EVENTCOUNT  ACTIVEUSERS
(not set)                8692        524
```

**All 14 custom dimensions show `(not set)` for all events.** The registration was successful (API returned 200, dimension IDs recorded), but the client-side code that sends `profile_id`, `node_id`, etc. as event parameters has not been deployed. The `.worktrees/ga4-custom-dimensions` worktree contains the instrumentation changes but has not been merged.

### 2.4 GA4 Data API Dimension Availability (verified)

| Dimension | Available | Notes |
|---|---|---|
| `clientId` | ❌ | Not a valid dimension in Data API v1beta |
| `userId` | ❌ | Not a valid dimension |
| `userPseudoId` | ❌ | Not a valid dimension |
| `sessionId` | ❌ | Not a valid dimension |
| `audienceId` | ✅ | But all users in single audience — not useful |
| `firstSessionDate` | ✅ | Can cohort by acquisition date |
| `date` | ✅ | Daily breakdown |
| `eventName` | ✅ | Event-level |
| `customEvent:profile_id` | ✅ | Registered but `(not set)` until instrumentation merged |
| `customEvent:node_id` | ✅ | Registered but `(not set)` |
| `deviceCategory` | ✅ | All mobile |
| `country` / `region` / `city` | ✅ | All Israel / South District / Kiryat Gat |
| `platform` | ✅ | All web |

**Conclusion:** Without `customEvent:profile_id` data, per-user segmentation is impossible through GA4 Data API. The plan must account for this.

### 2.5 Missing Events

| Event | Status | Impact |
|---|---|---|
| `parent_game_start` | Not in `useAnalytics.ts` | Parent segment cannot be identified |
| `parent_game_complete` | Not in `useAnalytics.ts` | Parent segment cannot be identified |

### 2.6 Traffic Pattern

- **Bursty:** 50–128 DAU on active school days, 0–14 on off-days
- **Only 5–8 active days per 28-day window**
- **404 users opened app in 28-day window, only 52 completed any node** (12.9% completion)
- **All users on mobile web, all from Israel, all from Kiryat Gat**

---

## 3. Architecture

### 3.1 Execution Engine

**Bun** (available on the Pi) for zero-compilation TypeScript execution. Fallback: `npx tsx`.

```bash
# Primary
bun run scripts/analytics/segmentation.ts

# Fallback
npx tsx scripts/analytics/segmentation.ts
```

### 3.2 File Layout

```text
scripts/analytics/
├── shared/
│   ├── gog.ts              # Wrapper for child_process execSync of 'gog' CLI
│   ├── types.ts            # Segment enums, GA4 row types, user models
│   ├── format.ts           # Markdown generation utilities (tables, formatting)
│   └── constants.ts        # Property ID, event names, segment thresholds
├── segmentation.ts          # Segment users: Power, At-Risk, Dormant, Parent
├── funnel-by-segment.ts     # Node completion funnel broken down by segment
├── weekly-report.ts         # Orchestrator: calls above modules, writes markdown report
├── __tests__/
│   ├── fixtures/
│   │   ├── ga4-7d-events.json      # Synthetic 7-day event data
│   │   ├── ga4-28d-events.json     # Synthetic 28-day event data
│   │   └── ga4-empty.json           # No-traffic scenario
│   ├── segmentation.test.ts
│   ├── funnel.test.ts
│   └── weekly-report.test.ts
└── README.md                # How to run, prerequisites, troubleshooting
```

### 3.3 Code Structure Sketches

**`scripts/analytics/shared/gog.ts`**
```typescript
import { execSync } from 'child_process';

const PROPERTY_ID = '519138010';
const GOG_BIN = process.env.GOG_BIN || 'gog';

export interface GogQueryParams {
  dimensions: string[];
  metrics: string[];
  from: string;        // e.g. '7daysAgo', '2026-08-01'
  to: string;          // e.g. 'today', '2026-08-15'
  max?: number;        // default 10000
}

export interface GogRow {
  [key: string]: string | number;
}

/**
 * Run a GA4 Data API query via the gog CLI.
 * Returns parsed TSV rows as objects.
 */
export function runGogQuery(params: GogQueryParams): GogRow[] {
  const dimStr = params.dimensions.join(',');
  const metStr = params.metrics.join(',');
  const maxStr = params.max ? `--max=${params.max}` : '--max=10000';

  const cmd = `${GOG_BIN} analytics report ${PROPERTY_ID} \
    --dimensions="${dimStr}" \
    --metrics="${metStr}" \
    --from=${params.from} \
    --to=${params.to} \
    ${maxStr} \
    --plain`;

  const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  return parseTsv(output, params.dimensions, params.metrics);
}

/**
 * Run a GA4 query and return JSON (for complex nested responses).
 */
export function runGogQueryJson(params: GogQueryParams): unknown {
  const dimStr = params.dimensions.join(',');
  const metStr = params.metrics.join(',');
  const maxStr = params.max ? `--max=${params.max}` : '--max=10000';

  const cmd = `${GOG_BIN} analytics report ${PROPERTY_ID} \
    --dimensions="${dimStr}" \
    --metrics="${metStr}" \
    --from=${params.from} \
    --to=${params.to} \
    ${maxStr} \
    --json`;

  const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  return JSON.parse(output);
}

function parseTsv(raw: string, dimensions: string[], metrics: string[]): GogRow[] {
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t');
  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const row: GogRow = {};
    headers.forEach((h, i) => {
      const v = values[i] || '';
      // Try to parse numbers
      const n = Number(v);
      row[h] = isNaN(n) ? v : n;
    });
    return row;
  });
}
```

**`scripts/analytics/shared/types.ts`**
```typescript
export type Segment = 'power' | 'at-risk' | 'dormant' | 'parent' | 'unsegmented';

export interface UserSegment {
  identifier: string;          // profile_id (when available) or 'aggregate'
  segment: Segment;
  questionAnsweredCount: number;
  nodeStartCount: number;
  nodeCompleteCount: number;
  appOpenCount: number;
  lastActiveDate: string | null;
  segmentReason: string;       // Human-readable explanation
}

export interface SegmentSummary {
  segment: Segment;
  userCount: number;
  pctOfTotal: number;
  avgQuestionsPerUser: number;
  avgNodeCompletionRate: number;
}

export interface FunnelBySegment {
  segment: Segment;
  nodeSelects: number;
  nodeStarts: number;
  nodeCompletes: number;
  completionRate: number;       // Bayesian-smoothed (α=7, β=3)
  rawCompletionRate: number;    // Raw node_complete / node_start
  users: number;
}

export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  weekNumber: string;           // ISO week, e.g. '2026-W33'
  totalActiveUsers: number;
  totalQuestions: number;
  segments: SegmentSummary[];
  funnels: FunnelBySegment[];
  wowChange: {
    activeUsers: number | null;   // percentage change vs previous week
    questions: number | null;
    nodeCompletes: number | null;
  };
  anomalies: string[];           // From Phase 10 integration
  insights: string[];            // Auto-generated insights
}

// Segment thresholds (configurable)
export const SEGMENT_THRESHOLDS = {
  POWER_USER_QUESTIONS: 50,       // >50 question_answered in 7 days
  AT_RISK_MAX_QUESTIONS: 3,       // <3 question_answered in 7 days
  DORMANT_DAYS: 14,               // no app_open in last 14 days
  DORMANT_LOOKBACK: 28,           // but had app_open in 14-28 days ago
} as const;
```

**`scripts/analytics/shared/format.ts`**
```typescript
import type { SegmentSummary, FunnelBySegment, WeeklyReportData } from './types';

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatWow(change: number | null): string {
  if (change === null) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatPct(change)}`;
}

export function segmentTable(segments: SegmentSummary[]): string {
  const rows = segments.map(s =>
    `| ${s.segment} | ${s.userCount} | ${formatPct(s.pctOfTotal)} | ${s.avgQuestionsPerUser.toFixed(1)} | ${formatPct(s.avgNodeCompletionRate)} |`
  ).join('\n');
  return `| Segment | Users | % of Total | Avg Q/User | Avg Completion |\n|---|---|---|---|---|\n${rows}`;
}

export function funnelTable(funnels: FunnelBySegment[]): string {
  const rows = funnels.map(f =>
    `| ${f.segment} | ${f.users} | ${f.nodeSelects} | ${f.nodeStarts} | ${f.nodeCompletes} | ${formatPct(f.completionRate)} | ${formatPct(f.rawCompletionRate)} |`
  ).join('\n');
  return `| Segment | Users | Selects | Starts | Completes | Smoothed CR | Raw CR |\n|---|---|---|---|---|---|---|\n${rows}`;
}
```

**`scripts/analytics/shared/constants.ts`**
```typescript
export const PROPERTY_ID = '519138010';
export const EVENTS = {
  APP_OPEN: 'app_open',
  LOGIN: 'login',
  SIGNUP: 'signup',
  NODE_SELECT: 'node_select',
  NODE_START: 'node_start',
  NODE_COMPLETE: 'node_complete',
  QUESTION_ANSWERED: 'question_answered',
  STREAK_MILESTONE: 'streak_milestone',
  ARCADE_MODE_SELECT: 'arcade_mode_select',
  POWERUP_ACTIVATED: 'powerup_activated',
  LESSON_START: 'lesson_start',
  LESSON_COMPLETE: 'lesson_complete',
  // Not yet implemented
  PARENT_GAME_START: 'parent_game_start',
  PARENT_GAME_COMPLETE: 'parent_game_complete',
} as const;

export const CUSTOM_DIMENSIONS = {
  PROFILE_ID: 'customEvent:profile_id',
  NODE_ID: 'customEvent:node_id',
  MODE: 'customEvent:mode',
  IS_CORRECT: 'customEvent:is_correct',
} as const;
```

---

## 4. Segmentation Design

### 4.1 The Custom Dimension Problem

**Verified finding:** GA4 Data API v1beta does NOT expose `clientId`, `userId`, `userPseudoId`, or `sessionId` as queryable dimensions. The only per-user identifier available is `customEvent:profile_id`, which currently shows `(not set)` for all 8,692 events.

**Impact:** Per-user segmentation (power users, at-risk users, dormant users) is **impossible** until `customEvent:profile_id` data flows. This requires:
1. Merging `.worktrees/ga4-custom-dimensions` into `sdlc/loop-v0` (the client-side code that sends `profile_id` with each event)
2. Deploying the updated app
3. Waiting 24–48 hours for GA4 data processing latency

**Fallback strategy (Track A):** Build the segmentation infrastructure with:
- **Aggregate-level analysis:** Query event counts by `date` + `eventName` and compute segment-level metrics (not per-user, but per-segment estimates)
- **`firstSessionDate` cohort:** Use `firstSessionDate` as a pseudo-user-identifier for cohort analysis (groups users by first visit date — not true per-user but provides some granularity)
- **Profile_id-ready architecture:** All segmentation logic uses a configurable `USER_DIMENSION` constant. When `customEvent:profile_id` data flows, flip the constant and queries automatically use per-user data

```typescript
// shared/constants.ts
// Toggle this once customEvent:profile_id data is flowing
export const USER_DIMENSION = 'customEvent:profile_id';  // Will work once instrumentation merged
export const USER_DIMENSION_FALLBACK = 'firstSessionDate'; // Current fallback
export const IS_PER_USER_READY = false;  // Set to true after merge + 48h
```

### 4.2 Segment Definitions (Mutually Exclusive, Priority Order)

Segments are processed in priority order — a user falls into the **first** segment they qualify for:

| Priority | Segment | Criteria | Rationale |
|---|---|---|---|
| 1 | **Power** | >50 `question_answered` events in last 7 days | Highly engaged, driving most usage |
| 2 | **At-Risk** | ≥1 `node_start` AND <3 `question_answered` in last 7 days | Started but didn't engage — about to churn |
| 3 | **Parent** | Any `parent_game_complete` event (or proxy) | Using parent zone features |
| 4 | **Dormant** | Had `app_open` 14–28 days ago, but 0 `app_open` in last 14 days | Previously active, now lapsed |
| 5 | **Unsegmented** | None of the above | Default bucket |

**Why mutually exclusive?** A user who is both power AND parent should be analyzed as power first — their engagement pattern is dominated by power-user behavior. The priority order ensures each user appears in exactly one segment for clean funnel analysis.

### 4.3 Parent Segment Proxy (until parent_game_complete is instrumented)

Since `parent_game_complete` does not exist in `useAnalytics.ts`, the parent segment uses a proxy:

**Proxy definition:** Users who triggered `app_open` but zero `node_start` events AND zero `question_answered` events in the last 7 days. This captures "browsing-only" behavior that may indicate parent-zone usage.

**When parent events are added:** Switch the proxy to the real `parent_game_complete` event. The architecture supports this via a constant:

```typescript
export const PARENT_EVENT = 'parent_game_complete';  // Real event (not yet instrumented)
export const PARENT_PROXY = true;  // Use proxy until event exists
```

### 4.4 Concrete GA4 Queries

**Query 1: Per-user event counts (7-day) — for Power & At-Risk segments**

When `customEvent:profile_id` is flowing:
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=100000 --plain
```

Current fallback (aggregate by firstSessionDate):
```bash
gog analytics report 519138010 \
  --dimensions=firstSessionDate,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=100000 --plain
```

**Query 2: App open history (28-day) — for Dormant segment**

When `customEvent:profile_id` is flowing:
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,date \
  --metrics=eventCount \
  --from=28daysAgo --to=today \
  --max=100000 --plain
```

Current fallback (aggregate):
```bash
gog analytics report 519138010 \
  --dimensions=date,eventName \
  --metrics=eventCount,activeUsers \
  --from=28daysAgo --to=today \
  --max=100000 --plain
```

**Query 3: Parent segment (when event exists)**
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=10000 --plain
# Filter for eventName=parent_game_complete in post-processing
```

---

## 5. Funnel by Segment Design

### 5.1 Two-Phase Approach

Since GA4 Data API doesn't support JOINs, the funnel analysis uses a two-phase approach:

**Phase A — Segment Assignment:** Query per-user event counts (using the dimension from §4.1) and assign each user to a segment.

**Phase B — Funnel Events:** Query the same users' funnel events (`node_select` → `node_start` → `node_complete`).

**Phase C — In-Memory Merge:** Join Phase A and Phase B results in TypeScript by user identifier.

### 5.2 Optimized Single-Query Approach

To minimize API calls, use a single wide query that captures all events per user:

```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=100000 --plain
```

Then in TypeScript:
1. Pivot the data: each user becomes a row with columns for each event type's count
2. Apply segment rules to assign segment
3. Compute funnel metrics per segment

### 5.3 Handling `(not set)` for node_id

Since `customEvent:node_id` also shows `(not set)`, per-node funnel analysis is not yet possible. The funnel operates at the **macro level**: total `node_start` → total `node_complete` per segment.

**When node_id data flows**, add per-node breakdown:
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,customEvent:node_id,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=250000 --plain
```

### 5.4 Bayesian-Smoothed Completion Rate

Following Phase 10's design, use Laplace smoothing (α=7, β=3) for completion rates:

```typescript
function smoothedCompletionRate(completes: number, starts: number): number {
  const alpha = 7, beta = 3;
  return (completes + alpha) / (starts + alpha + beta);
}
```

This prevents 1/1 = 100% completion rate panic from small samples.

---

## 6. Weekly Report Design

### 6.1 Output Path

```text
docs/analytics/weekly-YYYY-WNN.md
```

Example: `docs/analytics/weekly-2026-W33.md`

### 6.2 Markdown Template

```markdown
---
type: weekly-report
project: hebrew-math-adventures
week: {ISO week string, e.g. 2026-W33}
period: {weekStart} to {weekEnd}
generated: {timestamp}
ga4_property: "519138010"
tags: [analytics, weekly, segmentation, report]
---

# Weekly Analytics Report — {Week Start} to {Week End}

## 1. Executive Summary

| Metric | This Week | vs Last Week | Change |
|---|---|---|---|
| Weekly Active Users | {WAU} | {prev_WAU} | {WoW%} |
| Total Questions Answered | {count} | {prev} | {WoW%} |
| Node Completions | {count} | {prev} | {WoW%} |
| Avg Engagement/User | {seconds}s | {prev}s | {WoW%} |

**Data quality note:** {Per-user segmentation status: "customEvent:profile_id data flowing" or "using firstSessionDate fallback — per-user metrics not available"}

## 2. User Segmentation

{If per-user data available:}

| Segment | Users | % of Total | Avg Q/User | Avg Completion Rate |
|---|---|---|---|---|
| Power | {n} | {%} | {avg} | {%} |
| At-Risk | {n} | {%} | {avg} | {%} |
| Parent | {n} | {%} | {avg} | {%} |
| Dormant | {n} | {%} | {avg} | {%} |
| Unsegmented | {n} | {%} | {avg} | {%} |

{If per-user data NOT available (current state):}

### ⚠️ Per-User Segmentation Unavailable

Custom dimension `profile_id` is not yet populated. Showing aggregate-level metrics only.

| Metric | This Week |
|---|---|
| Total question_answered events | {count} |
| Total node_start events | {count} |
| Total node_complete events | {count} |
| Macro completion rate (smoothed) | {%} |
| Estimated power users (>50 q/week) | ~{n} based on {total_questions} / {threshold} |
| Active days this week | {n}/7 |

## 3. Node Completion Funnel by Segment

{If per-user data available:}

| Segment | Users | Selects | Starts | Completes | Smoothed CR | Raw CR |
|---|---|---|---|---|---|---|
| Power | {n} | {n} | {n} | {n} | {%} | {%} |
| At-Risk | {n} | {n} | {n} | {n} | {%} | {%} |
| ... | | | | | | |

{If per-user data NOT available:}

### Aggregate Funnel (no segment breakdown)

| Stage | Event | Count | Users | Conversion |
|---|---|---|---|---|
| 1. App Open | app_open | {n} | {n} | 100% |
| 2. Node Select | node_select | {n} | {n} | {%} |
| 3. Node Start | node_start | {n} | {n} | {%} |
| 4. Questions | question_answered | {n} | {n} | {%} |
| 5. Node Complete | node_complete | {n} | {n} | {%} |

## 4. Power User Feature Analysis

{If per-user data available:}

| Feature | Power Users Using | % of Power Users | Avg Events/Power User |
|---|---|---|---|
| Arcade (TIME_ATTACK) | {n} | {%} | {avg} |
| Arcade (SURVIVAL) | {n} | {%} | {avg} |
| Arcade (MEMORY) | {n} | {%} | {avg} |
| Power-ups | {n} | {%} | {avg} |
| Story Lessons | {n} | {%} | {avg} |
| Streak Milestones | {n} | {%} | {avg} |

{If per-user data NOT available:}

### Aggregate Feature Usage

| Feature | Events | Users |
|---|---|---|
| arcade_mode_select | {n} | {n} |
| powerup_activated | {n} | {n} |
| lesson_start | {n} | {n} |
| streak_milestone | {n} | {n} |

## 5. Node Difficulty Analysis

{If customEvent:node_id available:}

| Node ID | Starts | Completes | Completion Rate | Avg Stars | Avg Mistakes |
|---|---|---|---|---|---|
| {node_id} | {n} | {n} | {%} | {avg} | {avg} |

**Worst completion nodes:** {list of nodes with lowest completion rates}

{If NOT available:}

### Per-Node Analysis Blocked

`customEvent:node_id` shows `(not set)` — requires client instrumentation merge.

## 6. Anomalies & Alerts

{Integration with Phase 10 anomaly detection — if detect-anomalies.ts exists:}
- {anomaly descriptions from Phase 10}

{If Phase 10 not yet implemented:}
*Phase 10 anomaly detection not yet deployed — will integrate when available.*

## 7. Insights & Recommendations

{Auto-generated insights based on data:}
- Power users answered {X}x more questions than at-risk users
- {N}% of node starts result in completion — {assessment}
- At-risk users represent {N}% of active users — {recommendation}
- {If arcade_mode_select > 0:} Arcade modes see {N} engagements from power users

## 8. Data Collection Notes

- **Custom dimension status:** profile_id={status}, node_id={status}
- **GA4 data latency:** Data up to 48 hours delayed
- **Active days this week:** {n}/7
- **Traffic pattern:** {bursty description}

---

*Generated by `bun run scripts/analytics/weekly-report.ts` at {timestamp}*
*Source: GA4 Data API via `gog analytics report 519138010`*
```

### 6.3 No-Traffic Week Handling

If total active users for the week < 5:
- Output a shortened "Low Traffic Week" report
- Skip segmentation and funnel sections
- Show only aggregate counts (which will be near-zero)
- Add note: "Insufficient traffic for meaningful analysis — this is normal for off-school periods"

### 6.4 WoW (Week-over-Week) Trend Comparison

The script queries the current week (last 7 days) AND the previous week (7–14 days ago) to compute:
- WoW active user change
- WoW question count change
- WoW node completion change

If previous week had 0 active users (common in bursty traffic), WoW change is `null` (displayed as `—`).

### 6.5 Phase 10 Anomaly Integration

If `scripts/detect-anomalies.ts` exists (from Phase 10 implementation):
- Call it with `--json` flag to get structured anomaly data
- Include anomalies in the "Anomalies & Alerts" section
- Reference the Phase 10 alert format

If not yet implemented, include a placeholder noting Phase 10 integration is pending.

---

## 7. Cron Scheduling

### 7.1 Schedule

**Monday 08:00 GMT+3** — runs before the daily 09:00 snapshot, avoiding CLI conflicts.

Rationale:
- Monday morning captures the full previous week (Mon–Sun)
- 08:00 gives 1 hour buffer before the 09:00 daily snapshot
- Weekly report is ready for review at the start of the week

### 7.2 Crontab Entry

```bash
# Weekly analytics segmentation report (Mondays at 08:00 GMT+3)
0 8 * * 1 cd /home/ramamos/.openclaw/workspace/hebrew-math-adventures && /home/ramamos/.bun/bin/bun run scripts/analytics/weekly-report.ts >> /home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/analytics/weekly-report.log 2>&1
```

### 7.3 Conflict Avoidance

| Job | Time | Duration | Conflict Risk |
|---|---|---|---|
| Weekly report | Mon 08:00 | ~2–5 min (4–6 gog queries) | Low — no other job running |
| Daily snapshot | Daily 09:00 | ~1–2 min (4 gog queries) | Low — 1 hour after weekly |
| Board tick | Every 10 min | <5s | Negligible |

The weekly report makes 4–6 gog CLI queries sequentially. Each takes ~5–15 seconds. Total runtime: ~2–5 minutes. No overlap with daily snapshot.

### 7.4 File Naming

```
docs/analytics/
├── weekly-2026-W33.md
├── weekly-2026-W32.md
├── weekly-2026-W31.md
└── ...
```

ISO week numbering: `YYYY-WNN` where NN is 01–53.

---

## 8. Testing Strategy

### 8.1 Vitest Setup

Analytics tests run under the existing vitest configuration. Test files in `scripts/analytics/__tests__/`.

### 8.2 Synthetic Fixtures

**`scripts/analytics/__tests__/fixtures/ga4-7d-events.json`** — Mock `gog --plain` output with:
- 5 power users (60–120 question_answered each)
- 15 at-risk users (1–2 node_start, 0–2 question_answered)
- 8 dormant users (app_open 20 days ago, nothing since)
- 3 parent proxy users (app_open only, no node events)
- 10 unsegmented users (various low engagement)

**`scripts/analytics/__tests__/fixtures/ga4-empty.json`** — No-traffic scenario for low-traffic handling.

**`scripts/analytics/__tests__/fixtures/ga4-notset.json`** — All `customEvent:profile_id` values are `(not set)` to test fallback behavior.

### 8.3 Mocking Strategy

Mock `execSync` from `child_process` to return fixture data instead of calling `gog`:

```typescript
import { vi } from 'vitest';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd.includes('customEvent:profile_id')) {
      return fs.readFileSync('fixtures/ga4-7d-events.json', 'utf-8');
    }
    // ... other mock responses
    return '';
  })
}));
```

### 8.4 Test Cases

| Test | Description | Verification |
|---|---|---|
| `segmentation.test.ts > power user` | User with 60 question_answered → segment=power | ✅ |
| `segmentation.test.ts > at-risk` | User with 1 node_start, 1 question_answered → segment=at-risk | ✅ |
| `segmentation.test.ts > dormant` | User with app_open 20 days ago, none since → segment=dormant | ✅ |
| `segmentation.test.ts > priority` | User qualifying for power AND parent → segment=power | ✅ |
| `segmentation.test.ts > not-set fallback` | All profile_id=(not set) → aggregate mode | ✅ |
| `funnel.test.ts > completion rate` | 3 completions / 10 starts → smoothed rate = 55.6% | ✅ |
| `funnel.test.ts > zero starts` | 0 starts → completion rate = 0 (INSUFFICIENT_DATA) | ✅ |
| `weekly-report.test.ts > markdown` | Generated markdown has valid headers and tables | ✅ |
| `weekly-report.test.ts > low traffic` | <5 WAU → shortened report | ✅ |
| `weekly-report.test.ts > WoW` | Current 100 users, prev 80 → +25% | ✅ |

### 8.5 Live Integration Test

A `--dry-run` flag on `weekly-report.ts` prints markdown to stdout without writing a file. This allows manual testing against live GA4 data:

```bash
bun run scripts/analytics/weekly-report.ts --dry-run
bun run scripts/analytics/segmentation.ts --verbose
```

Live integration tests are **not** part of the vitest suite — they require real gog auth and GA4 data.

---

## 9. Implementation Phases (Child Cards)

### Card 9.1: Analytics TypeScript Infrastructure

| Field | Value |
|---|---|
| **Title** | Phase 9.1: Analytics shared infrastructure (gog wrapper, types, formatting) |
| **Primary files** | `scripts/analytics/shared/gog.ts`, `types.ts`, `format.ts`, `constants.ts` |
| **Deliverables** | Working gog CLI wrapper with TSV parsing, typed interfaces, markdown formatting utils |
| **Verification** | `bun run scripts/analytics/shared/gog.ts` (smoke test: query GA4 and print parsed rows); `npx vitest run scripts/analytics/__tests__/gog.test.ts` |
| **Dependencies** | None — can start immediately |
| **Parallel with** | Card 9.5 (instrumentation merge) |

### Card 9.2: Segmentation Engine

| Field | Value |
|---|---|
| **Title** | Phase 9.2: User segmentation script |
| **Primary files** | `scripts/analytics/segmentation.ts`, `scripts/analytics/__tests__/segmentation.test.ts` |
| **Deliverables** | Segmentation script that queries GA4, assigns segments, outputs JSON + summary |
| **Verification** | `bun run scripts/analytics/segmentation.ts --dry-run` (prints segments); `npx vitest run scripts/analytics/__tests__/segmentation.test.ts` |
| **Dependencies** | Card 9.1 (shared infrastructure) |

### Card 9.3: Funnel by Segment

| Field | Value |
|---|---|
| **Title** | Phase 9.3: Node completion funnel by segment |
| **Primary files** | `scripts/analytics/funnel-by-segment.ts`, `scripts/analytics/__tests__/funnel.test.ts` |
| **Deliverables** | Funnel analysis script that joins segment membership with node events, outputs funnel table |
| **Verification** | `bun run scripts/analytics/funnel-by-segment.ts --dry-run`; `npx vitest run scripts/analytics/__tests__/funnel.test.ts` |
| **Dependencies** | Card 9.1, Card 9.2 (uses segmentation logic) |

### Card 9.4: Weekly Report Generator + Cron

| Field | Value |
|---|---|
| **Title** | Phase 9.4: Weekly report generator and cron scheduling |
| **Primary files** | `scripts/analytics/weekly-report.ts`, `scripts/analytics/__tests__/weekly-report.test.ts`, `docs/analytics/.gitkeep` |
| **Deliverables** | Weekly report script that orchestrates segmentation + funnel + WoW trends, writes markdown to `docs/analytics/weekly-YYYY-WNN.md`; crontab entry added |
| **Verification** | `bun run scripts/analytics/weekly-report.ts --dry-run` (prints full markdown); verify crontab entry exists |
| **Dependencies** | Card 9.2, Card 9.3 (calls both modules) |

### Card 9.5: Custom Dimension Instrumentation Merge (Prerequisite for per-user data)

| Field | Value |
|---|---|
| **Title** | Phase 9.5: Merge ga4-custom-dimensions worktree into sdlc/loop-v0 |
| **Primary files** | Merge `.worktrees/ga4-custom-dimensions` changes into `sdlc/loop-v0`; add `parent_game_start`/`parent_game_complete` events to `useAnalytics.ts` |
| **Deliverables** | Client code sends profile_id, node_id, and all custom params with every event; parent zone events instrumented |
| **Verification** | Deploy app, wait 48h, verify `customEvent:profile_id` shows real values in gog query |
| **Dependencies** | None (can start in parallel with 9.1) |
| **Note** | This is NOT a blocker for Cards 9.1–9.4 (they work in aggregate mode). But per-user segmentation requires this + 48h data latency. |

### Card Dependencies

```
9.5 (Instrumentation Merge) ─────────────────────────────────────────►
                                                                       │
9.1 (Infrastructure) ──► 9.2 (Segmentation) ──► 9.3 (Funnel) ──► 9.4 (Weekly Report + Cron)
                                                                       │
                                                                       └──► Per-user segmentation goes live
                                                                            (after 9.5 merge + 48h)
```

- **9.1 and 9.5** can start in parallel (no dependencies between them)
- **9.2** depends on 9.1 (needs gog wrapper, types)
- **9.3** depends on 9.1 and 9.2 (needs segmentation logic)
- **9.4** depends on 9.2 and 9.3 (orchestrates both)
- **9.5** unblocks per-user data but doesn't block infrastructure development

---

## 10. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Custom dim `(not set)` — data not flowing** | High | High (verified) | **Dual-track plan:** Track A builds infrastructure in aggregate mode; Track B merges instrumentation. Scripts use `IS_PER_USER_READY` flag to switch modes. |
| **No per-user dimension available in GA4 Data API v1beta** | High | Confirmed (verified) | Cannot use clientId/userId/userPseudoId — they're not valid dimensions. Must use `customEvent:profile_id` (once populated) or `firstSessionDate` (cohort-level, not per-user). |
| **GA4 data latency (24–48h)** | Medium | High | Weekly report uses `today - 1` as end date to capture full previous-day cohorts. Note latency in report. |
| **GA4 quota limits (10k/day)** | Low | Low | Weekly report makes 4–6 queries once/week = ~30 queries/month. Far below quota. |
| **GA4 max rows (250k)** | Low | Low | 7-day window with ~1,300 events and ~400 users — well within limits. |
| **Small sample sizes** | Medium | High | Bayesian Laplace smoothing (α=7, β=3) for completion rates. Minimum sample gates: <5 users → "INSUFFICIENT_DATA". <5 active days → raw numbers only, no percentages. |
| **gog CLI auth expiration** | Medium | Low | gog CLI auto-refreshes OAuth2 tokens. Daily cron already runs successfully. Weekly cron same auth path. |
| **parent_game_complete not instrumented** | Low | Confirmed | Proxy segment definition (browsing-only users). Graceful `PARENT_PROXY` flag to switch when event is added. |
| **Bun not available on Pi** | Low | Low | Fallback to `npx tsx`. Both verified available. |
| **All users from single geo/device** | Low | Confirmed | No impact on segmentation — just means geo/device segmentation is not useful. All users are mobile web from Israel. |

---

## 11. GA4 Query Reference

### 11.1 Segmentation Queries

**Power users (>50 question_answered in 7 days):**
```bash
# When profile_id is flowing:
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=100000 --plain
# Post-process: filter eventName=question_answered, group by profile_id, count > 50

# Current fallback (aggregate):
gog analytics report 519138010 \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --from=7daysAgo --to=today \
  --max=10000 --plain
# Post-process: if total_question_answered / 50 > 0, estimate power users count
```

**At-risk users (node_start but <3 question_answered in 7 days):**
```bash
# When profile_id is flowing:
# Same query as power users, post-process differently:
# Users with >=1 node_start AND <3 question_answered

# Current fallback (aggregate):
gog analytics report 519138010 \
  --dimensions=date,eventName \
  --metrics=eventCount,activeUsers \
  --from=7daysAgo --to=today \
  --max=10000 --plain
```

**Dormant users (no app_open in 14 days, but app_open in 14-28 days):**
```bash
# When profile_id is flowing:
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,date \
  --metrics=eventCount \
  --from=28daysAgo --to=today \
  --max=100000 --plain
# Filter eventName=app_open, find users with dates in [14-28]d but none in [0-14]d

# Current fallback (aggregate):
gog analytics report 519138010 \
  --dimensions=date \
  --metrics=activeUsers \
  --from=28daysAgo --to=today \
  --max=30 --plain
# Compare 14-day windows: if activeUsers in days [14-28] > 0 but [0-14] ≈ 0 → dormant population
```

### 11.2 Funnel Queries

**Node completion funnel (per-user, when profile_id flows):**
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=100000 --plain
# Post-process: pivot to per-user event counts, join with segment, compute funnel
```

**Per-node funnel (when node_id flows):**
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:node_id,eventName \
  --metrics=eventCount,activeUsers \
  --from=28daysAgo --to=today \
  --max=250000 --plain
# Post-process: for each node_id, compute start→complete conversion
```

### 11.3 Feature Usage Queries

**Arcade mode usage:**
```bash
gog analytics report 519138010 \
  --dimensions=customEvent:mode \
  --metrics=eventCount,activeUsers \
  --from=7daysAgo --to=today \
  --max=100 --plain
# Currently shows (not set) for all events
```

**Feature engagement overview:**
```bash
gog analytics report 519138010 \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --from=7daysAgo --to=today \
  --max=100 --plain
```

### 11.4 WoW Comparison Queries

**Previous week (7-14 days ago):**
```bash
gog analytics report 519138010 \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --from=14daysAgo --to=8daysAgo \
  --max=100 --plain
```

**This week (0-7 days ago):**
```bash
gog analytics report 519138010 \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --from=7daysAgo --to=today \
  --max=100 --plain
```

### 11.5 Query Optimization

When `customEvent:profile_id` is flowing, a **single wide query** captures all data needed for segmentation + funnel:

```bash
gog analytics report 519138010 \
  --dimensions=customEvent:profile_id,eventName \
  --metrics=eventCount \
  --from=7daysAgo --to=today \
  --max=100000 --plain
```

This single query provides:
- Per-user question_answered counts → power/at-risk segmentation
- Per-user node_start/node_complete counts → funnel computation
- Per-user app_open counts → dormant detection (with 28-day query)

Total queries per weekly report: **4** (7-day events, 28-day events, 14-day events for WoW, 28-day for dormant). Well within GA4 quota.

---

## 12. Key Design Decisions

1. **TypeScript over bash** — The segmentation logic (priority-based assignment, Bayesian smoothing, WoW calculations) is impractical in bash. TypeScript enables full type safety and vitest testability. The existing `ga4-snapshot.sh` remains in bash for daily snapshots.

2. **gog CLI wrapper over Google Analytics Data API client library** — The gog CLI already handles OAuth2, token refresh, and API calls. Adding the `@google-analytics/data` Node.js library would duplicate auth logic and add bundle weight. The wrapper uses `execSync` for simplicity (queries are sequential and fast).

3. **Dual-track architecture (IS_PER_USER_READY flag)** — Rather than blocking all work until custom dimensions flow, the plan builds infrastructure that works in aggregate mode now and switches to per-user mode with a single flag change. This unblocks 4 of 5 child cards immediately.

4. **Mutually exclusive segments with priority** — A user can only be in one segment. Priority order (power > at-risk > parent > dormant) ensures clean funnel analysis without double-counting. A power user who also uses parent zone is analyzed as power.

5. **Bayesian-smoothed completion rates** — Following Phase 10's design, use Laplace smoothing (α=7, β=3) to prevent small-sample panic (1/1 = 100% → smoothed to 64.3%).

6. **Monday 08:00 cron** — Captures full previous week (Mon–Sun), runs before daily 09:00 snapshot, report ready for Monday morning review.

7. **firstSessionDate as fallback dimension** — When profile_id is not available, `firstSessionDate` provides cohort-level grouping (users by first-visit date). Not true per-user, but better than pure aggregate. This is the only user-related dimension available in GA4 Data API v1beta.

8. **Parent proxy segment** — Since `parent_game_complete` doesn't exist, use "browsing-only users" (app_open but no node_start/question_answered) as a proxy. Switch to real event when instrumented.

---

## Appendix A: Verified GA4 Data API Dimensions

Dimensions tested live on 2026-08-15 against property 519138010:

| Dimension | Status | Sample Value |
|---|---|---|
| `date` | ✅ Valid | `20260814` |
| `eventName` | ✅ Valid | `question_answered` |
| `firstSessionDate` | ✅ Valid | `20260814` |
| `audienceId` | ✅ Valid | `13270960451` |
| `audienceResourceName` | ✅ Valid | `properties/519138010/audiences/13270960451` |
| `deviceCategory` | ✅ Valid | `mobile` |
| `operatingSystem` | ✅ Valid | `Android` |
| `platform` | ✅ Valid | `web` |
| `country` | ✅ Valid | `Israel` |
| `region` | ✅ Valid | `South District` |
| `city` | ✅ Valid | `Kiryat Gat` |
| `customEvent:profile_id` | ✅ Registered | `(not set)` — data not flowing |
| `customEvent:node_id` | ✅ Registered | `(not set)` — data not flowing |
| `customEvent:mode` | ✅ Registered | `(not set)` — data not flowing |
| `clientId` | ❌ Invalid | "Did you mean contentId?" |
| `userId` | ❌ Invalid | "Did you mean itemId?" |
| `userPseudoId` | ❌ Invalid | "Did you mean userGender?" |
| `sessionId` | ❌ Invalid | "Did you mean region?" |

---

## Appendix B: Existing Analytics Commands (reference)

```bash
# Daily snapshot (existing cron)
./scripts/ga4-snapshot.sh
./scripts/ga4-snapshot.sh 7  # 7-day window

# Manual GA4 queries
gog analytics report 519138010 \
  --from=28daysAgo --to=today \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=100 --plain

# Custom dimension query (when data flows)
gog analytics report 519138010 \
  --from=7daysAgo --to=today \
  --dimensions=customEvent:profile_id,eventName \
  --metrics=eventCount \
  --max=100000 --plain

# JSON output for scripting
gog analytics report 519138010 \
  --from=7daysAgo --to=today \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=100 --json
```

---

*Analysis delegated to Gemini 3.1 Pro High via `ask-agy --card 145c3562-ca4e-49a2-9d89-5a0d079896a7` (Claude session-limited, resets 14:00 IDT). Full Gemini analysis artifact: `~/.gemini/antigravity-cli/brain/d2ec2df0-151e-4ea6-bb72-1238a5b92089/phase_9_analytics_plan.md`. This plan corrects the Gemini analysis's assumption that `clientId` is available as a GA4 Data API dimension (verified: it is not) and adds live verification findings for all custom dimensions.*
