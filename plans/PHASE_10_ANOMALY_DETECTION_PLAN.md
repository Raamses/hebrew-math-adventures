# Phase 10: Anomaly Detection & Session Health Alerts
## Architectural Design & Implementation Plan

**Project:** Hebrew Math Adventures (`hebrew-math-adventures`)  
**Lead Architect:** Antigravity  
**Target Environment:** React 19 + TypeScript + Vite + Firebase Analytics (GA4 Property `519138010`)  
**Target Branch:** `sdlc/loop-v0`  
**Date:** August 15, 2026  

---

## Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Current State & Gap Analysis](#2-current-state--gap-analysis)
3. [Anomaly Detection Design (5 Anomaly Types)](#3-anomaly-detection-design-5-anomaly-types)
   - [Anomaly 1: Sudden Drop in Node Complete Rate](#anomaly-1-sudden-drop-in-node_complete-rate)
   - [Anomaly 2: Sudden Spike in Zero-Answer Sessions](#anomaly-2-sudden-spike-in-zero-answer-sessions)
   - [Anomaly 3: Abnormally Long Response Times (P95 Latency)](#anomaly-3-abnormally-long-response-times-p95-latency)
   - [Anomaly 4: Session Crash & Bounce Patterns](#anomaly-4-session-crash--bounce-patterns)
   - [Anomaly 5: Parent Zone Funnel Abandonment](#anomaly-5-parent-zone-funnel-abandonment)
4. [Script Architecture (TypeScript Engine vs Shell)](#4-script-architecture-typescript-engine-vs-shell)
5. [Threshold Tuning & Small-Sample Smoothing for Bursty Traffic](#5-threshold-tuning--small-sample-smoothing-for-bursty-traffic)
6. [Cron Scheduling & Pipeline Integration](#6-cron-scheduling--pipeline-integration)
7. [Alert Output Format & Markdown Templates](#7-alert-output-format--markdown-templates)
8. [Test Plan & Synthetic Data Injection](#8-test-plan--synthetic-data-injection)
9. [Implementation Phases & Builder Child Cards](#9-implementation-phases--builder-child-cards)
10. [Risk Assessment & Mitigations](#10-risk-assessment--mitigations)

---

## 1. Executive Summary & Problem Statement

### 1.1 The Operational Reality of "Hebrew Math Adventures"
"Hebrew Math Adventures" is an early-childhood and elementary educational math game deployed to Israeli kindergartens and elementary school classrooms. Because usage is heavily tied to scheduled classroom computer lab sessions, pilot cohorts, and educator workshops, the traffic profile exhibits extreme **burstiness**:
- **Active Testing Days:** 50 to 120+ Daily Active Users (DAU), generating 1,500–3,000+ interactions within a 2-hour morning window.
- **Downtime / Non-Class Days:** 0 to 5 DAU on weekends, holidays, or off-schedule days.
- **28-Day Historical Distribution (as of Aug 2026):** Only 5–8 active days out of 28 calendar days.

```
       Bursty Classroom Traffic Pattern (DAU)
 120 |                 * [109]
 100 |           * [94] * [87]
  80 |       * [66]
  60 |
  40 |
  20 |
   0 | *---*-------------*---*---*---*--- (0-3 users on weekends/off-days)
      Jul 31       Aug 2-10 (Silent)  Aug 11-14 (Classroom Surge)
```

### 1.2 The Problem
In this bursty environment, software regressions (e.g., broken asset loaders, unsolvable procedural math generation, unresponsive canvas touch controls, unhandled promise rejections on Safari/iPad) lead to **silent session failure**:
1. Children cannot articulate technical bugs; they simply abandon the app, stare at a frozen question, or bounce back to the home screen.
2. Traditional statistical anomaly detectors (e.g., 7-day rolling moving average, $3\sigma$ thresholding) **fail completely**:
   - Off-days drag the rolling mean to near-zero, creating false "positive spikes" on normal school days.
   - Low traffic days produce high-variance percentages (e.g., 1 drop out of 2 starts = 50% drop rate), triggering debilitating **alert fatigue**.
   - True regressions occurring on a high-volume day get washed out if evaluated against calendar-day averages.
3. Lack of automated alerts means broken features can persist unnoticed across multiple school days until an educator complains.

### 1.3 Goal of Phase 10
Build an **intelligent, small-sample-aware Anomaly Detection & Session Health Alerting System** that:
- Seamlessly integrates with the existing daily GA4 snapshot cron (`scripts/ga4-snapshot.sh` at 09:00 GMT+3).
- Uses **Active-Day Windowing** and **Bayesian Laplace Smoothing** to reliably detect 5 critical session health anomalies without false positives on zero-traffic days.
- Emits structured, actionable triage markdown artifacts (`vault/alerts/alert-YYYY-MM-DD.md`) and pre-formats messages for instant dispatch (AmosBot / Telegram / Webhook).

---

## 2. Current State & Gap Analysis

### 2.1 Existing Analytics Assets
| Asset | Path | Role & Capabilities |
|---|---|---|
| **Snapshot Cron** | [`scripts/ga4-snapshot.sh`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/ga4-snapshot.sh) | Daily bash script run at 09:00 GMT+3. Fetches 1-day and 28-day GA4 reports via `gog` CLI. Generates [`vault/snapshots/ga4-YYYY-MM-DD.md`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/vault/snapshots/ga4-2026-08-14.md). |
| **CLI Client** | `gog analytics report 519138010` | Wrapper over Google Analytics Data API v1beta. Supports `--json`, `--plain` (TSV), `--from`, `--to`, `--dimensions`, `--metrics`. |
| **Client Hook** | [`src/hooks/useAnalytics.ts`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/src/hooks/useAnalytics.ts) | React hook wrapping Firebase Analytics `logEvent`. |
| **Admin API Provisioning** | [`scripts/ga4-register-custom-dimensions.py`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/ga4-register-custom-dimensions.py) | Python script registering custom event/user dimensions via GA4 Admin API. |

### 2.2 Critical Gaps & Technical Obstacles

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   IDENTIFIED GAPS                                      │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ 1. Missing Client Events   │ 2. Parameter Queryability   │ 3. Baseline & Anomaly Logic │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ • parent_game_start and    │ • response_time_ms is logged│ • ga4-snapshot.sh only      │
│   parent_game_complete do  │   as a param, but not       │   outputs raw tables.       │
│   not exist in             │   registered as a GA4       │ • No anomaly computation,   │
│   useAnalytics.ts or UI.   │   custom metric.            │   no baseline comparison,   │
│ • Zero instrumentation for │ • GA4 Data API cannot run   │   no sample size filters,   │
│   Parent Zone activities.  │   percentiles (P95) on raw  │   no alert generation.      │
│                            │   event parameters easily.  │                             │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

#### Gap 1: Missing Parent Zone Events
- In `src/types/analytics.ts` and `src/hooks/useAnalytics.ts`, `AnalyticsEvent` lacks `parent_game_start` and `parent_game_complete`.
- The Parent Dashboard (`src/components/parent/ParentDashboard.tsx`) allows profile management and review, but does not track diagnostic activities or co-op gameplay funnels.

#### Gap 2: Custom Parameter `response_time_ms` Queryability
- In standard GA4 Data API queries, querying `customEvent:response_time_ms` fails with `400 Bad Request` unless explicitly configured as a custom metric in GA4 Admin.
- GA4 Reporting API does not natively compute continuous percentiles (e.g. P95) across arbitrary event parameters without BigQuery or bucketed dimension distribution.
- **Solution:** Hybrid approach:
  1. Register `latency_bucket` dimension (`<2s`, `2-5s`, `5-10s`, `>10s`) for native GA4 histogram queries.
  2. Implement client-side session health aggregation logging summary percentiles.
  3. Calculate macro-latency proxy (`userEngagementDuration / question_answered`) from GA4 standard metrics.

#### Gap 3: Baseline Comparison with Irregular Data
- Current `ga4-snapshot.sh` only computes single-day snapshot ratios against the 28-day cumulative total. It does not compute active-day baselines, week-over-week (WoW) normalized differences, or statistical thresholds.

---

## 3. Anomaly Detection Design (5 Anomaly Types)

To address small sample sizes and bursty traffic, all detectors enforce:
1. **Minimum Sample Size Gate ($N_{min}$):** If traffic is below $N_{min}$, status is marked `INSUFFICIENT_DATA` (suppressed from triggering high-priority alerts).
2. **Active-Day Baseline ($B_{\text{active}}$):** Baselines are calculated only across the last $K$ days where $DAU \ge 10$ (default $K=7$ active days within the last 28 days), ignoring 0-traffic days.
3. **Bayesian Laplace Smoothing:** Protects rate calculations against small denominators ($n < 30$).

---

### Anomaly 1: Sudden Drop in `node_complete` Rate

#### 1. Metric Definition & Mathematical Formulation
Completion rate measures the ratio of players who finish a node after starting it. We compute both **Event Completion Ratio ($CR_E$)** and **User Completion Ratio ($CR_U$)**:

$$CR_E = \frac{Count(\text{node\_complete})}{Count(\text{node\_start})}$$

To stabilize small daily counts ($n = Count(\text{node\_start})$):
$$\widehat{CR}_E = \frac{Count(\text{node\_complete}) + \alpha}{Count(\text{node\_start}) + \alpha + \beta}$$
*(Prior parameters: $\alpha = 7, \beta = 3$, reflecting a healthy 70% historical baseline)*

#### 2. Exact `gog` CLI Query Commands
```bash
# Query event counts by date for the last 14 days
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

#### 3. Detection Algorithm & Thresholds
- **Sample Size Gate:** $Count(\text{node\_start}) \ge 15$
- **Baseline ($CR_{\text{baseline}}$):** Median $\widehat{CR}_E$ over the last 5 active days ($DAU \ge 10$).
- **Relative Delta:** $\Delta_{\% } = \frac{\widehat{CR}_{E,\text{today}} - CR_{\text{baseline}}}{CR_{\text{baseline}}} \times 100\%$

| Severity | Condition | Action |
|---|---|---|
| **HEALTHY** | $\Delta_{\% } \ge -10\%$ | Log OK |
| **WARNING** | $-20\% \le \Delta_{\% } < -10\%$ | Alert in snapshot |
| **CRITICAL** | $\Delta_{\% } < -20\%$ OR $\widehat{CR}_{E,\text{today}} < 40\%$ | High-priority Alert (AmosBot/Telegram) |
| **INSUFFICIENT_DATA** | $Count(\text{node\_start}) < 15$ | Suppress alert, report info |

#### 4. Diagnostic Runbook
- **Probable Causes:**
  1. A newly deployed node/question has a math equation error or impossible condition.
  2. UI canvas bug preventing touch interaction on the final question step.
  3. Audio asset load failure blocking the completion modal celebration.
- **Triage Steps:**
  1. Check per-node completion breakdown: `gog analytics report 519138010 --dimensions="customEvent:node_id,eventName" --metrics="eventCount"`
  2. Isolate which specific `node_id` has high starts and 0 completions.
  3. Reproduce in local environment: `npm run dev` and navigate to that `node_id`.

---

### Anomaly 2: Sudden Spike in Zero-Answer Sessions

#### 1. Metric Definition & Mathematical Formulation
A "Zero-Answer Session" occurs when a user initiates a session (`session_start` / `app_open`) but never records a single `question_answered` event.

$$ZAR = 1.0 - \frac{\text{Active Users with } \text{question\_answered}}{\text{Total Active Users}} = 1.0 - \frac{U_{\text{question\_answered}}}{U_{\text{total}}}$$

#### 2. Exact `gog` CLI Query Commands
```bash
# Query daily active users and sessions
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date" \
  --metrics="activeUsers,sessions" \
  --json

# Query event-level active users
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

#### 3. Detection Algorithm & Thresholds
- **Sample Size Gate:** $Total Active Users \ge 10$
- **Historical Baseline ($ZAR_{\text{baseline}}$):** Average $ZAR$ across active days (historical norm: $15\% - 22\%$).

| Severity | Condition | Action |
|---|---|---|
| **HEALTHY** | $ZAR \le 25\%$ | Normal engagement |
| **WARNING** | $25\% < ZAR \le 35\%$ | Flag in daily snapshot |
| **CRITICAL** | $ZAR > 35\%$ (or $>30\%$ when $DAU \ge 30$) | Trigger urgent session health alert |
| **INSUFFICIENT_DATA** | $DAU < 10$ | Suppress alert |

#### 4. Diagnostic Runbook
- **Probable Causes:**
  1. Profile selector or onboarding gate is crashing/freezing on specific browser versions (e.g. older Android Chrome / iOS Safari).
  2. Language loading bug: i18n initialization hanging before game modes render.
  3. Audio permission prompt blocking the main menu entry.
- **Triage Steps:**
  1. Inspect `app_open` vs `login` vs `node_select` ratio in the daily breakdown.
  2. Check browser console logs for fatal top-level React render errors (`Uncaught TypeError`).

---

### Anomaly 3: Abnormally Long Response Times (P95 Latency)

#### 1. Metric Definition & GA4 Workaround Strategy
In children's educational apps, response times $>10$s indicate either a confusing UI, equation difficulty mismatch, or canvas lag/freezing.

Because GA4 Data API does not support calculating continuous P95 percentiles directly from unaggregated custom parameters without BigQuery, we execute a **three-tier architecture**:

```
                                  RESPONSE TIME ARCHITECTURE
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Macro GA4 Proxy (Immediate)                                                               │
│    Engagement Per Answer (EPA) = userEngagementDuration / question_answered                 │
│    Threshold: EPA > 12.0s (Normal: 4.0s - 8.0s)                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Dimension Bucketing (Client + GA4)                                                       │
│    Log `latency_bucket`: [ '<2s', '2-5s', '5-10s', '>10s' ] in question_answered            │
│    Slow Response Ratio (SRR) = Count(latency_bucket == '>10s') / Total Answers               │
│    Threshold: SRR > 20%                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. Client-Side Session Health Buffer (Local / Telemetry)                                    │
│    Aggregates exact P50, P90, P95 on the client and flushes on node_complete                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 2. Exact `gog` CLI Query Commands
```bash
# Query daily engagement duration and question answers
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,userEngagementDuration,activeUsers" \
  --json

# Query latency bucket distribution (once custom dimension latency_bucket is registered)
gog analytics report 519138010 \
  --from="7daysAgo" --to="today" \
  --dimensions="customEvent:latency_bucket" \
  --metrics="eventCount" \
  --json
```

#### 3. Detection Algorithm & Thresholds
- **Sample Size Gate:** $Count(\text{question\_answered}) \ge 25$
- **Primary Metric:** $\text{Slow Ratio} = \frac{\text{Answers } > 10\text{s}}{\text{Total Answers}}$ (or Macro Proxy $\text{EPA} = \frac{\text{Engagement Duration}}{\text{Answers}}$).

| Severity | Macro Proxy EPA | Slow Bucket ($>10\text{s}$) | Status |
|---|---|---|---|
| **HEALTHY** | $\text{EPA} \le 8.5\text{s}$ | $\le 12\%$ | Healthy flow |
| **WARNING** | $8.5\text{s} < \text{EPA} \le 12.0\text{s}$ | $12\% - 20\%$ | Latency Warning |
| **CRITICAL** | $\text{EPA} > 12.0\text{s}$ | $> 20\%$ (or P95 $> 10\text{s}$) | Critical Slowdown |
| **INSUFFICIENT_DATA** | $Answers < 25$ | — | Suppress |

#### 4. Diagnostic Runbook
- **Probable Causes:**
  1. Font rendering lag or LaTeX equation parse hitch on mobile devices.
  2. Question difficulty spike (e.g., introducing multi-digit addition without visual aids).
  3. Drag-and-drop / bubble spawn physics stuttering (low frame rate).
- **Triage Steps:**
  1. Inspect `response_time_ms` grouped by `operation` and `target_level`.
  2. Check frame rate benchmarks on low-end tablets.

---

### Anomaly 4: Session Crash & Bounce Patterns

#### 1. Metric Definition & Mathematical Formulation
A "Ghost Session" or "Instant Bounce" is characterized by an `app_open` or `session_start` where the user exits in $< 3$ seconds with 0 gameplay interactions (`node_start = 0`, `question_answered = 0`, `node_select = 0`).

$$\text{Ghost Bounce Ratio } (GBR) = \frac{\text{Sessions with engagement} \le 3\text{s}}{\text{Total Sessions}}$$
$$\text{Macro Crash Proxy } (MCP) = 1.0 - \frac{U_{\text{node\_start}} + U_{\text{arcade\_mode\_select}}}{U_{\text{app\_open}}}$$

#### 2. Exact `gog` CLI Query Commands
```bash
# Query daily overview: active users, sessions, engagement duration
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date" \
  --metrics="activeUsers,sessions,eventCount,userEngagementDuration" \
  --json

# Query core funnel events
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

#### 3. Detection Algorithm & Thresholds
- **Sample Size Gate:** $DAU \ge 15$
- **Crash Indicator:** Average engagement time per user $< 6.0\text{s}$ AND $MCP > 40\%$.

| Severity | Condition | Status |
|---|---|---|
| **HEALTHY** | $\text{Avg Engagement} \ge 15\text{s}$ AND $MCP \le 25\%$ | Normal |
| **WARNING** | $MCP > 30\%$ OR $\text{Avg Engagement} < 10\text{s}$ | Warning |
| **CRITICAL** | $MCP > 45\%$ OR $\text{Avg Engagement} < 6\text{s}$ | High Crash/Bounce Risk |
| **INSUFFICIENT_DATA** | $DAU < 15$ | Suppress |

#### 4. Diagnostic Runbook
- **Probable Causes:**
  1. WebGL/Canvas context initialization crash on iOS Safari / WebKit.
  2. Broken service worker cache serving mismatched bundle chunks.
  3. Firebase Analytics initialization timeout blocking the root render.

---

### Anomaly 5: Parent Zone Funnel Abandonment

#### 1. Metric Definition & Mathematical Formulation
Measures whether parents/teachers who start a Parent Zone diagnostic test or guided game complete it.

$$\text{Parent Abandonment Rate } (PAR) = 1.0 - \frac{Count(\text{parent\_game\_complete})}{Count(\text{parent\_game\_start})}$$

#### 2. Client Instrumentation Required (Closing the Gap)
In `src/types/analytics.ts` and `src/hooks/useAnalytics.ts`:
```typescript
// Add to AnalyticsEvent
| 'parent_game_start'
| 'parent_game_complete'
| 'parent_zone_enter'
| 'parent_zone_exit'
```

In `src/components/parent/ParentDashboard.tsx`:
```typescript
// When parent starts a guided activity/diagnostic test:
logEvent('parent_game_start', {
  game_mode: 'parent_diagnostic',
  profile_id: currentProfileId,
});

// When completed:
logEvent('parent_game_complete', {
  game_mode: 'parent_diagnostic',
  duration_seconds: elapsed,
  success: true,
});
```

#### 3. Exact `gog` CLI Query Commands
```bash
# Query parent zone events
gog analytics report 519138010 \
  --from="28daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

#### 4. Detection Algorithm & Thresholds
- **Sample Size Gate:** $Count(\text{parent\_game\_start}) \ge 5$ (Parent traffic is lower volume).
- **Thresholds:**

| Severity | Condition | Status |
|---|---|---|
| **HEALTHY** | $PAR \le 30\%$ | Healthy parent completion |
| **WARNING** | $30\% < PAR \le 50\%$ | Elevated abandonment |
| **CRITICAL** | $PAR > 50\%$ | Critical Parent Zone UX roadblock |
| **INSUFFICIENT_DATA** | $Count(\text{parent\_game\_start}) < 5$ | Suppress |

---

## 4. Script Architecture (TypeScript Engine vs Shell)

### 4.1 Comparison & Architecture Decision

| Criteria | Pure Bash Shell (`.sh`) | Pure TypeScript (`.ts`) | **Hybrid Architecture (Recommended)** |
|---|---|---|---|
| **JSON Parsing** | Requires `jq` (brittle with nested GA4 formats) | Native `JSON.parse` with strict types | **Engine in TS, Cron runner in Bash** |
| **Mathematical Modeling** | `bc` / `awk` (clunky floating point & arrays) | Full JS Math, statistical distributions | **TS handles all stats, gates & baselines** |
| **Unit Testability** | Hard to test bash edge cases with mocks | Full `vitest` unit test suite & synthetic fixtures | **100% testable via vitest** |
| **CLI & Cron Interop** | Native shell integration | Requires node/bun runner | **Bash wrapper executes `bun` or `npx tsx`** |
| **Maintainability** | Degrades rapidly above 150 lines | Clean modular structure, types, schemas | **High readability & easy builder tasks** |

### 4.2 System Architecture Diagram

```
                              ANOMALY DETECTION PIPELINE
 ┌───────────────────────────────────────────────────────────────────────────────────┐
 │                               Daily Cron (09:00 GMT+3)                            │
 └────────────────────────────────────────┬──────────────────────────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │         scripts/ga4-snapshot.sh         │
                     │  1. Queries gog CLI for raw data        │
                     │  2. Writes vault/snapshots/ga4-*.md     │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │      scripts/detect-anomalies.ts        │
                     │  (Bun / Node TypeScript Engine)         │
                     └────────────────────┬────────────────────┘
                                          │
        ┌─────────────────────────────────┼──────────────────────────────────┐
        ▼                                 ▼                                  ▼
┌──────────────────┐            ┌──────────────────┐               ┌──────────────────┐
│ Active-Day       │            │ Bayesian Laplace │               │ Small-Sample     │
│ Baseline Window  │            │ Smoothing        │               │ Gate Checks      │
└───────┬──────────┘            └─────────┬────────┘               └─────────┬────────┘
        │                                 │                                  │
        └─────────────────────────────────┼──────────────────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │        Evaluate 5 Anomaly Rules         │
                     │  • Node Complete Drop                   │
                     │  • Zero-Answer Spike                    │
                     │  • Latency P95 / Macro EPA              │
                     │  • Ghost Crash / Bounce                 │
                     │  • Parent Zone Abandonment              │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │ Output Generation:                      │
                     │  1. vault/alerts/alert-YYYY-MM-DD.md    │
                     │  2. JSON state: .alert-state.json       │
                     │  3. Formatted Telegram / AmosBot payload│
                     │  4. Exit Codes: 0=OK, 1=WARN, 2=CRIT    │
                     └─────────────────────────────────────────┘
```

### 4.3 Directory Structure
```
scripts/
├── ga4-snapshot.sh                    # Main cron entrypoint
├── ga4-register-custom-dimensions.py  # Admin API custom dimension setup
├── detect-anomalies.ts                # TypeScript CLI runner
└── anomaly-detector/
    ├── types.ts                       # GA4 API & Anomaly types
    ├── parser.ts                      # gog JSON & TSV parser
    ├── baselines.ts                   # Active-day windowing & smoothing
    ├── rules/
    │   ├── nodeCompleteDrop.ts        # Anomaly 1 rule
    │   ├── zeroAnswerSpike.ts         # Anomaly 2 rule
    │   ├── responseTimeLatency.ts     # Anomaly 3 rule
    │   ├── sessionCrashBounce.ts      # Anomaly 4 rule
    │   └── parentAbandonment.ts       # Anomaly 5 rule
    ├── formatters/
    │   └── markdownAlert.ts           # Markdown alert generator
    └── __tests__/
        ├── fixtures/                  # Synthetic GA4 JSON responses
        └── anomalyDetector.test.ts    # Vitest suite
```

---

## 5. Threshold Tuning & Small-Sample Smoothing for Bursty Traffic

### 5.1 The Active-Day Windowing Algorithm
Instead of taking a fixed 7-calendar-day window (which contains 4–6 zeros), we extract the **most recent $K=5$ active days** where $DAU \ge 10$:

```typescript
export function getActiveDays(dailyRows: DailyRecord[], minDau = 10, maxDays = 5): DailyRecord[] {
  return dailyRows
    .filter(row => row.activeUsers >= minDau)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxDays);
}
```

### 5.2 Bayesian Laplace Smoothing for Rates
When calculating rates (e.g. $k$ completions out of $n$ starts), raw division $\frac{k}{n}$ fluctuates wildly for small $n$. We apply Laplace smoothing with prior $(\alpha, \beta)$:

$$\hat{p} = \frac{k + \alpha}{n + \alpha + \beta}$$

| Metric | Sample $n$ | Observed $k$ | Raw $\frac{k}{n}$ | Smoothed $\hat{p}$ ($\alpha=7, \beta=3$) | Assessment |
|---|---|---|---|---|---|
| **Classroom Burst** | 80 | 68 | 85.0% | **83.3%** | Reliable high confidence |
| **Small Group Test** | 4 | 2 | 50.0% | **64.3%** | Suppresses premature false panic |
| **Broken Release** | 35 | 4 | 11.4% | **24.4%** | Confirmed critical anomaly ($< 40\%$) |

### 5.3 Alert Fatigue Prevention & Cooldown
To prevent spamming the developer or channel repeatedly for the same ongoing issue:
1. **State Persistence:** Detector stores `.alert-state.json` in `vault/alerts/`.
2. **Cooldown Logic:** If an anomaly of severity `WARNING` was alerted in the past 24 hours and the metric has not worsened by $>10\%$, suppress repeated notifications and append `[PERSISTENT - SILENCED]` in the markdown log.
3. **Recovery Notification:** When a previously `CRITICAL` metric returns to `HEALTHY`, emit a single `[RESOLVED]` green notification.

---

## 6. Cron Scheduling & Pipeline Integration

### 6.1 Integration with Existing 09:00 Cron
The daily snapshot cron in `scripts/ga4-snapshot.sh` is extended to execute anomaly detection immediately after snapshot creation.

```bash
# In scripts/ga4-snapshot.sh:

# 1. Fetch reports & generate daily snapshot (existing logic)
# ...

# 2. Run Anomaly Detection Engine
echo "[$NOW] Running Anomaly Detection Engine..."
if command -v bun >/dev/null 2>&1; then
  ANOMALY_RUNNER="bun"
else
  ANOMALY_RUNNER="npx tsx"
fi

ANOMALY_OUTPUT=$(${ANOMALY_RUNNER} "${REPO_DIR}/scripts/detect-anomalies.ts" \
  --snapshot="${SNAPSHOT_FILE}" \
  --property="${PROPERTY_ID}" \
  --output-dir="${REPO_DIR}/vault/alerts" 2>&1) || DETECT_EXIT=$?

DETECT_EXIT=${DETECT_EXIT:-0}
echo "[$NOW] Anomaly detection finished with exit code: ${DETECT_EXIT}"

# 3. Optional Dispatcher (Telegram / AmosBot Webhook)
if [[ "${DETECT_EXIT}" -eq 2 && -n "${AMOSBOT_WEBHOOK_URL:-}" ]]; then
  echo "[$NOW] Dispatching CRITICAL alert to AmosBot..."
  curl -s -X POST "${AMOSBOT_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"🚨 Hebrew Math Adventures: CRITICAL Session Health Alert detected. Check vault/alerts/\"}" || true
fi
```

### 6.2 Exit Code Standards
- `0`: All systems **HEALTHY** (or `INSUFFICIENT_DATA` / non-class day).
- `1`: One or more **WARNING** level metrics detected.
- `2`: One or more **CRITICAL** level anomalies detected.
- `3`: Fatal CLI or execution failure (e.g. network failure, invalid auth).

---

## 7. Alert Output Format & Markdown Templates

When an anomaly is detected (or daily health is summarized), the engine creates [`vault/alerts/alert-YYYY-MM-DD.md`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/vault/alerts/):

````markdown
---
type: alert
project: hebrew-math-adventures
date: 2026-08-15
status: CRITICAL
affected_metrics: [node_complete_drop, zero_answer_spike]
active_users_today: 87
sample_gate_passed: true
---

# 🚨 Session Health Alert — 2026-08-15

**Evaluated At:** 2026-08-15 09:02 IDT  
**Overall Status:** `CRITICAL` (Action Required)  
**Traffic Context:** 87 Active Users / 87 Sessions (Classroom surge detected)

---

## Anomaly Summary Matrix

| Anomaly Type | Today's Value | Active Baseline | Delta / Status | Severity |
|---|---|---|---|---|
| **Node Completion Rate** | **34.2%** (26/76) | 78.4% | **-56.4%** | 🔴 `CRITICAL` |
| **Zero-Answer Sessions** | **41.4%** (36/87) | 18.2% | **+127.5%** | 🔴 `CRITICAL` |
| **Response Time (Macro EPA)** | 6.8s / answer | 6.2s / answer | +9.6% | 🟢 `HEALTHY` |
| **Ghost Crash / Bounce** | 14.9% | 12.0% | +2.9% | 🟢 `HEALTHY` |
| **Parent Zone Abandonment** | — | — | Insufficient Data ($N=2$) | ⚪ `INSUFFICIENT_DATA` |

---

## 🔍 Detailed Diagnostics

### 1. 🔴 Node Completion Rate Collapse
- **Observation:** Only 26 out of 76 started nodes reached completion ($\widehat{CR} = 34.2\%$), representing a **56.4% drop** compared to the 5-day active baseline ($78.4\%$).
- **Impact:** ~50 children abandoned their lesson mid-game.
- **Top Suspects:**
  - `node_id`: `unit_2_subtraction_bridge` (starts: 42, completes: 3)
- **Triage SOP:**
  1. Open `src/components/lessons/Unit2Lesson.tsx` or run `npm run test`.
  2. Verify if subtraction step 3 equation input accepts virtual numpad touch events.

### 2. 🔴 Zero-Answer Sessions Surge
- **Observation:** 36 users launched the app but did not answer a single math question ($ZAR = 41.4\%$).
- **Top Suspects:**
  - Asset preload stall on audio sound effects (`useMusicalSound`).
  - Mascot selector modal unable to dismiss on mobile Safari.

---

## 🛠️ Reproduction & Verification Commands

```bash
# Query specific per-node completion breakdown
gog analytics report 519138010 \
  --from=1daysAgo --to=today \
  --dimensions="customEvent:node_id,eventName" \
  --metrics="eventCount" \
  --plain

# Run local regression test suite
npm test
```
````

---

## 8. Test Plan & Synthetic Data Injection

### 8.1 Synthetic Mock Data Strategy
To ensure the anomaly engine is robust and regression-proof, we create a dedicated Vitest test suite (`scripts/anomaly-detector/__tests__/anomalyDetector.test.ts`) that feeds synthetic GA4 JSON payloads into the detector rules.

```
                               TEST HARNESS SUITE
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ scripts/anomaly-detector/__tests__/fixtures/                                           │
│  ├── normal_classroom_surge.json   -> Expect status: HEALTHY (DAU=94, CR=82%, ZAR=18%) │
│  ├── zero_traffic_weekend.json     -> Expect status: HEALTHY (INSUFFICIENT_DATA)       │
│  ├── node_complete_collapse.json   -> Expect status: CRITICAL (CR=28%, N=70)           │
│  ├── zero_answer_spike.json        -> Expect status: CRITICAL (ZAR=55%, DAU=80)        │
│  ├── latency_freeze.json           -> Expect status: CRITICAL (EPA=14.2s)              │
│  ├── ghost_crash_spike.json        -> Expect status: CRITICAL (MCP=60%, Eng=2.1s)      │
│  ├── parent_abandonment.json       -> Expect status: WARNING (PAR=75%, N=12)           │
│  └── small_sample_noise.json       -> Expect status: HEALTHY (Suppressed, N=3)         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Key Unit Test Cases
1. **Zero-Traffic Edge Case:** When all metrics are 0 or empty rows, detector must output `HEALTHY` (Status: `INSUFFICIENT_DATA`) without `NaN`, `undefined`, or throwing division-by-zero errors.
2. **Small-Sample Boundary Test:** 1 start and 0 completions ($0\%$ raw completion) must NOT trigger a Critical alert because $N < 15$.
3. **Classroom Spike True Positive:** 80 starts and 20 completions ($25\%$ completion rate) must trigger `CRITICAL` with exact delta calculation.
4. **Bayesian Smoothing Test:** Verifies that Laplace smoothing dampens small fluctuations while converging to empirical rates at $N > 50$.
5. **Cooldown & State Persistence Test:** Verifies that consecutive identical warning runs do not produce duplicate alert triggers.

---

## 9. Implementation Phases & Builder Child Cards

Below are 6 atomic, builder-friendly implementation task cards designed for rapid execution and clear validation.

---

### 🎴 Card 10.1: Client-Side Event Instrumentation
**Role:** Frontend / Analytics Engineer  
**Objective:** Instrument missing Parent Zone events and add latency bucketing to math answer flow.  
**Files to Modify:**
- [`src/types/analytics.ts`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/src/types/analytics.ts) — Add `'parent_game_start' | 'parent_game_complete' | 'parent_zone_enter' | 'parent_zone_exit'` to `AnalyticsEvent`.
- [`src/hooks/useAnalytics.ts`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/src/hooks/useAnalytics.ts) — Add `latency_bucket: '<2s' | '2-5s' | '5-10s' | '>10s'` helper.
- [`src/components/parent/ParentDashboard.tsx`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/src/components/parent/ParentDashboard.tsx) — Add `parent_game_start` and `parent_game_complete` logging on activity launch and exit.
- [`src/hooks/useAnswerFlow.ts`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/src/hooks/) — Compute latency bucket on `question_answered`.

**Acceptance Criteria:**
1. `npm test` passes with 100% success.
2. `useAnalytics` logs `parent_game_start` and `parent_game_complete` with valid payloads in mock mode.
3. `question_answered` includes both `response_time_ms` and `latency_bucket`.

---

### 🎴 Card 10.2: GA4 Custom Dimensions & Metrics Setup
**Role:** Analytics Architect / Data Engineer  
**Objective:** Register custom dimensions in GA4 Admin API for latency and parent tracking.  
**Files to Modify / Run:**
- [`scripts/ga4-register-custom-dimensions.py`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/ga4-register-custom-dimensions.py) — Add `latency_bucket` and `parent_mode` custom dimensions.
- Execute script to verify registration against GA4 Property `519138010`.

**Acceptance Criteria:**
1. Running `python3 scripts/ga4-register-custom-dimensions.py` lists `latency_bucket` among active dimensions.
2. Querying `gog analytics report 519138010 --dimensions="customEvent:latency_bucket"` returns valid metadata (no 400 badRequest).

---

### 🎴 Card 10.3: TypeScript Anomaly Detection Engine
**Role:** Backend / Node / TypeScript Engineer  
**Objective:** Build the core statistical anomaly detection engine with active-day windowing and Laplace smoothing.  
**Files to Create:**
- `scripts/anomaly-detector/types.ts`
- `scripts/anomaly-detector/parser.ts`
- `scripts/anomaly-detector/baselines.ts`
- `scripts/anomaly-detector/rules/nodeCompleteDrop.ts`
- `scripts/anomaly-detector/rules/zeroAnswerSpike.ts`
- `scripts/anomaly-detector/rules/responseTimeLatency.ts`
- `scripts/anomaly-detector/rules/sessionCrashBounce.ts`
- `scripts/anomaly-detector/rules/parentAbandonment.ts`
- `scripts/anomaly-detector/index.ts`
- `scripts/detect-anomalies.ts`

**Acceptance Criteria:**
1. CLI accepts `--snapshot=<path>` or `--json=<data>` and returns structured output.
2. Handles zero-traffic days gracefully (returns code 0, status `INSUFFICIENT_DATA`).
3. Correctly detects and flags all 5 anomaly types when thresholds are breached.

---

### 🎴 Card 10.4: Snapshot Pipeline Integration & Markdown Formatter
**Role:** DevOps / Infrastructure Engineer  
**Objective:** Connect `scripts/detect-anomalies.ts` into `scripts/ga4-snapshot.sh` and output dated alert reports.  
**Files to Create / Modify:**
- `scripts/anomaly-detector/formatters/markdownAlert.ts`
- [`scripts/ga4-snapshot.sh`](file:///home/ramamos/.openclaw/workspace/hebrew-math-adventures/scripts/ga4-snapshot.sh)
- `vault/alerts/.gitkeep`

**Acceptance Criteria:**
1. Running `./scripts/ga4-snapshot.sh` automatically creates both `vault/snapshots/ga4-YYYY-MM-DD.md` AND `vault/alerts/alert-YYYY-MM-DD.md`.
2. Git commit logic cleanly commits both snapshot and alert files when changes are present.
3. Proper exit code propagation (0 = OK, 1 = WARN, 2 = CRIT).

---

### 🎴 Card 10.5: Synthetic Test Suite & Mock Data Injection
**Role:** QA / Test Automation Engineer  
**Objective:** Create comprehensive unit test suite with 8+ synthetic test fixtures in Vitest.  
**Files to Create:**
- `scripts/anomaly-detector/__tests__/anomalyDetector.test.ts`
- `scripts/anomaly-detector/__tests__/fixtures/*.json`
- `vitest.config.ts` (ensure script tests are included or runnable via `npm run test:scripts`).

**Acceptance Criteria:**
1. `bun test scripts/anomaly-detector` or `npm test` runs all synthetic scenarios.
2. 100% test coverage on baseline calculations, Laplace smoothing, sample gating, and rule evaluations.

---

### 🎴 Card 10.6: Notification Dispatcher & Runbook Documentation
**Role:** Lead Architect / SRE  
**Objective:** Add Telegram/AmosBot webhook dispatcher hook and write developer triage SOP.  
**Files to Create / Modify:**
- `scripts/anomaly-detector/notifier.ts` (Webhook POST with curl/fetch fallback).
- `docs/ANOMALY_TRIAGE_RUNBOOK.md` (Step-by-step diagnostic guide for each alert).

**Acceptance Criteria:**
1. Setting `AMOSBOT_WEBHOOK_URL` properly dispatches a JSON notification when a `CRITICAL` anomaly fires.
2. Triage runbook document provides clear reproduction steps and code symbol links for each alert.

---

## 10. Risk Assessment & Mitigations

| Risk | Impact | Likelihood | Mitigation Strategy |
|---|---|---|---|
| **GA4 Data Processing Latency (24–48h)** | High (delayed detection) | High | GA4 reporting data has a 24h lag. Use `today` + `1daysAgo` windows in daily 09:00 cron to evaluate full previous-day classroom cohorts. Supplement with client-side error telemetry for immediate crashes. |
| **Small-Sample False Alarms** | Med (alert fatigue) | High | Enforce hard minimum sample gates ($N_{min} \ge 15$ starts, $DAU \ge 10$) and Bayesian Laplace smoothing. Filter out non-class days ($DAU < 10$) from baselines. |
| **Auth Token Expiration (`gog`)** | High (pipeline fails) | Low | `gog` CLI automatically handles OAuth2 token refresh via stored refresh token. Python Admin API script uses `gog auth tokens export` to ensure valid credentials. |
| **GA4 Quota Limits** | Low | Low | Daily cron runs only 4–5 batched queries once per 24 hours. Well within Google Analytics Data API limit (10,000 requests/day). |
| **Client Event Name Drift** | High (broken detector) | Low | TypeScript typed enums for `AnalyticsEvent` in `src/types/analytics.ts` shared with detection engine types. |

---
*Hebrew Math Adventures Architecture Plan — Phase 10: Anomaly Detection & Session Health Alerts*
