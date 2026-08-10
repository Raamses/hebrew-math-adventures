# Devil's Advocate Review: Sound Centralization — Implementation Review

> **Reviewer**: reviewer-opus (glm-5.2)
> **Date**: 2026-08-10
> **Scope**: Implementation commits 841ebf5..424f8a6 (useSoundManager hook + 8 consumer migrations)
> **Branch**: `sdlc/loop-v0`
> **Verdict**: ⚠️ APPROVED WITH BLOCKERS — 2 blockers, 4 major issues, 4 minor issues

---

## BLOCKERS

### B1. No `AudioContext.resume()` — sounds silent after page load (carried forward)
**Severity**: Blocker
**Where**: `src/hooks/useSoundManager.ts` — `getAudioContext()`

Prior review B1 explicitly required `ctx.resume()`. Implementation does NOT call it anywhere. Modern browsers start AudioContext in "suspended" state; first sound after page load is silent.

**Fix**: Add `ctx.resume()` in `getAudioContext()` when `ctx.state === 'suspended'`. Add test.

### B2. `vibrate()` gated by `isMuted` — silent behavior change (carried forward)
**Severity**: Blocker
**Where**: `src/hooks/useSoundManager.ts` line 385–390

Prior review B2 flagged this. Original 13 `navigator.vibrate()` calls were NEVER gated by mute. Implementation adds `if (isMuted) return;` — users who mute sound lose haptic feedback. Behavior change masquerading as refactor.

**Fix**: Remove `isMuted` guard from `vibrate()`, or add separate `hapticsEnabled` setting.

---

## MAJOR ISSUES

### M1. Old hooks not converted to thin re-export wrappers
**Where**: `src/hooks/useSound.ts`, `src/hooks/useMusicalSound.ts`

Plan D6 said convert to thin wrappers. Both files are completely unchanged — full implementations with separate AudioContexts. Three copies of sound logic exist. 151 tests test dead code.

### M2. Mute state still uses localStorage — not unified to ProfileContext
**Where**: `src/hooks/useSoundManager.ts` lines 98–103

Plan D3 said read from `profile.settings.isMuted`. Implementation still reads/writes `localStorage('isMuted')`. Mute state desync (P4/P8) is NOT fixed.

### M3. `resetMelodyCombo()` never called by any consumer
**Where**: All 4 game components

Exposed by hook but zero callers. Combo accumulates across games/session. Prior review M1 flagged this. Add calls on game start/restart.

### M4. Component test mocks are orphaned
**Where**: `MathInvadersGame.test.tsx`, `MemoryDuelGame.test.tsx`, `FrenzyOverlay.test.tsx`

Tests mock old `useSound`/`useMusicalSound` but components now import `useSoundManager`. Mocks are dead code giving false sense of isolation.

---

## MINOR ISSUES

- **m1**: Raw `playSound`/`play` calls remain in BubbleGameContainer (8), UnitCompleteCinematic (2), FrenzyOverlay (1) instead of semantic API
- **m2**: No `typeof window` guard in `getAudioContext()` — SSR crash risk
- **m3**: No `visibilitychange` suspend/resume for AudioContext — battery waste
- **m4**: `play('levelUp')` used for both level-up AND boss-defeat (semantic conflation, carried forward)

---

## POSITIVE ASPECTS
1. ✅ Single AudioContext — one `globalAudioContext`
2. ✅ All 8 consumers migrated — no production component imports old hooks
3. ✅ All 13 `navigator.vibrate` calls replaced with `soundManager.vibrate()`
4. ✅ Inline if/else SG branching eliminated
5. ✅ Director.recordResult callback pattern preserved
6. ✅ 199 new tests pass, all 805 tests pass, typecheck clean
7. ✅ `createTone` helper reduces oscillator boilerplate (improvement over plan)

---

## VERIFICATION CHECKLIST

| Check | Status |
|-------|--------|
| Single AudioContext | ✅ |
| All 8 consumers migrated | ✅ |
| All 13 vibrate calls replaced | ✅ |
| Inline SG branching eliminated | ✅ |
| Director callback preserved | ✅ |
| AudioContext.resume() | ❌ B1 |
| Vibration behavior preserved | ❌ B2 |
| Mute state unified to ProfileContext | ❌ M2 |
| Old hooks as wrappers | ❌ M1 |
| resetCombo on game start | ❌ M3 |
| Component test mocks updated | ❌ M4 |
| Volume control wired in | ❌ (D4 skipped) |
| Semantic API in all consumers | ⚠️ m1 |
| SSR window guard | ❌ m2 |
| visibilitychange suspend/resume | ❌ m3 |
| 199 new tests | ✅ |
| All 805 tests pass | ✅ |
| Typecheck clean | ✅ |

---

## RECOMMENDED ACTIONS BEFORE COMPLETE
1. Add `ctx.resume()` to `getAudioContext()` (B1)
2. Remove `isMuted` guard from `vibrate()` (B2)
3. Add `resetMelodyCombo()` on game start/restart in all 4 game components (M3)
4. Update component test mocks to target `useSoundManager` (M4)
5. Track M1/M2/D1/D3/D4 as tech debt for follow-up card
