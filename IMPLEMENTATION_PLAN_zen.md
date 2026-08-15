# Implementation Plan — Fix Zen-Mode Answer Race + Anti-Repeat Duplicate-Slip

**Branch:** `sdlc/loop-v0` · **Date:** 2026-08-03 · **Status:** REVISED (awaiting approval)
**Counsel:** Reviewed by Claude (devil's advocate) — 2 of 3 original claims confirmed, 1 refuted.
**Related vault notes:** [[decisions/2026-07-spawn-overhaul]] · [[domain/bubble-spawn-design]] · [[rules/game-flow]] · [[rules/math-curriculum]]

---

## Confirmed bugs (from code inspection + Claude counsel)

### P1 — Zen-mode answer race (real bug, blocks trust)
**Mechanism (confirmed):** `useAnswerFlow.ts` `submitAnswer` drops any submission while `status !== 'idle'`. In `BubbleGameContainer.tsx`, `onPopWrapper` calls `enginePop(id)` directly with no answer-flow gating. The existing `isPopped` guard in `useGameEngine.ts:545` only blocks re-popping the **same** bubble — it does **not** cover the **cross-entity race**: a target and a distractor popped near-simultaneously get both processed, and the second can be validated against a **stale/rotated `targetValue`**. In zen mode (endless, strikes:0) there's no fail gate, so a mis-registered pop both breaks scoring and can reset the answer state.

### P2 — Anti-repeat duplicate-slip (real bug — worse than first reported)
**Mechanism (confirmed):** `MathModule.generateProblem` (`maxAttempts=5`) and `MathStrategy.generateAndSetProblem` (`MAX_REGEN_ATTEMPTS=8`) both stop retrying after a bounded cap. Critically, in `MathStrategy` the **P1-11 adjacent-level fallback** can still produce a colliding signature, and if all fallback levels collide, the **colliding problem is passed to `setProblem` anyway with no final re-check** — a genuine path where `0 + 0 = ?` repeats back-to-back. The trivial-signature exclusion only kicks in at `correctCount >= 3`.

---

## Refuted (NOT in scope — do not implement)
- **Distractor-overlap findability:** `generateDistractor` already loops `do...while (value === this.targetValue)` and the pedagogical branch filters `c !== answer`. Target can never equal a distractor. **No fix needed.**
- **LTR equation rendering:** `BubbleGameContainer.tsx` already renders `instruction` inside `<div dir="ltr" style={{unicodeBidi:'isolate'}}>`, and `MathText.tsx` covers the math-card path. **No fix needed at these sites** (only re-check other game modes if a real RTL-math bug is reported elsewhere).

---

## Scope of fix (minimal, test-driven)

### Fix 1 — Answer-flow gating for the cross-entity race
- In `BubbleGameContainer.onPopWrapper`: add an answer-lock (`useRef` + short cooldown, ~120ms, or reuse `useAnswerFlow.isProcessing`). While processing, ignore further pops — never validate a second pop against a rotated target.
- Snapshot `targetValue` atomically per accepted pop so no mid-flow rotation can corrupt validation.
- **New test:** at the `BubbleGameContainer`/engine layer (this is the real gap — no such test exists), assert that two near-simultaneous pops (target + distractor) process exactly one result, and the correct one.

### Fix 2 — Anti-repeat final re-check on fallback
- In `MathStrategy.generateAndSetProblem`: after the adjacent-level fallback loop, add a **final re-check** — if the chosen signature still collides, force a perturbation (e.g. swap operator / adjust num2 by ±1) and re-validate before `setProblem`.
- In `MathModule.generateProblem`: when `maxAttempts` is hit, perturb to a different signature rather than returning the colliding problem.
- Extend trivial-signature exclusion (`0+0`, `1-1`, `0*N`) to **all correct-counts**, not just `>= 3`.
- **New test:** generate 50 problems at level 1, assert no two consecutive identical signatures (existing `MathStrategy.test.ts` covers bag, not this).

---

## Out of scope (separate track)
- Memory-duel / full arcade rework, new features, visual redesign.
- RTL-math re-verification of other game modes — only if a real bug is reported.

## Verification gate
- `npm run lint` + `tsc -b` + `npm test` all green. Browser smoke at 375/768/1440: zen rapid-tap shows no state reset; no duplicate `0+0`. Per [[rules/quality-gates]].

## Approval
Reply **/approve-plan** to green-light. On approval: I write the ADR in `vault/decisions/`, then orchestrate implement → test → review with the agent loop (Claude/Jules/agy as available).
