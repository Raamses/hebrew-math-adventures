# F2: Assess removing the `computeStars` passthrough wrapper

**Card:** 9946eb54-5e0a-4801-9790-230e241c503d
**Date:** 2026-08-14
**Branch:** sdlc/loop-v0
**Reviewer:** reviewer-opus

## 1. The wrapper

```tsx
// GameOrchestrator.tsx:78-80
// Compute stars based on session accuracy (Pass/Good/Perfect tier).
// Delegates to the shared star-tier helper so every mode uses one source of truth.
const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);
```

This is a **pure passthrough**: same parameter names, same types, same return type, no additional logic, no closure state captured, no default arguments, no type narrowing. The body is `return computeStarsByTier(correct, attempts)` in arrow form.

## 2. All call sites

Every call site is inside `GameOrchestrator.tsx`. There are **no external consumers** — `computeStars` is a local `const` declared inside the component function body, not exported, not passed as a prop, not memoised.

| # | Line | Path | Current call | Replacement |
|---|------|------|-------------|-------------|
| 1 | 119  | LESSON (handleLessonComplete) | `computeStars(performance.correct, performance.attempts)` | `computeStarsByTier(performance.correct, performance.attempts)` |
| 2 | 197  | SENSORY (BubbleGame onComplete, success branch) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 3 | 203  | SENSORY (BubbleGame onComplete, logEvent) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 4 | 288  | PRACTICE (PracticeMode onComplete, success branch) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |
| 5 | 294  | PRACTICE (PracticeMode onComplete, logEvent) | `computeStars(correct \|\| 1, attempts \|\| 1)` | `computeStarsByTier(correct \|\| 1, attempts \|\| 1)` |

## 3. SENSORY and PRACTICE paths — identical behaviour after removal

### SENSORY path (lines ~190-210)
```
onComplete={(success, correct, attempts) => {
    if (success) {
        const stars = computeStarsByTier(correct || 1, attempts || 1);  // was computeStars
        completeNode(node.id, stars);
    }
    logEvent('node_complete', {
        ...
        stars_earned: success ? computeStarsByTier(correct || 1, attempts || 1) : 0,  // was computeStars
        ...
    });
}}
```

The `correct || 1, attempts || 1` fallback is applied **at the call site**, not in the wrapper. Replacing `computeStars(...)` with `computeStarsByTier(...)` preserves the exact same arguments and the exact same return value.

### PRACTICE path (lines ~285-300)
```
onComplete={(success, correct, attempts) => {
    if (success) {
        const stars = computeStarsByTier(correct || 1, attempts || 1);  // was computeStars
        completeNode(node.id, stars);
    }
    logEvent('node_complete', {
        ...
        stars_earned: success ? computeStarsByTier(correct || 1, attempts || 1) : 0,  // was computeStars
        ...
    });
}}
```

Same pattern, same arguments, same result.

### LESSON path (line ~119)
```
const stars = computeStarsByTier(performance.correct, performance.attempts);  // was computeStars
completeNode(node.id, stars);
```

No `|| 1` fallback here; direct values from `performance`. Same result after replacement.

## 4. Precedent: PracticeMode already calls computeStarsByTier directly

```tsx
// PracticeMode.tsx:18, 404
import { computeStarsByTier } from '../lib/stars';
...
starsGained={computeStarsByTier(session.correct, session.attempts)}
```

`PracticeMode` — a sibling component rendered by `GameOrchestrator` — already uses `computeStarsByTier` directly with no wrapper. This proves the pattern is established and safe.

## 5. Test impact

- `GameOrchestrator.test.tsx` and `GameOrchestrator.lesson.test.tsx` do **not** reference `computeStars` at all.
- No test mocks, spies, or stubs the wrapper.
- All 73 star tests in `stars.test.ts` and `stars.tiers.test.ts` test `computeStarsByTier` directly.
- Removing the wrapper changes zero test behaviour.

## 6. Exact edit

**File:** `src/components/GameOrchestrator.tsx`

### Step 1 — Delete the wrapper (lines 78-80)

Delete these three lines:
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

The import on line 14 (`import { computeStarsByTier } from '../lib/stars'`) is already present and stays unchanged.

### Step 3 — Verify

```bash
npx tsc --noEmit          # TypeScript compiles clean
npx eslint src/components/GameOrchestrator.tsx   # ESLint clean
npx vitest run            # All tests pass
```

## 7. Risk assessment

**Risk: NONE.**

- The wrapper is a pure passthrough — no additional logic, no closure capture, no default args.
- All 5 call sites pass the same arguments with the same types.
- The return value is identical (`computeStarsByTier` return value).
- No tests reference the wrapper.
- No external consumers exist (local const, not exported).
- `PracticeMode.tsx` already uses `computeStarsByTier` directly — established pattern.
- The `correct || 1, attempts || 1` fallback lives at the call site, not in the wrapper, so it is preserved.

## 8. Verdict

**SAFE TO REMOVE.** The wrapper is dead weight that adds an indirection layer with zero behavioural value. Removing it:
- Eliminates a maintenance trap (if someone later adds logic to `computeStarsByTier`, the wrapper hides it).
- Makes `GameOrchestrator` consistent with `PracticeMode` (both call `computeStarsByTier` directly).
- Reduces cognitive load — one fewer name to understand.
- Makes grep for `computeStarsByTier` find all star computation call sites (currently 4 are hidden behind the local alias).

The edit is mechanical: delete 3 lines, rename 5 call sites, run the same verification suite that already passes.
