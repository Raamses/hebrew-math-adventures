---
type: decision
status: accepted
date: 2026-11-28
updated: 2026-11-28
project: hebrew-math-adventures
decision: "Gifted-prep creative math part 4 (C7): who has what, fair sharing, heads and legs"
related: [decisions/2026-11-gifted-prep-stage-a]
tags: [gifted-prep, creative-math, reasoning, decision]
---

# Creative math part 4 (C7)

**Date:** 2026-11-28 · **Status:** both PRs merged by Ram. Ram approved part 4 on 2026-11-24 ("yes", no content freeze).

## What was picked, and why
Ram's brief: hard, unusual but age-right types beyond the 12 live reasoning types (C3 + C5). The candidates were logic grids, matchstick moves, shortest grid paths, odd-coin weighing, fair sharing and digit-sum puzzles. I picked by quality, not count:

- **Who has what** (`math-logic` / `logic-grid`). 4 children, 4 pets, "has" / "has not" clues one per line. d1: two "has" clues. d2: one. d3: "has not" only. From d2 the answer needs a chain (another child's pet first). Every clue is needed.
- **Fair sharing** (`math-equalize` / `fair-share`). Move half the gap, not the gap. "After moving k they are equal" means the gap was 2k. d3: three children, give down to the fair share.
- **Heads and legs** (`math-legs` / `heads-legs`). Chickens and sheep; from d3 also beetles (6 legs) and spiders (8 legs). Assume the fewer legs, and each extra pair is one animal of the other kind.

Not picked:
- **Digit-sum puzzles:** already covered by the `clues` digit-sum clue and `counting` digits.
- **Odd-coin weighing:** overlaps the C5 `scales` type.
- **Matchsticks and shortest grid paths:** each needs a new drawn renderer. Left for a later part.

## Design note (found while building)
With "has not" clues only, the asked child's pet never takes 3 or more deduction steps: the generator never produced one in 20,000 draws. So d3 is "a 2-step chain with nothing given outright", not "3 steps". A 3-step requirement made the generator loop forever.

## PRs
- https://github.com/Raamses/hebrew-math-adventures/pull/328: who has what, plus the #321 review minor (`unicode-bidi-isolate` on the BidiText LTR span). Gate green; reviewer APPROVE, no findings.
- https://github.com/Raamses/hebrew-math-adventures/pull/329: fair sharing and heads and legs. Builds on #328; merge #328 first.

## Open for Ram
- Review the Hebrew templates and the 10 samples per type in each PR body.
- Niqqud kept against Dicta, needing a human eye: עַכָּבִישִׁים (Dicta: עַכְּבִישִׁים) and שְׁלוֹשְׁתָּם (Dicta: שְׁלָשְׁתָּם).

## Status 2026-11-28 (end of session)
- #328 merged by Ram (454b5f9).
- #329 merged by Ram (f00bef0), 2026-11-28 11:27 UTC. Reviewer APPROVE at 19a6645 (round 1 F1.1 MAJOR "1 חיפושיות" fixed; F2.1 NIT left: local `it` name, file-wide pattern).
- Vault copy written 2026-11-28 from the claude-win session (C7 could not reach the vault: read-only over ssh, SMB auth failed).
