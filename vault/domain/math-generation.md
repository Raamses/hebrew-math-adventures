---
type: domain
project: hebrew-math-adventures
updated: 2026-08-03
tags: [domain, math, generation, algorithm]
---

# Math Generation Rules

## Bag Deck randomization
- NEVER pure `Math.random()` for question selection. Use Bag Deck.

## 3-digit constraints
- **Simple**: no carrying/borrowing (e.g. 245 + 123).
- **Carry tens**: e.g. 150 + 170 (5+7 > 10).
- **Zero crossing**: critical for subtraction (e.g. 503 - 15).

## Repetition guard
- Store last 3 questions in a `history` array.
- If a newly generated question matches any operand/result of the last 3, discard and regenerate.

## Adaptive difficulty (GameDirector)
- Track `attempts`, `consecutiveCorrect`, `consecutiveFailures`.
- **Rescue** (failures ≥ 2): bounds × 0.8, simplify types (`sub_borrow` → `sub_simple`).
- **Challenge** (streak ≥ 5): bounds × 1.2.

## Problem types
- Standard arithmetic, missing operand (algebraic), comparison (> = <), series, word problems. Generated in `ProblemFactory.ts`.
