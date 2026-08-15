---
type: domain
project: hebrew-math-adventures
updated: 2026-08-03
status: active-concern
tags: [domain, bubble, playability, design]
---

# Bubble Spawn — Playability Design Intent

**This is the design intent behind the spawn overhaul.** The game must NEVER feel stale: no dead zones, no idle waiting, targets always reachable.

## Core principles
1. **No dead zones** — a player should never wait idly with nothing actionable on screen.
2. **Target visibility guarantee** — a needed target must appear within a bounded window (6s hard cap post-overhaul).
3. **Responsive progression** — difficulty ramp feels alive, not random.
4. **Anti-repeat** — no repetitive/duplicate spawn patterns.

## Implemented mechanisms (P0 overhaul, see [[decisions/2026-07-spawn-overhaul]])
- **Shuffled bag** for target/distractor ratio → max gap = ratio+1 draws (no gambler's streaks).
- **Target safety net** → forced target spawn if none for 6s.
- **Credit accumulator** scheduler → responsive, frame-based spawning.
- **Frenzy mode** at ≥5 combo (transient announcement + persistent badge).

## Status
- ✅ Structural fixes landed (branch `1677268` "bubble spawn engine overhaul P0+P1").
- ⚠️ **Watch item:** whether playability feels good in real kid playtesting. Ram's original complaint — "minutes without finding even one bubble you need" — must stay resolved.

## If it still feels stale
Revisit spawn rate curves, target-vs-distractor density, and catch-up spawning. See `SPAWN_OVERHAUL_PLAN.md` for full implementation detail.
