# 🤝 Plan Synthesis — Claude Implementation Plan + Gemini Devil's Advocate

**Date:** 2026-07-31
**Synthesized by:** AmosBot Council Coordinator
**Sources:** `IMPLEMENTATION_PLAN.md` (Claude Opus) + `DEVILS_ADVOCATE.md` (Gemini Pro)

---

## 1. Where Both Agents Agree

| Area | Consensus |
|------|-----------|
| **RTL fix** | Both want a shared `<MathText>` component with `dir="ltr"` + `unicode-bidi: isolate`. Gemini recommends `<bdi>` element; Claude uses `<span>` with inline style. Either works; `<bdi>` is more semantically correct. |
| **Anti-repeat signature bug** | Both confirm the root cause: `pushSignature` tracks the *generated* (discarded) problem, not the *displayed* fallback. Fix is to push the actual displayed problem's signature. |
| **Problem type filtering** | Both agree `MathModule.pickProblemType` must be constrained to only generate types the strategy can handle. Claude proposes `supportedTypes` param; Gemini proposes `allowedTypes` param. Same concept, different name. |
| **Positive operand bounds** | Both want `num1 >= 1, num2 >= 1` for all arithmetic operators, not just `+`. |
| **Remove hardcoded `addition_simple`** | Both verify `GameOrchestrator.tsx` forces addition-only and agree it should be removed. |
| **Boss Knowledge Gates = highest ROI** | Both independently identify boss gates as the best creative feature: existing `spawnBoss`/`bossHealth` infrastructure, minimal new UI, maximum player impact. |
| **Profile whitelist trap** | Both flag `validateProfileUpdate` as a critical blocker for creative features — new profile fields will be silently stripped without updating the validator. |
| **No tests exist** | Both note zero test coverage for `MathModule`, `MathStrategy`, `useGameEngine` — both want vitest suites added. |

---

## 2. Key Disagreements & Resolutions

### Disagreement 1: Streak Reset Behavior (P0-2)

| Position | Details |
|----------|---------|
| **Claude** | Track cumulative correct per level (`levelProgressRef`). Don't reset on wrong taps. Optionally decay by 1. |
| **Gemini** | **STRONG OBJECTION** — cumulative counting lets random clickers level up by luck, trapping kids in too-hard levels. Proposes "soft streak decay" (`streak = Math.max(0, streak - 1)` on wrong tap). |
| **Resolution** | ✅ **Use Gemini's soft decay approach.** It's safer for the target audience (5-8 year olds). Change line 217 from `consecutiveCorrectRef.current = 0` to `consecutiveCorrectRef.current = Math.max(0, consecutiveCorrectRef.current - 1)`. This preserves progress while adding a skill floor. If playtesting shows it's still too punishing, switch to Claude's decay-by-1 on `levelProgressRef` as a hybrid. |

### Disagreement 2: Remove `behavior.setProblem(problem)` useEffect (P0-1)

| Position | Details |
|----------|---------|
| **Claude** | Remove it. The strategy should own problem lifecycle. The `problem` prop is "largely dead" for bubble games. |
| **Gemini** | **WARNING** — deleting it will break Saga mode, where `GameOrchestrator` passes specific problems for learning path nodes (e.g. "pop 5" or a specific equation). Those will be ignored if the strategy always generates its own. |
| **Resolution** | ✅ **Conditional removal.** Only call `behavior.setProblem(problem)` when the problem comes from a Saga/learning-path node (check if `problem` has a `target` or specific `type` that isn't `'arithmetic'`). For arcade mode, skip it and let the strategy generate. Implement as: `if (problem && problem.type !== 'arithmetic') behavior.setProblem(problem);` |

### Disagreement 3: Seed `sessionLevel` from `profile.estimatedLevel` (P0-3)

| Position | Details |
|----------|---------|
| **Claude** | Seed `sessionLevel` from `profile.estimatedLevel`, capped at 10. |
| **Gemini** | **Two issues:** (1) `GameOrchestrator.tsx:90` explicitly overrides `estimatedLevel` to `1` for arcade — must fix that too. (2) Starting at level 8 with no warmup + high bubble speed = death loop. |
| **Resolution** | ✅ **Fix GameOrchestrator override (Claude's P0-8 already addresses this).** For warmup, start at `Math.max(1, estimatedLevel - 1)` instead of full `estimatedLevel`. This gives 1 level of ramp. Both agents' concerns are addressed. |

### Disagreement 4: Level 10 Prestige (P1-10)

| Position | Details |
|----------|---------|
| **Claude** | Implement prestige state (⭐×N badge + score multiplier) for players who exceed level 10. |
| **Gemini** | **Premature** — Classic mode ends at 10 target pops (~33 correct needed for level 10). Level 10 is mathematically unreachable in current game configs. Building prestige for an unreachable state is wasted effort. |
| **Resolution** | ✅ **Defer prestige to after Phase 4.** With P0-4 (target_count → 20) and P0-2 (easier leveling), level 10 becomes reachable. But it's not P1-urgent. Ship P0 fixes first, re-evaluate if playtesting shows players actually hit level 10. Keep the design in backlog. |

### Disagreement 5: `supportedTypes` Implementation

| Position | Details |
|----------|---------|
| **Claude** | Pass `supportedTypes` in `params` to `generateProblem()`, filter in `pickProblemType`. |
| **Gemini** | Same idea but warns the filter must actually be implemented in `pickProblemType` — just passing the param does nothing (the current code ignores unknown params). |
| **Resolution** | ✅ **Both are right — implementation must modify `pickProblemType` to accept and use the param.** Claude's plan already includes this; Gemini's warning is a guardrail. Ensure the PR includes the `pickProblemType` signature change, not just the caller change. |

---

## 3. Final Recommended Implementation Order

Reordered considering both perspectives, with blockers and risk-mitigations applied:

### Phase 1: P0 Critical Fixes (dependency-ordered)

| # | Task | Agent | Est. | Notes |
|---|------|-------|------|-------|
| 1 | **P0-9: RTL instruction fix** (`dir="ltr"` + `unicodeBidi: isolate`) | amosbot | 5 min | Zero risk, immediate visual win |
| 2 | **P0-4: Raise Classic `target_count` to 20** | amosbot | 5 min | Trivial, enables longer games |
| 3 | **P0-7: Positive operand bounds** (all operators) | aider | 15 min | Independent, no dependencies |
| 4 | **P0-1: Conditional `setProblem` removal** (Saga-aware) | claude | 20 min | Use Gemini's conditional approach, not full removal |
| 5 | **P0-3: Seed sessionLevel from estimatedLevel-1** | claude | 15 min | Depends on P0-1; also fix GameOrchestrator override (P0-8) |
| 6 | **P0-8: Remove hardcoded `addition_simple` + fix estimatedLevel override** | claude | 10 min | Ships with P0-3/P0-5 |
| 7 | **P0-5: `supportedTypes` filter in `pickProblemType`** | claude | 25 min | Must modify `pickProblemType` signature, not just caller |
| 8 | **P0-6: Track displayed signature** | amosbot | 10 min | Depends on P0-5 |
| 9 | **P0-2: Soft streak decay** (Gemini's approach) | claude | 15 min | Safer than cumulative for young kids |

**Phase 1 total: ~2h**
**Add vitest suites after: MathModule, MathStrategy, leveling helper**

### Phase 2: P1 Fixes

| # | Task | Agent | Est. | Notes |
|---|------|-------|------|-------|
| 10 | **P1-15: Shared `<MathText>` component** | amosbot | 20 min | Use `<bdi>` per Gemini |
| 11 | **P1-14: Memory Duel card container RTL** | amosbot | 10 min | Wrap in `<MathText>` |
| 12 | **P1-16: RTL audit** (grep + wrap) | amosbot | 15 min | |
| 13 | **P1-12: Scale distractor range** | aider | 5 min | |
| 14 | **P1-11: Widen anti-repeat + broaden on exhaustion** | claude | 15 min | Gemini warns: don't set window > unique problem space at low levels |
| 15 | **P1-13: Pedagogical distractors** | claude | 45 min | High value, reads `this.currentProblem` |
| 16 | **P0-profile: Fix `validateProfileUpdate` whitelist** | claude | 15 min | **CRITICAL prerequisite for Phase 3-5** (Gemini's catch) |
| 17 | ~~P1-10: Prestige state~~ | — | — | **DEFERRED** — not reachable yet per Gemini |

**Phase 2 total: ~2h 10m**

### Phase 3: Creative Feature — Math Pet 🐾

| # | Task | Agent | Est. |
|---|------|-------|------|
| 18 | 3.0: Profile plumbing (pet + gems fields) | claude | 40 min |
| 19 | 3.1: Pet engine (pure functions) | aider | 45 min |
| 20 | 3.2: Pet UI components | claude | 60 min |
| 21 | 3.3: Gems reward hook | amosbot | 20 min |

**Phase 3 MVP: 1 species (owl), derive stage from estimatedLevel, on-map companion + simple pet screen**
**Phase 3 total: ~2h 45m**

### Phase 4: Creative Feature — Boss Knowledge Gates 🛡️

| # | Task | Agent | Est. |
|---|------|-------|------|
| 22 | 4.1: Boss gate sequence model | aider | 45 min |
| 23 | 4.2: Wire into `useGameEngine` | claude | 90 min |
| 24 | 4.3: Dynamic boss banner | amosbot | 20 min |

**Phase 4 MVP: `+`/`-`/`×` gates, 3 escalating stages, reuse existing HP bar + banner**
**Phase 4 total: ~2h 35m**
**⚠️ Highest risk task: 4.2 touches the shared `handlePop` hot path**

### Phase 5: Creative Feature — Power-Ups + Combo Fusion ⚡

| # | Task | Agent | Est. |
|---|------|-------|------|
| 25 | 5.1: Lightning Chain + Rainbow Magnet power-ups | claude | 60 min |
| 26 | 5.2: Combo Fusion mode | claude | 120 min |
| 27 | 5.3: Mode selection + entry | amosbot | 20 min |

**Phase 5 MVP: Both power-ups (rainbow_magnet as instant-cluster), Fusion as opt-in mode**
**Phase 5 total: ~3h 20m**
**⚠️ 5.2 is the highest-risk item overall — gate behind its own mode to protect default play**

---

## 4. Risks & Blockers Identified by Devil's Advocate (Must Address Before Starting)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| **R1** | **Profile whitelist silent data loss** — `validateProfileUpdate` strips unknown fields. Any new profile field (pet, gems) will silently never persist. | 🔴 Critical | Add new fields to validator AND migration `map()` in `ProfileContext` **before** any creative feature work. Task 16 in Phase 2. |
| **R2** | **Saga mode problem breakage** — removing `setProblem` entirely will cause Saga learning-path nodes to be ignored. | 🔴 Critical | Use conditional removal: only call `setProblem` for non-arithmetic/Saga problems. Task 4. |
| **R3** | **Random-clicking exploit** — cumulative leveling lets kids level up by luck, trapping them in too-hard levels. | 🟡 High | Use soft streak decay (decrement by 1, not zero reset). Task 9. |
| **R4** | **GameOrchestrator estimatedLevel override** — line 90 forces `estimatedLevel: 1` for arcade. Seeding from profile won't work unless this is also fixed. | 🟡 High | Fix in P0-8 (remove the override, use real profile level). Task 6. |
| **R5** | **Completion delay race condition** — `setTimeout(() => onComplete(), 1500)` allows bubble pops during the delay, causing duplicate `recordSession()` calls. | 🟡 Medium | Add a `hasCompletedRef` guard. Not blocking but should be fixed during Phase 1. |
| **R6** | **Anti-repeat window too large for level 1** — at level 1, only ~15 unique addition problems exist. Setting `MAX_RECENT_SIGNATURES = 20` guarantees exhaustion. | 🟡 Medium | Set window to `min(18, estimatedUniqueProblems - 2)` or broaden difficulty on exhaustion (Claude's P1-11 already handles this). |
| **R7** | **Boss gate `handlePop` coupling** — extending the engine for boss stages touches the hottest code path shared by all modes. | 🟡 Medium | Gate behind boss-only logic. Comprehensive vitest coverage for `useGameEngine` before and after. |
| **R8** | **Fusion mode engine regression** — dual-target support modifies `validate`/`generateNext`/`handlePop` which all modes use. | 🟡 Medium | Fusion is its own arcade mode. Default arcade/blitz/zen modes must not be affected. Test both paths. |

---

## 5. Recommended Agent Assignments

| Agent | Strengths | Assigned Tasks |
|-------|-----------|----------------|
| **claude** (`claude -p --model opus`) | Architecture, complex logic, engine changes | P0-1 (conditional removal), P0-3 (seed level), P0-5 (type filter), P0-8 (GameOrchestrator), P0-2 (streak decay), P1-13 (pedagogical distractors), P1-11 (anti-repeat), profile whitelist fix, Phase 3.2 (pet UI), Phase 4.2 (boss engine wiring), Phase 5.1-5.2 (power-ups + fusion) |
| **aider** (`aider --message`) | Quick targeted edits, file-specific changes | P0-7 (operand bounds in ProblemFactory), P1-12 (distractor range), Phase 3.1 (pet engine pure functions), Phase 4.1 (boss gate model) |
| **amosbot** (me) | Quick wins, UI wiring, testing, coordination | P0-9 (RTL fix), P0-4 (target_count), P0-6 (displayed signature), P1-14/15/16 (RTL components + audit), Phase 3.3 (gems hook), Phase 4.3 (boss banner), Phase 5.3 (mode selection) |
| **agy** (`agy -p`) | Independent review, devil's advocate | Post-Phase-1 review of test coverage, post-Phase-4 review of boss engine safety |

### Execution Strategy
1. **Parallelize where possible:** P0-9, P0-4, P0-7 are independent — run amosbot + aider in parallel.
2. **Sequence the dependency chain:** P0-1 → P0-3 → P0-8 → P0-5 → P0-6 must be done in order (claude).
3. **Test after Phase 1:** Write and run all new vitest suites before starting Phase 2.
4. **Review after Phase 4:** Have agy review the boss engine changes before proceeding to Phase 5.
5. **Max 2 retries per step** — if a step fails twice, ask Ram for guidance.

---

## Summary

The council report was **mostly correct** in its diagnosis, but Gemini's devil's advocate review caught **3 critical issues** that would have caused regressions:
1. Saga mode breakage from full `setProblem` removal
2. Random-clicking exploit from cumulative leveling
3. Profile data loss from unwhitelisted new fields

Claude's implementation plan is **more detailed and actionable** — it grounds every fix in actual source code with diff-level descriptions, dependency graphs, and testing strategies. The two perspectives together produce a plan that is both ambitious and safe.

**Total estimated effort: ~13 hours across all phases.**
**Recommended first action: P0-9 (RTL fix, 5 min, zero risk) + P0-4 (target_count, 5 min) in parallel.**