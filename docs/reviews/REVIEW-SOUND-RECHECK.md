# Devil's Advocate Re-Check: Sound Centralization Implementation

> **Reviewer**: reviewer-opus (glm-5.2)
> **Date**: 2026-08-11
> **Scope**: Re-review of implementation commits 841ebf5..424f8a6 on `sdlc/loop-v0`
> **Prior reviews**: REVIEW-CENTRALIZE-SOUND.md (plan, 2026-08-08), REVIEW-SOUND-IMPL.md (impl, 2026-08-10)
> **Verdict**: ⚠️ APPROVED WITH BLOCKERS — 2 blockers persist, 4 major issues persist, 2 new findings

---

## SUMMARY

The implementation was previously reviewed on 2026-08-10 with 2 blockers and 4 major issues. This re-check confirms that **none of the blockers or major issues have been fixed**. The implementation is functionally correct for what it does (single AudioContext, all consumers migrated, 13 vibrate calls centralized, inline SG branching eliminated), but the carried-forward issues remain.

All 805 tests pass. Typecheck is clean. 199 new tests in `useSoundManager.test.ts` are comprehensive and well-structured.

---

## PERSISTING BLOCKERS (from prior review)

### B1. No `AudioContext.resume()` — sounds silent after page load
**Status**: ❌ UNFIXED
**Where**: `src/hooks/useSoundManager.ts` — `getAudioContext()`

No `resume()` or `suspend()` call exists anywhere in `useSoundManager.ts`. Modern browsers start AudioContext in "suspended" state. The first sound after page load will be silent.

**Impact**: User-facing bug. First interaction after loading the app produces no sound.

**Fix**: Add `ctx.resume()` in `getAudioContext()` when `ctx.state === 'suspended'`, or add a one-time global gesture listener.

### B2. `vibrate()` gated by `isMuted` — silent behavior change
**Status**: ❌ UNFIXED
**Where**: `src/hooks/useSoundManager.ts` line 387

```ts
const vibrate = useCallback(
    (pattern: number | number[]) => {
        if (isMuted) return;  // ← This is the problem
        ...
    },
    [isMuted],
);
```

Original 13 `navigator.vibrate()` calls were NEVER gated by mute. Users who mute sound still lose haptic feedback. This is a behavior change masquerading as a refactor.

**Fix**: Remove `isMuted` guard from `vibrate()`, or add a separate `hapticsEnabled` setting.

---

## PERSISTING MAJOR ISSUES

### M1. Old hooks not converted to thin re-export wrappers
**Status**: ❌ UNFIXED
**Where**: `src/hooks/useSound.ts` (197 lines), `src/hooks/useMusicalSound.ts` (162 lines)

Plan D6 said "convert to thin re-export wrappers." Both files remain full implementations with their own separate `AudioContext` singletons. Three copies of sound logic exist in the codebase. The old test files (621 + 1052 = 1673 lines) test dead code that no production component imports.

**Impact**: Maintenance burden. Any sound logic change must be applied in 3 places. Tests waste CI time on dead code.

### M2. Mute state still uses localStorage — not unified to ProfileContext
**Status**: ❌ UNFIXED — now confirmed as a real user-facing bug
**Where**: `useSoundManager.ts` lines 168–178, `SettingsModal.tsx` line 28

`useSoundManager` reads/writes `localStorage('isMuted')`.
`SettingsModal` writes `profile.settings.isMuted` via `updateProfile`.

These two stores are NOT synchronized. When a user toggles mute in SettingsModal:
- `profile.settings.isMuted` updates → toggle UI shows "muted"
- `localStorage('isMuted')` stays `false` → `useSoundManager.isMuted` stays `false`
- **Sounds still play** even though the UI says muted

This is not just a design deviation — it's a functional bug. The mute toggle in SettingsModal does not mute sounds.

**Fix**: Read `isMuted` from `useProfile()` in `useSoundManager`, or sync `localStorage` when `profile.settings.isMuted` changes.

### M3. `resetMelodyCombo()` never called by any consumer
**Status**: ❌ UNFIXED
**Where**: All 4 game components

`resetMelodyCombo` is exposed but zero callers. Melody combo accumulates across games/sessions. A user who answered 7 correctly in one game, then starts a new game, gets harmony on their first correct answer — musically confusing.

**Fix**: Add `resetMelodyCombo()` calls on game start/restart in all 4 game components.

### M4. Component test mocks are orphaned
**Status**: ❌ UNFIXED
**Where**: `FrenzyOverlay.test.tsx`, `MathInvadersGame.test.tsx`, `MemoryDuelGame.test.tsx`

Tests mock `useSound`/`useMusicalSound` but components now import `useSoundManager`. Mocks are dead code that provide no isolation — the real `useSoundManager` runs in tests.

```ts
// MathInvadersGame.test.tsx line 18-24 — mocks old hooks, component imports new one
vi.mock('../../../hooks/useSound', () => ({ ... }));
vi.mock('../../../hooks/useMusicalSound', () => ({ ... }));
// But MathInvadersGame.tsx imports useSoundManager — mock is dead
```

**Fix**: Replace with `vi.mock('../../hooks/useSoundManager', () => ({ ... }))`.

---

## NEW FINDINGS

### N1. `soundGardenEnabled` still prop-drilled — plan D1 not followed
**Severity**: Major (downgraded from prior plan review where it was implicit in D1)
**Where**: All 4 game components

Plan D1: "Hook reads ProfileContext internally, NOT via prop." Implementation takes `soundGardenEnabled` as an option parameter. Every consumer manually threads it:

```tsx
// BubbleGameContainer.tsx line 64
const soundManager = useSoundManager({ soundGardenEnabled: profile?.settings?.soundGarden ?? false });
```

This is the same prop-drilling pattern the plan was designed to eliminate. The hook should call `useProfile()` internally.

**Note**: This is a design deviation, not a bug — the code works correctly. But it means consumers still need `useProfile()` AND `useSoundManager()`, and the threading is manual.

### N2. No `visibilitychange` suspend/resume for AudioContext
**Status**: ❌ UNFIXED (minor, carried forward as m3)
**Where**: `useSoundManager.ts`

No `visibilitychange` listener to suspend/resume AudioContext when tab is hidden. Minor battery/CPU waste on mobile.

---

## VERIFICATION CHECKLIST (current state)

| Check | Status | Notes |
|-------|--------|-------|
| Single AudioContext | ✅ | One `globalAudioContext` singleton |
| All 8 consumers migrated | ✅ | No production component imports old hooks |
| All 13 vibrate calls centralized | ✅ | All use `soundManager.vibrate()` |
| Inline SG branching eliminated | ✅ | All consumers use semantic API or raw `playSound` |
| Director callback preserved | ✅ | Callback pattern maintained |
| AudioContext.resume() | ❌ B1 | Not implemented |
| Vibration behavior preserved | ❌ B2 | Gated by isMuted |
| Mute state unified | ❌ M2 | localStorage vs ProfileContext desync — functional bug |
| Old hooks as wrappers | ❌ M1 | Full implementations remain |
| resetCombo on game start | ❌ M3 | Never called |
| Component test mocks | ❌ M4 | Mock old hooks, not useSoundManager |
| ProfileContext integration (D1) | ❌ N1 | soundGardenEnabled prop-drilled |
| Volume control wired (D4) | ❌ | sfxVolume/musicVolume unused |
| SSR window guard (m2) | ❌ | No `typeof window` check |
| visibilitychange (m3) | ❌ | No suspend/resume |
| 199 new tests pass | ✅ | Comprehensive coverage |
| All 805 tests pass | ✅ | 42 files, 36.89s |
| Typecheck clean | ✅ | `tsc --noEmit` passes |
| No missed sound/vibrate calls | ✅ | Exhaustive grep confirms |

---

## POSITIVE ASPECTS (confirmed)

1. ✅ **Single AudioContext** — verified: one `globalAudioContext`, shared between classic and SG
2. ✅ **All 8 consumers migrated** — no production component imports old hooks
3. ✅ **All 13 vibrate calls centralized** — all use `soundManager.vibrate()`
4. ✅ **Inline SG branching eliminated** — semantic API handles branching internally
5. ✅ **Director callback preserved** — `playMilestone()` inside callback maintained
6. ✅ **199 new tests** — comprehensive, well-structured, covering edge cases, rapid play, cleanup, SG switching
7. ✅ **`createTone` helper** — reduces oscillator boilerplate (improvement over plan)
8. ✅ **All 805 tests pass** — typecheck clean
9. ✅ **No missed sound calls** — exhaustive grep confirms no orphans

---

## RECOMMENDED ACTIONS (prioritized)

### Must fix before closing card
1. **B1**: Add `ctx.resume()` in `getAudioContext()` — 2 lines of code
2. **B2**: Remove `isMuted` guard from `vibrate()` — 1 line deletion
3. **M2**: Either read `isMuted` from `ProfileContext` in `useSoundManager`, OR sync `localStorage` when `profile.settings.isMuted` changes — this is a functional bug
4. **M3**: Add `resetMelodyCombo()` calls on game start/restart

### Should fix (tech debt for follow-up card)
5. **M1**: Convert old hooks to thin re-export wrappers (or delete if no longer needed)
6. **M4**: Update component test mocks to target `useSoundManager`
7. **N1**: Have `useSoundManager` read `soundGardenEnabled` from `ProfileContext` internally
8. **D4**: Wire `sfxVolume` from profile settings into oscillator gain
9. **m2**: Add `typeof window` guard in `getAudioContext()` for SSR safety
10. **m3**: Add `visibilitychange` listener for AudioContext suspend/resume

---

## VERDICT

⚠️ **APPROVED WITH BLOCKERS** — The core architecture is sound and the migration is complete, but 2 blockers (B1: no AudioContext.resume, B2: vibrate gated by mute) and 1 functional bug (M2: mute state desync between localStorage and ProfileContext) must be fixed before this work can be considered complete. The other major issues (M1, M3, M4) are tech debt that should be tracked but don't block the user experience.

The test suite is excellent (199 tests covering API surface, mute, SG mode, cleanup, rapid play, edge cases, singleton, haptics, mode switching). The `createTone` helper is a nice improvement over the plan.
