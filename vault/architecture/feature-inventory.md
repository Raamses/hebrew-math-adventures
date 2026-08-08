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
| Dynamic Star Rewards (Tier) | ✅ | `src/lib/stars.ts` — Pass/Good/Perfect → 1/2/3 across all node types (was hardcoded 3 for lessons)
| Legacy Zone Map | ⚠️ | `WorldMap.tsx` exists but unlinked — `App.tsx` routes via SagaMap only |
| Adaptive Math Engine | ✅ | MathModule + ProblemFactory + GameDirector (rescue/challenge) |
| Adaptive Difficulty | ✅ | Rescue 0.8×, Challenge 1.2×, type simplification |
| Practice Session & Modes | ✅ | Standard, Time Attack (60s), Survival (3 lives), combo multipliers |
| Math Card & Custom Input | ✅ | Vertical/horizontal arithmetic, series, comparison, custom numpad |
| Visual Animated Hints | ✅ | Borrowing, carrying, multiplication grid, division grouping |
| Sensory Mode (Bubble Pop) | ✅ | rAF loop, frenzy ≥5 combo, catch-up spawning, particles |
| Interactive Story Lessons | ✅ | Engine works + performance-tier star rewards; only 1 lesson (`lesson1_multiplication`) implemented |
| Mascot System | ✅ | Owl/Bear/Ant/Lion, emotion states, SVG |
| Theme Customization | ✅ | Default/Forest/Space/Candy, unlock by stars |
| Audio Synthesizer | ✅ | Web Audio API, no external files |
| Analytics & Telemetry | ✅ | Firebase Analytics (GA4 property 519138010). 16 typed events: lifecycle, progression, performance, engagement. Env-safe fallback to console. See [[domain/analytics]]. |
| Internationalization | ✅ | Hebrew RTL primary + English LTR, i18next |

## Known gaps / partials to watch
- **Lessons**: only 1 real lesson exists; other LESSON nodes fall back.
- **Bubble spawn playability**: see [[domain/bubble-spawn-design]] — GA4 data shows 94% node-start → node-complete drop-off (2026-08-08).
- **GA4 custom dimensions**: event params exist in code but not yet registered/tested as queryable GA4 dimensions. See [[domain/analytics]].
