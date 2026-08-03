---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-03
tags: [roadmap, issues, known]
---

# Known Issues & Watch Items

- **Bubble spawn playability** (⚠️ active concern): after P0 overhaul, validate no dead zones / no idle waiting in real kid playtesting. See [[domain/bubble-spawn-design]].
- **Zen-mode answer race** (in fix, ADR 2026-08-zen-answer-race): cross-entity pop race can reset answer state / mis-score in zen mode. Fix = answer-lock in BubbleGameContainer.
- **Anti-repeat duplicate-slip** (in fix, ADR 2026-08-zen-answer-race): fallback can admit a colliding signature → `0+0` repeats. Fix = final re-check + perturbation.
- **Lesson coverage**: only 1 real lesson; others fall back to practice. Content gap.
- **WorldMap dead code**: exists but unlinked; possible cleanup with `worldConfig.ts` consolidation.
- **Star rewards** hardcoded to 3 — doesn't reflect performance.
- **Sound calls** not fully centralized in `PracticeMode`.

## How to log new issues
Create a dated note in `roadmap/known-issues.md` or link from [[INDEX]]. Keep entries factual with a "status" field.
