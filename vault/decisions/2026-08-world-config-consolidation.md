---
type: decision
status: accepted
date: 2026-08-08
updated: 2026-08-08
project: hebrew-math-adventures
decision: "Consolidate scattered world config constants into worldConfig.ts as single source of truth"
related: [rules/architecture, domain/curriculum-levels, domain/powerups, domain/bubble-spawn-design]
tags: [config, worldconfig, refactor, single-source-of-truth, decision]
---

# ADR: World Config Consolidation

**Date:** 2026-08-08 · **Status:** Accepted · **Branch:** `sdlc/loop-v0`

## Context
`src/lib/worldConfig.ts` already existed as a well-structured single source of truth for the majority of game-world constants (created in a prior consolidation pass). It exported **18 config namespaces** consumed by **20+ modules** across engines, components, hooks, and lib.

However, a full audit (plan: `docs/plans/consolidate-world-config.md`, commit `8cd58cc`) revealed **~35 additional hardcoded constants** still scattered across the codebase in 5 categories. The most urgent was **storage keys**: 7 constants across 5 files with one known duplicate (`useMemoryGame` vs `types/progress`) — key drift is an active bug risk.

## Decision
Consolidate the remaining scattered constants into `worldConfig.ts` as the single source of truth, in a phased, low-risk migration:

- **Phase 1 (MUST): Storage keys** — 7 constants across 5 files; fix the known duplicate. Key drift is an active bug risk.
- **Phase 2–3 (SHOULD): Sensory factory config** (4 constants) and **behavioral UI config** (3 constants) — clean extractions.
- **Phase 4–5 (CONSIDER): Daily challenge/quest config** — content-adjacent; only if tuning-without-code is needed.
- **Deferred:** Badge thresholds, shop prices, `ProblemFactory` ranges — content/pedagogical design, correctly left in data files.

## Rationale
- **Single source of truth**: one file to tune game-world behavior without hunting through engines/components.
- **Bug prevention**: the storage-key duplicate was a real drift risk; consolidation removes it.
- **Testability**: consolidated config is unit-tested (67 worldConfig tests, commit `99eb8e0`).
- **Low risk**: phases 1–3 can be parallelized; total effort ~4–5h.

## Consequences
- `worldConfig.ts` is the canonical home for all game-world constants.
- Dead code removed (e.g. Legacy Zone Map from `curriculum-levels.md` — resolved).
- `POWER_UP_CONFIG`, `SPAWN_CONFIG`, `INVADER_CONFIG`, `FRENZY_CONFIG`, `PRACTICE_CONFIG`, `SESSION_CONFIG`, `SESSION_THEMES` all live in `worldConfig.ts` and are consumed by their engines.
- Risk: Low. Phased migration; 67 unit tests + consumer contract tests pass.

## Implementation
- `45304c4` — `feat(worldConfig)`: consolidate scattered config constants into `worldConfig.ts`.
- `bc266e7` / `99eb8e0` — comprehensive + expanded unit tests (67 total).
- SDLC chain complete ✅ (plan → review → feat → tests).

## Revisit if
- A new game mode introduces config that belongs in `worldConfig.ts` rather than its own file, or
- Content tuning (badges, shop prices, problem ranges) needs to move out of data files into config.
