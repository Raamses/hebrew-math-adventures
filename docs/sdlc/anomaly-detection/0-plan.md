# Phase 10: Anomaly Detection & Session Health Alerts — Plan

**Model:** gemini-3.7-flash (via `agy --dangerously-skip-permissions`)
**Date:** 2026-08-15
**Branch:** sdlc/loop-v0
**Status:** Draft for review

> **Model attribution note:** The card requires delegation to a stronger model via `ask-claude --escalate --card`. Claude (both claude-opus-5 and claude-sonnet-5) hit session limits at 10:57 IDT — resets at 14:00 Asia/Jerusalem. Both attempts are recorded in `~/.openclaw/bin/model-usage.jsonl` with `actual: "unknown"`. Gemini CLI (`gemini`) is deprecated (IneligibleTierError). The fallback was `agy` (Antigravity CLI, Gemini 3.7 Flash), which successfully served the analysis. The full 43KB plan artifact is saved at `plans/PHASE_10_ANOMALY_DETECTION_PLAN.md`. This document is the board-facing deliverable built from that analysis.

---

## 1. Problem Statement

Hebrew Math Adventures operates in a classroom environment with extreme **traffic burstiness**: 50–120+ DAU on active testing days, 0–5 DAU on off-days, and only 5–8 active days per 28-day window.

**Core problems:**
1. **Silent regressions:** Children can't articulate bugs — they just abandon the app. Broken features persist unnoticed across multiple school days until an educator complains.
2. **Traditional detectors fail:** 7-day rolling averages and 3σ thresholds break down because zero-traffic days drag baselines toward zero, creating false spikes on normal school days. Low-volume days produce high-variance percentages (1 drop out of 2 starts = 50% drop rate).
3. **No alerting layer:** Events are logged to GA4 and daily snapshots exist, but nobody is watching for patterns. There's no baseline comparison, no sample size filtering, no alert generation.

**Goal:** Build an intelligent, small-sample-aware anomaly detection system that integrates with the existing daily GA4 snapshot cron, uses Active-Day Windowing and Bayesian Laplace Smoothing, and emits structured actionable alerts.

---

## 2. Current State Analysis

### 2.1 Existing Analytics Assets

| Asset | Path | Role |
|---|---|---|
| Snapshot cron | `scripts/ga4-snapshot.sh` | Daily bash at 09:00 GMT+3, queries GA4 via `gog` CLI, writes `vault/snapshots/ga4-YYYY-MM-DD.md` |
| CLI client | `gog analytics report 519138010` | Wrapper over GA4 Data API v1beta. Supports `--json`, `--plain` (TSV), dimensions, metrics |
| Client hook | `src/hooks/useAnalytics.ts` | React hook wrapping Firebase Analytics `logEvent` |
| Types | `src/types/analytics.ts` | Typed `AnalyticsEvent` + `AnalyticsParams` |
| Admin API | `scripts/ga4-register-custom-dimensions.py` | Python script registering 14 custom dimensions |
| Domain docs | `vault/domain/analytics.md` | Full event taxonomy, real data, concerning signals |

### 2.2 Real GA4 Data (28-day funnel as of Aug 14, 2026)

| Event | Count | Active Users |
|---|---|---|
| `question_answered` | 1,327 | 158 |
| `app_open` | 1,107 | 404 |
| `node_complete` | 376 | 52 |
| `node_start` | 314 | 167 |
| `node_select` | 215 | 185 |
| `streak_milestone` | 123 | 49 |
| `arcade_mode_select` | 112 | 108 |
| `session_level_up` | 49 | 25 |
| `session_level_down` | 1 | 1 |
| `powerup_activated` | 44 | 2 |

### 2.3 Critical Gaps

| Gap | Details | Impact |
|---|---|---|
| **Missing Parent Zone events** | `parent_game_start` and `parent_game_complete` do not exist in `useAnalytics.ts` or any UI component | Anomaly 5 cannot be detected until events are added |
| **response_time_ms not queryable** | Custom parameter not registered as GA4 custom metric; GA4 Data API can't compute P95 on raw params without BigQuery | Need macro proxy (engagement/answers) and/or client-side latency bucketing |
| **No baseline comparison** | `ga4-snapshot.sh` only computes single-day ratios vs 28-day cumulative — no active-day baselines, no WoW comparison | No anomaly detection logic exists |
| **No AmosBot/Telegram** | No Telegram bot integration in codebase. AmosBot is an orchestrator role mentioned in counsel docs, not a deployed service | Telegram notification is future/optional |

---

## 3. Anomaly Detection Design (5 Anomaly Types)

All detectors enforce three small-sample protections:
1. **Minimum Sample Size Gate (N_min):** Below threshold → `INSUFFICIENT_DATA` (suppressed)
2. **Active-Day Baseline (B_active):** Baselines calculated only from last K days where DAU ≥ 10 (default K=5 within 28-day window), ignoring zero-traffic days
3. **Bayesian Laplace Smoothing:** Stabilizes rate calculations: p̂ = (k + α) / (n + α + β), with α=7, β=3 reflecting a 70% historical baseline

---

### Anomaly 1: Sudden Drop in node_complete Rate

**Metric:** Bayesian-smoothed Event Completion Ratio:
```
CR_E = (Count(node_complete) + α) / (Count(node_start) + α + β)
```

**gog CLI query:**
```bash
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

**Thresholds:**
| Severity | Condition |
|---|---|
| HEALTHY | Δ% ≥ -10% vs active-day baseline |
| WARNING | -20% ≤ Δ% < -10% |
| CRITICAL | Δ% < -20% OR CR_E < 40% |
| INSUFFICIENT_DATA | Count(node_start) < 15 |

**Diagnostic runbook:** Check per-node completion breakdown → isolate node_id with high starts / 0 completions → reproduce locally.

---

### Anomaly 2: Sudden Spike in Zero-Answer Sessions

**Metric:** Zero-Answer Rate:
```
ZAR = 1.0 - (Active Users with question_answered / Total Active Users)
```

**gog CLI queries:**
```bash
# Daily overview
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date" \
  --metrics="activeUsers,sessions" \
  --json

# Event-level breakdown
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

**Thresholds:**
| Severity | Condition |
|---|---|
| HEALTHY | ZAR ≤ 25% |
| WARNING | 25% < ZAR ≤ 35% |
| CRITICAL | ZAR > 35% (or > 30% when DAU ≥ 30) |
| INSUFFICIENT_DATA | DAU < 10 |

**Diagnostic runbook:** Inspect app_open vs login vs node_select ratio → check for fatal React render errors on specific browsers.

---

### Anomaly 3: Abnormally Long Response Times (P95 Latency)

**GA4 limitation:** Cannot compute continuous P95 from raw `response_time_ms` without BigQuery or custom metric registration.

**Three-tier workaround:**

| Tier | Approach | Implementation |
|---|---|---|
| 1. Macro Proxy (immediate) | Engagement Per Answer (EPA) = userEngagementDuration / question_answered | Queryable now from standard GA4 metrics |
| 2. Latency bucketing (client + GA4) | Log `latency_bucket: '<2s' \| '2-5s' \| '5-10s' \| '>10s'` in question_answered | Add to AnalyticsParams, register as custom dimension |
| 3. Client-side session health | Aggregate P50/P90/P95 on client, flush on node_complete | Future enhancement |

**gog CLI query:**
```bash
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,userEngagementDuration,activeUsers" \
  --json
```

**Thresholds:**
| Severity | Macro EPA | Slow Bucket (>10s) |
|---|---|---|
| HEALTHY | ≤ 8.5s | ≤ 12% |
| WARNING | 8.5s < EPA ≤ 12.0s | 12–20% |
| CRITICAL | > 12.0s | > 20% |
| INSUFFICIENT_DATA | Answers < 25 | — |

---

### Anomaly 4: Session Crash & Bounce Patterns

**Metric:** Macro Crash Proxy + engagement check:
```
MCP = 1.0 - (U_node_start + U_arcade_mode_select) / U_app_open
Ghost Bounce: avg engagement < 6s AND MCP > 40%
```

**gog CLI queries:**
```bash
# Daily overview
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date" \
  --metrics="activeUsers,sessions,eventCount,userEngagementDuration" \
  --json

# Core funnel events
gog analytics report 519138010 \
  --from="14daysAgo" --to="today" \
  --dimensions="date,eventName" \
  --metrics="eventCount,activeUsers" \
  --json
```

**Thresholds:**
| Severity | Condition |
|---|---|
| HEALTHY | Avg Engagement ≥ 15s AND MCP ≤ 25% |
| WARNING | MCP > 30% OR Avg Engagement < 10s |
| CRITICAL | MCP > 45% OR Avg Engagement < 6s |
| INSUFFICIENT_DATA | DAU < 15 |

---

### Anomaly 5: Parent Zone Funnel Abandonment

**⚠️ Prerequisite:** `parent_game_start` and `parent_game_complete` events do not exist yet. Must be added to `src/types/analytics.ts`, `src/hooks/useAnalytics.ts`, and `src/components/parent/ParentDashboard.tsx` before this check can function.

**Instrumentation to add:**
```typescript
// In src/types/analytics.ts — add to AnalyticsEvent:
| 'parent_game_start'
| 'parent_game_complete'
| 'parent_zone_enter'
| 'parent_zone_exit'

// In ParentDashboard.tsx:
logEvent('parent_game_start', { game_mode: 'parent_diagnostic', profile_id });
logEvent('parent_game_complete', { game_mode: 'parent_diagnostic', duration_seconds, success });
```

**Metric:** Parent Abandonment Rate:
```
PAR = 1.0 - Count(parent_game_complete) / Count(parent_game_start)
```

**Thresholds:**
| Severity | Condition |
|---|---|
| HEALTHY | PAR ≤ 30% |
| WARNING | 30% < PAR ≤ 50% |
| CRITICAL | PAR > 50% |
| INSUFFICIENT_DATA | Count(parent_game_start) < 5 |

---

## 4. Script Architecture

### Decision: Hybrid TypeScript Engine + Shell Cron Wrapper

| Criteria | Pure Bash | Pure TypeScript | **Hybrid (chosen)** |
|---|---|---|---|
| JSON parsing | Requires `jq` (brittle) | Native `JSON.parse` | TS handles all parsing |
| Math modeling | `bc`/`awk` (clunky) | Full JS Math | TS handles all stats |
| Unit testability | Hard | Full vitest suite | 100% testable |
| Cron interop | Native | Needs node/bun | Bash wrapper calls `bun`/`npx tsx` |

### Directory Structure
```
scripts/
├── ga4-snapshot.sh                    # Main cron entrypoint (extended)
├── ga4-register-custom-dimensions.py  # Admin API custom dimensions
├── detect-anomalies.ts                # TypeScript CLI entrypoint
└── anomaly-detector/
    ├── types.ts                       # GA4 API & anomaly types
    ├── parser.ts                      # gog JSON & TSV parser
    ├── baselines.ts                   # Active-day windowing & Laplace smoothing
    ├── rules/
    │   ├── nodeCompleteDrop.ts        # Anomaly 1
    │   ├── zeroAnswerSpike.ts         # Anomaly 2
    │   ├── responseTimeLatency.ts     # Anomaly 3
    │   ├── sessionCrashBounce.ts      # Anomaly 4
    │   └── parentAbandonment.ts       # Anomaly 5
    ├── formatters/
    │   └── markdownAlert.ts           # Markdown alert generator
    └── __tests__/
        ├── fixtures/                  # Synthetic GA4 JSON responses
        └── anomalyDetector.test.ts    # Vitest suite
```

### Pipeline Flow
```
Daily Cron (09:00 GMT+3)
    │
    ▼
scripts/ga4-snapshot.sh
    ├── 1. Query gog CLI → write vault/snapshots/ga4-YYYY-MM-DD.md
    └── 2. Run: bun scripts/detect-anomalies.ts --snapshot=... --output-dir=vault/alerts
            ├── Active-Day Baseline Windowing
            ├── Bayesian Laplace Smoothing
            ├── Sample Gate Checks
            ├── Evaluate 5 Anomaly Rules
            └── Output:
                ├── vault/alerts/alert-YYYY-MM-DD.md
                ├── .alert-state.json (cooldown tracking)
                ├── Optional: Telegram/AmosBot webhook (if CRITICAL)
                └── Exit code: 0=OK, 1=WARN, 2=CRIT, 3=ERROR
```

---

## 5. Threshold Tuning for Small Bursty Traffic

### 5.1 Active-Day Windowing
Instead of fixed 7-calendar-day windows (which contain 4–6 zeros), extract the most recent K=5 active days where DAU ≥ 10:

```typescript
export function getActiveDays(dailyRows: DailyRecord[], minDau = 10, maxDays = 5): DailyRecord[] {
  return dailyRows
    .filter(row => row.activeUsers >= minDau)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, maxDays);
}
```

### 5.2 Bayesian Laplace Smoothing Examples

| Metric | Sample n | Observed k | Raw k/n | Smoothed p̂ (α=7, β=3) | Assessment |
|---|---|---|---|---|---|
| Classroom burst | 80 | 68 | 85.0% | 83.3% | Reliable, high confidence |
| Small group test | 4 | 2 | 50.0% | 64.3% | Suppresses false panic |
| Broken release | 35 | 4 | 11.4% | 24.4% | Confirmed critical (< 40%) |

### 5.3 Alert Fatigue Prevention

1. **State persistence:** `.alert-state.json` tracks previously alerted anomalies
2. **Cooldown:** If anomaly was alerted in past 24h and hasn't worsened by >10%, suppress and mark `[PERSISTENT - SILENCED]`
3. **Recovery notification:** When CRITICAL metric returns to HEALTHY, emit `[RESOLVED]` notification

---

## 6. Cron Scheduling

### Integration with existing 09:00 cron

Extended `scripts/ga4-snapshot.sh` appends anomaly detection after snapshot generation:

```bash
# After snapshot generation (existing logic)...

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

# Optional: Dispatch CRITICAL alert to AmosBot/Telegram
if [[ "${DETECT_EXIT}" -eq 2 && -n "${AMOSBOT_WEBHOOK_URL:-}" ]]; then
  echo "[$NOW] Dispatching CRITICAL alert to AmosBot..."
  curl -s -X POST "${AMOSBOT_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"🚨 Hebrew Math Adventures: CRITICAL Session Health Alert. Check vault/alerts/\"}" || true
fi
```

### Exit Code Standards
| Code | Meaning | Action |
|---|---|---|
| 0 | HEALTHY or INSUFFICIENT_DATA | Silent (off-day or all checks pass) |
| 1 | WARNING | Log to markdown, no webhook |
| 2 | CRITICAL | Log + dispatch webhook (if configured) |
| 3 | FATAL | Execution/auth failure |

---

## 7. Alert Output Format

Generated at `vault/alerts/alert-YYYY-MM-DD.md`:

```markdown
# 🚨 Session Health Alert — 2026-08-15

**Overall Status:** `CRITICAL` | **Traffic:** 87 Active Users
**Query Window:** 14daysAgo → today | **Baseline:** 5 active days (DAU ≥ 10)

## Summary

| Anomaly Type | Today | Active Baseline | Delta | Severity |
|---|---|---|---|---|
| **Node Completion Rate** | **34.2%** | 78.4% | **-56.4%** | 🔴 CRITICAL |
| **Zero-Answer Sessions** | **41.4%** | 18.2% | **+127.5%** | 🔴 CRITICAL |
| **Response Time (Macro EPA)** | 6.8s | 6.2s | +9.6% | 🟢 HEALTHY |
| **Ghost Crash / Bounce** | 14.9% | 12.0% | +2.9% | 🟢 HEALTHY |
| **Parent Zone Abandonment** | — | — | Insufficient Data (N=2) | ⚪ INSUFFICIENT_DATA |

## Critical Alerts

### Node Completion Rate — CRITICAL
- **Today:** 34.2% (smoothed) vs baseline 78.4%
- **Delta:** -56.4% week-over-week
- **Sample:** 68 node_start events (gate: ≥15 ✓)
- **Triage:** Check per-node completion breakdown → isolate node_id with high starts / 0 completions → reproduce locally

### Zero-Answer Sessions — CRITICAL
- **Today:** 41.4% of active users never answered a question
- **Baseline:** 18.2%
- **Sample:** 87 DAU (gate: ≥10 ✓)
- **Triage:** Inspect app_open → login → node_select funnel → check for fatal React render errors

## Resolution
- [ ] Investigate node completion regression
- [ ] Check zero-answer session crash pattern
- [ ] Verify latest deployment changes

---
*Generated by scripts/detect-anomalies.ts at 09:00 GMT+3*
```

---

## 8. Test Plan

### Synthetic Data Fixtures (8 scenarios)

| Fixture | Description | Expected Result |
|---|---|---|
| `normal_classroom_surge.json` | 80 DAU, normal completion rates | HEALTHY |
| `zero_traffic_weekend.json` | 0 DAU, no events | HEALTHY (INSUFFICIENT_DATA) |
| `node_complete_collapse.json` | 50 DAU, completion drops from 78% to 34% | CRITICAL |
| `zero_answer_spike.json` | 60 DAU, ZAR jumps to 41% | CRITICAL |
| `latency_freeze.json` | EPA > 12s, 25% slow bucket | CRITICAL |
| `ghost_crash_spike.json` | MCP > 45%, avg engagement < 6s | CRITICAL |
| `parent_abandonment.json` | 8 parent_game_start, 2 complete | WARNING |
| `small_sample_noise.json` | 3 DAU, 1/2 completion | HEALTHY (Suppressed) |

### Verification Commands
```bash
# Run anomaly detector standalone
bun scripts/detect-anomalies.ts --snapshot=vault/snapshots/ga4-2026-08-14.md

# Run synthetic test suite
npx vitest run scripts/anomaly-detector

# Run full snapshot + anomaly pipeline
./scripts/ga4-snapshot.sh
```

---

## 9. Implementation Phases (Child Cards)

| Card | Title | Primary Files | Verification |
|---|---|---|---|
| **10.1** | Client Event Instrumentation | `src/types/analytics.ts`, `src/hooks/useAnalytics.ts`, `src/components/parent/ParentDashboard.tsx` | `npm test` |
| **10.2** | GA4 Custom Dimensions | `scripts/ga4-register-custom-dimensions.py` (add `latency_bucket`) | `python3 scripts/ga4-register-custom-dimensions.py` |
| **10.3** | Anomaly Engine Core | `scripts/anomaly-detector/*`, `scripts/detect-anomalies.ts` | `bun scripts/detect-anomalies.ts --help` |
| **10.4** | Pipeline & Snapshot Cron Integration | `scripts/ga4-snapshot.sh`, `vault/alerts/.gitkeep` | `./scripts/ga4-snapshot.sh` |
| **10.5** | Synthetic Test Suite | `scripts/anomaly-detector/__tests__/*` | `npx vitest run scripts/anomaly-detector` |
| **10.6** | Notification Dispatcher & Runbook | `scripts/anomaly-detector/notifier.ts`, `docs/ANOMALY_TRIAGE_RUNBOOK.md` | `bun scripts/detect-anomalies.ts --test-notify` |

### Card Dependencies
```
10.1 (Client Events) ─┐
                       ├──► 10.3 (Engine Core) ──► 10.4 (Cron Integration) ──► 10.6 (Notification)
10.2 (Custom Dims) ────┘                    │
                                             └──► 10.5 (Test Suite)
```

- **10.1 and 10.2** can run in parallel (no dependencies between them)
- **10.3** depends on both 10.1 and 10.2 (needs the events and dimensions to exist)
- **10.4** depends on 10.3 (integrates engine into cron)
- **10.5** depends on 10.3 (tests the engine)
- **10.6** depends on 10.4 (adds notification to integrated pipeline)

---

## 10. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **GA4 data latency (24–48h)** | High | High | Use `today + 1daysAgo` window in daily cron to capture full previous-day cohorts. Supplement with client-side error telemetry for immediate crashes. |
| **Small-sample false alarms** | Medium | High | Hard minimum sample gates (N_min ≥ 15 starts, DAU ≥ 10) + Bayesian Laplace smoothing. Filter non-class days from baselines. |
| **Auth token expiration (gog)** | High | Low | `gog` CLI auto-handles OAuth2 refresh. Python script uses `gog auth tokens export`. |
| **GA4 quota limits** | Low | Low | 4–5 batched queries/day, well within 10,000/day quota. |
| **Client event name drift** | High | Low | TypeScript typed enums shared between client and detection engine. |
| **Parent Zone events never added** | Medium | Medium | Anomaly 5 gracefully returns `INSUFFICIENT_DATA` until instrumentation is added. No blocker for other 4 anomalies. |
| **Telegram bot never deployed** | Low | Medium | Webhook dispatch is fully optional (gated by `AMOSBOT_WEBHOOK_URL` env var). Markdown alerts still generated regardless. |

---

## Appendix: Key Design Decisions

1. **TypeScript over pure bash** — The math (Laplace smoothing, active-day windowing, percentile proxies) is impractical in bash. TypeScript enables full type safety and vitest testability.
2. **Active-day windowing over calendar-day baselines** — With 5/28 active days, calendar baselines are meaningless. Filtering to DAU ≥ 10 days gives stable, meaningful comparison points.
3. **Laplace smoothing over raw rates** — Prevents 1/2 = 50% panic. With α=7, β=3, a 2/4 result yields 64.3% (near the 70% prior), not an alarming 50%.
4. **Macro EPA proxy for P95** — GA4 can't compute P95 from raw `response_time_ms` without BigQuery. Engagement-per-answer is queryable now and correlates with perceived latency.
5. **Graceful degradation for Parent Zone** — Anomaly 5 returns `INSUFFICIENT_DATA` until events are added, rather than blocking the entire system.
6. **Alert cooldown with state file** — Prevents daily repetition of the same anomaly. Only re-alerts if metric worsens by >10%. Emits `[RESOLVED]` on recovery.

---

*Analysis delegated to Gemini 3.7 Flash via `agy` (Claude session-limited, resets 2pm IDT). Full 43KB analysis artifact: `plans/PHASE_10_ANOMALY_DETECTION_PLAN.md`*
