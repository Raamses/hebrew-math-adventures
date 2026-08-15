# Plan: Dynamic Star Rewards — Full Implementation

**Card:** b0a9d350-b4af-4993-b19f-ad2296415b12  
**Branch:** `sdlc/loop-v0` (never main, never push)  
**Date:** 2026-08-07  

---

## 1. Current State Assessment

### What's Already Done (commits `a3e664c`, `9c3f93a`)

| Component | Status | Details |
|---|---|---|
| `src/lib/stars.ts` | ✅ Done | Single source of truth: `computeStarsByTier`, `getTier`, `tierToStars`. Pass=1, Good=2, Perfect=3. |
| `src/lib/__tests__/stars.test.ts` | ✅ Done | 11 tests — core tiers, boundaries, edge cases. |
| `src/lib/__tests__/stars.tiers.test.ts` | ✅ Done | 62 tests — exhaustive boundary values, null handling, scale invariance, round-trip consistency, negative inputs. |
| `LessonEngine.ts` | ✅ Done | Tracks `correctCount`/`mistakeCount`, exposes `recordMistake()` and `getPerformance()`. |
| `LessonModal.tsx` | ✅ Done | Calls `onComplete(engine.getPerformance())` with `{ correct, attempts }`. |
| `GameOrchestrator.tsx` — LESSON path | ✅ Done | `handleLessonComplete` uses `computeStarsByTier(performance.correct, performance.attempts)`. |
| `GameOrchestrator.tsx` — SENSORY path | ✅ Done | `onComplete` callback uses `computeStarsByTier(correct, attempts)`. |
| `GameOrchestrator.tsx` — PRACTICE path | ✅ Done | `onComplete` callback uses `computeStarsByTier(correct, attempts)`. |
| Vault ADR | ✅ Done | `vault/decisions/2026-08-dynamic-star-tiers.md` documents the decision. |

### What Still Has Hardcoded Star Logic (4 sites)

| # | File | Line | Current Logic | Game Mode | Problem |
|---|---|---|---|---|---|
| 1 | `PracticeMode.tsx` | 406 | `session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1` | PRACTICE (SessionSummary display) | Duplicate inline logic — doesn't use `computeStarsByTier`. Uses absolute correct thresholds (7/4) instead of mistake-based tiers. Mismatches orchestrator's star computation. |
| 2 | `GameOrchestrator.tsx` | 226 | `stats.moves <= 8 ? 3 : stats.moves <= 12 ? 2 : 1` | MEMORY | Hardcoded move-count thresholds, not mistake-based. Doesn't use `computeStarsByTier`. |
| 3 | `GameOrchestrator.tsx` | 249 | `stats.lives >= 2 ? 3 : stats.lives === 1 ? 2 : 1` | INVADERS | Lives-based, not mistake-based. Doesn't use `computeStarsByTier`. |
| 4 | `MathInvadersGame.tsx` | 122 | `state.lives >= 2 ? 3 : state.lives === 1 ? 2 : 1` | INVADERS (in-game display) | Duplicate of #3 — computes stars internally for end-screen display instead of receiving from orchestrator. |

### Architecture Issue: Dual Star Computation Paths

Currently there are **two separate concerns** conflated in different places:

1. **Node-completion stars** (persisted to `ProgressContext.completeNode`) — computed in `GameOrchestrator.tsx` for each mode.
2. **Session-summary display stars** (shown to user in UI) — computed independently in `PracticeMode.tsx` and `MathInvadersGame.tsx`.

These can diverge: `PracticeMode.tsx` uses `session.correct > 7` while `GameOrchestrator.tsx` uses `computeStarsByTier(correct, attempts)` — they produce different results for the same session.

---

## 2. Implementation Plan

### Phase 1: Unify PRACTICE mode star display (Site #1)

**File:** `src/components/PracticeMode.tsx`  
**Line:** 406  

**Current:**
```tsx
starsGained={session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1}
```

**Change to:**
```tsx
starsGained={computeStarsByTier(session.correct, session.attempts)}
```

**Why:** `GameOrchestrator.tsx` already computes `computeStarsByTier(correct, attempts)` for the PRACTICE `onComplete` callback (line 281). The `SessionSummary` display in `PracticeMode.tsx` should show the **same** star count the orchestrator will report. Currently they can disagree (e.g., 10 correct / 10 attempts → orchestrator: 3 stars (0 mistakes, PERFECT), display: 3 stars (correct > 7); but 8 correct / 10 attempts → orchestrator: 1 star (PASS, 4+ mistakes), display: 3 stars (correct > 7) — **major mismatch**).

**Files to touch:**
- `src/components/PracticeMode.tsx` — import `computeStarsByTier`, replace inline logic.

**Tests:**
- No new test file needed. The `stars.ts` helper is already exhaustively tested. 
- Optional: Add a vitest rendering test for `PracticeMode` verifying `starsGained` prop passed to `SessionSummary` matches `computeStarsByTier` for sample sessions. This is a UI integration test, not a unit test of the star logic itself.

### Phase 2: Unify MEMORY mode star computation (Site #2)

**File:** `src/components/GameOrchestrator.tsx`  
**Line:** 226  

**Current:**
```tsx
const stars = stats.moves <= 8 ? 3 : stats.moves <= 12 ? 2 : 1;
```

**Change to:**
```tsx
const stars = computeStarsByTier(stats.matchedCount, stats.moves);
```

**Rationale:** Memory Duel reports `{ time, moves, matchedCount }`. The natural mapping to the star-tier model is:
- `correct` = `matchedCount` (successful matches = correct answers)
- `attempts` = `moves` (total moves includes both successful and failed attempts)
- `mistakes` = `moves - matchedCount`

This gives:
- 0–1 mistakes (moves ≤ matchedCount + 1) → PERFECT → 3 stars
- 2–3 mistakes → GOOD → 2 stars  
- 4+ mistakes → PASS → 1 star

The old thresholds (≤8 moves = 3, ≤12 = 2) were absolute and didn't scale with pair count. With 6 pairs (12 cards), a perfect game = 6 moves. ≤8 moves = ≤2 mistakes → PERFECT (3 stars), which roughly matches the old ≤8 threshold. ≤12 moves = ≤6 mistakes → that's actually PASS (1 star) under the tier model, vs. 2 stars under the old logic. This is **intentional**: the tier model is stricter and more consistent.

**Files to touch:**
- `src/components/GameOrchestrator.tsx` — replace inline logic with `computeStarsByTier`.

**Tests:**
- No new test file. The `MemoryDuelGame.onComplete` stats shape `{ time, moves, matchedCount }` is already known. Verify the mapping is correct.
- Optional: Add a test in `stars.tiers.test.ts` that specifically validates the Memory Duel mapping (matchedCount as correct, moves as attempts).

### Phase 3: Unify INVADERS mode star computation (Sites #3 & #4)

**Files:**  
- `src/components/GameOrchestrator.tsx` (line 249) — node completion stars
- `src/components/games/MathInvadersGame.tsx` (line 122) — in-game end-screen display

**Current (GameOrchestrator):**
```tsx
const stars = stats.victory
    ? (stats.lives >= 2 ? 3 : stats.lives === 1 ? 2 : 1)
    : 0;
```

**Current (MathInvadersGame):**
```tsx
const stars = isVictory
    ? (state.lives >= 2 ? 3 : state.lives === 1 ? 2 : 1)
    : 0;
```

**Change approach:** Invaders doesn't report `correct`/`attempts` in the traditional sense. The `onComplete` callback provides `{ score, lives, victory }`. We need to either:

**Option A (recommended): Extend `onComplete` stats to include `correct` and `attempts`.**

The Invaders engine already tracks correct answers (hits) and total attempts (shots or enemies encountered). Extend the `onComplete` payload to include these fields, then use `computeStarsByTier`:

```tsx
// In MathInvadersGame.tsx onComplete call:
onComplete({ score, lives, victory, correct: state.correctHits, attempts: state.totalShots });

// In GameOrchestrator.tsx:
const stars = stats.victory
    ? computeStarsByTier(stats.correct, stats.attempts)
    : 0;
```

**Option B (simpler): Map lives to a pseudo-attempt model.**

Start with 3 lives. Each life lost = 1 mistake. On victory:
- `correct` = a fixed constant (e.g., `state.score` or number of waves cleared)
- `attempts` = `correct + livesLost` where `livesLost = 3 - state.lives`

This maps to:
- 0–1 lives lost → PERFECT → 3 stars (matches old: lives ≥ 2)
- 2 lives lost → GOOD → 2 stars (matches old: lives === 1)
- 3 lives lost → would be PASS → 1 star, but player lost (victory=false) → 0 stars

**Decision: Option A** is cleaner and aligns with the ADR's "mistakes = attempts - correct" model. It requires extending the Invaders engine to track `correctHits` and `totalShots` and expose them in the `onComplete` callback.

**Files to touch:**
- `src/components/games/MathInvadersGame.tsx` — track and report `correct`/`attempts` in `onComplete`; replace internal star display with `computeStarsByTier`.
- `src/components/GameOrchestrator.tsx` — use `computeStarsByTier(stats.correct, stats.attempts)` for INVADERS path.
- Potentially: `src/engines/invader/useInvaderEngine.ts` or `src/engines/invader/types.ts` — if the engine doesn't already track these, add counters.

**Tests:**
- Verify the Invaders `onComplete` payload includes `correct` and `attempts`.
- Test that `computeStarsByTier` with Invaders stats produces correct tiers.

### Phase 4: Remove duplicate star computation in MathInvadersGame end-screen

**File:** `src/components/games/MathInvadersGame.tsx` (line 122)

The end-screen displays stars computed internally. After Phase 3, this should use the same `computeStarsByTier` call. Since the component has access to `state.correctHits` and `state.totalShots` (or whatever fields we add), it can call `computeStarsByTier` directly:

```tsx
const stars = isVictory ? computeStarsByTier(state.correctHits, state.totalShots) : 0;
```

This eliminates the duplicate logic and ensures the end-screen shows the same stars the orchestrator will persist.

### Phase 5: Update SessionSummary to receive computed stars

**File:** `src/components/SessionSummary.tsx`

Currently `SessionSummary` receives `starsGained` as a prop. The caller (`PracticeMode.tsx`) computes it. After Phase 1, `PracticeMode.tsx` will use `computeStarsByTier`. 

No change needed to `SessionSummary.tsx` itself — it just displays whatever `starsGained` it receives. But we should verify the prop is always populated correctly.

For modes that don't go through `PracticeMode` (SENSORY, MEMORY, INVADERS), the `SessionSummary` is either not shown (SENSORY has its own end screen via `BubbleGameContainer`) or uses a different summary component (INVADERS has its own end screen). This is fine — the goal is consistency of computation, not UI homogenization.

### Phase 6: Update vault documentation

**Files:**
- `vault/architecture/feature-inventory.md` — update the "Dynamic Star Rewards (Tier)" row from "✅ (was hardcoded 3 for lessons)" to "✅ All 5 modes (LESSON/PRACTICE/SENSORY/MEMORY/INVADERS) unified via `computeStarsByTier`."
- `vault/decisions/2026-08-dynamic-star-tiers.md` — add a "Follow-up" section noting the full rollout across all modes.

---

## 3. Summary of All Files to Touch

| # | File | Change | Phase |
|---|---|---|---|
| 1 | `src/components/PracticeMode.tsx` | Import `computeStarsByTier`, replace inline star logic at line 406 | 1 |
| 2 | `src/components/GameOrchestrator.tsx` | Replace MEMORY inline logic (line 226) with `computeStarsByTier` | 2 |
| 3 | `src/components/GameOrchestrator.tsx` | Replace INVADERS inline logic (line 249) with `computeStarsByTier` | 3 |
| 4 | `src/components/games/MathInvadersGame.tsx` | Track `correct`/`attempts`, use `computeStarsByTier` for display | 3+4 |
| 5 | `src/engines/invader/useInvaderEngine.ts` (or types) | Add `correctHits`/`totalShots` tracking if not present | 3 |
| 6 | `vault/architecture/feature-inventory.md` | Update status note | 6 |
| 7 | `vault/decisions/2026-08-dynamic-star-tiers.md` | Add follow-up section | 6 |

### Test files to add/update:

| # | File | Content |
|---|---|---|
| 1 | `src/lib/__tests__/stars.tiers.test.ts` (extend) | Add Memory Duel mapping tests: `matchedCount` as correct, `moves` as attempts |
| 2 | `src/components/__tests__/PracticeMode.stars.test.tsx` (new, optional) | Verify `SessionSummary` receives correct `starsGained` from `computeStarsByTier` for sample sessions |

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| MEMORY star thresholds change (stricter) | High | Low — players get fewer stars for same performance | Expected behavior: tiers are mistake-based, not absolute-move-based. Old logic was too generous. |
| INVADERS engine doesn't track correct/attempts | Medium | Medium — need to add tracking | Low complexity: add two counters in the engine state. |
| PracticeMode display/orchestrator mismatch was already present | Was already broken | Fixed by Phase 1 | This is a bug fix, not a regression. |
| SessionSummary receives 0 stars for failed sessions | Already the case | None | No change — failures still report 0 stars. |

---

## 5. Suggested Child Card Decomposition

This plan decomposes into **3 child cards**:

### Card A: Unify PRACTICE + MEMORY star computation (Phases 1-2)
- Replace inline logic in `PracticeMode.tsx` line 406
- Replace inline logic in `GameOrchestrator.tsx` MEMORY path line 226
- Both use `computeStarsByTier` from `src/lib/stars.ts`
- Add mapping tests for Memory Duel stats shape
- **Estimated effort:** Small — 2 files, 1 import each, plus tests

### Card B: Unify INVADERS star computation (Phases 3-5)
- Extend `MathInvadersGame.onComplete` to include `correct`/`attempts`
- Add tracking in invader engine if needed
- Replace inline logic in `GameOrchestrator.tsx` INVADERS path
- Replace inline display logic in `MathInvadersGame.tsx`
- **Estimated effort:** Medium — engine changes + 2 component updates

### Card C: Documentation update (Phase 6)
- Update `vault/architecture/feature-inventory.md`
- Update `vault/decisions/2026-08-dynamic-star-tiers.md`
- **Estimated effort:** Trivial — 2 markdown files

---

## 6. Verification Plan

After implementation:
1. Run full test suite: `npx vitest run` — all existing 365+ tests must pass.
2. Run `npx tsc --noEmit` — no type errors.
3. Manual verification (if possible): Play each mode and confirm:
   - PRACTICE: SessionSummary stars match accuracy tier.
   - SENSORY: Complete callback stars match accuracy tier.
   - MEMORY: Complete callback stars match moves-based tier.
   - INVADERS: End-screen stars match accuracy tier, not just lives.
   - LESSON: Already verified in commit `a3e664c`.

---

## 7. Key Insight: The "Two Concerns" Pattern

The codebase has a recurring pattern where **node-completion stars** (persisted to ProgressContext) and **display stars** (shown in UI) are computed independently. This plan unifies both to use `computeStarsByTier`, but a future architectural improvement could be to:

1. Compute stars **once** in the game mode's `onComplete` handler.
2. Pass the computed stars **into** the UI (SessionSummary/end-screen) for display.
3. Have `GameOrchestrator` receive already-computed stars instead of recomputing.

This would eliminate the dual-computation pattern entirely. However, it's a larger refactor (changing callback signatures) and is out of scope for this card. The current plan achieves consistency by having both paths call the same pure function.
