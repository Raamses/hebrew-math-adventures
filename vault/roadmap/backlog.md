---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-08
tags: [roadmap, backlog, debt]
---

# Backlog & Technical Debt

Distilled from `docs/plans/backlog.md`. Keep this current as work moves.

## Technical debt / refactoring
- **Sound handling follow-up**: `PracticeMode.tsx` migration done ✅ (ADR 2026-08-centralize-sound). Raw `soundGarden` ternaries remain in `BubbleGameContainer`/`MathInvadersGame`/`MemoryDuelGame` — migrate to semantic `useSound` API.
- **Consolidate world config** ✅ done (commit `45304c4`, world-config SDLC chain complete).
- **Dynamic star rewards** ✅ done (ADR 2026-08-dynamic-star-tiers, commit `a3e664c`).

## Feature gaps
- **Lessons**: only 1 real lesson (`lesson1_multiplication`). Other LESSON nodes fall back. Expand lesson content.
- **Legacy Zone Map** ✅ resolved (world-config consolidation removed dead code).

## Analytics & instrumentation
- **GA4 custom dimensions**: event params (`profile_id`, `node_id`, `equation`, `response_time_ms`, `age_group`) exist in code but haven't been tested as queryable dimensions. Need to register them in GA4 Admin and test via `gog analytics report` with `--dimensions=customParameter:...`. See [[domain/analytics]].
- **Per-user engagement analysis**: query `question_answered` filtered by `profile_id` to identify power users vs at-risk users.
- **Node completion rate by node_id**: query `node_complete` grouped by `node_id` to find which nodes have worst completion rates.
- **Engagement time trend**: query `averageEngagementTimePerSession` by date to detect declining engagement.

## Open questions / concerns
- Bubble spawn playability still to be validated in real use — GA4 data shows 94% node-start → node-complete drop-off (see [[domain/bubble-spawn-design]], [[domain/analytics]]).
- Zen-mode stale-bubble fix in progress (card `cea832da`) — see [[decisions/2026-08-zen-answer-race]] for original ADR and `handoff-zen-bug.md` for updated investigation.
