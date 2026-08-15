# Plan: Centralize Sound Handling

> **Date**: 2026-08-07  
> **Branch**: sdlc/loop-v0  
> **Status**: Planning complete — ready for builder cards

---

## 1. Current State Audit

### A. Sound Infrastructure (2 hooks)

**`src/hooks/useSound.ts`**
- Low-level Web Audio API synthesizer (oscillator-based beeps)
- 7 sound types: `correct`, `wrong`, `levelUp`, `click`, `streak`, `frenzy`, `milestone`
- Global singleton `AudioContext` (lazily created)
- Mute state via `localStorage('isMuted')`
- Semantic API layer: `playAnswerCorrect`, `playAnswerWrong`, `playLevelUp`
- Exposes: `{ playSound, play (alias), isMuted, toggleMute, playAnswerCorrect, playAnswerWrong, playLevelUp }`

**`src/hooks/useMusicalSound.ts`**
- Sound Garden mode: melodic note playback using C major scale
- Combo tracking (wraps at 8, adds harmony at 9+)
- Operation-specific wave types (addition=sine, sub=triangle, mul=square, div=sawtooth)
- Descending wrong-answer melody (C5 → G4)
- **Own global `AudioContext`** (duplicate of useSound's — two separate contexts!)
- Exposes: `{ playMelodyNote, playWrongMelody, resetMelodyCombo, isSoundGarden, toggleSoundGarden, melodyCombo, isMuted }`

### B. Consumer Files

| File | Hooks Used | Sound Calls | Pattern |
|------|-----------|-------------|---------|
| `PracticeMode.tsx` | useSound (semantic) + useMusicalSound | `playAnswerCorrect/Wrong`, `playLevelUp` | ✅ Centralized semantic API |
| `BubbleGameContainer.tsx` | useSound (raw) + useMusicalSound | `playSound('correct'/'wrong'/'levelUp')`, `play('frenzy')` | ❌ Mixed: raw + inline if/else SG logic |
| `MathInvadersGame.tsx` | useSound (raw) + useMusicalSound | `playSound('correct'/'wrong')` | ❌ Inline if/else SG logic |
| `MemoryDuelGame.tsx` | useSound (raw) + useMusicalSound | `playSound('correct'/'wrong')` | ❌ Inline if/else SG logic |
| `FrenzyOverlay.tsx` | useSound (raw) | `play('frenzy')` | ✅ Simple, no SG branching needed |
| `BubbleGame.tsx` (sensory) | useSound (mute/toggle only) | none (delegates to container) | ✅ Correct delegation |
| `UnitCompleteCinematic.tsx` | useSound (raw) | `playSound('milestone', 'streak')` | ✅ No SG variant needed |
| `PracticeHeader.tsx` | useSound (mute/toggle only) | none | ✅ UI only |

### C. Settings / Context

- `ProfileContext.tsx`: `toggleSoundGarden`, persists `soundGarden` boolean in `profile.settings`
- `SettingsModal.tsx`: volume/mute/Sound Garden toggle UI
- `SettingsMenu.tsx`: mute toggle (delegates to `useSound.toggleMute`)
- `user.ts`: `settings { musicVolume, sfxVolume, isMuted, soundGarden }`

---

## 2. Problems Identified

### P1. Duplicate Audio Contexts
`useSound` and `useMusicalSound` each create their own global `AudioContext`. Browsers limit the number of `AudioContext` instances (typically 6). With both hooks active in the same component tree, 2 are consumed. Not a bug today, but fragile and wastes resources.

### P2. Inconsistent Sound-Garden Branching (Duplicated Logic)
The if/else pattern:
```ts
if (profile?.settings?.soundGarden) { playMelodyNote(); }
else { playSound('correct'); }
```
is copy-pasted across **BubbleGameContainer**, **MathInvadersGame**, and **MemoryDuelGame**. This is exactly what `playAnswerCorrect`/`playAnswerWrong` in `useSound.ts` was designed to eliminate. These 3 components bypass the semantic API and re-implement the branching inline.

### P3. Two Hooks Must Be Called Together
Every game component must call BOTH `useSound()` and `useMusicalSound()` to get full sound coverage. The hooks are tightly coupled (shared mute state, complementary roles) yet exposed as separate APIs.

### P4. Sound Garden State Source Fragmentation
- Mute state lives in `useSound` (`localStorage 'isMuted'`)
- Sound Garden state lives in `ProfileContext` (`profile.settings.soundGarden`)
- `SettingsModal` toggles Sound Garden via `ProfileContext`, but `useMusicalSound` receives `soundGardenEnabled` as a prop — so it must be threaded manually
- This creates a prop-drilling chain: `ProfileContext → component → useMusicalSound`

### P5. Vibration Scattered (13 call sites)
`navigator.vibrate()` is called inline in 13 places, always paired with a sound call. No centralized haptic feedback. Not part of the card scope but worth noting as a co-located concern.

### P6. No Central Config for Volume
`profile.settings` has `musicVolume` and `sfxVolume` (0..1) but `useSound` ignores them — oscillator gain values are hardcoded (0.1–0.3). No volume control.

### P7. `useMusicalSound.toggleSoundGarden` Is a Stub
The hook exposes `toggleSoundGarden` but it's a no-op comment stub. Actual persistence goes through `ProfileContext`. Misleading API.

---

## 3. Centralized Sound Manager Design

**Goal:** One hook, one AudioContext, one call site per sound event.

```
┌─────────────────────────────────────────────────────┐
│                  useSoundManager()                    │
│                                                       │
│  Internally merges: useSound + useMusicalSound       │
│  Single AudioContext (shared)                        │
│  Reads soundGarden from ProfileContext internally     │
│  Reads isMuted from localStorage internally           │
│                                                       │
│  Exposes:                                             │
│  ─────────────────────────────────────────────────── │
│  Semantic events (zero branching in consumers):       │
│    playCorrect(operation?)  → SG: melody / classic: beep│
│    playWrong()              → SG: desc melody / classic: buzz│
│    playLevelUp()            → fanfare                  │
│    playFrenzy()             → buzz                     │
│    playMilestone()          → chime                    │
│    playStreak()             → arpeggio                 │
│    playClick()              → click                    │
│                                                       │
│  Combo management:                                    │
│    resetCombo()                                        │
│    combo (read-only)                                  │
│                                                       │
│  Settings:                                            │
│    isMuted, toggleMute()                              │
│    isSoundGarden (read-only from ProfileContext)      │
│    sfxVolume, musicVolume (read-only from profile)    │
│                                                       │
│  Haptics (bonus, co-located):                          │
│    vibrate(pattern)  → navigator.vibrate wrapper      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Migration Strategy (3 child cards)

### Card 1 (builder): Create `useSoundManager` hook
- New file: `src/hooks/useSoundManager.ts`
- Merges logic from `useSound.ts` + `useMusicalSound.ts`
- Single `AudioContext` (shared between classic beeps + Sound Garden)
- Reads `soundGarden` from `useProfile()` internally — no prop threading
- Exposes semantic event API: `playCorrect`, `playWrong`, `playLevelUp`, `playFrenzy`, `playMilestone`, `playStreak`, `playClick`, `resetCombo`, `combo`
- Exposes: `isMuted`, `toggleMute`, `isSoundGarden`, `sfxVolume`, `vibrate()`
- Keep `useSound.ts` and `useMusicalSound.ts` as thin re-exports for backward compatibility during migration (deprecation JSDoc tags)
- All existing tests must still pass

### Card 2 (builder): Migrate all consumers to `useSoundManager`
- `BubbleGameContainer`: replace `useSound`+`useMusicalSound` with `useSoundManager`; replace inline if/else SG branching with `playCorrect()`/`playWrong()`
- `MathInvadersGame`: same migration
- `MemoryDuelGame`: same migration
- `PracticeMode`: already uses semantic API — swap to `useSoundManager` equivalents
- `FrenzyOverlay`: replace `play('frenzy')` with `playFrenzy()`
- `UnitCompleteCinematic`: replace `playSound('milestone'/'streak')` with `playMilestone()`/`playStreak()`
- `BubbleGame`: replace `useSound()` with `useSoundManager()` (mute/toggle only)
- `PracticeHeader`: same
- Remove all inline `navigator.vibrate` calls; use `vibrate()` from hook

### Card 3 (tester-unit): Add/adjust tests for `useSoundManager`
- Port `useMusicalSound.test.ts` → `useSoundManager.test.ts`
- Port `useSound.test.ts` → `useSoundManager.test.ts` (where applicable)
- Add tests for: SG branching inside hook (mock ProfileContext)
- Add tests for: volume control (sfxVolume affects gain)
- Add tests for: vibrate wrapper (mock navigator.vibrate)
- Add tests for: single AudioContext (verify only one created)

---

## 5. Files Affected

**NEW:**
- `src/hooks/useSoundManager.ts`

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

**NEW TESTS:**
- `src/hooks/__tests__/useSoundManager.test.ts`

**EXISTING TESTS TO UPDATE:**
- `src/hooks/__tests__/useSound.test.ts`
- `src/hooks/__tests__/useMusicalSound.test.ts`
- Component test mocks that reference `useSound`/`useMusicalSound`

---

## 6. Key Design Decisions

### D1. Hook reads ProfileContext internally, NOT via prop
Eliminates prop-drilling of `soundGardenEnabled`. The hook calls `useProfile()` and reads `profile.settings.soundGarden`. If no profile, defaults to `false` (classic beeps). Safe — all game components are already within `ProfileContext.Provider`.

### D2. Single AudioContext
One global `AudioContext` shared between classic beep synthesis and Sound Garden melodic playback. Saves browser resources and simplifies lifecycle management.

### D3. Volume control wired in
Oscillator gain values multiplied by `sfxVolume` from profile settings. Music volume reserved for future background music control.

### D4. Co-located haptics
`vibrate(pattern)` wraps `navigator.vibrate` with the same `isMuted` guard. Reduces 13 scattered `navigator.vibrate` calls to one method.

### D5. Backward-compatible shim
`useSound.ts` and `useMusicalSound.ts` become thin re-export wrappers so existing tests and any unmigrated components keep working. They can be deleted in a follow-up once all consumers are migrated.

### D6. No Context Provider needed (yet)
The hook uses module-level singleton `AudioContext` + `ProfileContext` for settings. A `SoundContext` provider would add complexity without benefit at this scale. If we later add streaming audio, background music, or spatial audio, a provider would make sense — but not now.
