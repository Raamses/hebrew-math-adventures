---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-24
tags: [roadmap, backlog, debt]
---

# Backlog & Technical Debt

> **Model:** glm-5.2 (direct — Claude OAuth expired, Gemini IneligibleTierError; both delegations failed)
> **Delegation note:** `ask-claude --escalate` failed (OAuth session expired). `gemini` failed (IneligibleTierError — client no longer supported). Artifact built from direct analysis of git log, test output, build output, and vault files.

## Technical debt / refactoring

- **Sound handling migration (incomplete)**: `PracticeMode.tsx` migrated to `useSound` ✅ (ADR 2026-08-centralize-sound). Raw `soundGarden` ternaries remain in `BubbleGameContainer`, `MathInvadersGame`, `MemoryDuelGame`. **Next step:** migrate these three components to the semantic `useSound` API.
- **Chunk size warning**: Vite build produces a single 910 kB JS chunk (gzip: 265 kB) — exceeds the 500 kB warning threshold. No `manualChunks` or `chunkSizeWarningLimit` config in `vite.config.ts`. **Next step:** add `build.rollupOptions.output.manualChunks` to split vendor (React, Firebase, Framer Motion) from app code.
- **LESSON node dead code**: `GameOrchestrator.tsx` `effectiveMode` never returns `'LESSON'` — LESSON-type nodes fall through to PRACTICE. `isLessonOpen` is initialized `false` and never set `true`. Identified as B1 blocker in e2e coverage review. **Next step:** fix `effectiveMode` to return `'LESSON'` for LESSON nodes, wire `isLessonOpen`, render `LessonModal`.
- **Difficulty rebalancer parked**: removed from main (commit `d1b2f79`). GA4 pipeline needs fix before reactivation. See [[decisions/2026-08-park-difficulty-rebalancer]]. **Next step:** fix GA4 data pipeline, then re-evaluate.

## Feature gaps

- **Lesson content expansion**: 21 lesson files exist (up from 1 — `lesson1_multiplication`), but curriculum covers Gr 1–6 (ages 5–11) with many more LESSON-type nodes. Content gap remains. **Next step:** audit curriculum for all LESSON-type nodes, create content files for each.
- **E2E coverage gaps**: 32 spec files exist. 6 new specs added (badge-unlocks, daily-quests-streaks, dashboard-visualization, fusion-arcade, powerups-frenzy, story-scenes). Still untested: hints system, shop/treasure economy flow, pet screen interactions, profile switching, memory duel, invaders. **Next step:** verify new specs pass against deployed site, then write specs for remaining gaps.
- **E2E suite failures**: Aug 20 run — 53 passed / 40 failed / 1 skipped / 5 did not run (99 total). Root causes: generic timeout (30 tests), waitForSagaMap (3), GameOrchestrator not found (2), node locked (2), ERR_CONNECTION_REFUSED (1), star tier assertion (1). Fix cards created on workboard. **Next step:** verify fix cards resolved, re-run full suite.

## Analytics & instrumentation

- **GA4 custom dimensions untested**: event params (`profile_id`, `node_id`, `equation`, `response_time_ms`, `age_group`) exist in code but haven't been registered in GA4 Admin or tested as queryable dimensions via Data API. **Next step:** register dimensions in GA4 Admin, test with `gog analytics report --dimensions=customParameter:...`.
- **Per-user engagement analysis**: query `question_answered` filtered by `profile_id` to identify power users vs at-risk users. **Next step:** run analysis query against GA4 Data API.
- **Node completion rate by node_id**: query `node_complete` grouped by `node_id` to find which nodes have worst completion rates. **Next step:** run analysis query, cross-reference with bubble-spawn design.
- **Engagement time trend**: query `averageEngagementTimePerSession` by date to detect declining engagement. **Next step:** run 28-day window query.

## Open questions / concerns

- **Bubble spawn playability**: 94% node-start → node-complete drop-off (GA4 data, 2026-08-08). Variant-aware spawn-X clamp landed, but real kid playtesting validation still needed. See [[domain/bubble-spawn-design]] and [[domain/analytics]].
- **Challenge clutter reduction**: `CHALLENGE_CLUTTER_PLAN.md` — reduce visual overload in challenge nodes. **Next step:** review plan, implement.
- **PracticeMode design review follow-ups**: `DESIGN_REVIEW_PRACTICEMODE.md` — outstanding items from review. **Next step:** triage and implement.

## Resolved (kept for reference)

- ~~**Sound handling — PracticeMode migration**~~ ✅ done (ADR 2026-08-centralize-sound).
- ~~**Consolidate world config**~~ ✅ done (commit `45304c4`, world-config SDLC chain complete).
- ~~**Dynamic star rewards**~~ ✅ done (ADR 2026-08-dynamic-star-tiers, commit `a3e664c`).
- ~~**Legacy Zone Map**~~ ✅ resolved (world-config consolidation removed dead code).
- ~~**Zen-mode stale-bubble fix**~~ ✅ done (commit `0deaef6`, snapshot target per pop).
- ~~**Anti-repeat duplicate-slip**~~ ✅ done (ADR 2026-08-zen-answer-race, commit `be4af87`).
- ~~**Bubble viewport overflow**~~ ✅ done (ADR 2026-08-bubble-spawn-x-overflow-clamp, variant-aware clamp).
- ~~**Merge fix/saga-node-star-tier to main**~~ ✅ done (commit `0aeaddf`, 1546/1546 tests, tsc clean).
- ~~**Close stale Bolt/Sentinel PRs**~~ ✅ done (9 PRs closed, branches deleted).
- ~~**Parent economy + arcade revamp**~~ ✅ landed (ParentEconomyPanel, GiftToChildModal, WeeklyLeaderboard, 10 parent badges, coin earning, 56 engine tests, parent games, arcade mode selector, 14 new lessons).