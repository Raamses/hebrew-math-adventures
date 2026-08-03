---
type: rule
rule_id: math-curriculum
severity: must
applies_to: [hebrew-math-adventures]
trigger: always_on
category: curriculum
tags: [math, curriculum, generation, levels]
---

# Math Logic & Curriculum Standards

## Level standards (by age)
| Level | Age | Constraint |
|---|---|---|
| 1 | 6 | Add/Sub result < 10 (e.g. 3 + 4) |
| 2 | 7 | Add/Sub result < 20 (e.g. 12 - 5) |
| 3 | 8 | Add/Sub < 100, basic mult (1-5 tables) |
| 4 | 9+ | Mult (1-10), basic division |
| 5 | 10+ | Basic fractions (1/2, 1/4, 1/8), division 1-100 |

## Progression
- Users earn **XP**. Every 100 XP = Level Up.

## Advanced generation rules
- **Bag Deck randomization** — NEVER pure `Math.random()` for question selection.
- **3-digit constraints**:
  - Simple: no carrying/borrowing (e.g. 245 + 123)
  - Carry tens: e.g. 150 + 170 (5+7 > 10)
  - Zero crossing: critical for subtraction (e.g. 503 - 15)
- **Repetition guard**: store last 3 questions in a `history` array. If a new question matches any operand/result of the last 3, discard and regenerate.

## Adaptive difficulty (GameDirector)
- Track `attempts`, `consecutiveCorrect`, `consecutiveFailures`.
- **Rescue** when failures ≥ 2: multiply bounds × 0.8, simplify types (e.g. `sub_borrow` → `sub_simple`).
- **Challenge** when streak ≥ 5: multiply bounds × 1.2.
