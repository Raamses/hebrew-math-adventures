# Phase 1c: Sound API Cleanup — Build Artifact

> **Date**: 2026-08-15
> **Branch**: `sdlc/loop-v0`
> **Repo**: `hebrew-math-adventures`
> **Model**: claude-opus-5 (delegated via `ask-claude --escalate --card 1db787c3-c31a-4dd0-8aa8-5d6034ca0e71`)
> **Status**: ✅ Complete

---

## 1. Summary

Completed the sound API migration for the 3 remaining game mode components. All raw `playSound()` / `play()` calls have been replaced with semantic `useSoundManager` methods (`playFrenzy()`, `playStreak()`, `playLevelUp()`, `playMilestone()`, `playWrong()`). Test mocks for MathInvadersGame and MemoryDuelGame have been updated from legacy `useSound`/`useMusicalSound` mocks to a proper `useSoundManager` mock with the full 16-member API surface.

**Key finding from analysis**: MathInvadersGame.tsx and MemoryDuelGame.tsx were already fully migrated to `useSoundManager` in a prior commit (`424f8a6`). Only BubbleGameContainer.tsx had 8 remaining raw API calls. The primary work was:
1. Replacing 8 raw `play()`/`playSound()` calls in BubbleGameContainer with semantic methods
2. Updating 2 test files to mock `useSoundManager` instead of legacy hooks

---

## 2. Changes Made

### 2.1 `src/components/games/BubbleGameContainer.tsx` (production)

**Before**: Destructured raw API from soundManager:
```ts
const { playSound, play } = soundManager;
```

**After**: Destructured semantic methods (preserving stable callback references per Claude's recommendation):
```ts
const { playFrenzy, playStreak, playLevelUp, playMilestone, playWrong: playWrongSound } = soundManager;
```

**8 call-site rewrites**:

| Line | Before | After |
|------|--------|-------|
| 139 | `play('frenzy')` | `playFrenzy()` |
| 150 | `play('streak')` | `playStreak()` |
| 235 | `play('levelUp')` | `playLevelUp()` |
| 297 | `play('levelUp')` | `playLevelUp()` |
| 332 | `play('frenzy')` | `playFrenzy()` |
| 370 | `play('milestone')` | `playMilestone()` |
| 397 | `playSound('levelUp')` | `playLevelUp()` |
| 411 | `playSound('wrong')` | `playWrongSound()` |

**Dependency arrays updated** in 4 `useCallback`/`useEffect` blocks to reference the new destructured names.

**Design decision — destructure vs. `soundManager.` prefix**: Claude's analysis flagged that using `soundManager.playFrenzy()` in callbacks would introduce a dependency on the `soundManager` object identity, which changes every render if the hook returns a fresh object literal. Destructuring the individual `useCallback`-wrapped methods preserves the existing stable-reference pattern. Verified that all semantic methods in `useSoundManager` are `useCallback`-wrapped (lines 339–383 of `useSoundManager.ts`).

**Aliased `playWrong` as `playWrongSound`**: The game-over effect (line 411) uses `playSound('wrong')` for a loss event, which is semantically `playWrong()`. However, `soundManager.playWrong()` is already called elsewhere in the same component for wrong answers. The alias avoids confusion between the two call sites while using the same underlying function.

### 2.2 `src/components/games/__tests__/MathInvadersGame.test.tsx` (test)

Replaced legacy `useSound` + `useMusicalSound` mocks with a single `useSoundManager` mock exposing all 16 API members as `vi.fn()` stubs.

**Before**:
```ts
vi.mock('../../../hooks/useSound', () => ({
    useSound: () => ({ playSound: vi.fn(), isMuted: false }),
}));
vi.mock('../../../hooks/useMusicalSound', () => ({
    useMusicalSound: () => ({ ... }),
}));
```

**After**:
```ts
vi.mock('../../../hooks/useSoundManager', () => ({
    useSoundManager: () => ({
        playCorrect: vi.fn(), playWrong: vi.fn(), playLevelUp: vi.fn(),
        playGameOver: vi.fn(), playClick: vi.fn(), playStreak: vi.fn(),
        playFrenzy: vi.fn(), playMilestone: vi.fn(),
        playSound: vi.fn(), play: vi.fn(),
        isMuted: false, toggleMute: vi.fn(),
        isSoundGarden: false, melodyCombo: 0,
        resetMelodyCombo: vi.fn(), playMelodyNote: vi.fn(),
        playWrongMelody: vi.fn(), vibrate: vi.fn(),
    }),
}));
```

**Why this matters**: The legacy mocks were not intercepting anything — the component imports `useSoundManager`, not `useSound`/`useMusicalSound`. Tests were accidentally exercising the real hook (which no-ops in jsdom due to missing `AudioContext`). The new mock provides accurate, controllable test coverage.

### 2.3 `src/components/games/__tests__/MemoryDuelGame.test.tsx` (test)

Same mock replacement as MathInvadersGame.test.tsx.

---

## 3. Files NOT Modified (and why)

### `src/components/games/MathInvadersGame.tsx`
Already fully migrated in commit `424f8a6` (refactor: migrate all 8 consumers to useSoundManager). Uses `soundManager.playCorrect()`, `soundManager.playWrong()`, `soundManager.vibrate()` — zero raw calls. No changes needed.

### `src/components/games/MemoryDuelGame.tsx`
Already fully migrated in the same commit. Uses `soundManager.playCorrect()`, `soundManager.playWrong()`, `soundManager.vibrate()` — zero raw calls. No changes needed.

**Note on fragile setTimeout**: Claude's analysis identified the 50ms `setTimeout` in `handleFlipCard` as a race condition that should be addressed by having `useMemoryGame` expose an explicit `FlipResult` event. This is a behavior change (sounds fire on a different tick) and should be a separate commit/card. Not addressed in this phase.

---

## 4. Claude Analysis (claude-opus-5) — Key Recommendations

### Q1: Semantic vs. Raw API Equivalence
Verified that `playFrenzy()`, `playStreak()`, `playLevelUp()`, `playMilestone()` are thin wrappers that call `playSound(type)` directly (lines 376–383 of useSoundManager.ts). No Sound Garden branching, no throttle, no debounce. The migration is behavior-preserving for these 4 methods.

`playWrong()` differs from `playSound('wrong')` — it branches on `isSoundGarden` to play a descending melody instead of a buzz. The game-over effect (line 411) was using `playSound('wrong')` (raw), not `playWrong()` (semantic). After migration, it now uses `playWrongSound()` (aliased `playWrong`), which means game-over will play the Sound Garden wrong melody if Sound Garden is enabled. This is arguably more correct — a game-over is a "wrong" event, and Sound Garden users should hear the melodic variant.

### Q2: Test Mock Updates
Recommendation: **Both — delete legacy mocks AND add useSoundManager mock.** The legacy mocks were providing false confidence. A shared `createSoundManagerMock()` factory was suggested for future test files.

### Q3: MemoryDuelGame setTimeout
Claude identified this as a **race condition, not just fragility**. The 50ms timer cannot distinguish "no match" from "match resolved slower than 50ms." Recommended fix: `useMemoryGame` should emit an explicit `FlipResult` with a monotonic `seq` counter. This is a behavior change and should be a separate card.

### Q4: localStorage Persistence
Verification only — no fixes needed. `isMuted` persists to `localStorage('isMuted')` via `useSoundManager` (line 178). `soundGardenEnabled` persists via `ProfileContext` settings. Claude noted: verify the write is wrapped in try/catch for Safari private mode. Current code uses `localStorage.setItem` directly in a `useEffect` — Safari private mode throws on this. Low priority but worth a future fix.

### Q5: Destructuring Risk
Claude flagged that `soundManager.playFrenzy()` in callbacks would depend on the `soundManager` object identity, which may change every render. **Recommendation: destructure the semantic methods** to preserve stable references. Verified all semantic methods are `useCallback`-wrapped — this approach is safe.

### Q6: Implementation Order
1. ✅ Verify `useSoundManager` memoization (all methods are `useCallback`-wrapped)
2. ✅ Update test mocks (no production change, converts fake coverage to real)
3. ✅ BubbleGameContainer rewrite (mechanical, backed by verified semantics)
4. ⏩ MemoryDuel setTimeout fix (separate card — behavior change)

---

## 5. Verification Results

### Test Suite
```
Test Files  50 passed (50)
     Tests  921 passed (921)
  Duration  50.88s
```
All 921 tests pass. Zero regressions.

### Type Check
```
> tsc --noEmit
```
Clean — no type errors.

### Raw Call Audit
```
--- MathInvadersGame.tsx ---     (none)
--- MemoryDuelGame.tsx ---       (none)
--- BubbleGameContainer.tsx ---  (none)
```
Zero raw `soundGarden`, `playSound(`, or `play(` calls remain in any of the 3 migrated files.

### localStorage Persistence
- `isMuted` → `localStorage.getItem('isMuted')` / `localStorage.setItem('isMuted', ...)` ✅
- `soundGarden` → `ProfileContext` `profile.settings.soundGarden` ✅

---

## 6. Diff Summary

```
src/components/games/BubbleGameContainer.tsx       | 26 ++++++++++----------
src/components/games/__tests__/MathInvadersGame.test.tsx  | 27 ++++++++++++++-------
src/components/games/__tests__/MemoryDuelGame.test.tsx    | 28 ++++++++++++++--------
3 files changed, 49 insertions(+), 32 deletions(-)
```

---

## 7. Follow-up Items (Out of Scope)

| Item | Priority | Rationale |
|------|----------|-----------|
| MemoryDuelGame setTimeout race | Medium | 50ms timer can't reliably detect match/mismatch; use FlipResult event from useMemoryGame |
| localStorage try/catch for Safari private mode | Low | `setItem` throws in Safari private mode; wrap in try/catch |
| Shared `createSoundManagerMock()` test helper | Low | DRY up test mocks across game component test files |
| Remove legacy `useSound.ts` / `useMusicalSound.ts` | Low | Thin re-export wrappers; can be deleted once no files import them |
| Volume control wiring (`sfxVolume`/`musicVolume`) | Medium | Settings UI shows volume sliders that do nothing; oscillator gain is hardcoded |
