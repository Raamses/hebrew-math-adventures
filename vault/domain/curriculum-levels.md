---
type: domain
project: hebrew-math-adventures
updated: 2026-08-03
tags: [domain, curriculum, math, levels]
---

# Curriculum Levels (by age)

Authoritative math standards per level. Source: `ANTIGRAVITY_RULES.md` + `docs/plans/PRODUCT_OVERVIEW.md`.

| Level | Age | Constraint |
|---|---|---|
| 1 | 6 | Add/Sub result < 10 (e.g. 3 + 4) |
| 2 | 7 | Add/Sub result < 20 (e.g. 12 - 5) |
| 3 | 8 | Add/Sub < 100, basic mult (1-5 tables) |
| 4 | 9+ | Mult (1-10), basic division |
| 5 | 10+ | Basic fractions (1/2, 1/4, 1/8), division 1-100 |

## Progression
- Earn **XP**; every 100 XP = Level Up.

## Units (Saga Map)
- `unit_1` through `unit_5` in `src/data/learningPath.ts`.
- Node types: `PRACTICE`, `SENSORY`, `LESSON`, `CHALLENGE`.
- Initial unit unlocked based on child age (`getInitialProgress`).

## Legacy zones (WorldMap — unlinked)
- Addition Island (L1-2), Subtraction Forest (L3-4), Multiplication Mountain (L5+). Defined in `src/lib/worldConfig.ts`; not in main flow.
