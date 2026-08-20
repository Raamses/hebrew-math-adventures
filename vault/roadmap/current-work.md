---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-08
status: in-flight
tags: [roadmap, current, work]
---

# Current Work

## Branch
- `sdlc/loop-v0` (current) — SDLC loop experimentation branch.

## Recently landed (git log highlights)
- `0deaef6` — Zen-mode stale-bubble validation fix (snapshot target per pop) — [[decisions/2026-08-zen-answer-race]]
- `8cd58cc` — World config consolidation plan (full audit & phased design)
- `4cec323` — Dynamic star rewards plan (audit & tier-based implementation design)
- `c3eca67` — Centralize sound handling plan (audit & useSoundManager design)
- `45304c4` — World config consolidation (feat)
- `e5e3832` — Sound centralization via semantic feedback API (feat)
- `a3e664c` — Dynamic star rewards by performance tier (feat)
- `be4af87` — Zen-mode answer race + anti-repeat duplicate-slip fix (ADR 2026-08-zen-answer-race)
- `1677268` — Bubble spawn engine overhaul (P0+P1) — [[decisions/2026-07-spawn-overhaul]]

## Active Plan
- [[plans/game-ideation-2026-08-23]] — comprehensive feature plan from ideation session (P0/P1/P2 priorities)
- Monetization parked → see [[backlog/monetization-and-growth]]

## In flight / next
- **Zen-mode stale-bubble fix** ✅ landed (commit `0deaef6`, 2026-08-08): snapshot `targetValue` per pop, ignore stale bubbles. The answer-lock from ADR 2026-08-zen-answer-race was insufficient; synchronous target rotation left stale bubbles that validated as wrong. Fix applied + committed. See `handoff-zen-bug.md` and [[decisions/2026-08-zen-answer-race]].
- **Bubble-spawn playability analytics** (GA4 data retrieved 2026-08-08): 565 `question_answered` events, 50 active users, 94% node-start → node-complete drop-off. Plan artifact at `docs/sdlc/bubble-spawn-analytics/0-plan.md`. See [[domain/analytics]].
- **SDLC pipeline**: world-config chain complete ✅. Sound-handling: plan done, review in progress. Star-rewards: plan needs re-run (no artifact). E2e-coverage: plan blocked (no artifact).
- **Playability validation** of the bubble spawn overhaul in real playtesting — GA4 data now available, see [[domain/bubble-spawn-design]] and [[domain/analytics]].
- Challenge clutter reduction (`CHALLENGE_CLUTTER_PLAN.md`).
- PracticeMode design review follow-ups (`DESIGN_REVIEW_PRACTICEMODE.md`).

## Source plans (repo)
- `SPAWN_OVERHAUL_PLAN.md`, `CHALLENGE_CLUTTER_PLAN.md`, `COUNSEL_FRENZY*.md`, `DESIGN_REVIEW_PRACTICEMODE.md`, `CLAUDE_BRIEF.md`.

## E2E Suite + Coverage Analysis (2026-08-20)

- Full e2e suite run completed: 53/99 passed, 40 failed, 5 did not run, 1 skipped (58.4m)
- Gemini coverage analysis identified 8 blind spots — all have workboard cards
- 6 fix cards created for failing specs grouped by root cause
- Fix priority: timeout increase (30 tests), waitForSagaMap helper fix (3 tests), GameOrchestrator mode switch (2 tests), node unlock (2 tests), localhost URL fix (1 test), star tier assertion (1 test)
- Learning-hints.spec.ts already written and passing against deployed site
- Next: dispatch Claude to fix timeout-prone specs, then implement coverage gap cards
