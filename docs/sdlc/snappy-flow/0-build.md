# Phase 1a: Snappy Flow — Build Artifact

**Card:** ffd25d58-d5cf-4de9-a75f-bba88da1ca62
**Branch:** sdlc/loop-v0
**Model:** claude-opus-5 (via `ask-claude --escalate --card`)
**Date:** 2026-08-15

## Summary

Cut the answer lock from 2000ms→400ms (correct) and 1000ms→600ms (wrong) in PracticeMode.
Decoupled visual reward lifecycles from the answer lock so animations persist after input unlocks.
Added micro-checkpoint banners at Q3/10 and Q6/10. Fixed a pre-existing ScoreToast timer leak
that would have broken the reward loop at the new shorter lock duration.

## What Changed

### 1. Answer lock timing (`src/lib/worldConfig.ts`)

Added two constants to `UI_CONFIG`:

```ts
ANSWER_LOCK_CORRECT_MS: 400,
ANSWER_LOCK_WRONG_MS: 600,
```

`PracticeMode.tsx` now reads `UI_CONFIG.ANSWER_LOCK_CORRECT_MS` / `ANSWER_LOCK_WRONG_MS`
instead of hardcoding 2000/1000.

### 2. ScoreToast timer leak fix (`src/components/ScoreToast.tsx`)

**Pre-existing bug:** `onComplete` was in the `useEffect` dependency array, but
`PracticeMode` passed an inline arrow (`() => setScoreToast(null)`) whose identity
changed on every render. This restarted the 2000ms dismiss timer on every parent
re-render. At 2000ms lock this was masked; at 400ms it would prevent the toast
from ever dismissing, breaking the reward animation for Q2–Q10.

**Fix:** Store `onComplete` in a ref; remove it from the deps array. Also shortened
animation from 1.5s → 0.9s and dismiss timer from 2000ms → 900ms to match the
snappy feel.

### 3. `useFeedbackEffects` hook (`src/hooks/useFeedbackEffects.ts`)

New hook that owns the lifecycle of celebratory visual effects (mascot bubble,
confetti, stars), decoupled from the answer lock timing.

- `celebrate(message)`: sets mascot→excited, showBubble, showStars, showConfetti;
  schedules bubble cleanup at 1400ms and confetti at 2200ms; bumps `burstId`.
- `encourage(message)`: sets mascot→encourage, showBubble; cleanup at 1400ms.
- `clearAll()`: immediate cleanup (used before showing session summary).
- `burstId`: incremented on every call; used as React `key` on effect components
  so animations replay from frame 0 on rapid answers.

### 4. `PracticeFeedback.tsx` — burstId keys

Added `burstId` prop; `FlyingStars` and `Confetti` are now keyed with `burstId`
so they remount and replay animations on each answer.

### 5. Micro-checkpoint banners (`src/lib/checkpoints.ts` + `src/components/practice/CheckpointBanner.tsx`)

- `isCheckpoint(questionNumber, mode)`: pure function, returns true for Q3 and Q6
  in STANDARD mode only. Extracted for unit testability.
- `CheckpointBanner`: framer-motion spring banner at `top-3`, auto-dismisses at
  1600ms, `pointer-events-none`, `z-[60]`.
- i18n entries in `he.json` and `en.json` under `practice.checkpoint`:
  - Q3: `שליש מהדרך! מעולה! 🌟` / `A third of the way! Awesome! 🌟`
  - Q6: `עוד קצת! כל הכבוד! 🎯` / `Almost there! Well done! 🎯`
- ScoreToast is suppressed on checkpoint questions to avoid visual collision.

### 6. `PracticeMode.tsx` — full rewrite of feedback wiring

- Replaced individual `useState` calls for mascot/confetti/stars with
  `useFeedbackEffects()` hook.
- `onCorrectComplete`: no longer clears visual effects (they self-dismiss).
  Only calls `clearAll()` before showing the session summary.
- `onWrongComplete`: no longer clears mascot bubble (self-dismisses via hook).
- Added `CheckpointBanner` component with `checkpointMessage` state.
- Added `lastCheckpointRef` to prevent double-firing of checkpoint banners.
- ScoreToast keyed with `burstId` for animation replay.
- Checkpoint trigger fires on `session.count` change via `useEffect`.

### 7. ScoreToast typo fix

Fixed `show-nowrap` → `whitespace-nowrap` (line 39) — was not a valid Tailwind class.

## Files Modified

| File | Change |
|---|---|
| `src/lib/worldConfig.ts` | +2 constants in UI_CONFIG |
| `src/lib/checkpoints.ts` | **NEW** — pure isCheckpoint function |
| `src/lib/__tests__/checkpoints.test.ts` | **NEW** — 6 tests |
| `src/hooks/useFeedbackEffects.ts` | **NEW** — feedback lifecycle hook |
| `src/hooks/__tests__/useFeedbackEffects.test.ts` | **NEW** — 8 tests |
| `src/components/ScoreToast.tsx` | Timer leak fix + 0.9s animation + typo fix |
| `src/components/__tests__/ScoreToast.test.tsx` | **NEW** — 5 tests (incl. regression) |
| `src/components/practice/PracticeFeedback.tsx` | +burstId prop, keyed effects |
| `src/components/practice/CheckpointBanner.tsx` | **NEW** — transient banner |
| `src/components/practice/__tests__/CheckpointBanner.test.tsx` | **NEW** — 5 tests |
| `src/components/PracticeMode.tsx` | Rewired to useFeedbackEffects + CheckpointBanner |
| `src/i18n/locales/he.json` | +checkpoint messages |
| `src/i18n/locales/en.json` | +checkpoint messages |
| `src/lib/__tests__/worldConfig.test.ts` | Updated key count assertion (3→5) |

## Test Results

- **New tests:** 24 pass (checkpoints: 6, ScoreToast: 5, useFeedbackEffects: 8, CheckpointBanner: 5)
- **Full suite:** 920 pass, 1 pre-existing failure (`zenStateReset.test.ts` — fails on clean tree, unrelated)
- **Typecheck:** clean (`tsc --noEmit` passes)

## Claude Analysis (claude-opus-5)

The analysis was delegated to Claude via `ask-claude --escalate --card ffd25d58-d5cf-4de9-a75f-bba88da1ca62`.
Key findings that shaped the implementation:

1. **ScoreToast timer leak** — Claude identified a pre-existing bug where the inline
   `onComplete` arrow changed identity on every render, restarting the dismiss timer.
   This was masked at 2000ms but would break the reward loop at 400ms. Fixed before
   the timing change.

2. **Visual effects must outlive the lock** — Claude recommended removing visual
   cleanup from `onCorrectComplete` and letting effects self-dismiss on their own
   timers. Implemented via `useFeedbackEffects` hook with independent lifetimes
   (bubble: 1400ms, confetti: 2200ms).

3. **burstId for animation replay** — Claude identified that without a changing
   React `key`, rapid answers at 400ms wouldn't remount effect components, so
   animations wouldn't replay. The `burstId` mechanism solves this.

4. **Checkpoint design** — Claude recommended triggering on question count (not
   correctness), suppressing ScoreToast on checkpoint questions to avoid collision,
   and extracting `isCheckpoint` as a pure function for testability.

5. **Hebrew correction** — Claude corrected `שליש דרך` → `שליש מהדרך` (the card's
   original text was not idiomatic Hebrew).

6. **Risks flagged by Claude:**
   - Wrong-answer feedback overlay (600ms may be too short for early readers to
     process Hebrew text) — deferred for measurement.
   - `usePracticeSession` dedup collision risk amplified at 400ms — flagged for
     follow-up (monotonic counter in MathCard key).
   - Double-submit window grows 5× — the existing `status !== 'idle'` guard is
     sound, but QA with real child tapping is needed.

## Not in scope (per Claude's recommendation)

- `BubbleGameContainer.tsx` has its own `ANSWER_LOCK_MS: 120` — separate mechanism,
  not affected by this change.
- E2E test comment updates (references to "correctDelay (2000ms)") — follow-up.
- `MathCard` key collision fix — follow-up.
- Sound tone duration adjustment (correct tone is 500ms, longer than the 400ms
  lock — tolerable per Claude, but could be shortened to 350ms later).
