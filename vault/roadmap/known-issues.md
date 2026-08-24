---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-24
tags: [roadmap, issues, known]
---

# Known Issues & Watch Items

> **Model:** glm-5.2 (direct — Claude OAuth expired, Gemini IneligibleTierError; both delegations failed)
> **Delegation note:** `ask-claude --escalate` failed (OAuth session expired). `gemini` failed (IneligibleTierError — client no longer supported). Artifact built from direct analysis of git log, test output, build output, and vault files.

## Active issues

- **LESSON node dead code** (⚠️ bug): `GameOrchestrator.tsx:85-87` — `effectiveMode` never returns `'LESSON'`; LESSON-type nodes fall through to `'PRACTICE'`. `isLessonOpen` initialized `false`, never set `true`. The entire `if (effectiveMode === 'LESSON')` block (lines 207–216) is unreachable. Identified as B1 blocker in e2e coverage review (`vault/reviews/e2e-coverage-review.md`). **Impact:** lesson-node e2e spec cannot pass; `LessonModal` never renders. **Fix:** set `effectiveMode = 'LESSON'` when `node?.type === 'LESSON'`, wire `isLessonOpen`, render `LessonModal` with `isOpen={true}`.

- **Bubble spawn playability** (⚠️ active concern): 94% node-start → node-complete drop-off, 23% of node starters never answer a question (GA4 data, 2026-08-08). Variant-aware spawn-X clamp landed (ADR 2026-08-bubble-spawn-x-overflow-clamp). Real kid playtesting still needed. See [[domain/bubble-spawn-design]] and [[domain/analytics]].

- **Chunk size warning** (⚠️ build): Vite build emits a 910 kB JS chunk (gzip: 265 kB), exceeding the 500 kB threshold. No `manualChunks` config in `vite.config.ts`. Single-bundle load impacts first-paint on mobile. **Fix:** add `build.rollupOptions.output.manualChunks` to split vendor libs.

- **E2E suite failures** (⚠️ testing): Aug 20 run — 53 passed / 40 failed / 1 skipped / 5 did not run (99 total, 58.4 min against deployed Firebase site). Root causes:
  1. **Generic timeout (30 tests)** — 120s Playwright timeout too short for deployed site latency (fix card: increase to 180s — partially applied)
  2. **waitForSagaMap timeout (3 tests)** — local helpers reference arcade-button without opening hamburger menu first (fix card: helpers updated with `openMenu`)
  3. **GameOrchestrator not found (2 tests)** — mode switch via GameOrchestrator fails on deployed site
  4. **Node locked (2 tests)** — `setupFreshProfileWithPracticeAccess` doesn't unlock target nodes
  5. **ERR_CONNECTION_REFUSED (1 test)** — invaders spec targets localhost:5173 instead of deployed site
  6. **Star tier assertion (1 test)** — perfect-run star calculation mismatch (fix card: strip Unicode directional marks)
  **Status:** fix cards created on workboard, some partially applied. **Next step:** re-run full suite to verify.

- **Sound handling incomplete** (🔧 debt): `PracticeMode` migrated to `useSound` ✅. Raw `soundGarden` ternaries remain in `BubbleGameContainer`, `MathInvadersGame`, `MemoryDuelGame`. See ADR 2026-08-centralize-sound.

- **Lesson coverage** (📏 gap): 21 lesson files exist (up from 1). Curriculum covers Gr 1–6 (ages 5–11) with many more LESSON-type nodes. Nodes without dedicated lesson content fall back to PracticeMode.

- **GA4 custom dimensions untested** (📊 analytics): event params (`profile_id`, `node_id`, `equation`, `response_time_ms`, `age_group`) exist in code but not registered in GA4 Admin or tested as custom dimensions via Data API. See [[domain/analytics]].

- **Difficulty rebalancer parked** (⏸️ parked): removed from main (commit `d1b2f79`). GA4 data pipeline needs fix before reactivation. See [[decisions/2026-08-park-difficulty-rebalancer]].

## E2E Suite Results (2026-08-20)

- **Full run**: 99 tests, 58.4 minutes, against deployed Firebase site
- **Results**: 53 passed, 40 failed, 1 skipped, 5 did not run
- **Clean specs** (zero failures): arcade-mode-selector, bubble-bugfixes, bubble-game, learning-hints, new-lessons-star-space, pet-screen, play-again-loop, profile-creation-smoke, unit-progression, wrong-answer-feedback
- **New specs added (Aug 24)**: badge-unlocks, daily-quests-streaks, dashboard-visualization, fusion-arcade, powerups-frenzy, story-scenes
- **CI workflow**: `.github/workflows/e2e.yml` added
- **Config**: timeout 180s (up from 120s), removed local setTimeout overrides, helpers use `waitForSelector` instead of fixed 5s mascot waits

## Resolved (kept for reference)

- ~~**Zen-mode stale-bubble validation**~~ — ✅ fixed (commit `0deaef6`, snapshot target per pop). See [[decisions/2026-08-zen-answer-race]].
- ~~**Anti-repeat duplicate-slip**~~ — ✅ fixed (ADR 2026-08-zen-answer-race, commit `be4af87`).
- ~~**Bubble viewport overflow**~~ — ✅ fixed (2026-08-23, ADR 2026-08-bubble-spawn-x-overflow-clamp, variant-aware spawn-X clamp in `worldConfig.ts`). 14 of 18 variant × viewport combinations overflowed; surfaced as ~1-in-3 e2e flake.
- ~~**Star rewards hardcoded to 3**~~ — ✅ fixed (ADR 2026-08-dynamic-star-tiers, commit `a3e664c`).
- ~~**WorldMap dead code**~~ — ✅ resolved (world-config consolidation, commit `45304c4`).

## How to log new issues
Create a dated note in `roadmap/known-issues.md` or link from [[INDEX]]. Keep entries factual with a "status" field.