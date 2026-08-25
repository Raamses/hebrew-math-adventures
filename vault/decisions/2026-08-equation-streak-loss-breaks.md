---
type: adr
project: hebrew-math-adventures
date: 2026-08-25
status: accepted
tags: [equation, streak, game-design, nerdle]
---

# ADR 2026-08-equation-streak-loss-breaks

## Context

`computeStreak` in `equationEngine.ts` returned the stored streak unchanged on a
yesterday-loss. This meant a player could lose every other day and keep an
unbroken counter — the streak stopped meaning "consecutive wins" and became
"days played with at least one win".

AmosBot's review of the merged `fix/saga-node-star-tier` branch flagged this.

## Decision

A loss **always** breaks the streak, returning 0. This matches Nerdle semantics
and the common expectation that a streak is "consecutive wins".

- already played today → return stored streak unchanged (idempotent)
- won today, last played yesterday → streak + 1 (continuation)
- LOST today → streak breaks to 0, regardless of gap
- won today after a gap → streak restarts at 1

## Consequences

- Streak counter is now a true "consecutive wins" metric
- Players who lose daily will see their streak reset — this is intentional
- 3 tests updated in `EquationOfTheDay.test.tsx`
