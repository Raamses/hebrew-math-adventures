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
- `8cd58cc` — World config consolidation plan (full audit & phased design)
- `4cec323` — Dynamic star rewards plan (audit & tier-based implementation design)
- `c3eca67` — Centralize sound handling plan (audit & useSoundManager design)
- `45304c4` — World config consolidation (feat)
- `e5e3832` — Sound centralization via semantic feedback API (feat)
- `a3e664c` — Dynamic star rewards by performance tier (feat)
- `be4af87` — Zen-mode answer race + anti-repeat duplicate-slip fix (ADR 2026-08-zen-answer-race)
- `1677268` — Bubble spawn engine overhaul (P0+P1) — [[decisions/2026-07-spawn-overhaul]]

## In flight / next
- **Zen-mode stale-bubble fix** (card `cea832da`): the answer-lock from ADR 2026-08-zen-answer-race was insufficient. Synchronous target rotation leaves stale bubbles that validate as wrong. Claude Code (opus-5) applying the snapshot-target-per-pop fix on 2026-08-08. See `handoff-zen-bug.md`.
- **Bubble-spawn playability analytics** (GA4 data retrieved 2026-08-08): 565 `question_answered` events, 50 active users, 94% node-start → node-complete drop-off. Plan artifact at `docs/sdlc/bubble-spawn-analytics/0-plan.md`. See [[domain/analytics]].
- **SDLC pipeline**: world-config chain complete ✅. Sound-handling: plan done, review in progress. Star-rewards: plan needs re-run (no artifact). E2e-coverage: plan blocked (no artifact).
- **Playability validation** of the bubble spawn overhaul in real playtesting — GA4 data now available, see [[domain/bubble-spawn-design]] and [[domain/analytics]].
- Challenge clutter reduction (`CHALLENGE_CLUTTER_PLAN.md`).
- PracticeMode design review follow-ups (`DESIGN_REVIEW_PRACTICEMODE.md`).

## Source plans (repo)
- `SPAWN_OVERHAUL_PLAN.md`, `CHALLENGE_CLUTTER_PLAN.md`, `COUNSEL_FRENZY*.md`, `DESIGN_REVIEW_PRACTICEMODE.md`, `CLAUDE_BRIEF.md`.
