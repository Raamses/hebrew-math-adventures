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
