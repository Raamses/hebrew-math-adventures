# Phase 3: Math Pet Active Superpowers and Treat Economy — Build Artifact

**Card:** 13b4e48c-d454-4360-8a96-f6eb0278f10c
**Branch:** sdlc/loop-v0
**Model:** Claude analysis unavailable — session limit hit (3 attempts via `ask-claude --escalate --card` and `ask-claude --card`). Gemini CLI deprecated (UNSUPPORTED_CLIENT). Artifact built from direct codebase analysis by builder agent (glm-5.2). **This is explicitly disclosed: the delegated model did not serve.**
**Date:** 2026-08-15

## Model Delegation Log

| Attempt | Tool | Result |
|---------|------|--------|
| 1 | `ask-claude --escalate --card 13b4e48c...` | Session limit — "resets 2pm (Asia/Jerusalem)" |
| 2 | `ask-claude --card 13b4e48c...` (no escalate) | Session limit — same message |
| 3 | `ask-claude --card 13b4e48c...` (minimal test) | Session limit — same message |
| 4 | `gemini -p "..."` | `UNSUPPORTED_CLIENT` — Gemini Code Assist deprecated, migrate to Antigravity |

Per card instructions: "If the call genuinely fails, say so explicitly in the artifact rather than
silently substituting yourself." — Done. The analysis below is from glm-5.2 direct codebase
inspection, not from a stronger model. The `--card` flag was passed on all attempts; no
model-usage.jsonl entry was created because no model served.

---

## Summary

Make the pet companion active in game sessions by adding two new components
(`PetHud.tsx`, `PetSuperpower.tsx`) and one new hook (`usePetPower`). The pet
appears as a HUD overlay when happiness >70%, charges a superpower meter on
every correct answer, and unleashes a species-specific power when the player
taps the pet icon after 3 correct answers. The design reuses the existing
`PowerUpState` infrastructure for effects that overlap (cat freeze, dragon
pop-distractors) while adding new mechanics for owl (tens-digit highlight) and
robot/bear (shield). A `PetMood` enum drives expression changes.

## Baseline

- **Tests:** 921 passing (50 test files) — card note says 212, actual is 921
- **Branch:** `sdlc/loop-v0`
- **HEAD:** `54f39f4 fix(build): LessonModal step→stepType prop, exclude test files from tsc -b`
- **Key files inspected:** `src/types/user.ts`, `src/lib/pet.ts`, `src/components/pet/PetScreen.tsx`,
  `src/components/pet/PetAvatar.tsx`, `src/context/ProfileContext.tsx`, `src/components/games/BubbleGameContainer.tsx`,
  `src/components/PracticeMode.tsx`, `src/components/games/ArcadeHUD.tsx`, `src/engines/bubble/types.ts`,
  `src/hooks/useAnswerFlow.ts`, `src/hooks/usePracticeSession.ts`, `src/engines/bubble/useGameEngine.ts`,
  `src/hooks/useAnalytics.ts`, `src/types/analytics.ts`, `src/lib/worldConfig.ts`, `src/components/mascot/Mascot.tsx`,
  `src/context/__tests__/ProfileContext.pet.test.tsx`

---

## 1. Architecture Decision: Separate PetPowerState

**Decision: Create a separate `PetPowerState` type, do NOT reuse `PowerUpState`.**

### Rationale

| Factor | Reuse PowerUpState | Separate PetPowerState |
|--------|-------------------|----------------------|
| Cat/dragon overlap | Saves duplication | Must map pet power → power-up type |
| Owl/robot new mechanics | Doesn't fit — no "highlight" or "shield" PowerUpType | Clean — new type for new mechanics |
| Activation model | Power-ups activate on bubble pop; pet powers on tap | Different trigger semantics |
| Meter charging | Power-ups have no meter; pet powers charge via correct answers | Encapsulates meter state |
| Coexistence | Pet power + power-up bubble could both be active — state collision | Independent state objects |
| Testability | Must disambiguate which system set state | Each system owns its state |

The overlap between cat/dragon powers and existing power-up effects is real but
shallow. The cat "freeze" is a 5-second bubble freeze that maps to
`PowerUpType.freeze`, and the dragon "pop 2 distractors" maps to
`PowerUpType.pop_distractors`. However:

1. **Different trigger**: Power-up bubbles are popped to activate; pet powers
   are tap-activated after meter charge.
2. **Different duration model**: Power-ups use `expiresAt` timestamps; the
   shield (robot/bear) is a one-shot absorb, not a timer.
3. **Coexistence**: A player could have a freeze power-up active AND activate
   the cat's freeze. If they share state, the second activation overwrites the
   first. Separate state lets both coexist.
4. **Owl highlight**: This is a UI hint, not a game-state mutation. It needs to
   signal the BubbleGameContainer or PracticeMode to highlight a digit — there's
   no `PowerUpType` for this.

**Implementation approach**: `PetPowerState` is a separate type. For cat and
dragon powers, the activation handler calls into the existing power-up
application functions (reuse the effect logic) but tracks pet power state
independently.

---

## 2. New Types (src/types/user.ts)

```typescript
// --- Pet Superpower Types ---

/** Pet-specific power types, one per species */
export type PetPowerType = 'tens_highlight' | 'pop_distractors' | 'freeze' | 'shield';

/** Activation state for the pet superpower */
export interface PetPowerState {
    /** Whether the meter is currently charging (correct answers accumulating) */
    meterCharging: boolean;
    /** Number of correct answers toward the next charge (0-3) */
    meterCount: number;
    /** Whether the power is ready to activate (meter full) */
    ready: boolean;
    /** Whether the power is currently active */
    active: boolean;
    /** Which power type is active (null when inactive) */
    activeType: PetPowerType | null;
    /** Timestamp when the active power expires (for timed effects) */
    expiresAt: number | null;
    /** Whether the shield has been consumed (for shield power) */
    shieldConsumed: boolean;
}

/** Pet mood for expression/animation during gameplay */
export type PetMood = 'happy' | 'neutral' | 'sad' | 'excited' | 'power_ready';

/** Extended PetState with power info (additive to existing PetState) */
// PetState gains an optional power field:
// export interface PetState {
//     ...existing fields...
//     power?: PetPowerState;  // NEW — session-local, not persisted
// }
```

**Key decisions:**
- `PetPowerState` is **session-local**, not persisted to localStorage. It
  resets every session. We store it on the component/hook level, not in
  `ProfileContext`. This avoids migration concerns and keeps the profile clean.
- `PetMood` is derived from `happiness` + `meterCount` + `active` state —
  computed, not stored.
- The `power` field on `PetState` is optional and transient. If we don't want
  it on `PetState` at all (since it's session-local), we can keep it entirely in
  the `usePetPower` hook. **Recommendation: keep it in the hook only, do not add
  to PetState.** This avoids `ProfileContext` validation changes.

### Species → Power Mapping

```typescript
export const PET_POWER_MAP: Record<PetSpecies, PetPowerType> = {
    owl:    'tens_highlight',
    cat:    'freeze',
    dragon: 'pop_distractors',
    robot:  'shield',   // robot stands in for "bear" — see §8
};
```

---

## 3. Species Mapping: Bear vs Robot (§8)

**Recommendation: Map bear → robot. Do not add 'bear' to PetSpecies.**

### Rationale

1. **Existing profiles**: Kids already have pets with `species: 'robot'`. Adding
   `'bear'` doesn't break them, but renaming `'robot'` to `'bear'` would require
   a migration.
2. **Validation**: `ProfileContext` validates `species` against
   `['owl', 'cat', 'dragon', 'robot']`. Adding `'bear'` means updating the
   validator, the `PET_SPECIES_OPTIONS` array, the `PET_EMOJI` map, and
   `PetAvatar`. That's 4 files for a cosmetic change.
3. **Visuals**: The card says "Bear: Provides a shield." The robot can provide
   a shield just as thematically (force field). No need for a new species.
4. **If bear is truly desired later**: Add `'bear'` as a 5th species in a
   separate change. For now, `robot → shield` is zero-risk.

**In the UI**, the power description can say "Shield!" without mentioning "bear"
or "robot" — it's the power name, not the species name.

---

## 4. usePetPower Hook Design

```typescript
// src/hooks/usePetPower.ts

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PetSpecies, PetPowerType, PetMood } from '../types/user';

interface UsePetPowerProps {
    species: PetSpecies;
    happiness: number;           // decayed happiness, 0-100
    onActivate: (power: PetPowerType) => void;  // host-side effect handler
    onExpire?: (power: PetPowerType) => void;   // cleanup when timed effect ends
}

interface UsePetPowerReturn {
    visible: boolean;            // happiness > 70
    mood: PetMood;               // derived expression
    meterCount: number;          // 0-3
    ready: boolean;              // meterCount >= 3
    active: boolean;             // power currently active
    activeType: PetPowerType | null;
    registerCorrect: () => void; // call on each correct answer
    activate: () => void;        // call when pet icon tapped
    reset: () => void;           // call on session restart
}

export const usePetPower = ({
    species,
    happiness,
    onActivate,
    onExpire,
}: UsePetPowerProps): UsePetPowerReturn => {
    const [meterCount, setMeterCount] = useState(0);
    const [active, setActive] = useState(false);
    const [activeType, setActiveType] = useState<PetPowerType | null>(null);
    const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const powerType: PetPowerType = PET_POWER_MAP[species];
    const visible = happiness > 70;
    const ready = meterCount >= 3;

    const mood: PetMood = active ? 'excited'
        : ready ? 'power_ready'
        : happiness >= 80 ? 'happy'
        : happiness >= 70 ? 'neutral'
        : 'sad';

    const registerCorrect = useCallback(() => {
        setMeterCount(prev => Math.min(3, prev + 1));
    }, []);

    const activate = useCallback(() => {
        if (!ready || active) return;
        setActive(true);
        setActiveType(powerType);
        setMeterCount(0); // consume the charge

        onActivate(powerType);

        // Timed powers expire after 5 seconds (freeze, tens_highlight)
        // Shield is one-shot — no timer, expires on consumption
        if (powerType === 'freeze' || powerType === 'tens_highlight') {
            expireTimerRef.current = setTimeout(() => {
                setActive(false);
                setActiveType(null);
                onExpire?.(powerType);
            }, 5000);
        }
        // pop_distractors is instant — no timer needed
        if (powerType === 'pop_distractors') {
            // Effect is instant, deactivate after a short animation window
            expireTimerRef.current = setTimeout(() => {
                setActive(false);
                setActiveType(null);
            }, 1000); // 1s for fire breath animation
        }
    }, [ready, active, powerType, onActivate, onExpire]);

    const reset = useCallback(() => {
        if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
        setMeterCount(0);
        setActive(false);
        setActiveType(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
        };
    }, []);

    return { visible, mood, meterCount, ready, active, activeType, registerCorrect, activate, reset };
};
```

**Why a hook (not inline in PetHud)?**
- The meter logic (charge, consume, cooldown) is identical across both hosts
  (BubbleGameContainer and PracticeMode). Only the `onActivate` callback differs.
- Timer teardown is the kind of thing that goes wrong when duplicated.
- The hook doesn't render anything — it's pure state. This keeps PetHud as a
  presentational component and makes the hook independently testable.

**Why not a context?**
- No cross-screen consumer. The power state is session-local. Putting it in
  context re-renders the whole subtree on every meter increment. In
  BubbleGameContainer that's 20+ framer-motion bubbles per state change.

---

## 5. PetHud.tsx Component Design

```typescript
// src/components/games/PetHud.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPetEmoji } from '../../lib/pet';
import type { PetSpecies, PetMood } from '../../types/user';

interface PetHudProps {
    species: PetSpecies;
    petName: string;
    level: number;               // for emoji stage
    visible: boolean;            // happiness > 70
    mood: PetMood;
    meterCount: number;          // 0-3
    ready: boolean;              // meter full
    active: boolean;
    onTap: () => void;           // activate power
    /** Which power type for the label/icon */
    powerLabel: string;
}
```

### Layout

```
┌──────────────────────────────────────────┐
│              Game Area                    │
│                                          │
│                                          │
│                                          │
│  ┌─────┐                        ┌─────┐  │
│  │ 🦉  │  ●●○                   │     │  │
│  │     │  Tens Highlight        │     │  │
│  └─────┘                        └─────┘  │
│  ^ bottom-left, RTL-aware       ^ HUD   │
└──────────────────────────────────────────┘
```

- **Position**: `fixed bottom-4 left-4` (LTR) / `bottom-4 right-4` (RTL via
  `dir="rtl"` on parent). Uses `z-40` to sit above game entities but below
  modals (`z-50`).
- **Size**: 56×56px container (w-14 h-14), pet emoji at `text-3xl`.
- **Meter**: 3 dots below the pet icon. Filled dots are colored, empty are gray.
  When all 3 are filled, the container gets a pulsing glow ring
  (`ring-2 ring-yellow-400 animate-pulse`).
- **Tap target**: The entire 56×56 container is a button. `disabled` when
  `!ready || active`.
- **Active state**: When power is active, show a small badge overlay
  (❄️ for freeze, 🔥 for pop_distractors, 💡 for tens_highlight, 🛡️ for shield).
- **Mood animation**: Framer Motion variants per mood:
  - `happy`: gentle bounce (y: [0, -3, 0], repeat)
  - `power_ready`: excited bounce + scale pulse
  - `excited`: rotate + scale (power active)
  - `neutral`: idle float
  - `sad`: droop (y: 5, rotate: -5)

### RTL Consideration

The game uses `dir="rtl"` on the root. The pet HUD must appear in the
bottom-right corner in RTL mode. Using `left-4` with the RTL parent will
auto-mirror. To be safe, use CSS logical properties: `inset-inline-start: 1rem`.
Or simpler: wrap in a div with `dir="ltr"` to keep the pet fixed left, since
it's a UI element not a text element.

**Recommendation**: Use `fixed bottom-4 left-4 z-40` with `dir="ltr"` wrapper.
The pet icon and meter are visual, not text — no RTL mirroring needed.

---

## 6. PetSuperpower.tsx — Effect Implementations

```typescript
// src/components/games/PetSuperpower.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PetPowerType } from '../../types/user';

interface PetSuperpowerProps {
    activeType: PetPowerType | null;
    active: boolean;
    /** For owl: the tens digit to highlight */
    highlightDigit?: number;
    /** For dragon: number of distractors popped */
    distractorsPopped?: number;
}
```

### Per-Species Effects

#### Owl — Tens Highlight (`tens_highlight`)

**Mechanism**: When activated, the owl power highlights the correct tens digit
in the current problem's answer. This is a **UI hint**, not a game-state change.

**In BubbleGameContainer**: The `behavior.getTargetValue()` returns the current
answer. The tens digit is `Math.floor(answer / 10) % 10`. PetSuperpower renders
a floating badge near the instruction area: "Tens digit: X" with a glowing
animation. The host (BubbleGameContainer) passes `highlightDigit` as a prop.

**In PracticeMode**: The `problem` object has the answer. PetSuperpower renders
a highlight overlay on the MathCard's answer area, drawing attention to the
tens digit of the correct answer.

**Implementation**: PetSuperpower renders a `<motion.div>` with the digit
displayed in large golden text and a pulsing glow. It's a visual hint — no
bubbles are modified.

```tsx
{activeType === 'tens_highlight' && (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
        <div className="bg-yellow-400 text-white text-2xl font-bold px-6 py-3 rounded-full shadow-lg border-2 border-yellow-300 animate-pulse">
            💡 Tens digit: {highlightDigit}
        </div>
    </motion.div>
)}
```

#### Dragon — Pop Distractors (`pop_distractors`)

**Mechanism**: When activated, 2 wrong distractor bubbles are instantly popped.
This is a **game-state change**.

**In BubbleGameContainer**: The `onActivate` callback filters `entities` to find
distractors (entities where `validate(entity) === false` and `!entity.isPopped`
and `!entity.isPowerUp` and `!entity.isBoss`), picks 2, and marks them as
popped with an explosion effect. This reuses the existing explosion visual.

**In PracticeMode**: Not applicable in the same way (no bubbles). For
PracticeMode, the dragon power could reveal 2 wrong answer choices by
greying them out. But PracticeMode's `MathCard` may not always have multiple
choice. **Recommendation**: In PracticeMode, dragon power gives a "skip" —
advances to the next problem without penalty. This is a different but useful
effect.

**Implementation in BubbleGameContainer**:
```tsx
const handlePetPower = useCallback((power: PetPowerType) => {
    if (power === 'pop_distractors') {
        // Find up to 2 wrong, non-popped, non-powerup, non-boss entities
        const distractors = entitiesRef.current
            .filter(e => !e.isPopped && !e.isPowerUp && !e.isBoss && !behavior.validate(e))
            .slice(0, 2);
        distractors.forEach(d => {
            setExplosions(prev => [...prev, { id: `${d.id}-pet-exp`, x: d.x, y: 200 }]);
            // Mark as popped via engine's handlePop with a fake "wrong" validation
            // Or directly set entities to filter them out
        });
        // Add fire breath animation via PetSuperpower overlay
    }
    // ... other power handlers
}, [behavior, entitiesRef]);
```

**Risk**: Directly modifying entities bypasses the engine's normal pop flow.
Safest approach: add a `removeEntities(ids: string[])` function to
`useGameEngine` that marks entities as popped without scoring.

#### Cat — Freeze (`freeze`)

**Mechanism**: Freezes all bubbles for 5 seconds. Overlaps with existing
`PowerUpType.freeze`.

**In BubbleGameContainer**: Reuse the existing freeze mechanic. The
`onActivate` callback sets `gameState.powerUpState` to a freeze state with
`expiresAt = Date.now() + 5000`. The existing `getEffectiveSpeedMultiplier()`
already returns 0 for freeze — no new code needed for the effect itself.

**Difference from power-up freeze**: Pet freeze is activated by tap, not by
popping a power-up bubble. The state setting is the same.

**Implementation**:
```tsx
if (power === 'freeze') {
    // Reuse existing power-up state infrastructure
    setGameState(prev => ({
        ...prev,
        powerUpState: {
            type: 'freeze',
            active: true,
            expiresAt: Date.now() + 5000,
        },
    }));
}
```

**In PracticeMode**: Freeze doesn't apply (no moving bubbles). For
PracticeMode, cat power could add 10 seconds to the timer in TIME_ATTACK
mode, or skip a wrong-answer penalty in SURVIVAL. **Recommendation**: In
PracticeMode, cat power gives "extra time" — +10s in TIME_ATTACK, +1 life
in SURVIVAL, or a free skip in STANDARD.

#### Robot — Shield (`shield`)

**Mechanism**: Absorbs 1 strike (wrong answer). This is a **new mechanic** —
no existing power-up does this.

**In BubbleGameContainer**: The shield intercepts `gameState.strikes`. When the
shield is active and a wrong answer would increment strikes, the shield
absorbs it instead: strikes stays the same, `shieldConsumed` becomes true,
shield deactivates.

**Implementation**:
```tsx
// In onPopWrapper, before incrementing strikes:
if (isCorrect === false) {
    if (petPower.shieldActive && !petPower.shieldConsumed) {
        // Shield absorbs the strike
        petPower.consumeShield();
        // Don't increment strikes — return early for the strike logic
        // Still play a shield-break sound/animation
        return;
    }
}
```

**In PracticeMode**: Shield absorbs a life loss in SURVIVAL mode. When a wrong
answer would decrement `lives`, the shield blocks it instead.

**The shield is one-shot**: It activates on tap, stays armed until a wrong
answer arrives, then breaks. No timer needed.

**State**: The `usePetPower` hook tracks `shieldConsumed` — but actually, since
the shield is active until consumed, we can simplify: `active = true` means
shield is armed. When a wrong answer arrives, the host calls `petPower.reset()`
or sets `active = false`. The hook doesn't need `shieldConsumed` — the host
just deactivates the power.

**Revised approach**: The hook's `active` state for shield means "shield
armed." The host calls a `deactivate()` function when the shield is consumed.
Add `deactivate` to the hook's return:

```typescript
const deactivate = useCallback(() => {
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    setActive(false);
    setActiveType(null);
}, []);
```

---

## 7. Integration Points

### 7.1 BubbleGameContainer.tsx

**Changes:**

1. **Import PetHud and usePetPower**:
```typescript
import { PetHud } from './PetHud';
import { PetSuperpower } from './PetSuperpower';
import { usePetPower } from '../../hooks/usePetPower';
```

2. **Initialize the hook** (inside component, after `useProfile`):
```typescript
const { profile } = useProfile();
const pet = profile?.pet;
const todayISO = new Date().toISOString().slice(0, 10);
const happiness = pet ? decayedHappiness(pet, todayISO) : 0;

const handlePetPower = useCallback((power: PetPowerType) => {
    if (power === 'freeze') {
        // Reuse existing power-up freeze
        // Need access to setGameState from useGameEngine — see below
    }
    if (power === 'pop_distractors') {
        // Pop 2 distractors — need entity access
    }
    if (power === 'tens_highlight') {
        // Visual only — PetSuperpower component handles display
        const target = behavior.getTargetValue?.() ?? 0;
        setPetHighlightDigit(Math.floor(target / 10) % 10);
    }
    if (power === 'shield') {
        // Shield armed — no immediate action needed
    }
    logEvent('pet_power_used', {
        pet_type: pet?.species,
        power_type: power,
        node_id: 'sensory',
    });
}, [behavior, pet, logEvent]);

const petPower = usePetPower({
    species: pet?.species ?? 'owl',
    happiness,
    onActivate: handlePetPower,
});
```

3. **Feed correct answers to meter** (in `onPopWrapper`, after `isCorrect` is true):
```typescript
if (isCorrect) {
    petPower.registerCorrect();
    // ... existing correct-answer logic
}
```

4. **Shield interception** (in `onPopWrapper`, before wrong-answer processing):
```typescript
if (isCorrect === false && petPower.active && petPower.activeType === 'shield') {
    petPower.deactivate();
    // Show shield-break animation
    setExplosions(prev => [...prev, { id: `shield-${Date.now()}`, x: 50, y: 50 }]);
    soundManager.vibrate([50, 100, 50]);
    // Skip strike increment — return early
    return;
}
```

5. **Render PetHud** (at the end of the JSX, before closing div):
```tsx
{petPower.visible && pet && (
    <PetHud
        species={pet.species}
        petName={pet.name}
        level={profile?.capabilities?.estimatedLevel ?? 1}
        visible={petPower.visible}
        mood={petPower.mood}
        meterCount={petPower.meterCount}
        ready={petPower.ready}
        active={petPower.active}
        onTap={petPower.activate}
        powerLabel={POWER_LABELS[pet.species]}
    />
)}
{petPower.active && (
    <PetSuperpower
        activeType={petPower.activeType}
        active={petPower.active}
        highlightDigit={petHighlightDigit}
    />
)}
```

6. **Reset on session end** (in the victory/game-over effect):
```typescript
petPower.reset();
```

**Tricky parts:**
- `useGameEngine` doesn't currently expose `setGameState` directly. For the
  cat/freeze power, we either need to add a `setPowerUpState` method to
  `useGameEngine` or add a `applyExternalPowerUp(type: PowerUpType, durationMs: number)`
  function. The latter is cleaner — it keeps the state management inside the
  engine.
- For dragon/pop_distractors, we need access to `entities` and the ability to
  mark entities as popped. The engine already has `handlePop` — we could call
  it with the distractor's ID, but that would score it as wrong. Better: add a
  `removeEntities(ids: string[])` method to `useGameEngine`.

**Required additions to `useGameEngine.ts`:**
```typescript
// New exported function in the hook's return:
const applyExternalPowerUp = useCallback((type: PowerUpType, durationMs: number) => {
    setGameState(prev => ({
        ...prev,
        powerUpState: {
            type,
            active: true,
            expiresAt: Date.now() + durationMs,
        },
    }));
}, []);

const removeEntities = useCallback((ids: string[]) => {
    setEntities(prev => prev.map(e =>
        ids.includes(e.id) ? { ...e, isPopped: true, poppedAt: Date.now() } : e
    ));
}, []);
```

### 7.2 PracticeMode.tsx

**Changes:**

1. **Import PetHud and usePetPower** (same as above).

2. **Initialize the hook**:
```typescript
const pet = profile?.pet;
const todayISO = new Date().toISOString().slice(0, 10);
const happiness = pet ? decayedHappiness(pet, todayISO) : 0;

const handlePetPower = useCallback((power: PetPowerType) => {
    if (power === 'tens_highlight') {
        const answer = problem?.answer ?? 0;
        setPetHighlightDigit(Math.floor(answer / 10) % 10);
    }
    if (power === 'freeze') {
        // In PracticeMode: +10s in TIME_ATTACK, +1 life in SURVIVAL, skip in STANDARD
        if (session.mode === 'TIME_ATTACK') {
            // Need access to session timeLeft update — use dispatch or a new action
        }
        // For STANDARD: advance to next problem without penalty
    }
    if (power === 'pop_distractors') {
        // In PracticeMode: skip to next problem
        nextProblem();
    }
    if (power === 'shield') {
        // Shield armed — intercept next wrong answer
    }
    logEvent('pet_power_used', {
        pet_type: pet?.species,
        power_type: power,
        node_id: problemConfig?.type || 'mixed',
    });
}, [pet, problem, session.mode, logEvent, nextProblem]);

const petPower = usePetPower({
    species: pet?.species ?? 'owl',
    happiness,
    onActivate: handlePetPower,
});
```

3. **Feed correct answers** (in `handleAnswer`, after `isCorrect` is true):
```typescript
if (isCorrect) {
    petPower.registerCorrect();
    // ... existing logic
}
```

4. **Shield interception** (in `handleAnswer`, for wrong answers):
```typescript
if (!isCorrect && petPower.active && petPower.activeType === 'shield') {
    petPower.deactivate();
    // Don't submit the wrong answer — or submit but prevent life loss
    // Simplest: don't call submitResult(false)
    return;
}
```

5. **Render PetHud** (in the JSX, after the MathCard):
```tsx
{petPower.visible && pet && (
    <PetHud
        species={pet.species}
        petName={pet.name}
        level={profile?.capabilities?.estimatedLevel ?? 1}
        visible={petPower.visible}
        mood={petPower.mood}
        meterCount={petPower.meterCount}
        ready={petPower.ready}
        active={petPower.active}
        onTap={petPower.activate}
        powerLabel={POWER_LABELS[pet.species]}
    />
)}
```

6. **Reset on session restart/summary**:
```typescript
// In handleRestart and handlePlayAgain:
petPower.reset();
```

**Tricky parts:**
- `usePracticeSession` uses a reducer. To add time/lives from pet powers, we
  either need new reducer actions (`BONUS_TIME`, `BONUS_LIFE`) or handle it
  outside the reducer. Adding actions is cleaner.
- For the shield in PracticeMode, the simplest approach is to not call
  `submitResult(false)` when the shield is active — the player gets a free
  pass on one wrong answer. This doesn't require reducer changes.

**Required additions to `usePracticeSession.ts`:**
```typescript
// New action types:
| { type: 'BONUS_TIME'; seconds: number }
| { type: 'BONUS_LIFE' }

// In reducer:
case 'BONUS_TIME':
    return { ...state, timeLeft: state.timeLeft + action.seconds };
case 'BONUS_LIFE':
    return { ...state, lives: state.lives + 1 };
```

### 7.3 ProfileContext.tsx

**Changes needed: minimal.**

The pet power state is **session-local** — it lives in the `usePetPower` hook,
not in `ProfileContext`. The only ProfileContext change is:

1. **Pet happiness micro-updates during gameplay**: When a correct answer is
   registered, optionally nudge happiness +1 (capped at 100) to make the pet
   feel "alive" during play. This is optional and can be deferred.

2. **pet_fed_streak analytics**: When `feedPet()` is called, log the current
   streak:
```typescript
const feedPet = useCallback(() => {
    if (!profile || !profile.pet) return;
    if ((profile.gems || 0) < 2) return;
    const todayISO = new Date().toISOString().slice(0, 10);
    if (profile.pet.lastFedDate === todayISO) return;
    updateProfile(profile.id, {
        gems: (profile.gems || 0) - 2,
        pet: { ...profile.pet, happiness: Math.min(100, profile.pet.happiness + 25), lastFedDate: todayISO },
    });
    // NEW: Log fed streak
    logEvent('pet_fed_streak', { streak_count: profile.streak });
}, [profile, updateProfile, logEvent]);
```

That's it. No structural changes to ProfileContext.

### 7.4 types/user.ts

**Changes:**

```typescript
// Add new types (additive, no breaking changes):

export type PetPowerType = 'tens_highlight' | 'pop_distractors' | 'freeze' | 'shield';

export type PetMood = 'happy' | 'neutral' | 'sad' | 'excited' | 'power_ready';

// PetState unchanged — power state is session-local in the hook
// No need to add power field to PetState

// But if we want to persist "last power used" for analytics:
// Add to PetState: lastPowerUsedDate?: string | null;
// This is optional and can be deferred.
```

**No validation changes needed** in `ProfileContext` because `PetState` is
unchanged. The new types are used only in the hook and components.

---

## 8. Power Labels & Icons

```typescript
const POWER_LABELS: Record<PetSpecies, string> = {
    owl:    '💡 Tens Highlight',
    cat:    '❄️ Freeze Bubbles',
    dragon: '🔥 Pop Distractors',
    robot:  '🛡️ Shield',
};

const POWER_ICONS: Record<PetPowerType, string> = {
    tens_highlight: '💡',
    freeze: '❄️',
    pop_distractors: '🔥',
    shield: '🛡️',
};
```

---

## 9. GA4 Events

### pet_power_used

```typescript
logEvent('pet_power_used', {
    pet_type: pet.species,        // 'owl' | 'cat' | 'dragon' | 'robot'
    power_type: power,            // 'tens_highlight' | 'freeze' | etc.
    node_id: nodeId,              // 'sensory' for bubble, problem type for practice
});
```

**Integration**: Called in the `onActivate` handler in both BubbleGameContainer
and PracticeMode. The `useAnalytics` hook's `logEvent` accepts string event
names, so `'pet_power_used'` works without updating `AnalyticsEvent` type.

### pet_fed_streak

```typescript
logEvent('pet_fed_streak', {
    streak_count: profile.streak, // current day streak
});
```

**Integration**: Called in `ProfileContext.feedPet()` after a successful feed.

### AnalyticsEvent type extension (optional):

```typescript
// In src/hooks/useAnalytics.ts AnalyticsEvent union:
| 'pet_power_used'
| 'pet_fed_streak'
```

This is additive — existing events are unaffected.

---

## 10. Test Plan

### Existing Tests — Regression Safety

All 921 tests must pass. The integration approach is **additive**:
- New files (`PetHud.tsx`, `PetSuperpower.tsx`, `usePetPower.ts`) don't touch
  existing code paths.
- `BubbleGameContainer` changes are conditional (`if (petPower.visible && pet)`)
  — no pet means no pet code runs.
- `PracticeMode` changes are similarly conditional.
- `ProfileContext` only adds a `logEvent` call in `feedPet` — no logic change.
- `types/user.ts` adds new types — no changes to existing types.
- `useGameEngine` additions (`applyExternalPowerUp`, `removeEntities`) are new
  exports — existing callers are unaffected.

**Risk areas for regression**:
1. `BubbleGameContainer` — adding the `petPower.registerCorrect()` call inside
   `onPopWrapper`. This is after the existing logic, so it shouldn't affect
   timing. But the callback now has an additional dependency. Must ensure
   `petPower.registerCorrect` is stable (useCallback with `[]` deps).
2. `useGameEngine` — adding `applyExternalPowerUp` and `removeEntities` to the
   return object. The hook's return is used by `BubbleGameContainer` only. No
   existing test directly tests `useGameEngine` return shape (tests go through
   `BubbleGameContainer`).
3. `ProfileContext.feedPet` — adding `logEvent` changes the function's
   dependency array. The `ProfileContext.pet.test.tsx` tests check `feedPet`
   behavior. The `logEvent` call is fire-and-forget (async, no await) — it
   shouldn't change the function's synchronous behavior.

### New Unit Tests

#### Test file: `src/components/games/__tests__/PetHud.test.tsx`

```typescript
describe('PetHud', () => {
    it('renders with correct pet type (owl)', () => {
        // Render PetHud with species='owl', visible=true
        // Assert: pet emoji 🦉 is present
        // Assert: meter shows 0/3
    });

    it('renders with correct pet type (dragon)', () => {
        // Render PetHud with species='dragon', visible=true
        // Assert: pet emoji 🐉 is present
    });

    it('hides when visible=false (happiness < 70%)', () => {
        // Render PetHud with visible=false
        // Assert: component returns null (or has display:none)
    });

    it('shows 3 filled meter dots when ready=true', () => {
        // Render PetHud with meterCount=3, ready=true
        // Assert: 3 filled dots, container has pulse animation class
    });

    it('disables tap when ready=false', () => {
        // Render PetHud with ready=false
        // Assert: button is disabled
    });

    it('calls onTap when tapped and ready', () => {
        // Render PetHud with ready=true
        // Fire click on pet button
        // Assert: onTap was called
    });

    it('shows power label for correct species', () => {
        // Render with species='cat'
        // Assert: '❄️ Freeze Bubbles' text is present
    });

    it('shows active badge when active=true', () => {
        // Render with active=true, activeType='shield'
        // Assert: 🛡️ badge is present
    });
});
```

#### Test file: `src/hooks/__tests__/usePetPower.test.ts`

```typescript
describe('usePetPower', () => {
    it('meter charges after 3 correct answers', () => {
        // Render hook with happiness=80
        // Call registerCorrect() 3 times
        // Assert: ready=true, meterCount=3
    });

    it('meter caps at 3', () => {
        // Call registerCorrect() 5 times
        // Assert: meterCount=3 (capped)
    });

    it('ready is false before 3 correct answers', () => {
        // Call registerCorrect() 2 times
        // Assert: ready=false, meterCount=2
    });

    it('activate does nothing when not ready', () => {
        // Call activate() with meterCount=0
        // Assert: active=false, onActivate not called
    });

    it('activate triggers onActivate when ready', () => {
        // Charge to 3, call activate()
        // Assert: active=true, onActivate called with correct power type
    });

    it('each pet type activates correct power', () => {
        // Test with species='owl' → onActivate called with 'tens_highlight'
        // Test with species='cat' → onActivate called with 'freeze'
        // Test with species='dragon' → onActivate called with 'pop_distractors'
        // Test with species='robot' → onActivate called with 'shield'
    });

    it('freeze power expires after 5 seconds', async () => {
        // Use fake timers
        // Activate freeze power
        // Advance 5000ms
        // Assert: active=false, onExpire called
    });

    it('shield does not auto-expire (stays armed until consumed)', () => {
        // Activate shield power
        // Advance 10 seconds
        // Assert: active=true (shield still armed)
    });

    it('deactivate clears active state', () => {
        // Activate shield, then deactivate()
        // Assert: active=false, activeType=null
    });

    it('reset clears meter and active state', () => {
        // Charge to 3, activate, then reset()
        // Assert: meterCount=0, active=false, activeType=null
    });

    it('visible is false when happiness <= 70', () => {
        // Render with happiness=70
        // Assert: visible=false
    });

    it('visible is true when happiness > 70', () => {
        // Render with happiness=71
        // Assert: visible=true
    });

    it('mood reflects happiness and power state', () => {
        // happiness=85, not ready → 'happy'
        // happiness=75, ready=true → 'power_ready'
        // active=true → 'excited'
        // happiness=72, not ready → 'neutral'
    });
});
```

#### Test file: `src/components/games/__tests__/PetSuperpower.test.tsx`

```typescript
describe('PetSuperpower', () => {
    it('renders tens highlight overlay for owl power', () => {
        // Render with activeType='tens_highlight', highlightDigit=3
        // Assert: "Tens digit: 3" text is present
    });

    it('renders freeze overlay for cat power', () => {
        // Render with activeType='freeze'
        // Assert: ❄️ icon/animation present
    });

    it('renders fire overlay for dragon power', () => {
        // Render with activeType='pop_distractors'
        // Assert: 🔥 animation present
    });

    it('renders shield overlay for robot power', () => {
        // Render with activeType='shield'
        // Assert: 🛡️ overlay present
    });

    it('renders nothing when active=false', () => {
        // Render with active=false
        // Assert: no overlay
    });
});
```

#### Integration test: shield absorbs exactly 1 strike

```typescript
describe('Pet shield integration', () => {
    it('shield absorbs exactly 1 strike in BubbleGameContainer', () => {
        // This is an integration test that would need mocking useGameEngine
        // and simulating a wrong answer while shield is active.
        //
        // Setup:
        // 1. Mock profile with pet species='robot', happiness=80
        // 2. Render BubbleGameContainer
        // 3. Simulate 3 correct pops → meter charges
        // 4. Tap pet → shield activates
        // 5. Simulate a wrong pop
        // 6. Assert: strikes did NOT increment, shield deactivated
        // 7. Simulate another wrong pop
        // 8. Assert: strikes DID increment (shield is gone)
    });
});
```

This integration test is more complex and may require a custom render wrapper.
If full integration testing is too brittle, test the `usePetPower` hook's
shield behavior in isolation (deactivate on consume) and test the
`BubbleGameContainer` shield interception separately by mocking the hook.

---

## 11. Risk Analysis

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| `onPopWrapper` callback instability in BubbleGameContainer | The wrapper has many dependencies. Adding `petPower.registerCorrect` could cause re-renders or stale closures. | `registerCorrect` uses `useCallback([], [])` — no deps, always stable. Add to the dep array of `onPopWrapper` but it won't cause re-creation since it's stable. |
| `useGameEngine` return shape change | If existing tests check the exact return of `useGameEngine`, adding new fields could break type assertions. | Check: no test directly destructures `useGameEngine` return. Tests go through `BubbleGameContainer`. New fields are additive. |
| Power-up state collision (cat freeze + power-up freeze) | If a freeze power-up is active and cat power activates, the second `setGameState` overwrites the first. | This is acceptable — they're the same effect. The longer expiry wins. Document this in code comments. |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| PetHud z-index conflicts with modals | PetHud at z-40, modals at z-50. PetHud should hide when a modal is open. | Pass `isMenuOpen` or `isSettingsOpen` as a prop to PetHud, hide when true. Or simply render PetHud conditionally: `{!isMenuOpen && !isSettingsOpen && petPower.visible && ...}` |
| Framer Motion performance with pet animations | PetHud adds another motion component to an already animation-heavy screen. | PetHud animations are simple (bounce, pulse). No per-frame physics. Performance impact is negligible. |
| `decayedHappiness` called on every render | The function parses dates — called in BubbleGameContainer's render. | It's a pure function with no side effects, called once per render. Cost is ~0.01ms. Not a concern. |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| ProfileContext `feedPet` now calls `logEvent` | Changes function's dependency array. | `logEvent` is already in the dependency array of other functions in ProfileContext. Adding it to `feedPet` is consistent. |
| New types in `types/user.ts` | Could break type-checking if any file does exhaustive `switch` on `PetSpecies`. | `PetSpecies` is unchanged. New types are additive. No `switch` statements on `PetSpecies` exist outside `PET_EMOJI` and `PET_POWER_MAP` (which we're adding). |
| RTL layout issues | PetHud might appear on wrong side in RTL mode. | Use `dir="ltr"` wrapper. Pet is a visual element, not text. |

### Test Regression Checklist

- [ ] `ProfileContext.pet.test.tsx` — `feedPet` still works (logEvent is async, no await)
- [ ] `BubbleGameContainer` tests (if any) — pet code is conditional on `pet` existing
- [ ] `PracticeMode.test.tsx` — pet code is conditional on `pet` existing
- [ ] `useGameEngine` tests — new return fields are additive
- [ ] `useAnswerFlow` tests — unchanged, no pet integration
- [ ] All 50 test files / 921 tests — run full suite after implementation

---

## 12. Implementation Order

```
1. types/user.ts          — Add PetPowerType, PetMood, PET_POWER_MAP  (30 min)
2. usePetPower.ts         — Create hook                              (60 min)
3. usePetPower.test.ts    — Write hook tests                         (45 min)
4. PetHud.tsx             — Create component                         (60 min)
5. PetHud.test.tsx        — Write component tests                    (30 min)
6. PetSuperpower.tsx      — Create component                         (45 min)
7. PetSuperpower.test.tsx — Write component tests                    (30 min)
8. useGameEngine.ts       — Add applyExternalPowerUp, removeEntities (30 min)
9. BubbleGameContainer    — Integrate PetHud + power handlers        (90 min)
10. PracticeMode.tsx      — Integrate PetHud + power handlers        (60 min)
11. ProfileContext.tsx    — Add logEvent to feedPet                  (15 min)
12. useAnalytics.ts       — Add event types (optional)              (10 min)
13. Full test suite       — Run all 921+ tests                       (10 min)
Total: ~8 hours
```

---

## 13. File Inventory

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/usePetPower.ts` | Pet power meter + activation hook |
| `src/hooks/__tests__/usePetPower.test.ts` | Hook unit tests |
| `src/components/games/PetHud.tsx` | In-game pet display with meter |
| `src/components/games/__tests__/PetHud.test.tsx` | PetHud unit tests |
| `src/components/games/PetSuperpower.tsx` | Power activation visual effects |
| `src/components/games/__tests__/PetSuperpower.test.tsx` | PetSuperpower unit tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/user.ts` | Add `PetPowerType`, `PetMood`, `PET_POWER_MAP` |
| `src/engines/bubble/useGameEngine.ts` | Add `applyExternalPowerUp()`, `removeEntities()` to return |
| `src/components/games/BubbleGameContainer.tsx` | Import PetHud/PetSuperpower/usePetPower, integrate meter + power handlers, render components |
| `src/components/PracticeMode.tsx` | Same integration as BubbleGameContainer |
| `src/context/ProfileContext.tsx` | Add `logEvent('pet_fed_streak', ...)` in `feedPet` |
| `src/hooks/useAnalytics.ts` | (Optional) Add `'pet_power_used'`, `'pet_fed_streak'` to `AnalyticsEvent` union |
| `src/hooks/usePracticeSession.ts` | Add `BONUS_TIME`, `BONUS_LIFE` reducer actions for PracticeMode power effects |

### Unchanged Files
All other files remain untouched. The design is strictly additive.

---

## 14. Open Questions / Deferred

1. **Pet happiness micro-updates during gameplay**: Should each correct answer
   nudge happiness +1? This would make the pet feel alive but requires
   ProfileContext updates on every correct answer. **Defer to Phase 3b.**

2. **PracticeMode power parity**: The cat (freeze) and dragon (pop distractors)
   powers don't map cleanly to PracticeMode (no bubbles). The proposed mappings
   (extra time, skip problem) are functional but not thematically consistent.
   **Defer to user testing.**

3. **Power cooldown after use**: Should there be a cooldown before the meter
   can charge again? Currently the meter resets to 0 and starts charging
   immediately. **Defer — let playtesting determine if a cooldown is needed.**

4. **Pet animations**: The card mentions "pet expression/animation changes with
   happiness." The `PetMood` type covers expressions (happy/neutral/sad/excited/
   power_ready). Full SVG animations per mood (like the Mascot component) are
   out of scope for this phase — the PetHud uses emoji + Framer Motion bounce
   variants. **Defer rich SVG pet animations to a future phase.**

5. **Boss bubble interaction**: Should pet powers work during boss fights?
   Recommendation: Yes, but shield doesn't block boss-gate wrong answers
   (those are multi-step, not strikes). **Clarify in implementation.**

---

## 15. Appendix — Codebase Context Summary

### Test Count
- **50 test files, 921 tests passing** (card says 212, actual is 921)
- Duration: 51.28s
- Framework: vitest + @testing-library/react
- No pre-existing failures

### Pet System Files
- `src/types/user.ts` — `PetState`, `PetSpecies`, `UserProfile`
- `src/lib/pet.ts` — `getPetStage()`, `getPetEmoji()`, `decayedHappiness()`, `PET_SPECIES_OPTIONS`
- `src/lib/worldConfig.ts` — `PET_STAGES` (single source of truth)
- `src/components/pet/PetAvatar.tsx` — emoji-based pet display
- `src/components/pet/PetScreen.tsx` — full pet management screen
- `src/components/pet/DailyQuestList.tsx` — daily quests UI
- `src/context/ProfileContext.tsx` — `feedPet()`, `setPetSpecies()`, `renamePet()`
- `src/context/__tests__/ProfileContext.pet.test.tsx` — 11 tests for pet/gems validation

### Game Session Files
- `src/components/games/BubbleGameContainer.tsx` — bubble game (330 lines)
- `src/components/PracticeMode.tsx` — flashcard practice (290 lines)
- `src/components/games/ArcadeHUD.tsx` — arcade mode HUD
- `src/engines/bubble/useGameEngine.ts` — game engine hook
- `src/engines/bubble/types.ts` — `GameConfig`, `BubbleEntity`, `GameState`, `PowerUpType`, `PowerUpState`
- `src/hooks/useAnswerFlow.ts` — answer timing (400ms/600ms)
- `src/hooks/usePracticeSession.ts` — practice session reducer
- `src/hooks/useFeedbackEffects.ts` — visual feedback lifecycle

### Key Patterns
- `worldConfig.ts` is the single source of truth for constants (LEAF module)
- Hooks own state, components are presentational
- `ProfileContext` validates all updates via `validateProfileUpdate()`
- Analytics via `useAnalytics().logEvent(eventName, params)` — accepts any string
- Framer Motion for all animations
- `dir="rtl"` on root, components handle RTL with logical properties

