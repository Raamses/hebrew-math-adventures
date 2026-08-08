# Devil's Advocate Review: Centralize Sound Handling

> **Reviewer**: reviewer-opus (glm-5.2)
> **Date**: 2026-08-08
> **Plan**: `docs/sdlc/sound-handling/0-plan.md` + `docs/plans/centralize-sound-handling.md`
> **Branch**: `sdlc/loop-v0`
> **Verdict**: ⚠️ APPROVED WITH BLOCKERS — 3 blockers, 5 major issues, 4 minor issues

---

## Summary

The plan is well-researched and correctly identifies the core problems (duplicate AudioContexts, duplicated SG branching, split mute state, no volume control). The 3-card decomposition is logical. However, the plan has **3 blockers** that must be resolved before builder cards start, plus **5 major issues** that need design decisions documented.

---

## BLOCKERS (must fix before builder cards start)

### B1. No `AudioContext.resume()` on user gesture — sounds will be silent after page load

**Severity**: Blocker  
**Where**: Plan §3 (Design), Plan §7 (Risk Assessment)

Both `useSound.ts` and `useMusicalSound.ts` create an `AudioContext` but never call `ctx.resume()`. Modern browsers (Chrome, Safari, Firefox) start AudioContext in `"suspended"` state and require a user gesture (click, tap, keypress) to call `ctx.resume()` before any sound will play.

**Current impact**: The first sound after page load is likely silent. This is an existing bug, but the plan — which is supposed to centralize and fix sound handling — doesn't address it. A "sound manager" that doesn't play sound on first interaction is a regression in user experience compared to expectations.

**Required fix**: `useSoundManager` must call `ctx.resume()` inside its first sound-playing method (or on a one-time global click/keypress listener). Add this to Card 1's spec. Add a test for the suspended→running transition.

### B2. `vibrate()` gated by `isMuted` is a silent behavior change — breaks haptic-only users

**Severity**: Blocker  
**Where**: Plan §3 D5 ("Co-located haptics"), Plan architecture diagram

The plan says `vibrate(pattern)` will be "gated by `isMuted`". But the current 13 `navigator.vibrate()` calls are **NOT** gated by mute — they always fire. A user who mutes sound (e.g., in a quiet environment) but still wants haptic feedback on their phone will lose vibration silently.

This is a **user-facing behavior change** masquerading as a refactor. The plan should either:
1. **(Recommended)** Add a separate `hapticsEnabled` setting (default `true`) and gate vibration on that, not on `isMuted`. Or:
2. **(Minimum)** Keep vibration independent of `isMuted` (matching current behavior). The `vibrate()` method should NOT check `isMuted`.

**Required fix**: Update the plan's D5 section and the architecture diagram to decouple vibration from mute. Add a design decision entry.

### B3. E2E test `practice-mute-toggle.spec.ts` will break — no migration plan for it

**Severity**: Blocker  
**Where**: Plan §4 Card 2, Plan §7 Risk Assessment

The E2E test reads `localStorage.getItem('isMuted')` to verify mute state. The plan (D3) moves mute state to `profile.settings.isMuted` and only reads `localStorage` once for backward compat. After migration:
- `getIsMuted()` in the E2E test will return the stale `localStorage` value, not the profile value.
- The assertion `expect(mutedAfter).not.toBe(mutedBefore)` may pass on the first toggle (if the backward-compat read updates localStorage) but will fail on the second toggle (if `toggleMute` writes to profile, not localStorage).

The plan's risk table acknowledges this ("E2E mute toggle test reads localStorage directly") and rates it **Low** with mitigation "Test may need update; coordinate with Card 2" — but Card 2's spec doesn't mention updating the E2E test. Card 3 only covers unit tests.

**Required fix**: Add explicit E2E test update task to Card 2 or Card 3. The test must read `profile.settings.isMuted` (via `page.evaluate` reading the profile from localStorage/IndexedDB or via a test hook) instead of the raw `isMuted` localStorage key.

---

## MAJOR ISSUES (design decisions needed before implementation)

### M1. `resetCombo()` is never called by any consumer — plan doesn't address this

**Severity**: Major  
**Where**: Plan §3 (Combo management), Plan §4 Card 2

`resetMelodyCombo()` exists in `useMusicalSound` but **zero consumers call it**. The melody combo accumulates indefinitely across games and sessions. The plan exposes `resetCombo()` in the new API but Card 2 (migration) doesn't specify when to call it.

**Impact**: Sound Garden melodies will wrap at 8 and add harmony at 9+, but the combo never resets on game start, game restart, or session change. This means a user who played 7 correct answers in one game, then started a new game, would immediately get harmony on their first correct answer in the new game — which is musically confusing.

**Required**: Card 2 should explicitly add `resetCombo()` calls at:
- Game start / mount (all 3 game components + PracticeMode)
- Game restart
- Wrong answer (already handled by `playWrongMelody` which resets combo — verify this is preserved)

### M2. `playAnswerCorrect`/`playAnswerWrong` in current `useSound` take `soundGardenEnabled` + `playMelodyNote` as params — plan should document the API simplification

**Severity**: Major  
**Where**: Plan §3 D1

The current semantic API in `useSound.ts` is:
```ts
playAnswerCorrect(soundGardenEnabled: boolean, playMelodyNote?: () => void)
```

This is a "leaky abstraction" — the caller must know about Sound Garden and pass the melody function. The plan's new API (`playCorrect(operation?)`) reads Sound Garden state internally, which is correct. But the plan doesn't explicitly call out that **all callers passing `soundGardenEnabled` and `playMelodyNote` as parameters will break** and must be changed. Card 2 should note this signature change explicitly.

### M3. No `AudioContext.close()` on unmount — resource leak across route changes

**Severity**: Major  
**Where**: Plan §3 D2, D7

The plan says "One module-level `AudioContext` (shared)" but never mentions `ctx.close()`. The AudioContext is a module-level singleton, so it persists for the app's lifetime. While this is acceptable for a SPA, if the app ever does SSR or hot-module reloading during development, the old AudioContext leaks.

More importantly, if the user navigates away from the app (or the tab is backgrounded for a long time), there's no `ctx.suspend()` to save resources. The plan should add:
- `ctx.suspend()` on `visibilitychange` → `hidden` (saves CPU/battery)
- `ctx.resume()` on `visibilitychange` → `visible` (paired with B1's resume fix)

### M4. `play('milestone')` is called inside a `Director.recordResult` callback — timing nuance

**Severity**: Major  
**Where**: `BubbleGameContainer.tsx` line 353

```ts
const updatedCapabilities = Director.recordResult(currentCapabilities, isCorrect, () => {
    play('milestone');
});
```

The `play('milestone')` is a callback passed to `Director.recordResult`. This means the sound is played at whatever time `Director.recordResult` chooses to invoke the callback (possibly synchronously, possibly conditionally based on capability threshold crossing). The plan's migration to `playMilestone()` must preserve this callback pattern — `playMilestone()` can't just be called unconditionally in place of the `Director.recordResult` call.

**Required**: Card 2 should note that `playMilestone()` replaces `play('milestone')` **inside** the callback, not outside it. The migration must preserve the callback structure.

### M5. `BubbleGameContainer` uses `play('levelUp')` for BOTH level-up AND boss-defeat — plan treats them as one

**Severity**: Major  
**Where**: `BubbleGameContainer.tsx` lines 223, 280

The plan maps `playLevelUp()` to "fanfare" and lists it as a single semantic event. But `BubbleGameContainer` uses `play('levelUp')` in two distinct contexts:
1. Line 223: Session level-up (correct streak threshold reached)
2. Line 280: Boss defeated (celebration)

These are semantically different events that happen to use the same sound. The plan should either:
- Document that `playLevelUp()` serves both purposes (and note the semantic conflation), or
- Add a `playBossDefeated()` event (or `playCelebration()`) for the boss-defeat case

---

## MINOR ISSUES

### m1. Plan lists 8 consumers but `BubbleGameContainer` has 2 distinct `play('frenzy')` calls with different semantics

**Severity**: Minor  
**Where**: `BubbleGameContainer.tsx` lines 133, 315

Line 133: `play('frenzy')` on boss spawn (alert/urgency)  
Line 315: `play('frenzy')` on power-up bubble pop (reward/celebration)

Both map to `playFrenzy()` in the new API. These are semantically different events using the same sound. Not a blocker, but worth noting that the plan's "one call site per sound event" claim is slightly undermined.

### m2. `UnitCompleteCinematic` calls `playSound('streak')` as a "shatter" sound — not a streak

**Severity**: Minor  
**Where**: `UnitCompleteCinematic.tsx` line 121

The cinematic uses `playSound('streak')` for a "shatter" effect during the cinematic sequence, not for an actual streak. The plan maps this to `playStreak()` which is semantically correct (same sound) but the naming might confuse future developers. Consider documenting that `playStreak()` is a "rising arpeggio" sound, not specifically a "streak" event.

### m3. `useMusicalSound` has its own `isMuted` from `useSound` — the plan should note this coupling

**Severity**: Minor  
**Where**: `useMusicalSound.ts` line 31

`useMusicalSound` calls `useSound()` internally to get `isMuted`. This means every component that calls both hooks creates **two** `useSound` instances, each with its own `isMuted` state. The repro test (`zz-repro-mute.test.ts`) explicitly demonstrates this bug. The plan correctly fixes this by merging into one hook, but doesn't mention that `useMusicalSound` currently has a hidden `useSound` dependency — the shim in D6 needs to handle this carefully.

### m4. Plan doesn't mention the `ThemeContext.test.tsx` mock

**Severity**: Minor  
**Where**: `src/context/ThemeContext.test.tsx` line 41

`ThemeContext.test.tsx` mocks `toggleSoundGarden` from ProfileContext. This mock will need to be updated if the ProfileContext API changes. The plan's "Files Affected" section should include this test file.

---

## POSITIVE ASPECTS (things the plan gets right)

1. ✅ **Consumer audit is accurate** — all 8 files verified, all 13 vibrate calls confirmed, all sound call sites accounted for
2. ✅ **No missed sound calls** — exhaustive grep confirms no sound/audio usage outside the listed files
3. ✅ **Dual AudioContext problem is real** — verified: `globalAudioContext` in useSound.ts, `globalMusicalAudioContext` in useMusicalSound.ts
4. ✅ **Mute state desync is real and demonstrated** — `zz-repro-mute.test.ts` proves the bug exists
5. ✅ **Volume sliders are non-functional** — confirmed: `useSound` never reads `sfxVolume` or `musicVolume`
6. ✅ **`toggleSoundGarden` stub confirmed** — line 43-45 of useMusicalSound.ts is a no-op
7. ✅ **3-card decomposition is logical** — create → migrate → test is the right order
8. ✅ **Backward-compatible shim approach** — reduces migration risk
9. ✅ **No new Context Provider** — correct decision for this scale

---

## VERIFICATION CHECKLIST

| Check | Status | Notes |
|-------|--------|-------|
| All sound call sites audited | ✅ Pass | 8 consumers, all verified |
| All vibrate call sites audited | ✅ Pass | 13 calls confirmed |
| No missed consumers | ✅ Pass | Exhaustive grep, no orphans |
| Mute state desync addressed | ✅ Pass | D3 moves to profile.settings |
| Volume control wired | ✅ Pass | D4 multiplies gain by sfxVolume |
| AudioContext singleton | ✅ Pass | D2 shares one context |
| AudioContext resume on gesture | ❌ Fail | B1 — not addressed |
| Vibration behavior preserved | ❌ Fail | B2 — silent behavior change |
| E2E test migration planned | ❌ Fail | B3 — not in any card |
| Combo reset on game start | ❌ Fail | M1 — not addressed |
| Rapid play / overlapping sounds | ⚠️ Partial | Oscillators auto-cleanup via onended, but no debounce/throttle |
| SSR / window guard | ⚠️ Partial | No `typeof window` check in getAudioContext |
| Test coverage plan | ✅ Pass | Card 3 covers all new paths |
| Dependency chain correct | ✅ Pass | Card 2 depends on Card 1, Card 3 on Card 2 |

---

## RECOMMENDED ACTIONS

1. **Update the plan** to address B1, B2, B3 before decomposing into builder cards
2. **Add `ctx.resume()` call** on first user gesture to `useSoundManager` spec (Card 1)
3. **Decouple vibration from mute** — use a separate `hapticsEnabled` flag or keep vibration unconditional
4. **Add E2E test update** to Card 2 or Card 3 explicitly
5. **Add `resetCombo()` calls** to Card 2 on game start/restart for all game components
6. **Document the `Director.recordResult` callback pattern** in Card 2's migration notes for `BubbleGameContainer`
7. **Consider `visibilitychange` listener** for suspend/resume of AudioContext (battery optimization)
