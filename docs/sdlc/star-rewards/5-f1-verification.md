# F1 Verification: false-PERFECT from `correct||1` fallback in GameOrchestrator

**Verifier:** reviewer-opus (GLM-5.2)  
**Date:** 2026-08-14  
**Branch:** `sdlc/loop-v0`  
**Card:** 963470a1-2f90-42f7-b31e-1544ffdbfa28  
**Parent review:** `4-review-opus.md` (Final review: Star rewards — APPROVED)  

---

## Finding F1 (from final review)

> In `GameOrchestrator.tsx` the SENSORY and PRACTICE paths call `computeStars(correct || 1, attempts || 1)`. When a session reports `correct=0, attempts=0` this becomes `(1,1)` → 0 mistakes → PERFECT → 3 stars for doing nothing.

## Verdict: BUG IS NOT REACHABLE IN PRACTICE (with caveat)

The `correct || 1, attempts || 1` fallback cannot produce a false-PERFECT through any current UI code path. However, the code is **not defensively safe** — it relies on a caller-site convention (`node` and `arcadeMode` are mutually exclusive) that is not enforced by types or guards. The fallback masks a latent bug that would activate if the mutual-exclusivity convention is ever broken.

**Severity:** Latent / tech-debt (not a live bug today)  
**Recommendation:** Replace `|| 1` with `|| 0` — `computeStarsByTier(0, 0)` correctly returns 1 star (PASS tier) via the `attempts <= 0 → null → PASS` path.

---

## Detailed Trace

### 1. SENSORY path (BubbleGame → BubbleGameContainer → GameOrchestrator)

#### 1a. Non-arcade SENSORY node (no `arcadeMode`)

**Config:** `winCondition: { type: 'target_count', value: N }` where N = count of target items in the problem (or 10 fallback).

**Victory trigger:** `useGameEngine` sets `isVictory=true` only when `targetsPopped >= value` (line 716). `targetsPopped` increments exclusively on `isCorrect === true` (line 712). Each correct pop also increments `sessionCorrectRef` and `sessionAttemptsRef` in `BubbleGameContainer.onPopWrapper` (lines 312–313).

**Reachability of `success=true, correct=0, attempts=0`:**  
**IMPOSSIBLE.** Victory requires ≥ N ≥ 1 correct pops. Each correct pop increments both refs. Therefore `correct ≥ 1` and `attempts ≥ 1` when `onComplete(true, ...)` fires.

#### 1b. Arcade mode (blitz) without node

**Config:** `arcadeMode='blitz'` overrides `winCondition` to `{ type: 'time_limit', value: 60 }`.

**Victory trigger:** `timerSystem` in `useGameEngine` decrements `timeLeft` every ~1000ms. When `timeLeft <= 0`, it sets `isVictory=true, isGameOver=true` (line 503) **independently of player actions**. A player who never pops a bubble gets `isVictory=true` with `sessionCorrectRef=0, sessionAttemptsRef=0`.

**But:** `handleArcadeMode` in `App.tsx` explicitly calls `setSelectedNode(null)` (line 62). When `arcadeMode` is set, `node` is always `null`. In `GameOrchestrator`, the star computation is guarded by `if (node)` (line 196). With `node=null`, the entire `if (node)` block is skipped — no `computeStars` call, no `completeNode` call.

**Reachability of `success=true, correct=0, attempts=0` with node set:**  
**NOT REACHABLE via current UI.** The `node` and `arcadeMode` props are mutually exclusive by convention in `App.tsx`. Neither `handleNodeSelect` (line 54) nor `handleArcadeMode` (line 58) ever sets both.

#### 1c. Arcade mode (zen, survival, classic) without node

- **zen:** `winCondition: { type: 'endless', value: 0 }`, `failCondition: { type: 'strikes', value: 0 }`. No victory or game-over trigger from the engine. Game only ends via player `onExit`. `onComplete` is never called with `success=true`. **Safe.**
- **survival:** `failCondition: { type: 'strikes', value: 3 }`. Game-over triggers `isGameOver=true` (not `isVictory`). `onComplete(false, ...)` is called. The `if (success)` guard prevents star computation. **Safe.**
- **classic:** `winCondition: { type: 'target_count', value: 20 }`. Same as 1a — requires 20 correct pops. **Safe.**

### 2. PRACTICE path (PracticeMode → usePracticeSession → GameOrchestrator)

#### 2a. STANDARD mode

**Completion:** `onCorrectComplete` callback in `PracticeMode` fires `onComplete(true, currentSession.correct, currentSession.attempts)` when `count >= UI_CONFIG.SESSION_LENGTH` (line 168).

`count` is only incremented when `isCorrect=true` in the `sessionReducer` (line 87 of `usePracticeSession.ts`). Therefore `correct = count >= SESSION_LENGTH >= 1` and `attempts >= correct >= 1`.

**Reachability:** **IMPOSSIBLE.** Both values are ≥ 1 when `success=true`.

#### 2b. TIME_ATTACK mode

**Game over:** `TICK` action sets `isGameOver=true` but NOT `isVictory` (line 103 of `usePracticeSession.ts`). The effect at line 197 of `PracticeMode` calls `onComplete(false, session.correct, session.attempts)` — `success=false`. The `if (success)` guard in `GameOrchestrator` prevents star computation.

**Reachability:** **IMPOSSIBLE.** `success=false` skips the `computeStars` call entirely.

#### 2c. SURVIVAL mode

**Game over:** `ANSWER` action decrements `lives`. When `lives <= 0`, `isGameOver=true` (line 93 of `usePracticeSession.ts`). Same as TIME_ATTACK — `onComplete(false, ...)`. **Safe.**

### 3. LESSON path

**Completion:** `handleLessonComplete` in `GameOrchestrator` calls `computeStars(performance.correct, performance.attempts)` — **no `|| 1` fallback**. Passes raw values from `LessonEngine.getPerformance()`. **Safe** (and correctly uses `computeStarsByTier`'s null-handling for the `attempts=0` edge case).

---

## Why the `|| 1` Fallback Exists

The `correct || 1, attempts || 1` pattern is a **pre-existing defensive coercion** in `GameOrchestrator.tsx`, not introduced by the star-rewards feature. It was likely added to prevent `NaN` or division-by-zero in earlier star computation logic that used accuracy ratios. The star-rewards migration replaced the old ratio-based computation with `computeStarsByTier` (mistake-count based), which **already handles the zero case correctly**:

```typescript
export function getTier(result: PerformanceResult): StarTier | null {
    if (result.attempts <= 0) return null;  // → defaults to PASS (1 star)
}
```

So `computeStarsByTier(0, 0)` returns `1` (PASS) — the correct behavior for "no data". The `|| 1` fallback is now **not only unnecessary but actively harmful**: it converts the "no data" case into a false-PERFECT.

---

## Minimal Fix

**Replace `correct || 1, attempts || 1` with `correct, attempts`** in both SENSORY and PRACTICE paths of `GameOrchestrator.tsx`.

### Files to change

`src/components/GameOrchestrator.tsx`, 4 occurrences:

| Line | Current | Fixed |
|------|---------|-------|
| 197 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStars(correct, attempts)` |
| 203 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStars(correct, attempts)` |
| 288 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStars(correct, attempts)` |
| 294 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStars(correct, attempts)` |

### Why this is safe

- `computeStarsByTier(0, 0)` → `getTier({ correct: 0, attempts: 0 })` → `attempts <= 0` → `null` → `tierToStars('PASS')` → **1 star**. This is the correct result for a session with no attempt data.
- `computeStarsByTier(5, 0)` → same → 1 star. Correct — a session with `correct > 0` but `attempts = 0` is a data anomaly, and 1 star (the minimum) is the safe default.
- All current reachable paths (traced above) always have `correct >= 1, attempts >= 1` when `success=true`, so removing the fallback changes nothing for live code paths.
- The fix **hardens** the code against future changes that might break the `node`/`arcadeMode` mutual-exclusivity convention.

### What does NOT need to change

- `checkArcadeDailyChallenge(correct || 0)` (line 193) — this is a different guard, ensuring daily challenge accumulation doesn't add 0. Leave as-is.
- LESSON path (line 119) — already passes raw values. No change needed.
- `PracticeMode.tsx` (line 404) — already calls `computeStarsByTier(session.correct, session.attempts)` directly. No change needed.

---

## Risk Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Is the bug live today? | **No** | `node` and `arcadeMode` are mutually exclusive in `App.tsx` |
| Could the bug activate from a future change? | **Yes** | If someone passes both `node` and `arcadeMode='blitz'` to `GameOrchestrator`, a player who lets the timer expire gets 3 stars |
| Is the fix risky? | **No** | Removing `|| 1` only changes behavior for the `correct=0` or `attempts=0` edge case, which `computeStarsByTier` already handles correctly (→ 1 star) |
| Should the fix include type-level enforcement? | **Optional** | A `never` type or runtime assertion on `node && arcadeMode` in `GameOrchestrator` would add defense-in-depth, but is beyond the scope of this finding |

---

## Test Coverage Gap

No existing test covers the `correct=0, attempts=0, success=true` scenario. A regression test should:

1. Render `GameOrchestrator` with a SENSORY `node` and `arcadeMode='blitz'` (hypothetical scenario).
2. Simulate the timer expiring without any bubble pops.
3. Assert that `completeNode` is called with `1` star (not `3`).

This test would only pass after the fix is applied (currently it would fail with 3 stars, confirming the latent bug).

---

## Summary

| Question | Answer |
|----------|--------|
| Is `correct=0, attempts=0` reachable when `success=true`? | Only in blitz mode, which requires `arcadeMode='blitz'`. |
| Can `arcadeMode` and `node` both be set? | Not via current `App.tsx` flows — they're mutually exclusive by convention. |
| Is the bug reachable in practice today? | **No.** |
| Is the code defensively safe? | **No.** The convention is not enforced by types or runtime guards. |
| Is the `|| 1` fallback necessary? | **No.** `computeStarsByTier(0, 0)` correctly returns 1 star. |
| What is the minimal fix? | Remove `|| 1` from all 4 `computeStars` calls in `GameOrchestrator.tsx`. |
| Bug classification | Latent / tech-debt. Not a live bug, but the fallback masks correct null-handling and would become a real bug if the mutual-exclusivity convention breaks. |

---

*Verification performed by reviewer-opus (GLM-5.2) on 2026-08-14, reading source code directly from `sdlc/loop-v0` branch. Read-only: no files edited, no commits made.*
