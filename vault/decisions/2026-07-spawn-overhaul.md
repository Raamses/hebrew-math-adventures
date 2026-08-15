---
type: decision
status: accepted
date: 2026-07-31
updated: 2026-07-31
project: hebrew-math-adventures
decision: "Bubble spawn engine overhaul (P0+P1)"
related: [domain/bubble-spawn-design, rules/game-flow]
tags: [bubble, spawn, playability, decision]
---

# ADR: Bubble Spawn Engine Overhaul (P0+P1)

**Date:** 2026-07-31 · **Status:** Accepted · **Branch:** `1677268`

## Context
The bubble game had playability issues: dead zones with no bubbles, phases with minutes without a needed target, and idle waiting. Ram flagged this as a top priority.

## Decision
Rebuild the spawn system with three P0 structural fixes, confined to `MathStrategy.ts`, `useGameEngine.ts`, `arcadeModes.ts`, `types.ts`:

1. **Shuffled bag** for target/distractor ratio (replaces `Math.random() < targetChance` gambler's streak). Fisher-Yates bag, integer proportions, `forceTarget` bypass for boss, bag reset on ratio change.
2. **Target safety net** in spawn loop — hard guarantee a target appears within 6s even if bag + despawn timing align against it. `lastTargetSeenTime` ref.
3. **Credit accumulator** spawn scheduler (`lastFrameTime` ref updated every frame).

## Rationale
- Eliminates gambler's-streak dead zones (bag guarantees max gap = ratio+1 draws).
- Guarantees target visibility (playability principle from [[rules/game-flow]]).
- Makes progression feel responsive.

## Consequences
- `IGameBehavior` interface gains optional `forceTarget` param (backward compatible).
- Risk: Medium (touches engine core). Reviewed by Claude + Gemini (devil's advocate).

## Revisit if
- Playability still feels stale in real playtesting, or
- A new dead-zone scenario emerges post-overhaul.
