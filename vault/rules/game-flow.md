---
type: rule
rule_id: game-flow
severity: must
applies_to: [hebrew-math-adventures]
trigger: always_on
category: game
project: hebrew-math-adventures
updated: 2026-08-08
tags: [gameflow, safety, restart]
---

# Game Flow Control

## Exit safety
- NEVER allow instant exit from an active game session.
- Always require 2-step confirmation: **Pause → Quit**.

## Restart logic
A "Restart" MUST:
1. Reset Score/Streak to 0.
2. Clear the "Last 3 Questions" history buffer.
3. Refill the "Question Bag" (Math Engine reset).

## Playability principle
- No "dead zones" — a player should never wait idly with nothing actionable on screen. See [[domain/bubble-spawn-design]].
