# Plan: Dynamic Star Rewards — Tier-Based (Pass/Good/Perfect)

**Card:** b0a9d350-b4af-4993-b19f-ad2296415b12  
**Branch:** sdlc/loop-v0  
**Author:** planner2 (GLM-5.2)  
**Date:** 2026-08-08  

---

## 1. Executive Summary

The codebase already has a solid foundation: `src/lib/stars.ts` implements a centralized `computeStarsByTier()` with `STAR_CONFIG` in `worldConfig.ts`, and `GameOrchestrator.tsx` already routes PRACTICE, SENSORY, and LESSON modes through it. **The remaining work is to migrate the three holdout paths** (MEMORY, INVADERS, and `SessionSummary`) that still hardcode star logic, plus add tests and a `StarTierLabel` UI component.

---

## 2. Current State Audit

### 2.1 What's Already Done ✅

| File | Status |
|------|--------|
| `src/lib/stars.ts` | **Complete.** `getTier()`, `tierToStars()`, `computeStarsByTier()` — single source of truth. |
| `src/lib/worldConfig.ts` | **Complete.** `STAR_CONFIG.PERFECT_MAX_MISTAKES=1`, `GOOD_MAX_MISTAKES=3`. |
| `src/lib/__tests__/stars.test.ts` | **Complete.** 11 tests covering basic tiers + edge cases. |
| `src/lib/__tests__/stars.tiers.test.ts` | **Complete.** 62 exhaustive boundary, null, scale-invariance, and round-trip tests. |
| `src/components/GameOrchestrator.tsx` (PRACTICE) | **Migrated.** Calls `computeStars()` → `computeStarsByTier()`. |
| `src/components/GameOrchestrator.tsx` (SENSORY) | **Migrated.** Same path via `computeStars()`. |
| `src/components/GameOrchestrator.tsx` (LESSON) | **Migrated.** `handleLessonComplete` calls `computeStars(performance.correct, performance.attempts)`. |
| `src/engines/LessonEngine.ts` | **Migrated.** `recordMistake()` + `getPerformance()` feed the tier system. |

### 2.2 What's NOT Migrated ❌

| File | Problem | Current Logic |
|------|---------|---------------|
| `src/components/GameOrchestrator.tsx` (MEMORY) | Hardcoded move-count thresholds | `stats.moves <= 8 ? 3 : stats.moves <= 12 ? 2 : 1` |
| `src/components/GameOrchestrator.tsx` (INVADERS) | Hardcoded lives-based thresholds | `stats.lives >= 2 ? 3 : stats.lives === 1 ? 2 : 1` |
| `src/components/games/MathInvadersGame.tsx` (internal UI) | Duplicated lives-based star logic | Same `lives >= 2 ? 3 : lives === 1 ? 2 : 1` for end-screen display |
| `src/components/PracticeMode.tsx` → `SessionSummary` | Hardcoded accuracy thresholds | `session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1` |

### 2.3 Architecture Gaps

1. **No `StarTierLabel` export** — there's no human-readable label (e.g. "Perfect!") for tiers. UI code can't display the tier name.
2. **No tier → coins/reward mapping** — if the card asks for future bonus coins per tier, there's no infrastructure.
3. **`SessionSummary` receives `starsGained` from parent but PracticeMode hardcodes it** instead of using `computeStarsByTier`.
4. **MEMORY and INVADERS have no `PerformanceResult` adapter** — they track moves/lives, not correct/attempts. Need mode-specific adapters.

---

## 3. Implementation Plan

### Phase 1: Mode-Specific Adapters (3 child cards recommended)

The three remaining modes track performance differently. Each needs an **adapter function** that converts mode-specific metrics into a `PerformanceResult` for `computeStarsByTier()`.

#### 3.1 Memory Duel Adapter

**Current:** `stats.moves <= 8 ? 3 : stats.moves <= 12 ? 2 : 1`  
**Problem:** Memory game has no "correct/attempts" — it has moves and matches.  

**Adapter design:**
```typescript
// src/lib/starAdapters.ts (NEW FILE)
import type { PerformanceResult } from './stars';

/**
 * Memory Duel: Convert moves to performance.
 * A perfect memory game (no wrong flips) maps to 0 mistakes.
 * Each wrong flip pair = 1 mistake.
 */
export function memoryDuelToPerformance(stats: {
    moves: number;
    matches: number;
}): PerformanceResult {
    // matches = number of successful pairs found
    // In a perfect game, moves = matches (every flip reveals a pair)
    // Each extra move beyond matches = a mistake
    const correct = stats.matches;
    const mistakes = Math.max(0, stats.moves - stats.matches);
    return { correct, attempts: correct + mistakes };
}
```

**Files to touch:**
- `src/lib/starAdapters.ts` (NEW)
- `src/components/GameOrchestrator.tsx` — MEMORY branch (replace hardcoded logic)
- `src/lib/__tests__/starAdapters.test.ts` (NEW)

**Config addition in `worldConfig.ts`:**
```typescript
export const MEMORY_STAR_CONFIG = {
    PERFECT_MAX_EXTRA_MOVES: 1,  // ≤1 extra move → PERFECT (3 stars)
    GOOD_MAX_EXTRA_MOVES: 3,     // ≤3 extra moves → GOOD (2 stars)
} as const;
```
*Alternative:* Keep using the generic `STAR_CONFIG` thresholds via the adapter. This is simpler and avoids mode-specific config proliferation. **Recommend: use adapter + generic thresholds.**

#### 3.2 Math Invaders Adapter

**Current:** `stats.lives >= 2 ? 3 : stats.lives === 1 ? 2 : 1`  
**Problem:** Invaders tracks lives, not correct/attempts.  

**Adapter design:**
```typescript
/**
 * Math Invaders: Convert lives/score to performance.
 * Lives lost = mistakes. Start with INVADER_CONFIG.INITIAL_LIVES (3).
 * correct = problems solved (if tracked) or derived from score.
 * If only lives are available, map directly:
 *   lives=3 (no lives lost) → 0 mistakes → PERFECT
 *   lives=2 → 1 mistake → PERFECT (≤1)
 *   lives=1 → 2 mistakes → GOOD (≤3)
 *   lives=0 → 3 mistakes → GOOD (≤3) but victory=false → 0 stars
 */
export function invadersToPerformance(stats: {
    lives: number;
    victory: boolean;
    initialLives?: number;
}): PerformanceResult {
    const initial = stats.initialLives ?? 3;
    const livesLost = initial - stats.lives;
    // We need "correct" — use score/100 as a proxy or track real correct count.
    // Better: require invaders engine to track correct answers.
    const correct = Math.max(1, initial - livesLost); // At least 1 correct if victory
    return { correct, attempts: correct + livesLost };
}
```

**Better approach:** Modify `useInvaderEngine` to track `correctCount` and `attemptCount` like the practice session does, then pass those directly to `computeStarsByTier()`.

**Files to touch:**
- `src/engines/invader/types.ts` — add `correctCount`, `attemptCount` to stats
- `src/engines/invader/useInvaderEngine.ts` — track correct/attempts on each answer
- `src/components/games/MathInvadersGame.tsx` — pass real counts, replace hardcoded star logic
- `src/components/GameOrchestrator.tsx` — INVADERS branch, use `computeStarsByTier`
- `src/lib/starAdapters.ts` (if needed, or pass directly)
- `src/lib/__tests__/starAdapters.test.ts` or `src/engines/invader/__tests__/` (NEW tests)

#### 3.3 SessionSummary / PracticeMode Fix

**Current in PracticeMode.tsx line 406:**
```tsx
starsGained={session.correct > 7 ? 3 : session.correct > 4 ? 2 : 1}
```

**Problem:** Uses absolute `correct` count, not mistake ratio. A 10/10 session gets 3 stars (good), but a 7/10 session also gets 3 stars (bad — 3 mistakes = GOOD tier, not PERFECT).

**Fix:**
```tsx
starsGained={computeStarsByTier(session.correct, session.attempts)}
```

**Files to touch:**
- `src/components/PracticeMode.tsx` — import `computeStarsByTier`, replace hardcoded logic
- `src/__tests__/PracticeMode.test.tsx` — add test asserting correct tier-based stars

### Phase 2: Shared Infrastructure

#### 3.4 StarTierLabel export

Add a `tierToLabel()` function to `stars.ts` for UI display:

```typescript
export function tierToLabel(tier: StarTier): string {
    switch (tier) {
        case 'PERFECT': return 'Perfect!';
        case 'GOOD':    return 'Good!';
        case 'PASS':    return 'Pass';
    }
}
```

*Note: Should be i18n-aware in the future. For now, return English; the i18n keys can be added later as `tier.perfect`, `tier.good`, `tier.pass`.*

**Files to touch:**
- `src/lib/stars.ts` — add `tierToLabel()`
- `src/lib/__tests__/stars.test.ts` — add label tests
- `src/lib/__tests__/stars.tiers.test.ts` — add exhaustive label tests

#### 3.5 Optional: tierToCoins() for future reward expansion

```typescript
export function tierToCoins(tier: StarTier): number {
    switch (tier) {
        case 'PERFECT': return 30;
        case 'GOOD':    return 20;
        case 'PASS':    return 10;
    }
}
```

**Files to touch:**
- `src/lib/stars.ts` — add `tierToCoins()`
- `src/lib/worldConfig.ts` — add `STAR_CONFIG.COIN_REWARDS`
- `src/lib/__tests__/stars.test.ts` — add coin tests

*Decision: Only implement if the card scope includes coin rewards. The card title says "star rewards" so this is optional/future.*

### Phase 3: Tests

#### 3.6 Unit Tests for Adapters

- `src/lib/__tests__/starAdapters.test.ts` — test `memoryDuelToPerformance()` and `invadersToPerformance()` (if adapter approach used) with boundary values matching the existing `stars.tiers.test.ts` style.
- Ensure every adapter maps boundary values to the correct tier.

#### 3.7 Integration Tests for GameOrchestrator

- `src/components/__tests__/GameOrchestrator.test.tsx` (NEW or extend) — verify each mode path calls `computeStarsByTier` and passes correct `correct`/`attempts` values.

#### 3.8 PracticeMode Star Test

- Add a test in `src/__tests__/PracticeMode.test.tsx` that asserts `SessionSummary` receives `starsGained` computed via `computeStarsByTier`, not the old hardcoded thresholds.

### Phase 4: Cleanup & Polish

#### 3.9 Remove `computeStars` wrapper in GameOrchestrator

The inline `computeStars` function in `GameOrchestrator.tsx`:
```typescript
const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);
```
is a trivial passthrough. Remove it and call `computeStarsByTier` directly to reduce indirection.

**Files to touch:**
- `src/components/GameOrchestrator.tsx` — remove wrapper, update all call sites

#### 3.10 Consolidate Invaders star display

`MathInvadersGame.tsx` has its own internal star display (`stars` variable at line 122). After migration, this should use `computeStarsByTier` with the real `correct`/`attempts` counts from the engine (or the adapter), ensuring the end-screen and `GameOrchestrator.onComplete` show the same star count.

---

## 4. Child Card Breakdown

| # | Title | Scope | Dependencies |
|---|-------|-------|-------------|
| 1 | **Memory Duel: Migrate to tier-based stars** | Create `memoryDuelToPerformance` adapter, update GameOrchestrator MEMORY branch, add tests | None |
| 2 | **Math Invaders: Track correct/attempts and migrate to tier-based stars** | Extend invader engine to track counts, update MathInvadersGame + GameOrchestrator, add tests | None |
| 3 | **PracticeMode: Replace hardcoded SessionSummary stars with `computeStarsByTier`** | Update PracticeMode, add test | None |
| 4 | **Add `tierToLabel` and optional `tierToCoins` to stars.ts** | Extend stars.ts, add tests | None |

Cards 1–4 are independent and can be executed in parallel.  
If a single-card approach is preferred, they can be done in sequence within one card.

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Memory adapter thresholds don't feel right (8 moves = 3 stars may be too strict with the generic STAR_CONFIG) | Medium | Low | Use adapter to map to correct/attempts; the generic thresholds will work naturally. If not, add `MEMORY_STAR_CONFIG` override. |
| Invaders engine refactor to track correct/attempts is larger than expected | Medium | Medium | Fallback: use `invadersToPerformance(lives)` adapter without real correct count. Acceptable for v1. |
| `SessionSummary` already receives `starsGained` — changing the computation may alter UX for existing players | Low | Low | Stars are per-session display only; `completeNode` already uses `Math.max(current.stars, newStars)`, so best-score-is-kept semantics are preserved. |
| i18n: `tierToLabel` returns English only | Low | Low | Mark as TODO for i18n team; keys `tier.perfect` etc. are trivial to add. |

---

## 6. File Manifest

### New Files
| File | Purpose |
|------|---------|
| `src/lib/starAdapters.ts` | Mode-specific adapters (Memory, Invaders) → `PerformanceResult` |
| `src/lib/__tests__/starAdapters.test.ts` | Unit tests for adapters |
| `src/components/__tests__/GameOrchestrator.test.tsx` | Integration test for star routing per mode |

### Modified Files
| File | Change |
|------|--------|
| `src/lib/stars.ts` | Add `tierToLabel()`, optionally `tierToCoins()` |
| `src/lib/worldConfig.ts` | Optionally add `STAR_CONFIG.COIN_REWARDS` |
| `src/lib/__tests__/stars.test.ts` | Add label/coin tests |
| `src/lib/__tests__/stars.tiers.test.ts` | Add label/coin tier tests |
| `src/components/GameOrchestrator.tsx` | Replace MEMORY + INVADERS hardcoded star logic with `computeStarsByTier` + adapters; remove `computeStars` wrapper |
| `src/components/PracticeMode.tsx` | Replace hardcoded `starsGained` with `computeStarsByTier` |
| `src/components/games/MathInvadersGame.tsx` | Replace internal star logic with `computeStarsByTier` |
| `src/engines/invader/types.ts` | Add `correctCount`, `attemptCount` to invader stats (if real tracking chosen) |
| `src/engines/invader/useInvaderEngine.ts` | Track correct/attempts (if real tracking chosen) |
| `src/__tests__/PracticeMode.test.tsx` | Add test for tier-based `starsGained` |

### Untouched Files (Already Done)
| File | Status |
|------|--------|
| `src/lib/stars.ts` (core functions) | ✅ `getTier`, `tierToStars`, `computeStarsByTier` |
| `src/engines/LessonEngine.ts` | ✅ `recordMistake()`, `getPerformance()` |
| `src/components/lessons/LessonModal.tsx` | ✅ Passes `engine.getPerformance()` to `onComplete` |
| `src/context/ProgressContext.tsx` | ✅ `completeNode` stores stars, keeps best |

---

## 7. Acceptance Criteria

1. **Every game mode** (PRACTICE, SENSORY, MEMORY, INVADERS, LESSON) routes star computation through `computeStarsByTier()`.
2. **No hardcoded star thresholds** remain in `GameOrchestrator.tsx`, `PracticeMode.tsx`, or `MathInvadersGame.tsx`.
3. **`SessionSummary` receives `starsGained`** computed from `computeStarsByTier(session.correct, session.attempts)`.
4. **All existing tests pass** with no regressions.
5. **New tests** cover: memory adapter boundaries, invaders adapter (or real counts), PracticeMode `starsGained` computation, `tierToLabel` mapping.
6. **`STAR_CONFIG` in `worldConfig.ts`** remains the single source of truth for tier thresholds.


---

## 8. Deep Audit Addendum (Second Pass — 2026-08-08 18:47 GMT+3)

A second deep-dive pass through all game-mode engines, hooks, and UI components
revealed the following additional findings that refine the plan above.

### 8.1 Invaders: Tracking Already Exists (Simpler Than Expected)

**Discovery:** `MathInvadersGame.tsx` **already tracks** `sessionCorrectRef` and
`sessionAttemptsRef` (lines 27–28) and increments them in `handleTap` (lines 98–99).
These counters are passed to `recordSession()` for analytics — but are **not** passed
in the `onComplete` callback.

**Implication:** Child Card #2 is much simpler than originally planned. No engine
refactor is needed. The work is:

1. **Extend `onComplete` signature** in `MathInvadersGame` to include `correct` and `attempts`:
   ```typescript
   onComplete?: (stats: { score: number; lives: number; victory: boolean; correct: number; attempts: number }) => void;
   ```
2. **Pass the tracked values** in both the `onVictory` and `onGameOver` callback paths.
3. **Replace internal star display** (line 122–123) with `computeStarsByTier(sessionCorrectRef.current, sessionAttemptsRef.current)`.
4. **Update `GameOrchestrator` INVADERS branch** to use the new `correct`/`attempts` from
   the extended callback, replacing the lives-based hardcoded logic.

**No changes needed to `useInvaderEngine.ts` or `invader/types.ts`.** This eliminates
the "engine refactor" risk entirely.

### 8.2 Memory Duel: Field Name Correction

**Discovery:** The `MemoryDuelGame.onComplete` callback passes
`{ time, moves, matchedCount }` — **not** `matches`.

**Correction to §3.1:** The adapter must use `matchedCount`, not `matches`:

```typescript
export function memoryDuelToPerformance(stats: {
    moves: number;
    matchedCount: number;
}): PerformanceResult {
    const correct = stats.matchedCount;
    const mistakes = Math.max(0, stats.moves - stats.matchedCount);
    return { correct, attempts: correct + mistakes };
}
```

**Why this works naturally with `STAR_CONFIG`:**
- 6 pairs, 6 moves (perfect) → 6 correct, 6 attempts → 0 mistakes → PERFECT (3★)
- 6 pairs, 7 moves → 6 correct, 7 attempts → 1 mistake → PERFECT (3★)
- 6 pairs, 9 moves → 6 correct, 9 attempts → 3 mistakes → GOOD (2★)
- 6 pairs, 12 moves → 6 correct, 12 attempts → 6 mistakes → PASS (1★)

The generic thresholds map perfectly to Memory Duel without mode-specific config.

### 8.3 MathInvadersGame Internal Star Display (Line 122)

**Discovery:** `MathInvadersGame.tsx` has its **own star display** for the end screen
(line 122–123):
```typescript
const stars = isVictory
    ? (state.lives >= 2 ? 3 : state.lives === 1 ? 2 : 1)
    : 0;
```

This is a **separate hardcoded path** from the `GameOrchestrator` INVADERS branch —
it controls the visual star rating shown on the Invaders end screen. Both must be
migrated to `computeStarsByTier` to ensure consistency.

**Fix:** Replace with:
```typescript
const stars = isVictory
    ? computeStarsByTier(sessionCorrectRef.current, sessionAttemptsRef.current)
    : 0;
```

### 8.4 Zen Mode Edge Case

**Discovery:** Zen mode in `ARCADE_CONFIGS` has `failCondition: { type: 'strikes', value: 0 }`
— meaning it can never fail. `BubbleGameContainer` already tracks `sessionCorrectRef` and
`sessionAttemptsRef` and passes them to `onComplete`. The SENSORY branch in
`GameOrchestrator` already calls `computeStars(correct, attempts)`.

**Conclusion:** Zen mode (and all arcade modes) are **already correctly handled** — no
changes needed. The `onComplete(true, correct, attempts)` path from
`BubbleGameContainer` feeds directly into `computeStarsByTier`. ✅

### 8.5 SessionSummary: Single Consumer

**Discovery:** `SessionSummary` is imported only by `PracticeMode.tsx` (line 17).
No other component uses it. This makes the `starsGained` fix low-risk — only one
call site needs updating.

### 8.6 ProgressOverview: Hardcoded Total Stars

**Discovery:** `src/components/parent/ProgressOverview.tsx` line 10:
```typescript
const TOTAL_POSSIBLE_STARS = 150; // 50 nodes × 3 stars
```

**Issue:** This is a brittle constant. If the learning path adds/removes nodes,
this number will be wrong. Should be computed dynamically:
```typescript
const TOTAL_POSSIBLE_STARS = CURRICULUM.length * 3;
```

**Scope decision:** This is a pre-existing tech debt issue, not directly part of
the star-rewards migration. **Recommend a separate cleanup card** rather than
expanding this plan's scope. Noting it here for visibility.

### 8.7 `computeStars` Wrapper Removal

**Discovery:** `GameOrchestrator.tsx` line 60:
```typescript
const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);
```

This is a trivial identity wrapper. It adds an extra hop on every call. **Recommend
removing it** and calling `computeStarsByTier` directly at all call sites (PRACTICE,
SENSORY, LESSON branches). This is a pure refactor with no behavioral change.

### 8.8 Revised Child Card Breakdown

Based on the deep audit, the child cards can be refined:

| # | Title | Scope | Effort | Dependencies |
|---|-------|-------|--------|-------------|
| 1 | **Memory Duel: Migrate to tier-based stars** | Create `memoryDuelToPerformance` adapter in `starAdapters.ts`, update GameOrchestrator MEMORY branch, add adapter tests | Small | None |
| 2 | **Math Invaders: Pass tracked counts and migrate to tier-based stars** | Extend `onComplete` signature with `correct`/`attempts`, replace hardcoded star logic in both `MathInvadersGame` and `GameOrchestrator`, add tests | Small (no engine refactor needed!) | None |
| 3 | **PracticeMode: Replace hardcoded SessionSummary stars with `computeStarsByTier`** | Update `starsGained` prop, add test | Trivial | None |
| 4 | **Add `tierToLabel` to stars.ts + remove `computeStars` wrapper** | Extend `stars.ts`, add tests, remove wrapper in `GameOrchestrator`, update all call sites | Small | None |

**Key change from original plan:** Card #2 is now **Small** effort instead of Medium,
because the Invaders engine already tracks correct/attempts — no engine refactor needed.

### 8.9 Verification Matrix

| Mode | Tracks | Adapter | Star Path | Status |
|------|--------|---------|-----------|--------|
| PRACTICE | `session.correct`, `session.attempts` | None (direct) | `computeStarsByTier(correct, attempts)` | ✅ Already done |
| SENSORY (all arcade modes) | `sessionCorrectRef`, `sessionAttemptsRef` | None (direct) | `computeStarsByTier(correct, attempts)` | ✅ Already done |
| LESSON | `engine.getPerformance()` → `{correct, attempts}` | None (direct) | `computeStarsByTier(correct, attempts)` | ✅ Already done |
| MEMORY | `stats.moves`, `stats.matchedCount` | `memoryDuelToPerformance` | `computeStarsByTier(correct, attempts)` via adapter | ❌ Needs Card #1 |
| INVADERS | `sessionCorrectRef`, `sessionAttemptsRef` (already tracked!) | None (just pass them) | `computeStarsByTier(correct, attempts)` | ❌ Needs Card #2 |
| SessionSummary | `session.correct`, `session.attempts` | None (direct) | `computeStarsByTier(correct, attempts)` | ❌ Needs Card #3 |

### 8.10 Creative Suggestions

1. **Star animation on tier upgrade:** When a player improves their tier (e.g., 2→3 stars),
   `SessionSummary` could show a celebratory animation with the tier label ("Perfect!").
   The `tierToLabel()` function from Card #4 enables this.

2. **Tier-based coin rewards:** If future cards add coin economy, `tierToCoins()` gives:
   PERFECT=30, GOOD=20, PASS=10. This is sketched in §3.5 but should be deferred until
   the coin system is wired in.

3. **Memory Duel "Flawless" badge:** A perfect memory game (moves = matchedCount, zero
   mistakes) could trigger a special visual effect. The adapter makes this trivial to
   detect: `mistakes === 0` → show "Flawless!" overlay.

4. **Invaders combo → tier bonus:** If the Invaders engine exposes `maxCombo`, a high
   combo could bump the tier by one level (PASS→GOOD, GOOD→PERFECT). This is a future
   enhancement, not part of the current plan, but the infrastructure supports it.

5. **Adaptive thresholds for young children:** `STAR_CONFIG` could have an age-based
   variant: `PERFECT_MAX_MISTAKES=2` for ages < 7. This would require a
   `getStarConfigForProfile(profile)` helper. Deferred but architecturally compatible.
