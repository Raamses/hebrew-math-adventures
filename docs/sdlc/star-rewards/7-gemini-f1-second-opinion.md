# Gemini Second Opinion: F1 False-PERFECT Risk in `correct || 1, attempts || 1` Fallback

**Card:** fdda20e6-9124-42af-9c37-321d591e5769
**Date:** 2026-08-14
**Branch:** `sdlc/loop-v0`
**Reviewer:** reviewer-gemini (GLM-5.2) — context gathering, artifact author
**Model:** gemini-2.5-pro (via `ask-agy --effort high --card fdda20e6-9124-42af-9c37-321d591e5769`)
**Prior work:** `4-review-opus.md` (original review, F1 finding), `5-f1-verification.md` (GLM-5.2 verification)

---

## 1. Executive Summary

**Gemini's verdict: Latent High-Risk Defect** — not merely tech debt.

The `correct || 1, attempts || 1` fallback in `GameOrchestrator.tsx` (4 occurrences across SENSORY and PRACTICE paths) actively subverts the defensive null-handling built into `stars.ts`. While the bug is not reachable through current happy-path UI flows, the fallback masks correct engine behavior and would produce inverted star rewards (3 stars for zero performance) if the `node`/`arcadeMode` mutual-exclusivity convention in `App.tsx` is ever broken.

**Key new finding from Gemini:** The prior analyses focused exclusively on the `(0, 0) → (1, 1)` case. Gemini identified that `correct || 1` also corrupts the broader `(0, N)` case — any session where `correct=0` and `attempts > 0` gets a free correct answer, inflating the tier by reducing the mistake count by 1. This is a wider hazard than previously scoped.

---

## 2. Independent Path Trace

### 2.1 SENSORY Path (BubbleGame → BubbleGameContainer → GameOrchestrator)

#### Standard SENSORY node (no arcadeMode)

**Victory condition:** `target_count` — requires `targetsPopped >= value` (useGameEngine.ts:715-716). `targetsPopped` increments only on `isCorrect === true` (useGameEngine.ts:710). Each correct pop also increments `sessionCorrectRef` and `sessionAttemptsRef` in `BubbleGameContainer.onPopWrapper` (lines 354-355).

**Reachability of `success=true, correct=0, attempts=0`:** **IMPOSSIBLE.** Victory requires ≥1 correct pop, which guarantees `correct ≥ 1, attempts ≥ 1`.

#### Blitz mode (arcadeMode='blitz', no node)

**Victory condition:** `time_limit` — timer expiry sets `isVictory=true, isGameOver=true` (useGameEngine.ts:503) independently of player actions. A player who idles for 60 seconds gets `success=true, correct=0, attempts=0`.

**But:** `handleArcadeMode` in `App.tsx` explicitly calls `setSelectedNode(null)` (line 59). In `GameOrchestrator`, the star computation is guarded by `if (node)` (line 195). With `node=null`, the entire star-award block is skipped.

**Reachability with `node` set:** **NOT REACHABLE via current UI flow.** The `handleGameExit` function clears both `selectedNode` and `arcadeMode`, so transitioning from arcade mode to node selection always passes through a clean state.

#### Other arcade modes (zen, survival, classic)

- **zen:** `winCondition: endless` — no victory trigger. `onComplete` never called with `success=true`. **Safe.**
- **survival:** `failCondition: strikes=3` — game-over triggers `onComplete(false, ...)`. `if (success)` guard prevents star computation. **Safe.**
- **classic:** `winCondition: target_count=20` — same as standard node, requires 20 correct pops. **Safe.**

### 2.2 PRACTICE Path (PracticeMode → usePracticeSession → GameOrchestrator)

#### STANDARD mode

`onComplete(true, ...)` fires only when `count >= SESSION_LENGTH (10)` (PracticeMode.tsx:154). `count` increments only on correct answers (usePracticeSession.ts:79). Therefore `correct ≥ 10` and `attempts ≥ 10`. **IMPOSSIBLE to reach with zeros.**

#### TIME_ATTACK mode

`TICK` action sets `isGameOver=true` (not `isVictory`). `onComplete(false, ...)` is called. `success=false` skips star computation. **Safe.**

#### SURVIVAL mode

`lives <= 0` sets `isGameOver=true`. `onComplete(false, ...)`. **Safe.**

### 2.3 LESSON path

Calls `computeStars(performance.correct, performance.attempts)` directly — no `|| 1` fallback. **Safe** (and correctly relies on `computeStarsByTier`'s built-in null-handling).

---

## 3. The `(0, N)` Hazard — New Finding from Gemini

The prior analyses (both the original review and the F1 verification) focused exclusively on the `(0, 0) → (1, 1)` coercion. Gemini identified a broader issue: `correct || 1` corrupts **any** session with `correct=0` and `attempts > 0`.

| Actual `(correct, attempts)` | Expected Tier | Coerced `(correct||1, attempts||1)` | Coerced Tier | Over-award |
|---|---|---|---|---|
| `(0, 0)` | null → PASS (1★) | `(1, 1)` | mistakes=0 → PERFECT (3★) | **+2 stars** |
| `(0, 2)` | mistakes=2 → GOOD (2★) | `(1, 2)` | mistakes=1 → PERFECT (3★) | **+1 star** |
| `(0, 4)` | mistakes=4 → PASS (1★) | `(1, 4)` | mistakes=3 → GOOD (2★) | **+1 star** |

The `correct || 1` coercion gifts 1 free correct answer whenever `correct=0`, reducing the mistake count by 1 and potentially inflating the tier. This affects any zero-accuracy session, not just zero-attempt sessions.

**Reachability of `(0, N)` with `success=true`:** Only in blitz mode, where timer expiry sets `isVictory=true` regardless of player actions. A player who pops only wrong bubbles (or no bubbles) gets `success=true, correct=0, attempts=N`. However, this only reaches `computeStars` if `node` is truthy, which requires breaking the `node`/`arcadeMode` mutual-exclusivity convention.

**Our assessment:** This amplifies the severity of the latent bug. It's not just "3 stars for doing nothing" — it's "any zero-accuracy session gets inflated by 1 tier." The fix (`correct ?? 0` or removing `|| 1`) addresses both the `(0, 0)` and `(0, N)` cases simultaneously.

---

## 4. App.tsx State Exclusivity Robustness

### Current convention

```tsx
handleNodeSelect(node)    → setSelectedNode(node);     // does NOT clear arcadeMode
handleArcadeMode(mode)    → setSelectedNode(null);     // clears node, sets arcadeMode
handleGameExit()          → setSelectedNode(null);     // clears both
                             setArcadeMode(undefined);
```

### Gemini's concern

`handleNodeSelect` does not clear `arcadeMode`. The mutual exclusivity relies on `handleGameExit` being called between an arcade session and a node selection. If any future feature bypasses `handleGameExit` (deep-linking, notifications, keyboard shortcuts, back-button handling on mobile), both `node` and `arcadeMode` could be set simultaneously.

### Our assessment

**Agree with Gemini's concern.** The convention is enforced by the exit flow, not by the selection handlers. This is a fragile pattern:
- `handleArcadeMode` defensively clears `selectedNode` (line 59)
- `handleNodeSelect` does **not** defensively clear `arcadeMode` (line 52)
- The asymmetry means the defense is one-directional

**Recommended additional fix:** Add `setArcadeMode(undefined)` to `handleNodeSelect` for symmetric defense-in-depth. Gemini also recommends a long-term refactor to a discriminated union model for game view state.

---

## 5. Recommended Fix

### 5.1 Call-site fix (GameOrchestrator.tsx)

Replace `|| 1` with `?? 0` (or simply remove the fallback) at all 4 call sites:

| Line | Current | Fixed |
|---|---|---|
| 197 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct ?? 0, attempts ?? 0)` |
| 203 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct ?? 0, attempts ?? 0)` |
| 288 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct ?? 0, attempts ?? 0)` |
| 294 | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct ?? 0, attempts ?? 0)` |

**Note:** This assumes the F2 wrapper deletion (card 6ff0b8be) has been applied. If not, replace `computeStars` with the existing wrapper name — the key change is `|| 1` → `?? 0`.

**Why `?? 0` instead of `|| 0`:** `??` (nullish coalescing) only coerces `null`/`undefined`, while `||` (logical OR) coerces all falsy values. For `correct` and `attempts` (which are `number` types from the callback signature), both behave identically in practice. However, `??` is more explicit about intent: "handle missing values, don't coerce legitimate zeros." This is a style preference; `|| 0` is equally correct.

**What `computeStarsByTier(0, 0)` returns:** `getTier({ correct: 0, attempts: 0 })` → `attempts <= 0` → `null` → `tierToStars('PASS')` → **1 star**. This is the correct behavior: a session with no data earns the minimum (1 star), not PERFECT (3 stars).

### 5.2 State management fix (App.tsx)

```diff
const handleNodeSelect = (node: LearningNode) => {
    setSelectedNode(node);
+   setArcadeMode(undefined);
    setView('game');
};
```

This makes the mutual exclusivity symmetric — both `handleNodeSelect` and `handleArcadeMode` clear the other's state.

### 5.3 Test coverage gap

No existing test covers the `correct=0, attempts=0, success=true` scenario. Recommended regression tests:

1. **Unit test (stars.ts):** Already covered — `computeStarsByTier(0, 0)` → 1 star is tested in `stars.tiers.test.ts:254`. ✅
2. **Component test (GameOrchestrator):** Render with a SENSORY node + `arcadeMode='blitz'`, simulate timer expiry with no pops, assert `completeNode` called with 1 star (not 3). This test would fail before the fix and pass after.
3. **Component test (zero accuracy):** Render with `success=true, correct=0, attempts=4`, assert 1 star (PASS), not 2 stars (GOOD). This covers the `(0, N)` hazard.
4. **State test (App.tsx):** Verify `handleNodeSelect` clears `arcadeMode` after the symmetric fix.

---

## 6. Comparison with Prior Verdict

| Aspect | Prior Verdict (GLM-5.2, `5-f1-verification.md`) | Gemini's Second Opinion | Our Assessment |
|---|---|---|---|
| Bug reachable today? | No | No (in happy-path), yes under state desync | **Agree with both** — not reachable in current UI flow |
| Code defensively safe? | No | No — actively subverts engine guards | **Strongly agree** — the `|| 1` bypasses `getTier`'s `attempts <= 0` check |
| Severity | Latent / tech-debt | Latent High-Risk Defect | **Lean toward Gemini** — the `(0, N)` amplification and state fragility elevate this above simple tech-debt |
| Scope of the bug | Only `(0, 0)` case | Also `(0, N)` for any N > 0 | **Agree with Gemini** — this is a genuine new insight the prior analyses missed |
| Fix | Replace `\|\| 1` with `\|\| 0` or remove | Replace `\|\| 1` with `?? 0` | **Agree** — same fix, `?? 0` is marginally more idiomatic |
| App.tsx fix? | Not recommended | Add `setArcadeMode(undefined)` to `handleNodeSelect` | **Agree with Gemini** — symmetric defense-in-depth |
| Mutual exclusivity | Convention-based, not enforced | Fragile, anti-pattern, recommend discriminated union | **Agree** — long-term refactor is good, but the one-line fix is sufficient now |

---

## 7. Points of Agreement

Both the prior GLM-5.2 analysis and Gemini's independent review agree on:

1. **The bug is not live today** — current UI flows prevent `correct=0, attempts=0, success=true` from reaching `computeStars` with `node` set
2. **The `|| 1` fallback is unnecessary** — `computeStarsByTier(0, 0)` correctly returns 1 star (PASS) via the `attempts <= 0 → null → PASS` path
3. **The fix is to remove or invert the fallback** — replace `|| 1` with `?? 0` or `|| 0` or simply pass raw values
4. **There is a test coverage gap** — no integration test covers the zero-data success scenario

## 8. Points Where Gemini Adds Value

1. **The `(0, N)` hazard** — the prior analysis was scoped too narrowly. `correct || 1` doesn't just affect `(0, 0)`; it affects any session with `correct=0` and `attempts > 0`, inflating the tier by reducing mistakes by 1
2. **The asymmetric state defense in App.tsx** — `handleArcadeMode` clears `selectedNode` but `handleNodeSelect` does not clear `arcadeMode`. This is a one-directional defense that should be made symmetric
3. **Severity classification** — Gemini argues this is "Latent High-Risk Defect" rather than "tech-debt," citing that the code produces inverted business logic (3 stars for zero performance) rather than just being suboptimal structure
4. **Long-term architectural recommendation** — discriminated union for game view state (`{ type: 'node'; node } | { type: 'arcade'; mode } | null`) to make mutual exclusivity type-enforced

## 9. Points of Disagreement

| # | Prior (GLM-5.2) | Gemini | Our Assessment |
|---|---|---|---|
| 1 | Severity: "Latent / tech-debt" | Severity: "Latent High-Risk Defect" | The `(0, N)` amplification and state fragility lean toward Gemini's higher severity, but since the bug is not reachable in current UI flows, "latent" is correct for both. The disagreement is about risk priority, not classification. |
| 2 | Scope: only `(0, 0)` | Scope: `(0, 0)` and `(0, N)` | **Gemini is correct.** The `correct || 1` coercion affects any `correct=0` input, not just `correct=0, attempts=0`. The prior analysis was incomplete on this point. |
| 3 | App.tsx: no fix recommended | App.tsx: add symmetric clear | **Gemini is correct.** The asymmetric defense is a real fragility. The one-line fix is low-risk and high-value. |

---

## 10. Final Verdict

**Classification: Latent High-Risk Defect** (upgraded from "tech-debt" based on Gemini's `(0, N)` insight)

**Is the bug reachable in practice today?** No — the `if (node)` guard and the `handleGameExit`-based mutual exclusivity prevent it.

**Is the code defensively safe?** No — the `|| 1` fallback actively subverts the engine's built-in null-handling, and the App.tsx state exclusivity is asymmetric and convention-based.

**Minimal fix:**
1. Replace `|| 1` with `?? 0` (or remove fallback) at 4 call sites in `GameOrchestrator.tsx`
2. Add `setArcadeMode(undefined)` to `handleNodeSelect` in `App.tsx` for symmetric defense

**Should this be fixed now?** Yes — the fix is zero-risk (changes behavior only for the unreachable zero-data case, which `computeStarsByTier` already handles correctly) and eliminates a latent bug that would activate on any future change to the node/arcadeMode mutual-exclusivity convention.

---

## 11. Gemini's Raw Analysis

The full analysis from Gemini (via `ask-agy --effort high --card fdda20e6-9124-42af-9c37-321d591e5769`) is reproduced below for reference:

---

### Independent Code Review: Finding F1 (Star-Rewards Fallback Coercion)

#### Executive Summary & Verdict

| Assessment Area | Verdict |
| :--- | :--- |
| Is the bug reachable in practice today? | No in standard happy-path gameplay, but reachable via UI state desynchronization or if any map node uses a time-survival win condition. |
| Is the code defensively safe? | No. It violates defensive programming principles by actively subverting internal engine guards in `stars.ts`. |
| Prior Analysis Accuracy | Partially complete. The prior analysis correctly identified the `(0, 0) → (1, 1)` coercion, but missed the broader `(0, N)` flaw where any session with 0 correct answers is awarded a free correct answer. |
| Severity Classification | Latent High-Risk Defect (not merely tech debt). |

#### Critical Omission in Prior Analysis: The `(0, N)` Hazard

The prior review focused exclusively on `(0, 0) → (1, 1)`. However, JavaScript's `0 || 1 === 1` coercion introduces a wider arithmetic distortion whenever `correct = 0` and `attempts > 0`:

| Actual Score `(correct, attempts)` | Expected Mistakes & Tier | Coerced Score `(correct||1, attempts||1)` | Coerced Mistakes & Tier | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `(0, 0)` | 0 ≤ 0 ⟹ null → PASS (1★) | `(1, 1)` | 1−1=0 ≤ 1 → PERFECT (3★) | +2 Stars Over-awarded |
| `(0, 2)` | 2−0=2 ≤ 3 → GOOD (2★) | `(1, 2)` | 2−1=1 ≤ 1 → PERFECT (3★) | +1 Star Over-awarded |
| `(0, 4)` | 4−0=4 > 3 → PASS (1★) | `(1, 4)` | 4−1=3 ≤ 3 → GOOD (2★) | +1 Star Over-awarded |

Whenever a player gets zero correct answers on any node, `correct || 1` gifts them 1 free correct answer, artificially reducing their mistake count and inflating star rewards.

#### Robustness of App.tsx State Exclusivity

The mutual exclusivity between `selectedNode` and `arcadeMode` is fragile and prone to state leakage.

- The mutual exclusivity relies on the assumption that transitions always cycle through `handleGameExit`.
- If any future or concurrent feature triggers `handleNodeSelect(node)` while `arcadeMode` is set (e.g., direct deep-linking, notifications, keyboard shortcuts, or side drawers), both `node` and `arcadeMode` become truthy simultaneously.
- Maintaining two uncoupled state variables for a single view mode is a classic state synchronization anti-pattern.

#### Recommended Fixes

**Call-site fix:** Replace `|| 1` with `?? 0`:
```diff
- const stars = computeStars(correct || 1, attempts || 1);
+ const stars = computeStars(correct ?? 0, attempts ?? 0);
```

**State management fix:** Enforce mutual exclusivity on selection:
```diff
  const handleNodeSelect = (node: LearningNode) => {
      setSelectedNode(node);
+     setArcadeMode(undefined);
      setView('game');
  };
```

**Long-term refactor:** Model game view state as a discriminated union:
```typescript
type GameState =
  | { type: 'node'; node: LearningNode }
  | { type: 'arcade'; mode: ArcadeMode }
  | null;
```

#### Test Coverage Gaps

1. Component/integration tests verifying zero-data sessions award 1 star, not 3
2. State transition tests verifying `handleNodeSelect` clears `arcadeMode`
3. The `(0, N)` boundary: `computeStarsByTier(0, 2)` → 2 stars (GOOD), not 3 stars (PERFECT)

#### Review of Prior Verdict

| Prior Claim | Gemini Assessment | Rationale |
| :--- | :--- | :--- |
| "Bug is not reachable in practice today" | Agree with qualifications | True for normal happy-path, false under UI race/navigation leaks |
| "Code is not defensively safe" | Strongly Agree | The caller actively disables the engine's built-in 0-attempt handling |
| "Fix: Replace `\|\| 1` with `\|\| 0`" | Agree | Prefer `?? 0` for explicit nullish handling |
| "Analysis scope" | Disagree with completeness | Prior analysis overlooked that `correct \|\| 1` corrupts all zero-accuracy sessions `(0, N)`, not just zero-attempt sessions `(0, 0)` |

---

*Second opinion performed by gemini-2.5-pro via `ask-agy --effort high --card fdda20e6-9124-42af-9c37-321d591e5769`. Context gathered by reviewer-gemini (GLM-5.2) from `sdlc/loop-v0` branch. Read-only: no files edited, no commits made.*
