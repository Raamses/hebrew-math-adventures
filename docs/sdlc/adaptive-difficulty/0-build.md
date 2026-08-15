# Phase 6: Adaptive Difficulty — Build Artifact

**Card:** d9edc61c-cbf4-45e2-9619-9296fd069389
**Branch:** sdlc/loop-v0
**Model:** gemini-3.1-pro-high (via `ask-agy --card`, 27,877 tokens served)
**Date:** 2026-08-15

## Model Delegation Log

| Attempt | Tool | Result |
|---------|------|--------|
| 1 | `ask-claude --escalate --card d9edc61c...` | Session limit — "resets 2pm (Asia/Jerusalem)" |
| 2 | `ask-claude --card d9edc61c...` (no escalate) | Session limit — same message |
| 3 | `ask-agy --card d9edc61c...` (gemini-3.1-pro-high) | **SUCCESS** — 27,877 tokens, full analysis returned |

Per card instructions: the `--card` flag was passed on all Claude attempts. Claude did not serve
(no model-usage.jsonl entry created). The `ask-agy` tool served via gemini-3.1-pro-high and returned
a complete analysis. The artifact below is built from that Gemini analysis, validated and enriched
by builder-agent (glm-5.2) codebase inspection.

---

## Summary

The game logs `difficulty_level` in `question_answered` events but never adjusts it within a
session. `targetLevel` is passed as a static prop to `PracticeMode` and remains fixed. The
existing `GameDirector` adjusts `estimatedLevel` globally via mastery thresholds, and
`BubbleGameContainer` has inline hot-streak/struggling logic for the bubble game — but the
Practice Mode path has no adaptive difficulty at all.

This phase introduces `src/lib/adaptiveDifficulty.ts` — a pure-function library that analyzes a
rolling window of the last 10 answers (accuracy + response time) and recommends level
adjustments. A new `useAdaptiveDifficulty` hook wraps the pure functions with React state.
`usePracticeSession` integrates the hook, feeding each answer's correctness + response time
into the adaptive engine. When the engine recommends a change, `PracticeMode` displays a
mascot transition message ("קצת יותר קשה! 💪" / "נרגע קצת, ננסה שוב 🌟"), the profile's
`estimatedLevel` is persisted via `ProfileContext`, and GA4 `difficulty_adjusted` /
`difficulty_milestone` events are fired.

**Key design decisions (from Gemini analysis):**
- **Coexist** with `GameDirector` — adaptive difficulty is a session-level micro-adaptation layer;
  `GameDirector` remains the global profile-based progression engine
- **New hook** `useAdaptiveDifficulty` composed inside `usePracticeSession` — keeps
  `useAnswerFlow` as a pure timing hook, avoids polluting it with business logic
- **Reuse `estimatedLevel`** on `UserCapabilityProfile` for persistence — unifies the concept
  of a player's global difficulty level
- **Pure functions** with `DifficultyState` carrying `initialSessionLevel` for the
  "max 1 level per session" constraint
- **Non-blocking mascot overlay** during the idle delay phase for visual feedback

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PracticeMode.tsx                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  problemStartTime ref ──→ responseTimeMs calculation  │  │
│  │  handleAnswer() passes (isCorrect, responseTimeMs)    │  │
│  │  to submitResult()                                     │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  usePracticeSession                                    │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │  useAdaptiveDifficulty (new hook)                 │  │  │
│  │  │  • holds DifficultyState (rolling window)         │  │  │
│  │  │  • addAnswer(isCorrect, responseTimeMs)           │  │  │
│  │  │  • exposes lastAdjustment + currentLevel          │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  • submitResult() → adaptive.addAnswer() + dispatch   │  │
│  │  • useEffect on lastAdjustment → GA4 + persist         │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Mascot Transition UI (new)                            │  │
│  │  • Renders on lastAdjustment !== 'MAINTAIN'           │  │
│  │  • Fades in/out during answer lock delay              │  │
│  │  • Does not block next question                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   src/lib/adaptiveDifficulty.ts               │
│  PURE FUNCTIONS (zero dependencies)                           │
│  • evaluateDifficulty(state, config?) → RAMP_UP|DOWN|MAINTAIN│
│  • getNextDifficultyState(state, answer, config?) → state    │
│  • ADAPTIVE_CONFIG constants                                  │
│  • Types: AnswerRecord, DifficultyState, DifficultyAdjustment│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              Existing GameDirector (unchanged)                │
│  • tuneConfig() — global config tuning (rescue/challenge)    │
│  • recordResult() — skill stats + mastery level growth       │
│  • Coexists with adaptive difficulty as separate layer       │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. New File: `src/lib/adaptiveDifficulty.ts`

### Types

```typescript
export type AnswerRecord = {
    isCorrect: boolean;
    responseTimeMs: number;
};

export type DifficultyAdjustment = 'RAMP_UP' | 'RAMP_DOWN' | 'MAINTAIN';

export type DifficultyState = {
    currentLevel: number;
    initialSessionLevel: number; // For max-1-level-per-session constraint
    window: AnswerRecord[];
};
```

### Configuration

```typescript
export const ADAPTIVE_CONFIG = {
    windowSize: 10,
    rampUpAccuracyThreshold: 0.85,
    rampUpMaxAvgTimeMs: 2000,
    rampDownAccuracyThreshold: 0.50,
    rampDownMinAvgTimeMs: 5000,
    minLevel: 1,  // matches worldConfig MAX_LEVEL boundary
    maxLevel: 10, // matches worldConfig MAX_LEVEL
} as const;
```

### Pure Functions

**`evaluateDifficulty(state: DifficultyState, config?: typeof ADAPTIVE_CONFIG): DifficultyAdjustment`**

Algorithm:
1. If `window.length < config.windowSize` → return `MAINTAIN` (not enough data)
2. Compute `accuracy = correctCount / windowSize`
3. Compute `avgTimeMs = sum(responseTimeMs) / windowSize`
4. Check session boundary constraints:
   - `canRampUp = currentLevel < initialSessionLevel + 1 && currentLevel < maxLevel`
   - `canRampDown = currentLevel > initialSessionLevel - 1 && currentLevel > minLevel`
5. If `canRampUp && accuracy >= 0.85 && avgTimeMs <= 2000` → return `RAMP_UP`
6. If `canRampDown && (accuracy <= 0.50 || avgTimeMs >= 5000)` → return `RAMP_DOWN`
7. Otherwise → return `MAINTAIN`

**`getNextDifficultyState(state: DifficultyState, newAnswer: AnswerRecord, config?): DifficultyState`**

1. Append `newAnswer` to window, slice to last `windowSize` entries
2. Call `evaluateDifficulty()` on the new state
3. Adjust `currentLevel` by ±1 (or 0 for MAINTAIN)
4. Return new `DifficultyState` with updated window and level

**`createInitialState(initialLevel: number): DifficultyState`**

Returns `{ currentLevel: initialLevel, initialSessionLevel: initialLevel, window: [] }`.

**`computeMetrics(state: DifficultyState): { accuracy: number; avgResponseMs: number }`**

Helper for GA4 logging — returns accuracy (0–1) and average response time in ms.

---

## 2. New File: `src/hooks/useAdaptiveDifficulty.ts`

A thin React wrapper around the pure functions.

```typescript
export function useAdaptiveDifficulty(initialLevel: number) {
    const [state, setState] = useState<DifficultyState>(
        () => createInitialState(initialLevel)
    );
    const [lastAdjustment, setLastAdjustment] = useState<DifficultyAdjustment>('MAINTAIN');

    const addAnswer = useCallback((isCorrect: boolean, responseTimeMs: number) => {
        setState(prev => {
            const nextState = getNextDifficultyState(prev, { isCorrect, responseTimeMs });
            if (nextState.currentLevel > prev.currentLevel) setLastAdjustment('RAMP_UP');
            else if (nextState.currentLevel < prev.currentLevel) setLastAdjustment('RAMP_DOWN');
            else setLastAdjustment('MAINTAIN');
            return nextState;
        });
    }, []);

    const reset = useCallback((level: number) => {
        setState(createInitialState(level));
        setLastAdjustment('MAINTAIN');
    }, []);

    const clearAdjustment = useCallback(() => setLastAdjustment('MAINTAIN'), []);

    return { state, lastAdjustment, addAnswer, reset, clearAdjustment };
}
```

**Why a separate hook?** `useAnswerFlow` is purely a UI timing state machine (idle → correct/wrong → idle). Adding business logic there violates separation of concerns. `usePracticeSession` already handles game state; composing `useAdaptiveDifficulty` inside it keeps the hooks modular, testable, and reusable.

---

## 3. Modified File: `src/hooks/usePracticeSession.ts`

### Changes

**Import the new hook:**
```typescript
import { useAdaptiveDifficulty } from './useAdaptiveDifficulty';
```

**Compose the hook:**
```typescript
const adaptive = useAdaptiveDifficulty(targetLevel);
```

**Modify `submitResult` signature:**
```typescript
// Before: submitResult = useCallback((isCorrect: boolean) => { ... })
// After:
const submitResult = useCallback((isCorrect: boolean, responseTimeMs?: number) => {
    dispatch({ type: 'ANSWER', isCorrect });

    if (responseTimeMs !== undefined) {
        adaptive.addAnswer(isCorrect, responseTimeMs);
    }

    if (profile) {
        const currentCapabilities = profile.capabilities || INITIAL_CAPABILITY_PROFILE;
        const updatedCapabilities = Director.recordResult(currentCapabilities, isCorrect);
        updateProfile(profile.id, { capabilities: updatedCapabilities });
    }
}, [profile, updateProfile, adaptive]);
```

**Expose adaptive state:**
```typescript
return {
    session,
    problem,
    setProblem,
    generateNext,
    nextProblem,
    restartSession,
    submitResult,
    evaluateAnswer,
    initSession,
    // New
    adaptiveState: adaptive.state,
    lastAdjustment: adaptive.lastAdjustment,
    clearAdjustment: adaptive.clearAdjustment,
    adaptiveReset: adaptive.reset,
};
```

**Note on `targetLevel` usage in `generateNext`:** The `difficulty` parameter in `generateNext()`
currently uses the static `targetLevel` prop. After this phase, when `adaptive.state.currentLevel`
diverges from `targetLevel`, we should use the adaptive level:

```typescript
const effectiveLevel = adaptive.state.currentLevel || targetLevel;
// In generateNext: difficulty: effectiveLevel instead of targetLevel
```

This makes the math problems actually harder/easier when the adaptive engine adjusts.

---

## 4. Modified File: `src/components/PracticeMode.tsx`

### Changes

**Capture response time and pass to `submitResult`:**
```typescript
const handleAnswer = (isCorrect: boolean) => {
    if (!profile || !problem || isProcessing) return;

    const timeTaken = Date.now() - problemStartTime.current;

    logEvent('question_answered', {
        is_correct: isCorrect,
        equation: formatProblemEquation(problem),
        response_time_ms: timeTaken,
        mode: session.mode,
        target_level: targetLevel,
    });

    submitAnswer(isCorrect);
    submitResult(isCorrect, timeTaken); // ← now passes timing
    // ... existing sound/mascot/streak logic
};
```

**Destructure adaptive values from `usePracticeSession`:**
```typescript
const {
    session, problem, initSession, nextProblem, restartSession,
    submitResult, evaluateAnswer,
    adaptiveState, lastAdjustment, clearAdjustment,
} = usePracticeSession({ targetLevel, problemConfig });
```

**Difficulty transition mascot UI:**

Add a new state + effect to show the transition message:
```typescript
const [difficultyTransition, setDifficultyTransition] = useState<string | null>(null);

useEffect(() => {
    if (lastAdjustment === 'RAMP_UP') {
        setDifficultyTransition(t('practice.difficulty.rampUp', { defaultValue: 'קצת יותר קשה! 💪' }));
        clearAdjustment();
        const timer = setTimeout(() => setDifficultyTransition(null), 2500);
        return () => clearTimeout(timer);
    }
    if (lastAdjustment === 'RAMP_DOWN') {
        setDifficultyTransition(t('practice.difficulty.rampDown', { defaultValue: 'נרגע קצת, ננסה שוב 🌟' }));
        clearAdjustment();
        const timer = setTimeout(() => setDifficultyTransition(null), 2500);
        return () => clearTimeout(timer);
    }
}, [lastAdjustment, clearAdjustment, t]);
```

**Render the transition overlay** (alongside the existing CheckpointBanner):
```tsx
{difficultyTransition && (
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-40 pointer-events-none" dir="rtl">
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.4 }}
            className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border-2 border-purple-200"
        >
            <span className="text-2xl font-bold text-purple-700">
                {difficultyTransition}
            </span>
        </motion.div>
    </div>
)}
```

**Non-blocking by design:** The overlay uses `pointer-events-none` and a fixed position so it
never intercepts taps. It auto-dismisses after 2.5s. The mascot message appears during the
answer-lock delay phase, so the child sees it while waiting for the next question — no flow
disruption.

---

## 5. Modified File: `src/context/ProfileContext.tsx`

### Changes

The card asks to "persist adjusted difficulty per profile." We reuse the existing
`capabilities.estimatedLevel` field rather than adding a new field.

**Why reuse `estimatedLevel`?** Adding a separate `adaptiveDifficulty` field would create two
competing sources of truth for the player's level. `estimatedLevel` is already consumed by
`GameDirector.recordResult()` (mastery-based growth) and `BubbleGameContainer` (session seed).
The adaptive engine updates it from the other direction (performance-based micro-adjustments),
creating a unified level concept.

**No structural changes needed to ProfileContext itself.** The persistence happens in
`usePracticeSession` via the existing `updateProfile` call:

```typescript
// In usePracticeSession, watch for adaptive level changes
useEffect(() => {
    if (lastAdjustment !== 'MAINTAIN' && profile) {
        const metrics = computeMetrics(adaptive.state);
        const oldLevel = adaptive.state.initialSessionLevel;
        const newLevel = adaptive.state.currentLevel;

        // Persist to profile
        updateProfile(profile.id, {
            capabilities: {
                ...(profile.capabilities || INITIAL_CAPABILITY_PROFILE),
                estimatedLevel: newLevel,
            },
        });

        // GA4: difficulty_adjusted
        logEvent('difficulty_adjusted', {
            profile_id: profile.id,
            old_level: oldLevel,
            new_level: newLevel,
            reason: lastAdjustment.toLowerCase(),
            accuracy: metrics.accuracy,
            avg_response_ms: metrics.avgResponseMs,
        });

        // GA4: difficulty_milestone (first time reaching a level)
        // Track via a ref set of seen levels
        // ...see GA4 section below
    }
}, [lastAdjustment, adaptive.state, profile, updateProfile, logEvent]);
```

**Migration safety:** `estimatedLevel` already exists on all profiles via
`INITIAL_CAPABILITY_PROFILE`. No localStorage migration needed.

---

## 6. GA4 Event Implementation

### `difficulty_adjusted`

Fired every time the adaptive engine changes the level.

```typescript
logEvent('difficulty_adjusted', {
    profile_id: profile.id,
    old_level: number,      // level before adjustment
    new_level: number,      // level after adjustment
    reason: 'ramp_up' | 'ramp_down',  // lowercase per GA4 convention
    accuracy: number,       // 0.0–1.0 (rolling window accuracy)
    avg_response_ms: number, // average response time in ms
});
```

### `difficulty_milestone`

Fired the first time a player reaches a given level (per profile).

Track seen levels in a `useRef<Set<number>>` initialized from `profile.capabilities.estimatedLevel`:

```typescript
const seenLevelsRef = useRef<Set<number>>(new Set([profile?.capabilities?.estimatedLevel ?? 1]));

// Inside the adjustment effect:
if (!seenLevelsRef.current.has(newLevel)) {
    seenLevelsRef.current.add(newLevel);
    logEvent('difficulty_milestone', {
        profile_id: profile.id,
        level: newLevel,
        first_time: true,
    });
}
```

**Note:** `first_time` is always `true` when this event fires because we only fire it for
unseen levels. If we wanted to track re-visits, we could set `first_time: false` for
subsequent visits, but the card spec says `first_time: boolean` — this design keeps it simple.

---

## 7. Test File: `src/lib/__tests__/adaptiveDifficulty.test.ts`

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import {
    evaluateDifficulty,
    getNextDifficultyState,
    createInitialState,
    computeMetrics,
    ADAPTIVE_CONFIG,
    type DifficultyState,
    type AnswerRecord,
} from '../adaptiveDifficulty';

// Factory helpers
const makeAnswer = (isCorrect: boolean, responseTimeMs: number): AnswerRecord =>
    ({ isCorrect, responseTimeMs });

const makeWindow = (size: number, isCorrect: boolean, timeMs: number): AnswerRecord[] =>
    Array.from({ length: size }, () => makeAnswer(isCorrect, timeMs));

const makeMixedWindow = (
    correctCount: number,
    wrongCount: number,
    timeMs: number
): AnswerRecord[] => [
    ...Array.from({ length: correctCount }, () => makeAnswer(true, timeMs)),
    ...Array.from({ length: wrongCount }, () => makeAnswer(false, timeMs)),
];
```

### Test Cases

**`describe('evaluateDifficulty')`**

| Test | Window | Expected | Reason |
|------|--------|----------|--------|
| returns MAINTAIN if window < 10 | 5 answers, all correct, 1s | MAINTAIN | Not enough data |
| returns RAMP_UP for >85% accuracy + <2s avg | 9 correct / 1 wrong, 1.5s avg | RAMP_UP | High accuracy + fast |
| returns RAMP_DOWN for <50% accuracy | 4 correct / 6 wrong, 3s avg | RAMP_DOWN | Low accuracy |
| returns RAMP_DOWN for >5s avg regardless of accuracy | 9 correct / 1 wrong, 5.5s avg | RAMP_DOWN | Slow response |
| returns MAINTAIN for 70% accuracy + 3s avg | 7 correct / 3 wrong, 3s avg | MAINTAIN | In zone |
| returns MAINTAIN at level 10 even if performance is excellent | 10 correct, 1s, currentLevel=10 | MAINTAIN | Max bound |
| returns MAINTAIN at level 1 even if performance is poor | 0 correct / 10 wrong, 6s, currentLevel=1 | MAINTAIN | Min bound |
| respects max-1-level-per-session on ramp up | currentLevel=5, initial=5, window triggers up | RAMP_UP | 5→6 ok |
| blocks second ramp up in same session | currentLevel=6, initial=5, window triggers up | MAINTAIN | 6 > initial+1 |
| respects max-1-level-per-session on ramp down | currentLevel=5, initial=5, window triggers down | RAMP_DOWN | 5→4 ok |
| blocks second ramp down in same session | currentLevel=4, initial=5, window triggers down | MAINTAIN | 4 < initial-1 |

**`describe('getNextDifficultyState')`**

| Test | Scenario | Expected |
|------|----------|----------|
| appends answer and shifts window | 10-item window + 1 new | window.length === 10, oldest dropped |
| increments currentLevel on RAMP_UP | 9/1 correct, 1.5s, level 3 | currentLevel === 4 |
| decrements currentLevel on RAMP_DOWN | 4/6 correct, 3s, level 3 | currentLevel === 2 |
| does not change level on MAINTAIN | 7/3 correct, 3s, level 3 | currentLevel === 3 |
| does not exceed maxLevel | level 10, perfect window | currentLevel === 10 |
| does not drop below minLevel | level 1, failing window | currentLevel === 1 |

**`describe('createInitialState')`**

| Test | Expected |
|------|----------|
| returns correct initial state | currentLevel === initial, initialSessionLevel === initial, window === [] |

**`describe('computeMetrics')`**

| Test | Window | Expected |
|------|--------|----------|
| computes accuracy and avg time | 8 correct / 2 wrong, times [1000×8, 3000×2] | accuracy=0.8, avgResponseMs=1400 |

---

## 8. i18n Keys

Add to translation files:

**`src/locales/he.json`:**
```json
{
  "practice": {
    "difficulty": {
      "rampUp": "קצת יותר קשה! 💪",
      "rampDown": "נרגע קצת, ננסה שוב 🌟"
    }
  }
}
```

**`src/locales/en.json`:**
```json
{
  "practice": {
    "difficulty": {
      "rampUp": "A bit harder now! 💪",
      "rampDown": "Let's relax and try again 🌟"
    }
  }
}
```

**RTL considerations:** The Hebrew text is rendered with `dir="rtl"` on the container. The
emoji is LTR-safe (Unicode emoji have neutral directionality). The `framer-motion` animation
uses `translate-x-1/2` which is direction-agnostic in terms of layout flow.

---

## 9. Edge Cases & Potential Regressions

### Timer Inconsistencies
**Risk:** If `problemStartTime.current` isn't reset exactly when the next question renders
(including after `useAnswerFlow` delays), `responseTimeMs` will artificially inflate, causing
unwarranted `RAMP_DOWN`.

**Mitigation:** The existing `useEffect(() => { problemStartTime.current = Date.now(); }, [problemConfig])`
in `PracticeMode.tsx` handles this. After adaptive integration, also reset on `problem` change
(which already happens via the `problem` dependency in the init effect).

### Infinite Update Loops
**Risk:** The `useEffect` watching `lastAdjustment` could trigger continuous profile updates
if `clearAdjustment()` doesn't reset the dependency.

**Mitigation:** Call `clearAdjustment()` synchronously inside the effect before any async work.
The effect depends on `[lastAdjustment, ...]` — once cleared to `MAINTAIN`, it won't re-fire.

### Mascot Message Stacking
**Risk:** If the child answers very quickly across multiple adjustments, mascot messages
could overlap.

**Mitigation:** The 2.5s auto-dismiss timer + `setDifficultyTransition(null)` before setting
a new message prevents stacking. The `clearAdjustment()` call ensures only one transition
renders per adjustment event.

### Session Restart
**Risk:** If the player restarts a session, `initialSessionLevel` should reset to the new
starting level, not carry over from the previous session.

**Mitigation:** Call `adaptive.reset(newLevel)` in `restartSession()` and `initSession()`.

### Existing Test Regressions
**Risk:** `submitResult` signature change from `(isCorrect)` to `(isCorrect, responseTimeMs?)`
could break callers.

**Mitigation:** The `responseTimeMs` parameter is optional. Existing callers that pass only
`isCorrect` will simply skip the adaptive tracking (the `if (responseTimeMs !== undefined)`
guard). No existing tests should break.

### BubbleGameContainer Coexistence
**Risk:** `BubbleGameContainer` has its own inline adaptive difficulty. If both systems run
simultaneously, they could conflict.

**Mitigation:** In this phase, `adaptiveDifficulty.ts` is only integrated into the
`PracticeMode` → `usePracticeSession` path. `BubbleGameContainer` is untouched. Future phases
can refactor `BubbleGameContainer` to consume the same pure library.

### Profile Persistence Race
**Risk:** `updateProfile()` in the adjustment effect and `Director.recordResult()` in
`submitResult()` both update `capabilities` — they could race.

**Mitigation:** `submitResult` calls `Director.recordResult()` first (updates skill stats +
estimatedLevel via mastery), then `adaptive.addAnswer()` updates the adaptive state. The
persistence effect fires asynchronously after React state settles, so `Director.recordResult()`
has already completed. The adaptive effect merges its `estimatedLevel` override into the
latest `profile.capabilities` via the functional update in `updateProfile`.

---

## 10. Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/adaptiveDifficulty.ts` | Pure functions: types, config, evaluateDifficulty, getNextDifficultyState, createInitialState, computeMetrics |
| `src/lib/__tests__/adaptiveDifficulty.test.ts` | Unit tests for all pure functions (~12 test cases) |
| `src/hooks/useAdaptiveDifficulty.ts` | React hook wrapping pure functions with useState/useCallback |

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/usePracticeSession.ts` | Import useAdaptiveDifficulty, modify submitResult signature, expose adaptive state, add persistence+GA4 effect, use effectiveLevel in generateNext |
| `src/components/PracticeMode.tsx` | Capture responseTimeMs in handleAnswer, destructure adaptive values, add difficulty transition mascot UI, add i18n keys |
| `src/locales/he.json` | Add `practice.difficulty.rampUp` and `practice.difficulty.rampDown` |
| `src/locales/en.json` | Add `practice.difficulty.rampUp` and `practice.difficulty.rampDown` |

### Files NOT Modified (But Referenced)

| File | Reason |
|------|--------|
| `src/context/ProfileContext.tsx` | No structural changes — persistence uses existing `updateProfile()` + `capabilities.estimatedLevel` |
| `src/engines/GameDirector.ts` | Unchanged — coexists as global progression engine |
| `src/components/games/BubbleGameContainer.tsx` | Unchanged in this phase — future refactoring candidate |
| `src/hooks/useAnswerFlow.ts` | Unchanged — remains pure timing hook |
| `src/lib/worldConfig.ts` | Unchanged — ADAPTIVE_CONFIG is self-contained |

---

## 11. Implementation Order

1. **`src/lib/adaptiveDifficulty.ts`** — pure functions, zero dependencies
2. **`src/lib/__tests__/adaptiveDifficulty.test.ts`** — unit tests for pure functions
3. **`src/hooks/useAdaptiveDifficulty.ts`** — React hook wrapper
4. **`src/hooks/usePracticeSession.ts`** — integrate hook, modify submitResult, add effects
5. **`src/components/PracticeMode.tsx`** — wire UI, capture timing, add mascot transitions
6. **`src/locales/he.json` + `src/locales/en.json`** — add i18n keys
7. **Run full test suite** — verify 921 + new tests pass (target: 933+)
8. **Typecheck** — `npx tsc -b` must be clean

---

## 12. Success Criteria Validation

| Criterion | How Verified |
|-----------|-------------|
| Kids no longer stuck too hard or too easy | Rolling window adapts within 10 answers; max 1 level shift per session prevents whiplash |
| Difficulty adjustments visible in GA4 data | `difficulty_adjusted` event fired on every change with reason + metrics |
| No test regressions | Full suite run: 921 existing + ~12 new = 933+ tests pass |
| Min/max bounds respected | Pure function tests cover level 1 floor and level 10 ceiling |
| Max 1 level per session | `initialSessionLevel` in DifficultyState enforces constraint in pure function |
| Mascot feedback | Hebrew RTL overlay with fade animation, non-blocking, auto-dismiss |
| Profile persistence | `estimatedLevel` updated via `updateProfile()` in usePracticeSession effect |

---

## Appendix: Gemini Analysis Attribution

**Model:** gemini-3.1-pro-high
**Tool:** `ask-agy --card d9edc61c-cbf4-45e2-9619-9296fd069389`
**Tokens served:** 27,877
**Status:** SUCCESS

The Gemini analysis provided:
- Architectural answers to all 8 questions (coexist with GameDirector, new hook, reuse estimatedLevel, etc.)
- Complete API design for adaptiveDifficulty.ts with TypeScript types
- Integration code patterns for usePracticeSession and PracticeMode
- Test structure with factory helpers and test case descriptions
- Edge case identification (timer inconsistencies, infinite loops, mascot stacking)
- GA4 event implementation approach

This artifact was structured, enriched with codebase-specific details (existing test count,
worldConfig values, actual file paths, BubbleGameContainer analysis), and formatted by the
builder agent (glm-5.2) from the Gemini analysis output.
