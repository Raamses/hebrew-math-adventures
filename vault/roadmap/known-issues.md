---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-08
tags: [roadmap, issues, known]
---

# Known Issues & Watch Items

- **Bubble spawn playability** (⚠️ active concern): after P0 overhaul, validate no dead zones / no idle waiting in real kid playtesting. GA4 data (2026-08-08) shows 94% node-start → node-complete drop-off and 23% of node starters never answer a question. See [[domain/bubble-spawn-design]] and [[domain/analytics]].
- **Zen-mode stale-bubble validation** (✅ fixed, commit `0deaef6`, 2026-08-08): the answer-lock from ADR 2026-08-zen-answer-race was insufficient. Synchronous target rotation in `onPopWrapper` left stale bubbles that validated as wrong. Fix = snapshot `targetValue` per pop, ignore stale bubbles. See [[decisions/2026-08-zen-answer-race]] for the original ADR; updated investigation in `handoff-zen-bug.md`.
- **Anti-repeat duplicate-slip** (✅ fixed, ADR 2026-08-zen-answer-race): final re-check + perturbation landed in commit `be4af87`.
- **Lesson coverage**: only 1 real lesson (`lesson1_multiplication`); others fall back to practice. Content gap.
- **Sound calls** in `BubbleGameContainer`/`MathInvadersGame`/`MemoryDuelGame` — raw `soundGarden` ternaries remain (ADR 2026-08-centralize-sound follow-up). `PracticeMode` migration done ✅.
- **GA4 custom dimensions not yet tested**: event params like `profile_id`, `node_id`, `equation`, `response_time_ms` exist in the code but haven't been queried as custom dimensions via the Data API. See [[domain/analytics]].

## Resolved (kept for reference)
- ~~**Zen-mode stale-bubble validation**~~ — ✅ fixed (commit `0deaef6`, snapshot target per pop).
- ~~**Star rewards hardcoded to 3**~~ — ✅ fixed (ADR 2026-08-dynamic-star-tiers, commit `a3e664c`).
- ~~**WorldMap dead code**~~ — ✅ resolved (world-config consolidation, commit `45304c4`).

## How to log new issues
Create a dated note in `roadmap/known-issues.md` or link from [[INDEX]]. Keep entries factual with a "status" field.

## E2E Suite Results (2026-08-20)

- **Full run**: 99 tests, 58.4 minutes, against deployed Firebase site
- **Results**: 53 passed, 40 failed, 1 skipped, 5 did not run
- **Root causes**:
  1. **Generic timeout (30 tests)** — 120s Playwright timeout too short for deployed site latency
  2. **waitForSagaMap timeout (3 tests)** — local helpers in specs still reference arcade-button without opening hamburger menu first
  3. **GameOrchestrator not found (2 tests)** — mode switch via GameOrchestrator fails on deployed site
  4. **Node locked (2 tests)** — setupFreshProfileWithPracticeAccess doesn't unlock target nodes
  5. **ERR_CONNECTION_REFUSED (1 test)** — invaders spec targets localhost:5173 instead of deployed site
  6. **Star tier assertion (1 test)** — perfect-run star calculation mismatch
- **Clean specs** (zero failures): arcade-mode-selector, bubble-bugfixes, bubble-game, learning-hints, new-lessons-star-space, pet-screen, play-again-loop, profile-creation-smoke, unit-progression, wrong-answer-feedback
- **Fix cards created**: 6 cards on workboard for each root cause
- **Coverage gap cards**: 8 cards for untested features (hints, shop, badges, quests, story scenes, dashboard viz, powerups, fusion mode)
