---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-24
status: merged-to-main
tags: [roadmap, current, work]
---

# Current Work

## Branch
- `fix/saga-node-star-tier` — **MERGED to main** (commit `0aeaddf`, Aug 24). Build passing, 1546/1546 unit tests across 71 files, tsc --noEmit clean.
- **Deploy to Firebase** — not yet deployed (awaiting Ram's go).

## Recently landed (on main)
- `0aeaddf` — docs: merge artifact for fix/saga-node-star-tier → main
- `7840dc3` — fix(test): apply rotateToNewTarget pattern to zenStateReset.test.ts
- `8ea214d` — feat: badge collection improvements, bubble/cinematic tweaks, i18n fixes
- `d63896c` — test: e2e suite improvements — 6 new specs, helpers fix, CI workflow
- `6959c71` — feat: parent economy + competitive features (Phase 6) — ParentEconomyPanel, GiftToChildModal, WeeklyLeaderboard, 10 parent badges, coin earning, 56 engine tests
- `1a692ba` — feat: parent zone redesign, arcade i18n fix, parent games (Equation of the Day, Parent Blitz, Sudoku), arcade mode selector page, 14 new lessons
- `97acab6` — fix: bubble game bugs — Pop N i18n, boss bubble unkillable, memoized SensoryProblem
- `e4f0f9f` — fix: wire up 15 new lessons, repair ParentBlitz/hub tests, de-flake bubble test
- `a262011` — fix(bubble): variant-aware spawn-X clamp + correct overflow assertions

## Active Plan
- [[plans/game-ideation-2026-08-23]] — comprehensive feature plan from ideation session (P0/P1/P2 priorities)
- Monetization parked → see [[backlog/monetization-and-growth]]

## In flight / next
- **Deploy to Firebase** — main is ready, awaiting Ram's go.
- **SDLC pipeline**: world-config chain complete ✅. Sound-handling: PracticeMode migrated ✅, 3 components remain. Star-rewards: done ✅. E2e-coverage: 6 new specs added, fix cards in progress.
- **Challenge clutter reduction** (`CHALLENGE_CLUTTER_PLAN.md`).
- **PracticeMode design review follow-ups** (`DESIGN_REVIEW_PRACTICEMODE.md`).
- **LESSON node dead code fix** — GameOrchestrator `effectiveMode` never returns `'LESSON'`. See [[known-issues]].
- **Chunk size optimization** — add `manualChunks` to `vite.config.ts` to split 910 kB bundle. See [[backlog]].

## E2E test status (as of Aug 24)
- 32 spec files total (10 modified + 6 new + 16 existing)
- Playwright config: timeout 180s, removed local setTimeout overrides
- Helpers: waitForSelector instead of fixed 5s mascot waits
- GitHub Actions CI workflow added (.github/workflows/e2e.yml)
- Aug 20 full run: 53 passed / 40 failed / 1 skipped / 5 did not run — fix cards created, some partially applied

## Completed (since Aug 8)
- ✅ Merge `fix/saga-node-star-tier` to main (commit `0aeaddf`)
- ✅ Close 9 stale Bolt/Sentinel PRs (branches deleted)
- ✅ Zen-mode stale-bubble fix (commit `0deaef6`)
- ✅ Anti-repeat duplicate-slip (commit `be4af87`)
- ✅ Bubble viewport overflow (variant-aware spawn-X clamp, ADR 2026-08-bubble-spawn-x-overflow-clamp)
- ✅ World-config consolidation (commit `45304c4`)
- ✅ Dynamic star rewards (ADR 2026-08-dynamic-star-tiers, commit `a3e664c`)
- ✅ Parent economy + arcade revamp (Phase 6)
- ✅ 15 new lessons wired up (21 lesson files total)
- ✅ Update known-issues.md and backlog.md to reflect current state

## Next steps
- **Deploy to Firebase** (awaiting Ram's go)
- **Fix LESSON node dead code** in GameOrchestrator
- **Add manualChunks to vite.config.ts** for bundle splitting
- **Re-run full e2e suite** to verify fix cards resolved failures
- **Migrate remaining sound calls** in BubbleGameContainer/MathInvadersGame/MemoryDuelGame
- **Register GA4 custom dimensions** in GA4 Admin and test via Data API