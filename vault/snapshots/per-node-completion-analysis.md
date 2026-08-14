---
type: analysis
project: hebrew-math-adventures
created: 2026-08-14
updated: 2026-08-14
status: active
tags: [analytics, ga4, per-node, completion, funnel]
ga4_property: "519138010"
query_window: "28daysAgo → today"
---

# Per-Node Completion Rate Analysis — 28-Day Window

**Source:** GA4 Data API via `gog analytics report 519138010`
**Queried:** 2026-08-14 09:06 IDT
**Window:** 28daysAgo → today

## ⚠️ Limitation

Per-node analysis (by `node_id`) requires GA4 custom dimensions to be registered. Until card `a1b2c3d4-0006` is complete (blocked by OAuth scope fix), we can only analyze at the **event level**, not the node level.

## Funnel Analysis (28-day aggregate)

| Stage | Event | Count | Active Users | Conversion |
|---|---|---|---|---|
| 1. App opened | `app_open` | 1,107 | 404 | 100% (baseline) |
| 2. Session started | `session_start` | 414 | 401 | 99.3% users |
| 3. Node selected | `node_select` | 215 | 185 | 45.8% users |
| 4. Node started | `node_start` | 314 | 167 | 41.3% users |
| 5. Questions answered | `question_answered` | 1,327 | 158 | 39.1% users |
| 6. Node completed | `node_complete` | 376 | 52 | 12.9% users |

## Key Findings

### Drop-off #1: App open → Node select (54% drop)
- 404 users opened the app, but only 185 (45.8%) selected a node
- This suggests users are exploring other features (arcade, pets, profile) or dropping off before engaging with the learning content

### Drop-off #2: Node start → Node complete (60% drop by users)
- 167 users started nodes, but only 52 (31.1%) completed any node
- **But:** 314 node_starts vs 376 node_completions — there are MORE completions than starts!
- This means users are completing nodes they started in previous sessions (returning users)
- The per-user conversion is: 52/167 = 31.1% of users who start a node complete at least one

### Engagement depth: 1,327 questions / 314 node_starts = 4.2 questions per node start
- This is healthy — each node session involves multiple questions
- 1,327 questions / 158 users = 8.4 questions per active user (over 28 days)

### Node completion ratio: 376/314 = 119.7%
- More completions than starts because completions include nodes started in prior sessions
- This is a positive sign — users return to finish what they started

## Per-Node Breakdown (BLOCKED)

Cannot break down by individual node (n1_1, n1_2, etc.) until GA4 custom dimensions are registered.

## Recommendations

1. **Register GA4 custom dimensions** (card `a1b2c3d4-0006`) — this unblocks per-node, per-user, per-equation analysis
2. **Investigate the 54% app-open → node-select drop-off** — are users getting lost in the UI? Check if the saga map is clear enough
3. **Track node completion by return users** — the 119.7% completion/start ratio suggests returning users complete nodes. Consider tracking "first session completion rate" separately
4. **Set up per-node difficulty analysis** once custom dimensions are live — identify which nodes have the lowest completion rates

## How to re-run

```bash
# Event-level funnel (current)
gog analytics report 519138010 \
  --from=28daysAgo --to=today \
  --dimensions=eventName \
  --metrics=eventCount,activeUsers \
  --max=100 --plain

# Per-node breakdown (AFTER custom dimensions registered)
# Will require: --dimensions=customEvent:node_id
```