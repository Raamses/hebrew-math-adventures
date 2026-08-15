# F2 Followup: Is the `computeStars` Passthrough Wrapper Safe to Delete?

**Card:** 6ff0b8be-71b8-43db-bac9-307807721c6d
**Date:** 2026-08-14
**Branch:** `sdlc/loop-v0`
**Reviewer:** reviewer-opus (GLM-5.2) — context gathering
**Model:** claude-opus-5 — independent analysis via `ask-claude --escalate`
**Prior work:** F2-computeStars-passthrough-assessment.md (card 9946eb54)

---

## 1. Executive Summary

**Verdict: SAFE TO DELETE.** Both the prior GLM-5.2 assessment and the independent Claude Opus 5 review agree: the `computeStars` wrapper is a pure passthrough with zero behavioural value. Removing it converges `GameOrchestrator` with the established pattern in `PracticeMode.tsx` (which already calls `computeStarsByTier` directly).

**Risk: NONE for the deletion itself.** One mechanical risk during the edit (substring match — see §5).

---

## 2. The Wrapper

```tsx
// GameOrchestrator.tsx, line 80
const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);
```

**Properties confirmed by both reviewers:**

- Pure passthrough — same parameter names, same types, same return type
- No closure capture (no references to component state, props, or refs)
- No default arguments
- No type narrowing or widening
- No side effects
- Not exported, not passed as a prop, not memoised
- Local `const` inside the component function body

---

## 3. All 5 Call Sites

Every call site is inside `GameOrchestrator.tsx`. There are **no external consumers**.

| # | Line | Path | Current call | Replacement |
|---|------|------|-------------|-------------|
| 1 | 119  | LESSON (`handleLessonComplete`) | `computeStars(performance.correct, performance.attempts)` | `computeStarsByTier(performance.correct, performance.attempts)` |
| 2 | 197  | SENSORY (BubbleGame `onComplete`, success branch) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 3 | 203  | SENSORY (BubbleGame `onComplete`, `logEvent`) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 4 | 288  | PRACTICE (PracticeMode `onComplete`, success branch) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 5 | 294  | PRACTICE (PracticeMode `onComplete`, `logEvent`) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |

**Note on `|| 1` guards:** 4 of 5 call sites use `correct || 1, attempts || 1` to coerce zero values to 1. This fallback lives at the **call site**, not in the wrapper, so it is preserved verbatim during replacement. Claude's review specifically flagged: **do not touch the `|| 1` guards in this edit** — they are a separate concern tracked as F1.

---

## 4. SENSORY and PRACTICE — Identical Behaviour After Removal

### SENSORY path (lines ~190-210)

```tsx
onComplete={(success, correct, attempts) => {
    if (success) {
        const stars = computeStarsByTier(correct || 1, attempts || 1);  // was computeStars
        completeNode(node.id, stars);
    }
    logEvent('node_complete', {
        ...
        stars_earned: success ? computeStarsByTier(correct || 1, attempts || 1) : 0,
        ...
    });
}}
```

The `correct || 1, attempts || 1` fallback is applied at the call site, not in the wrapper. Replacing `computeStars(...)` with `computeStarsByTier(...)` preserves the exact same arguments and return value.

### PRACTICE path (lines ~285-300)

```tsx
onComplete={(success, correct, attempts) => {
    if (success) {
        const stars = computeStarsByTier(correct || 1, attempts || 1);  // was computeStars
        completeNode(node.id, stars);
    }
    logEvent('node_complete', {
        ...
        stars_earned: success ? computeStarsByTier(correct || 1, attempts || 1) : 0,
        ...
    });
}}
```

Same pattern, same arguments, same result.

### LESSON path (line ~119)

```tsx
const stars = computeStarsByTier(performance.correct, performance.attempts);  // was computeStars
completeNode(node.id, stars);
```

No `|| 1` fallback; direct values from `performance`. Same result after replacement.

**Claude's note on LESSON reachability:** Claude's review claimed the LESSON path is unreachable dead code (`effectiveMode` can never be `'LESSON'`). However, the prior N5 plan review proved it IS reachable: when `internalMode === null` (initial state, reset on node change) and `node.type === 'LESSON'`, `effectiveMode` resolves to `'LESSON'` via the fallback chain at line 86. LESSON nodes exist in the curriculum (`learningPath.ts:49` — `n3_1`). E2E test `lesson-node-completion.spec.ts` confirms this. **Claude was wrong on this point; the LESSON path is live.**

---

## 5. Risks

### Risk 1 — Substring match (MECHANICAL, during edit)

**Identified by Claude Opus 5.** `computeStars` is a substring of `computeStarsByTier`. A global `sed 's/computeStars/computeStarsByTier/g'` would produce `computeStarsByTierByTier` in the import statement and anywhere the full name appears.

**Mitigation:** Delete the wrapper line *first*, then replace `computeStars(` (with the open paren) to avoid matching the longer name. Grep for `ByTierByTier` afterward.

### Risk 2 — `|| 1` guards (SEPARATE CONCERN, NOT THIS CARD)

Claude's review flagged: if any emitter ever reports `correct > 0, attempts === 0`, then `computeStarsByTier(3, 1)` computes `mistakes = -2` and awards 3 stars (false perfect). `stars.ts` has no clamping, and `stars.tiers.test.ts:347-350` actively enshrines the unclamped result. This is tracked as F1 and should be fixed separately. **Do not touch the guards in this edit.**

### Risk 3 — No runtime test coverage for call sites

Claude noted: no `GameOrchestrator` test exercises any of the 5 call sites directly. Typecheck (`tsc --noEmit`) is the only automated verification. A green test suite does not confirm the rename is correct — it confirms nothing broke at the type level. Manual verification (grep for zero remaining `computeStars` references) is the completion check.

### Risk 4 — Net readability (ACCEPTABLE)

Claude noted: `computeStars` reads better at the call site than `computeStarsByTier`. The wrapper documents "tier-based" as the local default. But an alias that adds a name without adding meaning is worse than the longer name, and the codebase is already split. Converging on the direct call is the right direction.

---

## 6. Precedent

`PracticeMode.tsx` (sibling component rendered by `GameOrchestrator`) already calls `computeStarsByTier` directly:

```tsx
// PracticeMode.tsx:18, 404
import { computeStarsByTier } from '../lib/stars';
...
starsGained={computeStarsByTier(session.correct, session.attempts)}
```

This proves the direct-call pattern is established and safe.

---

## 7. Exact Edit

**File:** `src/components/GameOrchestrator.tsx`

### Step 1 — Delete the wrapper (3 lines)

Delete:
```tsx
    // Compute stars based on session accuracy (Pass/Good/Perfect tier).
    // Delegates to the shared star-tier helper so every mode uses one source of truth.
    const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);
```

### Step 2 — Replace 5 call sites

| Line | Find | Replace with |
|------|------|-------------|
| 119  | `computeStars(performance.correct, performance.attempts)` | `computeStarsByTier(performance.correct, performance.attempts)` |
| 197  | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 203  | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 288  | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 294  | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |

**Important:** Match `computeStars(` (with open paren) to avoid the substring trap. Do NOT use a bare `computeStars` match.

### Step 3 — Import is already present

Line 14: `import { computeStarsByTier } from '../lib/stars';` — unchanged.

### Step 4 — Verify

```bash
npx tsc --noEmit                              # TypeScript compiles clean
npx eslint src/components/GameOrchestrator.tsx # ESLint clean
npx vitest run                                 # All tests pass
grep -n 'computeStars[^B]' src/components/GameOrchestrator.tsx  # Zero remaining bare references
grep -n 'ByTierByTier' src/components/GameOrchestrator.tsx      # Zero substring-matched references
```

---

## 8. Independent Assessment by Claude Opus 5

**Model:** claude-opus-5 (via `ask-claude --escalate --card 6ff0b8be-71b8-43db-bac9-307807721c6d`)

**Claude's verdict:** "Safe to delete. The wrapper is a pure alias: same arity, same parameter types, same return type, no closure capture, no defaults, no side effects. Replacing `computeStars(a, b)` with `computeStarsByTier(a, b)` is referentially transparent at every site."

**Claude's corrections to the premise:**
1. 4 of 5 call sites use `|| 1` guards — argument expressions are preserved by rename, not "straight through" (but this doesn't change the verdict).
2. LESSON path is unreachable dead code — **DISAGREES** with our prior N5 review which proved it IS reachable via `node.type === 'LESSON'` fallback. The N5 review is correct; Claude lacked file access to verify the curriculum.
3. `computeStars` is a substring of `computeStarsByTier` — a real mechanical risk during sed replacement. This was NOT flagged in the prior GLM-5.2 assessment and is a valuable addition.
4. `stars.ts` has no clamping for negative mistake counts (correct > attempts → negative mistakes → PERFECT). This is a separate concern (F1), not this card.

**Points of agreement (GLM-5.2 + Claude Opus 5):**
- Wrapper is a pure passthrough — safe to delete
- All 5 call sites are local, no external consumers
- No tests reference the wrapper
- Import is already present, no change needed
- PracticeMode.tsx precedent confirms the pattern

---

## 9. Final Verdict

**SAFE TO DELETE.** The wrapper is dead weight that adds an indirection layer with zero behavioural value. Both GLM-5.2 and Claude Opus 5 independently confirm this. The edit is mechanical: delete 3 lines, rename 5 call sites (matching `computeStars(` with open paren to avoid the substring trap), run verification.

**Acceptance criteria for the edit:**
1. Zero remaining references to `computeStars` (as a standalone identifier) in `GameOrchestrator.tsx`
2. Zero `ByTierByTier` substring artifacts
3. `tsc --noEmit` passes
4. `eslint` passes on `GameOrchestrator.tsx`
5. `vitest run` — all tests pass
6. Import line unchanged

**Out of scope (tracked separately):**
- F1: `correct || 1, attempts || 1` fallback — false-PERFECT risk (card 963470a1)
- N5: LessonEngine re-drop bug — pre-existing, affects LESSON accuracy

---

*Review performed by reviewer-opus (GLM-5.2) with independent analysis by claude-opus-5 via `ask-claude --escalate`. Read-only: no files edited, no commits made.*
