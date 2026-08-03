---
type: architecture
project: hebrew-math-adventures
updated: 2026-08-03
tags: [architecture, features, inventory, status]
---

# Feature Inventory & Status

Source: `docs/plans/PRODUCT_OVERVIEW.md` (canonical audit). Status: ✅ works / ⚠️ partial / ❌ broken.

| Feature | Status | Notes |
|---|---|---|
| Multi-Profile Management | ✅ | Up to 10 profiles, ages 4–12, avatars, mascots. localStorage `hebrew-math-profiles` |
| Parent Gate & Security | ✅ | Dynamic addition challenge via `crypto.getRandomValues()` |
| Parent Dashboard | ✅ | Profile table, edit modal, reset data |
| Saga Map Progression | ✅ | Units 1–5, node types PRACTICE/SENSORY/LESSON/CHALLENGE, stars, locks |
| Legacy Zone Map | ⚠️ | `WorldMap.tsx` exists but unlinked — `App.tsx` routes via SagaMap only |
| Adaptive Math Engine | ✅ | MathModule + ProblemFactory + GameDirector (rescue/challenge) |
| Adaptive Difficulty | ✅ | Rescue 0.8×, Challenge 1.2×, type simplification |
| Practice Session & Modes | ✅ | Standard, Time Attack (60s), Survival (3 lives), combo multipliers |
| Math Card & Custom Input | ✅ | Vertical/horizontal arithmetic, series, comparison, custom numpad |
| Visual Animated Hints | ✅ | Borrowing, carrying, multiplication grid, division grouping |
| Sensory Mode (Bubble Pop) | ✅ | rAF loop, frenzy ≥5 combo, catch-up spawning, particles |
| Interactive Story Lessons | ⚠️ | Engine works, but only 1 lesson (`lesson1_multiplication`) implemented |
| Mascot System | ✅ | Owl/Bear/Ant/Lion, emotion states, SVG |
| Theme Customization | ✅ | Default/Forest/Space/Candy, unlock by stars |
| Audio Synthesizer | ✅ | Web Audio API, no external files |
| Analytics & Telemetry | ✅ | Firebase Analytics, env-safe fallback to console logger |
| Internationalization | ✅ | Hebrew RTL primary + English LTR, i18next |

## Known gaps / partials to watch
- **Lessons**: only 1 real lesson exists; other LESSON nodes fall back.
- **WorldMap**: dead code, possible consolidation with SagaMap (see backlog).
- **Bubble spawn playability**: see [[domain/bubble-spawn-design]] — stale-gameplay issue Ram flagged.
