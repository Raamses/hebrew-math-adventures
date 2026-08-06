---
type: decision
status: accepted
date: 2026-08-06
project: hebrew-math-adventures
decision: "Dynamic star rewards by performance tier (Pass/Good/Perfect → 1/2/3)"
related: [rules/game-flow, rules/math-curriculum, architecture/feature-inventory]
tags: [stars, reward, progression, lesson, tier, decision]
---

# ADR: Dynamic Star Rewards by Performance Tier

**Date:** 2026-08-06 · **Status:** Accepted · **Branch:** `sdlc/loop-v0`

## Context
`GameOrchestrator.tsx`'s `handleLessonComplete` hardcoded `completeNode(node.id, 3)` —
every LESSON node granted a full 3-star completion regardless of how well the child
performed. This made star rewards meaningless for lessons: no accuracy incentive, no
Pass/Good/Perfect distinction, and inconsistent with the other game modes
(PRACTICE/SENSORY/MEMORY/INVADERS) which already rewarded by accuracy.

The other modes each had their own inline `computeStars` copy — duplicated, untested
logic with no single source of truth.

## Decision
1. **Single source of truth:** new `src/lib/stars.ts` exports
   `computeStarsByTier(correct, attempts)`, `getTier`, and `tierToStars` mapping a
   performance result to a tier:

   | Tier | Mistakes | Stars |
   |---|---|---|
   | Perfect | ≤ 1 | 3 |
   | Good | ≤ 3 | 2 |
   | Pass | > 3 | 1 |

   All modes (PRACTICE, SENSORY, MEMORY, INVADERS, LESSON) delegate to this helper.
   Completing a node always earns ≥ 1 star (PASS default on missing attempt data).

2. **Lessons now earn stars by performance.** `LessonEngine` tracks a cumulative
   `correct`/`attempts` (mistakes = attempts − correct) across all steps: a successful
   fill counts as correct; a drop into empty space, a full/invalid target, or an
   explicit `recordMistake()` counts as a mistake. `LessonModal.onComplete` now passes
   the engine's `getPerformance()` result up to `GameOrchestrator`, which computes the
   tier via `computeStarsByTier` instead of hardcoding 3.

## Rationale
- Consistency: every node type now rewards by the same Pass/Good/Perfect ladder.
- Incentive: children are rewarded for accuracy, not merely for finishing a lesson.
- Testability: tier logic is isolated, pure, and unit-tested.

## Consequences
- `LessonModalProps.onComplete` signature changes from `() => void` to
  `(performance: { correct: number; attempts: number }) => void`.
- `LessonEngine` gains public `recordMistake()` and `getPerformance()`.
- `GameOrchestrator` LESSON path logs `node_complete` with `correct`/`attempts`.
- Risk: Low. Isolated to lesson completion + a pure helper; all 307 tests pass.

## Revisit if
- A future game mode needs a different reward scale (e.g. coin multipliers), or
- Lesson "mistakes" need finer granularity (wrong-target vs empty-drop) for tutoring.
