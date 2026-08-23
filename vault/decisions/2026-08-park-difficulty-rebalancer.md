---
type: decision
decision_id: 2026-08-park-difficulty-rebalancer
project: hebrew-math-adventures
updated: 2026-08-23
status: parked
tags: [decision, analytics, difficulty, ga4]
---

# Park Difficulty Rebalancer (ADR 2026-08-23)

## Status

**PARKED** — implementation exists on `feat/difficulty-rebalancer-v1` branch but removed from `main` due to upstream data pipeline being broken.

## Context

We implemented a Difficulty Rebalancer system that analyzes GA4 node completion data and recommends per-node difficulty tuning. The implementation includes:

| File | Purpose |
|------|---------|
| `src/lib/difficultyRebalancer.ts` | GA4 completion rate analysis, per-node tuning recommendations |
| `src/components/parent/DifficultyTuningTab.tsx` | Sortable table UI with confidence badges, completion bars |
| `src/lib/__tests__/difficultyRebalancer.test.ts` | 15 unit tests (all passing) |

The algorithm:
- `completionRate < 0.50` → too_hard (reduce difficulty)
- `completionRate > 0.85` → too_easy (increase difficulty)
- `0.50–0.85` → optimal
- High confidence at ≥10 starts, medium ≥3, low <3

## Decision

Remove from `main` until these prerequisites are met:

### Prerequisite 1: Fix GA4 Data Pipeline

**Problem**: All GA4 snapshots from Aug 10–17 show "(query failed)". The `gog` CLI referenced in `scripts/ga4-snapshot.sh` doesn't exist in the repo. Only real data is a partial day (Aug 13).

**Fix required**: 
- Set up actual GA4 Data API access (currently referenced as `gog analytics report 519138010`)
- Verify the service account has proper permissions
- Document the setup in `scripts/README.md`

### Prerequisite 2: Register GA4 Custom Dimensions

**Problem**: Per-node analysis by `node_id` requires GA4 custom dimensions to be registered. Until then, only event-level analysis is possible.

**Fix required**:
- Register `profile_id`, `node_id`, `equation`, `response_time_ms`, `age_group` as custom dimensions in GA4 Admin
- Wait 24-48 hours for data to populate
- Verify per-node queries work

### Prerequisite 3: Real Data in ParentDashboard

**Problem**: The "Run Analysis" button generated synthetic data via `Math.random()`, violating the vault's Bag Deck rule.

**Fix required**: Connect to real GA4 data instead of generating fake data.

### Prerequisite 4: Write-Back Path

**Problem**: Recommendations never reached `worldConfig.ts`. The `suggestedChanges` structure used type-level operators (`&clamp`, `&boost`) without runtime implementation.

**Fix required**: Implement the mutation path that reads recommendations and applies them to the game config.

## Review Findings (agy Gemini Pro)

The implementation was reviewed as non-functional in production:

1. **Dead on arrival** — GA4 pipeline broken, no data to analyze
2. **Blocked by GA4** — per-node analysis architecturally impossible without custom dimensions
3. **Fake data** — ParentDashboard violated vault's `no Math.random` rule
4. **No write-back** — recommendations never reached game config
5. **Misaligned scope** — duplicated GameDirector logic instead of focusing on baseline calibration

## Path Forward

1. Fix GA4 pipeline (estimate: 1-2 days)
2. Register custom dimensions (estimate: 4 hours + 48h wait)
3. Redesign with focus on **baseline calibration** — identify nodes where GameDirector rescues too often (indicating base config is wrong)
4. Build write-back path before UI goes live

## Branch

Code preserved at: `feat/difficulty-rebalancer-v1` (commit `468721c`)
