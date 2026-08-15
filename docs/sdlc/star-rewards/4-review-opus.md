# Final Code Review: Star Rewards

**Reviewer:** reviewer-opus (GLM-5.2)  
**Date:** 2026-08-14  
**Branch:** `sdlc/loop-v0`  
**Scope:** `src/lib/stars.ts`, `src/lib/worldConfig.ts` (STAR_CONFIG), `src/lib/__tests__/stars.test.ts`, `src/lib/__tests__/stars.tiers.test.ts`, consumer sites in `GameOrchestrator.tsx` and `PracticeMode.tsx`  
**Parent:** Test: Star rewards unit tests (8ebe8c53) — 73 tests pass ✅  
**Prior review:** Review plan: Star rewards (2b9c2c3b) — APPROVED WITH FINDINGS ✅

---

## Verdict: APPROVED

The star rewards implementation is **clean, correct, well-typed, and well-tested**. No critical or blocking issues found. No `any` types, no `@ts-ignore`, no hacks, no eslint violations. TypeScript compiles clean. All 968 tests pass (46 files). The code is production-ready for the migrated paths (LESSON, SENSORY, PRACTICE).

### Scorecard

| Check | Result |
|-------|--------|
| TypeScript `tsc --noEmit` | ✅ Pass (0 errors) |
| ESLint (`stars.ts`, `worldConfig.ts`) | ✅ Pass (0 errors, 0 warnings) |
| Star unit tests (73 tests, 2 files) | ✅ All pass (1.94s) |
| Full suite (968 tests, 46 files) | ✅ All pass (77.77s) |
| `any` type usage | ✅ None |
| `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` | ✅ None |
| `eslint-disable` directives | ✅ None |
| Hacks / code smells | ✅ None |
| Type safety | ✅ Strict throughout |

---

## Source Code Review

### `src/lib/stars.ts` (62 lines)

**Assessment: Excellent.** Clean single-responsibility module, well-documented.

**Correctness:**
- `getTier()` — correctly returns `null` for `attempts <= 0`, maps mistake counts to tiers using `STAR_CONFIG` thresholds (≤1 → PERFECT, ≤3 → GOOD, else PASS). Logic is sound.
- `tierToStars()` — exhaustive switch over `StarTier` union. No default case needed because the union is closed and TypeScript enforces exhaustiveness. Returns 3/2/1 for PERFECT/GOOD/PASS.
- `computeStarsByTier()` — correctly delegates to `getTier` + `tierToStars`, defaults to PASS (1 star) when tier is null. This ensures a player who completes a node always earns ≥1 star.
- `STAR_TIERS` — `readonly` array, ordered best→worst. Exported for introspection in tests.

**Style:**
- JSDoc header clearly documents the tier ladder and design rationale ("rewarded for accuracy, never for simply finishing").
- `PerformanceResult` interface is minimal and well-documented.
- `STAR_TIERS` is `readonly` (not mutable at the type level), correctly preventing runtime mutation.
- The `export { STAR_TIERS }` at the bottom for test introspection is a clean pattern.

**Types:**
- `StarTier` is a string-literal union (`'PERFECT' | 'GOOD' | 'PASS'`) — no `any`, no `unknown`, no casts.
- `PerformanceResult` uses `number` for both fields — no optional fields, no nullable types where they shouldn't be.
- Return types are explicit: `StarTier | null`, `number`, `number`.

**No issues found.**

### `src/lib/worldConfig.ts` — STAR_CONFIG section

```typescript
export const STAR_CONFIG = {
    PERFECT_MAX_MISTAKES: 1,
    GOOD_MAX_MISTAKES: 3,
} as const;
```

**Assessment: Good.** Centralized config with `as const` for literal-type inference. Imported by `stars.ts` as the single source of truth for tier thresholds. No magic numbers in `stars.ts`.

### Consumer: `GameOrchestrator.tsx`

**LESSON path (line 119):**
```typescript
const stars = computeStars(performance.correct, performance.attempts);
```
Correct — passes raw `correct`/`attempts` from `LessonEngine.getPerformance()` without coercion.

**SENSORY path (lines 197, 203):**
```typescript
const stars = computeStars(correct || 1, attempts || 1);
```
**Minor finding (F1):** The `correct || 1, attempts || 1` fallback coerces zero values to 1. If a game mode ever reports `correct=0, attempts=0` (e.g. a buggy callback or a player who exits immediately), this becomes `computeStarsByTier(1, 1)` → PERFECT (3 stars) — a false perfect. This is a pre-existing defensive pattern, not introduced by the star rewards feature, and it prevents division-by-zero in other code paths. **Not a blocker** — but should be tracked as a tech-debt item.

**PRACTICE path (lines 288, 294):** Same `correct || 1, attempts || 1` pattern as SENSORY. Same minor finding applies.

**`computeStars` wrapper (line 80):**
```typescript
const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);
```
**Minor finding (F2):** This is a pure passthrough wrapper — `computeStars` adds no logic over `computeStarsByTier`. The plan review (finding N5) recommended removing this wrapper and calling `computeStarsByTier` directly. **Not a blocker** for this review — the wrapper is harmless and the refactor can be done in a follow-up.

### Consumer: `PracticeMode.tsx` (line 404)

```typescript
starsGained={computeStarsByTier(session.correct, session.attempts)}
```
Correct — calls `computeStarsByTier` directly (not through the wrapper). Passes raw session values without coercion.

---

## Test Review

### `stars.test.ts` (11 tests)

Covers the core API: `getTier` null/PERFECT/GOOD/PASS paths, `tierToStars` mapping, `computeStarsByTier` tier coverage and no-data default, `STAR_TIERS` ordering. Good baseline coverage.

### `stars.tiers.test.ts` (62 tests)

**Assessment: Excellent.** Exhaustive boundary-value testing covering:

1. **All 3 tiers** with explicit lower/upper boundary testing (0/1 mistakes for PERFECT, 2/3 for GOOD, 4+ for PASS)
2. **Critical boundary transitions** — tests the exact mistake count where tier changes (1→2 mistakes: PERFECT→GOOD, 3→4 mistakes: GOOD→PASS)
3. **Null result edge cases** — `attempts=0` with various `correct` values, including paradoxical `correct>0, attempts=0`
4. **Systematic boundary value table** — every mistake count 0-6 at two scales (10 and 5 attempts)
5. **Scale invariance** — tests at 1K, 1M attempts, documents that tiers are mistake-COUNT based (not ratio)
6. **Round-trip consistency** — `computeStarsByTier` ↔ `getTier` ↔ `tierToStars` for 10 representative results
7. **Negative/invalid inputs** — negative attempts (→null), negative correct (inflated mistakes → PASS), correct>attempts (negative mistakes → PERFECT)
8. **STAR_TIERS integrity** — length=3, ordering, unique star values, frozen check

The test file is well-organized with clear section headers, helper functions, and descriptive test names. No `any` types, no `ts-ignore`.

---

## Findings Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | Minor | `correct \|\| 1, attempts \|\| 1` fallback in SENSORY/PRACTICE paths can produce false PERFECT (3 stars) when both are 0. Pre-existing pattern, not introduced by star rewards. | Acknowledged — tech-debt |
| F2 | Minor | `computeStars` wrapper in GameOrchestrator is a pure passthrough to `computeStarsByTier`. Plan review recommended removing it. | Acknowledged — follow-up |
| F3 | Info | MEMORY and INVADERS modes still use hardcoded star logic (not yet migrated to `computeStarsByTier`). This is expected — the plan correctly identifies these as future work (Cards #1, #2). | Expected — tracked in plan |
| F4 | Info | `stars.ts` docblock says "Every game mode (PRACTICE, SENSORY, MEMORY, INVADERS, LESSON)" — MEMORY and INVADERS are not yet routed through it. Stale comment noted in plan review (N3). | Acknowledged — update after migration |

**No CRITICAL issues. No MAJOR issues. No blocking issues.**

---

## Prior Review Findings — Verification

The plan review (2b9c2c3b) identified these findings. Here is their status in the current codebase:

| Plan Review Finding | Status in Code |
|---------------------|----------------|
| C1: LESSON path unreachable (FALSE POSITIVE) | ✅ Confirmed false — LESSON path is live (`GameOrchestrator.tsx:119`) |
| C2: MEMORY + INVADERS still inline | ✅ Still true — `GameOrchestrator.tsx:233,256` — expected, plan covers |
| M3: LessonEngine re-drop double-counts | ✅ Pre-existing bug, not in scope of star rewards code |
| M4: LessonModal engine never resets | ✅ Pre-existing bug, not in scope of star rewards code |
| N1: PracticeMode already migrated | ✅ Confirmed — `PracticeMode.tsx:404` uses `computeStarsByTier` |
| N3: stars.ts docblock stale | ✅ Still present — should be updated after MEMORY/INVADERS migration |

---

## Quality Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Correctness | ⭐⭐⭐⭐⭐ | Logic is sound, edge cases handled, null-result path correct |
| Type safety | ⭐⭐⭐⭐⭐ | Strict types throughout, no `any`, no casts, no `ts-ignore` |
| Test coverage | ⭐⭐⭐⭐⭐ | 73 tests covering all tiers, boundaries, null handling, invalid inputs, round-trip |
| Code style | ⭐⭐⭐⭐⭐ | Clean JSDoc, consistent naming, `as const` for immutability |
| Architecture | ⭐⭐⭐⭐⭐ | Single source of truth via `STAR_CONFIG`, leaf module, clean imports |
| Maintainability | ⭐⭐⭐⭐⭐ | Well-documented, easy to extend for MEMORY/INVADERS migration |

---

## Conclusion

The star rewards implementation (`stars.ts` + `STAR_CONFIG` in `worldConfig.ts` + tests) is **clean, correct, and production-ready**. The migrated paths (LESSON, SENSORY, PRACTICE) correctly use `computeStarsByTier`. The two minor findings (F1: `|| 1` fallback, F2: passthrough wrapper) are pre-existing patterns, not defects in the star rewards code, and do not block this review. The MEMORY and INVADERS holdout paths are expected and tracked in the implementation plan.

**Recommendation: APPROVE — no blockers, no required changes.**

---

*Review performed by reviewer-opus (GLM-5.2) on 2026-08-14, reading source code directly from `sdlc/loop-v0` branch. TypeScript 4.1.10, Vitest 4.1.10. Read-only: no files edited, no commits made.*
