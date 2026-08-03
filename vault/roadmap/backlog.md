---
type: roadmap
project: hebrew-math-adventures
updated: 2026-08-03
tags: [roadmap, backlog, debt]
---

# Backlog & Technical Debt

Distilled from `docs/plans/backlog.md`. Keep this current as work moves.

## Technical debt / refactoring
- **Sound handling**: refactor direct `playSound` calls in `PracticeMode.tsx` to centralized system / `useSound`.
- **Dynamic star rewards**: `GameOrchestrator.tsx` hardcodes `completeNode(node.id, 3)` — award 1/2/3 stars by performance (Pass/Good/Perfect).
- **Consolidate world config**: `worldConfig.ts` (`WORLD_ZONES`) duplicates `learningPath.ts` (`CURRICULUM`). Make `learningPath.ts` single source; consider deleting `WorldMap.tsx` + `worldConfig.ts`.

## Feature gaps
- **Lessons**: only 1 real lesson (`lesson1_multiplication`). Other LESSON nodes fall back. Expand lesson content.
- **Legacy Zone Map** unlinked from main flow — decide: integrate or remove.

## Open questions / concerns
- Bubble spawn playability still to be validated in real use (see [[domain/bubble-spawn-design]]).
