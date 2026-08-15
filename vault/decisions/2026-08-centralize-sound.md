---
type: decision
status: accepted
date: 2026-08-06
updated: 2026-08-06
project: hebrew-math-adventures
decision: "Centralize sound handling in useSound via semantic feedback API"
related: [architecture/system-overview, rules/quality-gates, roadmap/backlog]
tags: [audio, sound, refactor, hook, decision]
---

# ADR: Centralize Sound Handling in `useSound`

**Date:** 2026-08-06 · **Status:** Accepted · **Branch:** `sdlc/loop-v0`

## Context
`PracticeMode.tsx` (and several game components) scattered sound logic:
- Raw `playSound('levelUp')` calls in two places (session complete + game over).
- A duplicated `soundGarden` ternary in `handleAnswer` choosing between
  `playMelodyNote()`/`playWrongMelody()` (Sound Garden) and `playSound('correct')`/`playSound('wrong')`.

This duplicated the sound-choice decision in every caller and made mute handling
depend on internal guards inside each hook.

## Decision
Extend `useSound` with a **semantic feedback API** so the sound-choice logic lives
in exactly one place:

- `playAnswerCorrect(soundGardenEnabled, playMelodyNote?)`
- `playAnswerWrong(soundGardenEnabled, playWrongMelody?)`
- `playLevelUp()`

The two answer helpers honor both Sound Garden mode **and** the mute flag before
emitting anything, so callers no longer re-implement the branch. `playLevelUp()`
centralizes the level-up / session-complete / game-over cue.

`PracticeMode.tsx` now calls only these semantic methods; the raw
`playSound(type)` calls and the `soundGarden` ternaries were removed. The raw
`playSound`/`play` API is preserved for the other consumers (BubbleGameContainer,
UnitCompleteCinematic, FrenzyOverlay, etc.) and is untouched.

## Rationale
- Single source of truth for sound-choice + mute gating.
- Eliminates repeated `soundGarden` ternaries.
- The mute guard moved into the semantic helper (previous callers relied on the
  melody hook's internal guard; now the semantic API is self-contained).

## Tests
New `src/hooks/__tests__/useSound.test.ts` (9 cases) covers delegation to melody,
classic fallback, missing-melody fallback, levelUp cue, mute gating, and mute
persistence. Full suite: 316/316 passing.

## Notes
- Follow-up (not in this change): `BubbleGameContainer`, `MathInvadersGame`, and
  `MemoryDuelGame` still use the raw `soundGarden` ternary; they can migrate to
  the semantic API in a later pass.
