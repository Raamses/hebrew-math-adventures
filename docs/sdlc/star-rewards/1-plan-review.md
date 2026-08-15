# Plan Review: Dynamic Star Rewards — Devil's Advocate

**Reviewer:** reviewer-opus (GLM-5.2)  
**Date:** 2026-08-14  
**Plan:** `docs/plan-dynamic-star-rewards.md` (466 lines)  
**Branch:** `sdlc/loop-v0`  
**Verdict:** APPROVED WITH FINDINGS — plan is directionally correct but contains stale claims and missed bugs

---

## Executive Summary

The plan is well-structured, identifies the right holdout paths (MEMORY, INVADERS, internal Invaders display), and proposes reasonable adapter designs. However, a previous review (dispatch #5, `star-rewards-review-opus5.md`) blocked this card with 2 CRITICAL + 2 MAJOR findings. Upon independent verification against the actual source code on `sdlc/loop-v0`, **the previous review's 2 CRITICAL findings are both wrong**. The 2 MAJOR findings (LessonEngine re-drop, LessonModal engine reset) are valid bugs but are pre-existing defects, not plan completeness gaps.

### Scorecard

| # | Finding | Previous Review | This Review | Status |
|---|---------|-----------------|-------------|--------|
| C1 | LESSON path unreachable | CRITICAL — block | **WRONG** — LESSON path IS reachable | Resolved (was false) |
| C2 | MEMORY + INVADERS still inline | CRITICAL — block | **Valid** — genuine holdout, plan correctly identifies this | Plan covers it (Cards #1, #2) |
| M3 | LessonEngine re-drop double-counts | MAJOR | **Valid** — real bug, pre-existing | Plan scope gap — see below |
| M4 | LessonModal engine never resets | MAJOR | **Valid** — real bug, pre-existing | Plan scope gap — see below |

### New Findings (this review)

| # | Severity | Finding |
|---|----------|---------|
| N1 | Medium | Plan §2.1 claims PracticeMode/SessionSummary is "NOT Migrated ❌" — it IS already migrated (commit `197710b`). Card #3 is obsolete. |
| N2 | Low | Plan §2.1 claims `starAdapters.ts` and `GameOrchestrator.test.tsx` don't exist — the test file DOES exist (8 tests, covers effectiveMode routing). |
| N3 | Low | `stars.ts` docblock claims "All modes (PRACTICE, SENSORY, MEMORY, INVADERS, LESSON)" — MEMORY and INVADERS are not yet routed through it. Stale comment. |

---

## Detailed Verification

### C1: LESSON Path IS Reachable (Previous Review Was Wrong)

**Previous claim:** `effectiveMode` can never be `'LESSON'` because `setInternalMode` only produces `null | 'PRACTICE' | 'MEMORY' | 'INVADERS'`.

**Actual code** (`GameOrchestrator.tsx:86`):
```typescript
const effectiveMode: GameMode = internalMode 
    || (arcadeMode ? 'SENSORY' 
        : node?.type === 'SENSORY' ? 'SENSORY' 
        : node?.type === 'LESSON' ? 'LESSON' 
        : 'PRACTICE');
```

When `internalMode` is `null` (initial state, reset on node change at line 104) and `node.type === 'LESSON'`, `effectiveMode` resolves to `'LESSON'`. The `setInternalMode` calls only override mode for user-selected arcade modes (MEMORY, INVADERS) — they don't affect the LESSON fallback.

**Verification:**
- `learningPath.ts:49`: `{ id: 'n3_1', type: 'LESSON', ... }` — LESSON nodes exist in the curriculum.
- `GameOrchestrator.tsx:109-111`: `useEffect` opens the lesson modal when `effectiveMode === 'LESSON' && internalMode === null`.
- `GameOrchestrator.test.tsx:69-77`: Test #1 explicitly verifies "LESSON node → effectiveMode === LESSON → LessonModal rendered" and passes.
- `e2e/lesson-node-completion.spec.ts`: E2E test navigates to `n3_1`, clicks it, and verifies LessonModal appears. This test passes (commit `120a8fb`).

**Conclusion:** The LESSON code path is live and reachable. `handleLessonComplete` fires. The plan's claim that LESSON is "Migrated ✅" is correct. The previous review's C1 is a false positive caused by only examining `setInternalMode` call sites and missing the `node.type` fallback in the `effectiveMode` expression.

### C2: MEMORY and INVADERS Still Inline (Valid — Plan Covers This)

**Verified:** `GameOrchestrator.tsx:233` and `:256-257` still hardcode star logic:

```typescript
// MEMORY (line 233):
const stars = stats.moves <= 8 ? 3 : stats.moves <= 12 ? 2 : 1;

// INVADERS (line 256-257):
const stars = stats.victory
    ? (stats.lives >= 2 ? 3 : stats.lives === 1 ? 2 : 1)
    : 0;
```

`MathInvadersGame.tsx:112-113` also has its own internal star display:
```typescript
const stars = isVictory
    ? (state.lives >= 2 ? 3 : state.lives === 1 ? 2 : 1)
    : 0;
```

The plan correctly identifies all three of these holdout paths and proposes adapters. Cards #1 and #2 address them. **This finding is valid and the plan covers it.**

### N1: PracticeMode Already Migrated (Plan Stale)

The plan §2.2 claims:
> `src/components/PracticeMode.tsx` → `SessionSummary` — Hardcoded accuracy thresholds — `session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1`

**Actual code** (`PracticeMode.tsx:404`):
```typescript
starsGained={computeStarsByTier(session.correct, session.attempts)}
```

This was migrated in commit `197710b` ("feat: Memory Duel fixes + Parent Analytics Dashboard + Sound Garden + cut-features council reviews"). The import is at line 18: `import { computeStarsByTier } from '../lib/stars';`

**Impact:** Card #3 ("PracticeMode: Replace hardcoded SessionSummary stars with `computeStarsByTier`") is already done. It should be removed from the child card breakdown. The plan's §8.9 Verification Matrix still marks SessionSummary as "❌ Needs Card #3" — this is stale.

### M3: LessonEngine Re-Drop Double-Counts (Valid — Pre-Existing Bug)

**Verified:** `LessonEngine.ts:81-109` — `onItemDropped` has no tracking of which target an item currently occupies. It only checks `target.currentCount < target.capacity`. Re-dropping the same item into the same target increments `correctCount` again (if under capacity) or records a `mistake` (if full).

**Exploit path:** With `lesson1_multiplication.ts` (6 apples, 3 baskets of capacity 2): drag `a1` into `b1` 6 times → first 2 drops succeed (`correctCount += 2`), next 4 record mistakes. Not as exploitable as the previous review claimed (capacity limits it), but the "tidying up" scenario is real: nudging an already-placed item re-fires `onDragEnd`, `elementFromPoint` hits the same basket, and records a false mistake.

**Direction:** Track `item.placedIn` on each item. A re-drop into the same target is a no-op; a move to a different target decrements the old target's count and does not re-award `correct`.

**Scope decision:** This is a pre-existing bug in LessonEngine, not introduced by the star rewards plan. It affects the accuracy of `getPerformance()` which feeds `computeStarsByTier`. It should be fixed as a prerequisite or included in the plan scope, because the tier-based star computation inherits whatever bugs exist in the performance tracking.

### M4: LessonModal Engine Never Resets (Valid — Pre-Existing Bug)

**Verified:** `LessonModal.tsx:20`:
```typescript
const [engine] = useState(() => new LessonEngine(lesson));
```

The engine is created once on mount. `if (!isOpen) return null` at line 31 does not unmount the component — it returns null but hooks have already run. When the modal is reopened (isOpen goes true again), the same engine instance is reused with accumulated `correctCount`/`mistakeCount` from the previous session.

**Direction:** Either key the modal (`<LessonModal key={lesson.id} …>`) and conditionally mount/unmount it in GameOrchestrator, or add an `engine.reset()` method called on open.

**Scope decision:** Same as M3 — pre-existing bug that becomes relevant once the LESSON path is exercised. Should be fixed alongside or before the star rewards work.

---

## Plan Assessment

### What the Plan Gets Right ✅

1. **Correct identification of holdout paths** — MEMORY and INVADERS are genuinely still hardcoded.
2. **Sound adapter design** — `memoryDuelToPerformance` and the simpler-than-expected Invaders approach (using already-tracked `sessionCorrectRef`/`sessionAttemptsRef`) are both correct.
3. **Deep audit addendum (§8)** — The second-pass findings about Invaders tracking already existing, Memory field name correction (`matchedCount` not `matches`), and Zen mode being already handled are all accurate and valuable.
4. **Child card decomposition** — The 4-card split is reasonable and parallelizable (though Card #3 is now obsolete).
5. **Risk assessment** — Reasonable, though it understates the LessonEngine bugs.

### What the Plan Gets Wrong ❌

1. **§2.2 claims PracticeMode/SessionSummary is not migrated** — it IS migrated. Card #3 is obsolete.
2. **§8.9 Verification Matrix marks SessionSummary as "❌ Needs Card #3"** — stale, should be ✅.
3. **`stars.ts` docblock** claims all 5 modes delegate to it — MEMORY and INVADERS don't yet. Should be corrected after migration or annotated as "target state" vs "current state".
4. **Missing: LessonEngine re-drop bug** — The plan says LESSON is "Migrated ✅" but doesn't acknowledge that the performance tracking feeding the tier computation has a re-drop double-count bug. This means star tiers for LESSON mode are currently inaccurate.
5. **Missing: LessonModal engine reset bug** — The plan doesn't mention that the engine survives lesson abandonment. A child who re-opens a lesson after making mistakes inherits the previous mistake count.

### What the Plan Misses 🔍

1. **No mention of `GameOrchestrator.test.tsx`** — The plan (§3.7) proposes creating this file, but it already exists with 8 tests covering effectiveMode routing. The plan should reference and extend it, not create it new.
2. **`ProgressOverview.tsx:10` hardcoded `TOTAL_POSSIBLE_STARS = 150`** — Noted in §8.6 but deferred. This is correct — it's out of scope but should be tracked.
3. **No `tierToLabel` consumers identified** — Card #4 proposes adding `tierToLabel` but doesn't specify which UI components will consume it. `SessionSummary` is the natural consumer, but it currently only shows stars, not tier labels.
4. **`correct || 1, attempts || 1` fallback pattern** — `GameOrchestrator.tsx:197,203,288,294` uses this pattern which coerces zero values to 1. If a mode ever reports `correct=0, attempts=0` (e.g. a buggy callback), this becomes `computeStarsByTier(1, 1)` → PERFECT (3 stars) — a false perfect. The plan doesn't address this.

---

## Revised Child Card Breakdown

Based on the verified state:

| # | Title | Status | Effort |
|---|-------|--------|--------|
| 1 | **Memory Duel: Migrate to tier-based stars** | Needed — create adapter, update GameOrchestrator MEMORY branch | Small |
| 2 | **Math Invaders: Pass tracked counts and migrate to tier-based stars** | Needed — extend onComplete, replace hardcoded logic in 2 places | Small |
| ~~3~~ | ~~PracticeMode: Replace hardcoded SessionSummary stars~~ | **Already done** (commit `197710b`) | ~~Trivial~~ |
| 4 | **Add `tierToLabel` + remove `computeStars` wrapper** | Needed — extend stars.ts, add tests, refactor call sites | Small |
| 5 (NEW) | **Fix LessonEngine re-drop tracking + LessonModal reset** | Needed — track `item.placedIn`, add `engine.reset()` or key-based remount | Small-Medium |

Card #5 is a prerequisite for accurate LESSON star computation. It can run in parallel with Cards #1, #2, #4.

---

## Final Verdict

**APPROVED WITH FINDINGS** — The plan is sound and can proceed to implementation. The previous block was based on incorrect analysis (C1 false positive). The real work is Cards #1, #2, #4, plus a new Card #5 for the LessonEngine/LessonModal bugs.

### Acceptance Criteria (Revised)

1. MEMORY routes through `computeStarsByTier` via `memoryDuelToPerformance` adapter.
2. INVADERS routes through `computeStarsByTier` using existing `sessionCorrectRef`/`sessionAttemptsRef`.
3. ~~SessionSummary uses `computeStarsByTier`~~ — already done ✅.
4. `tierToLabel` exists and is consumed by at least one UI component.
5. `computeStars` wrapper removed; all call sites use `computeStarsByTier` directly.
6. No hardcoded star thresholds in `GameOrchestrator.tsx`, `MathInvadersGame.tsx`.
7. LessonEngine tracks item placement to prevent re-drop double-counting.
8. LessonModal engine resets between lesson sessions.
9. All existing tests pass; new tests cover adapters, label, and the two bug fixes.
10. `stars.ts` docblock accurately reflects which modes delegate to it.

---

*Review performed by reviewer-opus (GLM-5.2), reading source code directly from `sdlc/loop-v0` branch. Read-only: no files edited, no commits made.*
