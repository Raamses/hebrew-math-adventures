---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-24
status: ready-to-merge
tags: [roadmap, current, work]
---

# Current Work

## Branch
- `fix/saga-node-star-tier` (current) — 20 commits ahead of main, build passing, 1533/1533 unit tests passing.
- **Not yet merged to main. Not deployed.**

## Recently landed (on branch, unmerged)
- `ee8fd5e` — feat: parent zone redesign, arcade i18n fix, parent games (Equation of the Day, Parent Blitz, Sudoku), arcade mode selector page, 14 new lessons
- `141e1af` — feat: parent economy + competitive features (Phase 6) — ParentEconomyPanel, GiftToChildModal, WeeklyLeaderboard, useParentEconomy, 10 parent badges, coin earning, 56 engine tests
- `c8210e4` — fix: bubble game bugs — Pop N i18n, boss bubble unkillable, memoized SensoryProblem
- `3a382a8` — fix: wire up 15 new lessons, repair ParentBlitz/hub tests, de-flake bubble test
- `e6f29e3` — fix: resolve 22 TypeScript build errors
- `f910775` — fix: add 'space' theme and 'star' item type to sprite/theme maps
- `de79b39` — test: update DISTRACTOR_LIFESPAN_MS expectation to match 15000 config value
- `f709165` — fix: correct parent economy import paths and null-safe streak access
- `2a195d0` — feat: badge collection improvements, bubble/cinematic tweaks, i18n fixes
- `82f4d86` — test: e2e suite improvements — 6 new specs, helpers fix, CI workflow

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

## E2E test status (as of Aug 24)
- 10 modified specs + 6 new specs added (badge-unlocks, daily-quests-streaks, dashboard-visualization, fusion-arcade, powerups-frenzy, story-scenes)
- Playwright config: timeout 180s, removed local setTimeout overrides
- Helpers: waitForSelector instead of fixed 5s mascot waits
- GitHub Actions CI workflow added (.github/workflows/e2e.yml)

## Next steps
- **Merge `fix/saga-node-star-tier` to main** (awaiting Ram's go)
- **Deploy to Firebase** (awaiting Ram's go)
- **Close stale Bolt/Sentinel PRs** (9 open, mostly FrenzyOverlay duplicates and localStorage noise)
- **Update known-issues.md and backlog.md** to reflect current state
