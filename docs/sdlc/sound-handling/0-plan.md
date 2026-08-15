# Phase 0 — Plan: Centralize Sound Handling

> **Date**: 2026-08-08
> **Branch**: `sdlc/loop-v0`
> **Repo**: `hebrew-math-adventures`
> **Status**: Planning complete — ready for decompose

---

## 1. Current State Audit

### A. Sound Infrastructure (2 hooks)

**`src/hooks/useSound.ts`** — Classic beep synthesizer
- Low-level Web Audio API oscillator-based sounds
- 7 sound types: `correct`, `wrong`, `levelUp`, `click`, `streak`, `frenzy`, `milestone`
- Global singleton `AudioContext` (lazily created, module-level)
- Mute state via `localStorage('isMuted')` — independent of ProfileContext
- Semantic API layer added in commit `e5e3832`: `playAnswerCorrect`, `playAnswerWrong`, `playLevelUp`
- Exposes: `{ playSound, play (alias), isMuted, toggleMute, playAnswerCorrect, playAnswerWrong, playLevelUp }`

**`src/hooks/useMusicalSound.ts`** — Sound Garden mode (melodic)
- C major scale note playback with combo tracking (wraps at 8, harmony at 9+)
- Operation-specific wave types: addition=sine, sub=triangle, mul=square, div=sawtooth
- Descending wrong-answer melody: C5 → G4 (2 notes, sine wave)
- **Own global `AudioContext`** (separate from useSound's — two concurrent contexts!)
- Receives `soundGardenEnabled` as a constructor prop (must be threaded from ProfileContext)
- Exposes: `{ playMelodyNote, playWrongMelody, resetMelodyCombo, isSoundGarden, toggleSoundGarden (stub!), melodyCombo, isMuted }`

### B. Consumer File Audit (8 files)

| # | File | Hooks Used | Sound Calls | SG Branching | Vibrate Calls |
|---|------|-----------|-------------|--------------|--------------|
| 1 | `PracticeMode.tsx` | useSound (semantic) + useMusicalSound | `playAnswerCorrect/Wrong`, `playLevelUp` | ✅ Via semantic API | 4 calls |
| 2 | `BubbleGameContainer.tsx` | useSound (raw) + useMusicalSound | `playSound('correct'/'wrong'/'levelUp')`, `play('frenzy')` | ❌ Inline if/else | 5 calls |
| 3 | `MathInvadersGame.tsx` | useSound (raw) + useMusicalSound | `playSound('correct'/'wrong')` | ❌ Inline if/else | 2 calls |
| 4 | `MemoryDuelGame.tsx` | useSound (raw) + useMusicalSound | `playSound('correct'/'wrong')` | ❌ Inline if/else | 2 calls |
| 5 | `FrenzyOverlay.tsx` | useSound (raw) | `play('frenzy')` | N/A (no SG variant) | 0 |
| 6 | `BubbleGame.tsx` (sensory) | useSound (mute/toggle only) | none (delegates to container) | N/A | 0 |
| 7 | `UnitCompleteCinematic.tsx` | useSound (raw) | `playSound('milestone')`, `playSound('streak')` | N/A | 0 |
| 8 | `PracticeHeader.tsx` | useSound (mute/toggle only) | none (UI only) | N/A | 0 |

**Total navigator.vibrate calls across the codebase: 13** (all in files #1–#4)

### C. Settings / Context Layer

| File | Role |
|------|------|
| `ProfileContext.tsx` | `toggleSoundGarden`, persists `soundGarden` boolean in `profile.settings` |
| `SettingsModal.tsx` | Volume/mute/Sound Garden toggle UI; reads `profile.settings` |
| `SettingsMenu.tsx` | Mute toggle (delegates to `useSound.toggleMute`) |
| `types/user.ts` | `settings { musicVolume: number, sfxVolume: number, isMuted: boolean, soundGarden?: boolean }` |

### D. Existing Tests

| Test File | Scope | Test Count |
|-----------|-------|------------|
| `src/hooks/__tests__/useSound.test.ts` | Classic beep synthesis, mute, localStorage | ~30 tests |
| `src/hooks/__tests__/useMusicalSound.test.ts` | Sound Garden: melody, combo, harmony, cleanup | 96 tests |
| `e2e/practice-mute-toggle.spec.ts` | E2E: mute toggle UI flow | 1 spec |

### E. Prior Work on Branch

- `e5e3832` — Added semantic API (`playAnswerCorrect/Wrong/LevelUp`) to `useSound.ts`; migrated `PracticeMode.tsx` to use it
- `6e8972f` — Added 96 unit tests for `useMusicalSound`
- `55e8a62` — Added `docs/plans/centralize-sound-handling.md` (a prior version of this plan)

---

## 2. Problems Identified

### P1. Duplicate AudioContexts
`useSound` and `useMusicalSound` each create their own global `AudioContext`. Browsers limit concurrent AudioContexts (typically ~6). Two are consumed unnecessarily. Wastes resources, complicates lifecycle.

### P2. Inconsistent Sound-Garden Branching (Duplicated Logic)
```ts
if (profile?.settings?.soundGarden) { playMelodyNote(); }
else { playSound('correct'); }
```
Copy-pasted across **BubbleGameContainer**, **MathInvadersGame**, and **MemoryDuelGame**. The semantic API (`playAnswerCorrect`/`playAnswerWrong`) was designed to eliminate this, but only `PracticeMode` was migrated. Three components still bypass it.

### P3. Two Hooks Must Be Called Together
Every game component calls BOTH `useSound()` and `useMusicalSound()`. They are tightly coupled (shared mute state, complementary roles) yet exposed as separate APIs. Forces consumers to wire them in concert and thread the same `soundGardenEnabled` prop.

### P4. Sound Garden State Source Fragmentation
- Mute state → `useSound` (`localStorage 'isMuted'`) — independent of ProfileContext
- Sound Garden state → `ProfileContext` (`profile.settings.soundGarden`)
- `useMusicalSound` receives `soundGardenEnabled` as a prop — must be manually threaded from profile
- `SettingsMenu` (in `PracticeHeader`) uses `useSound.toggleMute` which writes to `localStorage`, NOT to `profile.settings.isMuted`
- This creates a split: some sound settings in localStorage, some in ProfileContext

### P5. Vibration Scattered (13 call sites)
`navigator.vibrate()` called inline in 13 places, always paired with sound. No centralized haptic feedback. Each call independently checks `typeof navigator !== 'undefined' && navigator.vibrate`.

### P6. No Volume Control
`profile.settings` has `musicVolume` and `sfxVolume` (0..1) but both hooks ignore them — oscillator gain values are hardcoded (0.1–0.3). Settings UI shows volume sliders that do nothing.

### P7. `useMusicalSound.toggleSoundGarden` Is a Stub
The hook exposes `toggleSoundGarden` but it's a no-op comment stub. Actual persistence goes through `ProfileContext`. Misleading API surface.

### P8. Mute State Desync Risk
`useSound` reads/writes `localStorage('isMuted')` directly, while `ProfileContext` also holds `isMuted` in `profile.settings.isMuted`. Two sources of truth for the same setting. If `SettingsModal` sets `isMuted` via profile, `useSound` won't know (and vice versa).

---

## 3. Centralized Sound Manager Design

### Architecture: Single `useSoundManager` hook

```
┌─────────────────────────────────────────────────────────┐
│                   useSoundManager()                       │
│                                                           │
│  Merges: useSound (classic beeps) + useMusicalSound (SG)  │
│  Single AudioContext (shared)                             │
│  Reads ProfileContext internally for:                      │
│    - soundGarden boolean                                   │
│    - sfxVolume / musicVolume                               │
│    - isMuted (from profile, not localStorage)              │
│                                                           │
│  Exposes:                                                  │
│  ─────────────────────────────────────────────────────── │
│  Semantic events (zero branching in consumers):            │
│    playCorrect(operation?)  → SG: melody / classic: beep  │
│    playWrong()              → SG: desc melody / classic: buzz │
│    playLevelUp()            → fanfare                     │
│    playFrenzy()             → buzz                        │
│    playMilestone()          → chime                        │
│    playStreak()             → arpeggio                    │
│    playClick()              → click                        │
│                                                           │
│  Combo management:                                         │
│    resetCombo()                                           │
│    combo (read-only)                                       │
│                                                           │
│  Settings:                                                 │
│    isMuted, toggleMute()     → writes to profile.settings  │
│    isSoundGarden (read-only from ProfileContext)           │
│    sfxVolume, musicVolume (read-only from profile)         │
│                                                           │
│  Haptics (co-located):                                     │
│    vibrate(pattern)  → navigator.vibrate wrapper           │
│                       gated by isMuted                     │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**D1. Hook reads ProfileContext internally, NOT via prop**
Eliminates prop-drilling of `soundGardenEnabled`. The hook calls `useProfile()` and reads `profile.settings.soundGarden`. If no profile, defaults to `false`. All game components are within `ProfileContext.Provider`.

**D2. Single AudioContext**
One module-level `AudioContext` shared between classic beep synthesis and Sound Garden melodic playback. Saves browser resources, simplifies lifecycle.

**D3. Mute state unified to ProfileContext**
`isMuted` reads from `profile.settings.isMuted` instead of `localStorage`. `toggleMute()` calls `updateProfile()` to persist. Eliminates P4/P8 desync. `localStorage` key kept only for pre-migration backward compat (read once on init, then migrated).

**D4. Volume control wired in**
Oscillator gain values multiplied by `sfxVolume` from profile settings. Makes volume sliders functional.

**D5. Co-located haptics**
`vibrate(pattern)` wraps `navigator.vibrate` with the same `isMuted` guard. Replaces 13 scattered calls with one method.

**D6. Backward-compatible shim**
`useSound.ts` and `useMusicalSound.ts` become thin re-export wrappers delegating to `useSoundManager`. Existing tests and unmigrated components keep working. Can be deleted in a follow-up.

**D7. No Context Provider needed (yet)**
The hook uses module-level singleton `AudioContext` + `ProfileContext` for settings. A `SoundContext` provider would add complexity without benefit at this scale. If streaming audio or background music is added later, a provider would make sense.

---

## 4. Migration Strategy (3 child cards)

### Card 1 (builder, complex): Create `useSoundManager` hook
- **New file**: `src/hooks/useSoundManager.ts`
- Merge logic from `useSound.ts` + `useMusicalSound.ts`
- Single `AudioContext` (shared)
- Read `soundGarden`, `sfxVolume`, `isMuted` from `useProfile()` internally
- Expose: `playCorrect`, `playWrong`, `playLevelUp`, `playFrenzy`, `playMilestone`, `playStreak`, `playClick`, `resetCombo`, `combo`, `isMuted`, `toggleMute`, `isSoundGarden`, `sfxVolume`, `musicVolume`, `vibrate()`
- Convert `useSound.ts` and `useMusicalSound.ts` to thin re-export wrappers (deprecation JSDoc tags)
- All existing tests must still pass
- **Label: complex** (architecture, cross-cutting, >3 files)

### Card 2 (builder): Migrate all 8 consumers to `useSoundManager`
- `BubbleGameContainer.tsx`: replace `useSound`+`useMusicalSound` → `useSoundManager`; replace inline if/else SG branching with `playCorrect()`/`playWrong()`
- `MathInvadersGame.tsx`: same migration
- `MemoryDuelGame.tsx`: same migration
- `PracticeMode.tsx`: swap semantic API calls to `useSoundManager` equivalents
- `FrenzyOverlay.tsx`: `play('frenzy')` → `playFrenzy()`
- `UnitCompleteCinematic.tsx`: `playSound('milestone'/'streak')` → `playMilestone()`/`playStreak()`
- `BubbleGame.tsx`: `useSound()` → `useSoundManager()` (mute/toggle only)
- `PracticeHeader.tsx`: same
- Replace all 13 inline `navigator.vibrate` calls with `vibrate()` from hook
- **Label: complex** (8 files, cross-cutting)

### Card 3 (tester-unit): Port + extend tests for `useSoundManager`
- Port `useSound.test.ts` → `useSoundManager.test.ts` (classic beep paths)
- Port `useMusicalSound.test.ts` → `useSoundManager.test.ts` (SG paths)
- New tests: SG branching inside hook (mock ProfileContext)
- New tests: volume control (sfxVolume affects gain)
- New tests: vibrate wrapper (mock navigator.vibrate, mute gating)
- New tests: single AudioContext (verify only one created)
- New tests: mute reads from profile.settings, not localStorage
- **Label: standard**

---

## 5. Files Affected

**NEW:**
- `src/hooks/useSoundManager.ts`
- `src/hooks/__tests__/useSoundManager.test.ts`

**MODIFIED (migration):**
- `src/components/games/BubbleGameContainer.tsx`
- `src/components/games/MathInvadersGame.tsx`
- `src/components/games/MemoryDuelGame.tsx`
- `src/components/games/FrenzyOverlay.tsx`
- `src/components/PracticeMode.tsx`
- `src/components/sensory/BubbleGame.tsx`
- `src/components/cinematic/UnitCompleteCinematic.tsx`
- `src/components/practice/PracticeHeader.tsx`

**DEPRECATED (thin re-export wrappers, remove after migration verified):**
- `src/hooks/useSound.ts`
- `src/hooks/useMusicalSound.ts`

**EXISTING TESTS TO UPDATE:**
- `src/hooks/__tests__/useSound.test.ts`
- `src/hooks/__tests__/useMusicalSound.test.ts`
- Component test mocks that reference `useSound`/`useMusicalSound`

---

## 6. Verification

- All 551+ existing tests pass after Card 1 (shim preserves backward compat)
- All 551+ existing tests pass after Card 2 (consumers use new API, shims still work for any stragglers)
- New `useSoundManager.test.ts` passes with ported + new tests after Card 3
- E2E `practice-mute-toggle.spec.ts` still passes (mute toggle now writes to profile, not localStorage — test may need update)
- `npm run typecheck` clean
- No new runtime errors in dev server

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| ProfileContext not available in test mocks | Medium | Provide test utility to wrap hook in mock ProfileContext |
| Mute state migration (localStorage → profile) breaks existing flows | Medium | Read localStorage once on init for backward compat, then migrate |
| AudioContext singleton cleanup timing | Low | Keep existing cleanup pattern (osc.onended → disconnect) |
| E2E mute toggle test reads localStorage directly | Low | Test may need update to check profile.settings.isMuted; coordinate with Card 2 |
| 13 vibrate calls replaced — subtle timing differences | Low | Same patterns, same guard, just centralized |
