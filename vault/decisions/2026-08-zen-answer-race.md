---
type: decision
status: accepted
date: 2026-08-03
updated: 2026-08-03
project: hebrew-math-adventures
decision: "Fix zen-mode answer race + anti-repeat duplicate-slip"
related: [rules/game-flow, rules/math-curriculum, domain/bubble-spawn-design, decisions/2026-07-spawn-overhaul]
approved_by: ram
implementation_plan: IMPLEMENTATION_PLAN_zen.md
tags: [bubble, zen, answer, anti-repeat, bugfix, decision]
---

# ADR: Fix Zen-Mode Answer Race + Anti-Repeat Duplicate-Slip

**Date:** 2026-08-03 · **Status:** Accepted · **Approved by:** Ram (`/approve-plan`)

## Context
Two confirmed bugs (via code inspection + Claude devil's-advocate counsel):

**P1 — Zen-mode answer race.** `useAnswerFlow.submitAnswer` drops any submission while `status !== 'idle'`. `BubbleGameContainer.onPopWrapper` calls `enginePop(id)` with no answer-flow gating. The existing `isPopped` guard in `useGameEngine` only blocks re-popping the **same** bubble, not the **cross-entity race**: a target + distractor popped near-simultaneously both get processed, and the second can be validated against a stale/rotated `targetValue`. In zen (endless, strikes:0) no fail gate → mis-registered pop breaks scoring and resets the answer state.

**P2 — Anti-repeat duplicate-slip.** `MathModule.generateProblem` (maxAttempts=5) and `MathStrategy.generateAndSetProblem` (MAX_REGEN_ATTEMPTS=8) stop retrying after a bounded cap. The P1-11 adjacent-level fallback can still produce a colliding signature, and if all fallback levels collide, the **colliding problem is passed to `setProblem` anyway with no final re-check** → `0 + 0 = ?` repeats. Trivial-signature exclusion only kicks in at `correctCount >= 3`.

## Decision
Fix both, minimal + test-driven:

1. **Answer-flow gating** in `BubbleGameContainer.onPopWrapper` — answer-lock (useRef + ~120ms cooldown, or reuse `useAnswerFlow.isProcessing`). While processing, ignore further pops; snapshot `targetValue` atomically per accepted pop.
2. **Anti-repeat final re-check** — in `MathStrategy.generateAndSetProblem`, after adjacent-level fallback, add a final re-check: if the chosen signature still collides, force a perturbation (swap operator / adjust num2 ±1) and re-validate before `setProblem`. In `MathModule.generateProblem`, when maxAttempts hit, perturb to a different signature. Extend trivial-signature exclusion (`0+0`, `1-1`, `0*N`) to all correct-counts.

## Refuted (NOT in scope)
- Distractor-overlap findability: `generateDistractor` already loops `do...while (value === targetValue)`. No fix needed.
- LTR equation rendering: already wrapped in `<div dir="ltr" unicode-bidi-isolate>` in container + `MathText.tsx`. No fix needed at these sites.

## Testing
- **New:** engine-layer test for the cross-entity race (target + distractor near-simultaneous → exactly one result processed, the correct one). This was the real gap — no such test existed.
- **New:** anti-repeat — generate 50 problems at level 1, assert no two consecutive identical signatures.

## Consequences
- Zen mode rapid-tapping no longer resets state or mis-scores.
- No back-to-back duplicate problems at any correct-count.

## Revisit if
- A real RTL-math bug surfaces in other game modes (not bubble) — re-verify then, not now.

## Update (2026-08-08): answer-lock was insufficient — stale-bubble validation bug

**The answer-lock fix above did NOT fully resolve the zen-mode state reset.** Further investigation (see `handoff-zen-bug.md`) found the root cause:

When a correct answer triggers `handleSessionLeveling` → `regenerateProblem()`, the target rotates **synchronously**. Already-spawned target bubbles on screen still carry the OLD `internalValue`. After rotation, `MathStrategy.validate()` returns `false` for them. If the player taps one (within or after the 120ms lock), `handlePop` treats it as a **wrong answer** → `combo = 0`, `strikes+1`, no score. This is the observed "state reset."

The `answerLockRef` (120ms) only prevents a *second* pop from being processed while one is in flight. It does not prevent the synchronous target rotation, nor does it clear/ignore the now-stale bubbles.

**Fix (in progress, card `cea832da`):** snapshot `targetValue` per accepted pop. In `useGameEngine.handlePop`, capture the target at the moment of validation and validate the entity against that snapshot. A stale bubble should be **ignored** (not counted as wrong), not flagged as a wrong answer. See `handoff-zen-bug.md` for full investigation. Tests: `zenStateReset.test.ts` (1 failing test proves the bug).
