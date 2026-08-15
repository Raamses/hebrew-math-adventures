# Outside Counsel Review: Dispatch Cap Fix (Spawn Credit Accumulator)

> **Reviewer:** Gemini (reviewer-gemini agent)
> **Date:** 2026-08-09
> **Card:** 194676c5-0f52-4a9c-85e8-e61713bc99f6
> **Scope:** Spawn credit accumulator system in `useGameEngine.ts` — specifically the `MAX_BANKED_CREDITS` cap, tab-backgrounding reset, and multi-spawn loop behavior.
> **Commits reviewed:** `1677268` (initial overhaul), `6de5293` (Gemini review fixes), `45304c4` (worldConfig consolidation), `0deaef6` (zen-mode stale-bubble fix)

---

## 1. Executive Summary

**Verdict: APPROVED with minor observations.**

The dispatch cap fix (spawn credit accumulator) is a well-designed, correctly implemented system that solves the core problem of screen-refill latency and tab-backgrounding floods. The `MAX_BANKED_CREDITS = 3` clamp is appropriately calibrated, the tab-background detection is robust, and the multi-spawn loop has correct guards. The test coverage is solid with 10 dedicated tests covering the critical edge cases.

No blocking issues found. Two minor observations and one architectural note are raised below.

---

## 2. What the Fix Does

### Problem Being Solved
Before the fix, the spawn system used a simple interval-based check: "has enough time passed since the last spawn?" This had three failure modes:
1. **Empty screen refill lag** — after popping many bubbles, the screen would refill slowly (1 bubble per `spawnIntervalMs`), leaving dead zones
2. **Tab backgrounding flood** — when a tab is backgrounded, `requestAnimationFrame` pauses. On return, `dt` could be 30s+, causing the old system to try spawning many bubbles at once
3. **Frame timing inconsistency** — variable frame rates on different devices caused inconsistent spawn rates

### Solution: Credit Accumulator
The fix replaces interval-based scheduling with a **credit accumulator** pattern:

```
spawnCredits += dt / currentInterval
spawnCredits = Math.min(spawnCredits, MAX_BANKED_CREDITS)  // cap at 3
```

- Credits accumulate proportionally to elapsed time
- The cap prevents flooding after long pauses
- Each spawn consumes 1 credit
- Multi-spawn loop: `while (credits >= 1 && activeCount < maxOnScreen)` — allows catching up without flooding

### Tab Backgrounding Guard
```typescript
if (dt > 2000) {
    spawnCredits.current = 0;
    return;
}
```
- If frame delta > 2 seconds, assume tab was backgrounded
- Reset credits to 0 and skip this frame
- Next frame resumes normal accumulation

---

## 3. Code Quality Assessment

### 3.1 Correctness — ✅ Pass

**Credit accumulation math:** `spawnCredits += dt / currentInterval` — Correct. At 60fps with `spawnIntervalMs = 1000`, each frame adds ~0.0167 credits. After 60 frames (1 second), 1 credit accumulates → 1 spawn per second. Math checks out.

**Cap behavior:** `Math.min(spawnCredits.current, MAX_BANKED_CREDITS)` — Correct. Prevents banking more than 3 spawns. If the player pauses for 10s, only 3 credits are available (not 10), preventing screen flooding on resume.

**Multi-spawn loop:** `while (spawnCredits.current >= 1 && activeCount < effectiveMaxOnScreen)` — Correct. The loop:
- Respects the `effectiveMaxOnScreen` ceiling (boss mode reduces this to 40%)
- Decrements credits per spawn
- Staggers Y coordinates for visual polish: `y = 110 + (spawnIndex * 12)`
- Has a `spawnIndex` counter for the stagger offset

**Force target clearing:** In the multi-spawn loop, `forceTarget` is set to `false` after exactly ONE forced spawn. This is correct — the safety net should force exactly one target, not fill the screen with forced targets.

**First-frame seeding:** `lastFrameTime.current = time` on first callback — prevents accumulating a huge `dt` from the initial 0 value. Correct.

**Frenzy multiplier:** `currentInterval = spawnIntervalMs * 0.6` during frenzy — credits accumulate 1.67x faster, meaning more spawns during frenzy. Correct.

**Speed multiplier:** `currentInterval = currentInterval / speedMultiplier` where `speedMultiplier = Math.min(1.6, 1 + comboBonus + timeBonus)` — caps at 1.6x speed. Credits accumulate faster with combo/time, capped appropriately. Correct.

### 3.2 Type Safety — ✅ Pass

- `spawnCredits = useRef<number>(0)` — properly typed
- `MAX_BANKED_CREDITS` now sourced from `POWER_UP_CONFIG.MAX_BANKED_CREDITS` in `worldConfig.ts` — single source of truth
- `dt` is `number` (from rAF timestamp) — no implicit any
- All entity filtering uses strict type checks before `behavior.validate()`

### 3.3 Edge Cases — ✅ Pass (with one observation)

**Edge case: First frame**
- `lastFrameTime.current === 0` → seed to `time` and `lastSpawnTime.current = time` and `lastTargetSeenTime.current = time`
- Correct: prevents a massive `dt` on the first frame

**Edge case: Tab backgrounding**
- `dt > 2000` → reset credits, skip frame
- Correct: prevents flooding after 30s tab switch
- **Observation:** The 2000ms threshold is reasonable but could theoretically trigger on very slow devices (e.g., a 2Hz render rate). On a Raspberry Pi hosting the PWA, this is unlikely but worth noting. No action needed.

**Edge case: Boss on screen**
- `effectiveMaxOnScreen = Math.max(2, Math.floor(maxOnScreen * 0.4))` — reduces spawns during boss fights
- Correct: prevents screen clutter during boss encounters

**Edge case: Power-up spawn consuming a credit**
- `spawnCredits.current -= 1` before spawning a power-up bubble
- Correct: power-ups cost the same as normal bubbles, preventing power-up spam

**Edge case: All credits consumed but maxOnScreen not reached**
- The `while` loop exits when `spawnCredits.current < 1` OR `activeCount >= effectiveMaxOnScreen`
- Correct: no infinite loop risk

### 3.4 Test Coverage — ✅ Pass

10 dedicated tests in `src/engines/bubble/__tests__/spawnOverhaul.test.ts`:

1. ✅ Fractional `distractorRatio` 1.5 builds integer bag without `RangeError`
2. ✅ Fractional `distractorRatio` 0.8 builds bag with mostly targets
3. ✅ `forceTarget` bypasses the bag and leaves bag state unchanged
4. ✅ Bag resets when `distractorRatio` changes
5. ✅ No back-to-back `FALLBACK_PROBLEM` signatures when fallback triggers twice
6. ✅ Trivial problems filtered when `correctCount >= 3`
7. ✅ Popped/powerup/boss entities not counted as active targets
8. ✅ `spawnBoss` uses `forceTarget` so boss value equals current target
9. ✅ Tab backgrounding (`dt > 2000ms`) resets spawn credits to 0 and does not flood
10. ✅ `forceTarget` + multi-spawn: exactly 1 forced target with 3 credits

**Observation:** The tests simulate the credit accumulator logic as a pure function (extracting the math) rather than testing `useGameEngine` directly. This is a pragmatic choice — testing React hooks with rAF mocking is complex. The tradeoff is that integration regressions could slip through. The full test suite (601 tests) provides additional coverage.

### 3.5 Performance — ✅ Pass

- Credit accumulator is O(1) per frame — one addition, one `Math.min`
- Entity counting loop is O(n) where n = entities on screen (typically < 12)
- No memory allocations in the hot path (refs are mutated in place)
- Multi-spawn loop is capped by `MAX_BANKED_CREDITS = 3` — at most 3 spawns per frame

### 3.6 Config Consolidation — ✅ Pass

`MAX_BANKED_CREDITS` was moved from a local constant in `useGameEngine.ts` to `POWER_UP_CONFIG.MAX_BANKED_CREDITS` in `worldConfig.ts`. This is correct — it's now part of the single source of truth. However:

**Architectural note:** `MAX_BANKED_CREDITS` is grouped under `POWER_UP_CONFIG` in `worldConfig.ts`, but it's actually a **spawn system** constant, not a power-up constant. It controls how fast the screen refills with bubbles, not power-up behavior. Consider moving it to a `SPAWN_CONFIG.MAX_BANKED_CREDITS` or a new `ENGINE_CONFIG` section. This is cosmetic and non-blocking.

---

## 4. Multi-Spawn Loop Deep Dive

The most complex part of the fix is the multi-spawn loop (lines ~270-320 in `useGameEngine.ts`):

```typescript
let spawnIndex = 0;
while (spawnCredits.current >= 1 && activeCount < effectiveMaxOnScreen) {
    let forceTarget = false;
    if (activeTargetCount === 0 && lastTargetSeenTime.current !== 0 && time - lastTargetSeenTime.current > 6000) {
        forceTarget = true;
    }

    const newBubbleProps = behavior.generateNext(currentConfig, forceTarget ? { forceTarget: true } : undefined);

    if (forceTarget) {
        activeTargetCount += 1;
        lastTargetSeenTime.current = time;
    }

    // ... lane assignment, entity creation ...

    activeCount++;
    spawnCredits.current -= 1;
    spawnIndex++;

    if (!forceTarget) {
        const testEntity = { ...newBubble, internalValue: newBubbleProps.internalValue } as BubbleEntity;
        if (isTargetEntity(testEntity)) {
            lastTargetSeenTime.current = time;
            activeTargetCount += 1;
        }
    }
}
```

**Analysis:**
- ✅ `forceTarget` is cleared after exactly one forced spawn (per Claude #8 review point)
- ✅ `activeTargetCount` is incremented correctly for both forced and natural target spawns
- ✅ `lastTargetSeenTime` is updated when any target spawns (forced or natural)
- ✅ The loop respects `effectiveMaxOnScreen` — no screen flooding
- ✅ Y-stagger (`spawnIndex * 12`) prevents visual stacking during burst spawns

**Minor observation:** The `forceTarget` variable is re-declared as `let` inside the `while` loop body on each iteration. This is actually correct — each iteration should independently evaluate whether to force a target. The previous iteration's `forceTarget = false` from clearing is not carried over. Good.

---

## 5. Integration Assessment

### 5.1 Zen-Mode Stale-Bubble Fix (commit `0deaef6`)
The dispatch cap fix integrates cleanly with the zen-mode stale-bubble validation. The `validateAgainst()` / `getTargetValue()` snapshot pattern operates in `handlePop`, which is downstream of spawn scheduling. No interaction between the two systems — they solve different problems:
- Dispatch cap: "how fast do bubbles appear?"
- Stale-bubble: "what happens when you pop a bubble with an old answer?"

### 5.2 WorldConfig Consolidation (commit `45304c4`)
All constants (`MAX_BANKED_CREDITS`, `SPAWN_INTERVAL_MS`, `POWER_UP_TYPES`, `DURATIONS`, `EMOJI`) were successfully extracted to `worldConfig.ts`. The `useGameEngine.ts` now imports from `POWER_UP_CONFIG` instead of declaring local constants. Clean migration.

### 5.3 Test Suite Timeout Fix (commit `bc83449`)
The vitest config fix (excluding `.worktrees/`, capping workers) is orthogonal to the dispatch cap fix. No interaction. Full suite runs in ~41s with 601 tests passing.

---

## 6. TypeScript Check

```
npx tsc -b → 11 errors, ALL in sound hook test files (useMusicalSound.test.ts, useSound.test.ts)
```

These errors are **pre-existing** from the sound centralization feature branch (`sdlc/feature-e2e-coverage`), not from the dispatch cap fix. The dispatch cap code itself has zero TypeScript errors.

**Recommendation:** Fix the sound test type errors as part of the sound centralization SDLC chain, not here.

---

## 7. Test Results

```
npx vitest run → 40 test files, 601 tests, 0 failures, 40.60s duration
```

All tests pass. No regressions.

---

## 8. Summary of Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | `MAX_BANKED_CREDITS` is in `POWER_UP_CONFIG` but is a spawn-system constant | Cosmetic | Non-blocking — suggest future move to `SPAWN_CONFIG` |
| 2 | Tab-backgrounding threshold (2000ms) could theoretically trigger on very slow devices | Informational | Non-blocking — acceptable for current target platforms |
| 3 | Spawn credit accumulator tests are unit-level (pure function simulation), not integration-level | Minor | Non-blocking — pragmatic choice, full suite provides integration coverage |
| 4 | TypeScript errors in sound test files are pre-existing, not from dispatch cap | Informational | Non-blocking — fix in sound centralization chain |

---

## 9. Final Verdict

**APPROVED.**

The dispatch cap fix is correct, well-tested, and performant. The credit accumulator pattern is an industry-standard approach for decoupling spawn rate from frame rate, and the implementation here follows best practices:

- ✅ Cap prevents flooding (`MAX_BANKED_CREDITS = 3`)
- ✅ Tab-backgrounding guard prevents burst-on-resume
- ✅ Multi-spawn loop respects screen capacity
- ✅ Force-target safety net guarantees target visibility within 6s
- ✅ First-frame seeding prevents initial-frame flood
- ✅ Frenzy and speed multipliers are correctly integrated
- ✅ All constants consolidated to single source of truth (`worldConfig.ts`)
- ✅ 10 dedicated tests + 601 total tests passing
- ✅ No TypeScript regressions from this fix

No blocking issues. Ship it.

---

*Review prepared by Gemini (reviewer-gemini) as outside counsel for the Hebrew Math Adventures project.*
