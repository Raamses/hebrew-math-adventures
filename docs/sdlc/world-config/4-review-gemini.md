# Final Review: World Config Consolidation

**Reviewer:** reviewer-gemini (GLM-5.2)
**Date:** 2026-08-14
**Branch:** `sdlc/loop-v0`
**Repo:** `hebrew-math-adventures`
**Parent card:** Test: World config unit tests (a08da87d) — 36 vitest tests written

---

## Verdict: ✅ APPROVED WITH NOTES

The world config consolidation is structurally sound, well-organized, and
effectively centralizes all game-world constants into a single leaf module.
All 968 tests pass (including 129 worldConfig-specific tests), TypeScript
compiles cleanly with zero errors, and the migration is nearly complete with
only one minor orphaned constant remaining.

---

## 1. Architecture Review

### 1.1 Leaf-Module Purity ✅

`src/lib/worldConfig.ts` correctly declares itself as a TRUE LEAF module:
- Imports only from `lucide-react` (icons) and `../types/game` (type defs)
- No imports from `engines/`, `components/`, `hooks/`, `context/`, or `data/`
- Verified by `worldConfig.leaf.test.ts` (11 invariant tests, all passing)
- The leaf test reads the source file and regex-checks for forbidden imports —
  this is an excellent CI-time guard against layer violations

### 1.2 Export Surface ✅

The module exports a well-structured set of constants and types:

| Export | Category | Type |
|--------|----------|------|
| `MAX_LEVEL`, `MIN_LEVEL`, `BOSS_LEVELS`, `BOSS_GATE_PROBLEM_COUNT` | Global Scalars | number / readonly array |
| `ZoneConfig` (interface), `WORLD_ZONES`, `getZoneForLevel` | Zone Config | type + data + function |
| `DIRECTOR_CONFIG` | Director Config | frozen object |
| `STAR_CONFIG` | Star Tier Config | frozen object |
| `PetStageConfig` (interface), `PET_STAGES` | Pet Config | type + data |
| `THEME_UNLOCKS`, `MASCOT_UNLOCKS` | Unlock Config | frozen arrays |
| `LEVEL_PROGRESSION`, `BUBBLE_SUPPORTED_TYPES` | Problem Progression | Record + ReadonlySet |
| `MEMORY_LEVEL_OPS` | Memory Game | Record |
| `DIFFICULTY_BREAKPOINTS` | Word Problems | frozen object |
| `ArcadeModeConfigEntry` (interface), `ARCADE_CONFIGS`, `ARCADE_MODE_LABELS` | Arcade Mode | type + data |
| `SESSION_CONFIG`, `SESSION_THEMES` | Session Config | frozen objects |
| `POWER_UP_CONFIG` | Power-Up Config | frozen object |
| `SPAWN_CONFIG` | Spawn Strategy | frozen object |
| `INVADER_CONFIG` | Invader Config | frozen object |
| `PRACTICE_CONFIG` | Practice Session | frozen object |
| `FRENZY_CONFIG` | Frenzy/Scoring | frozen object |
| `STORAGE_KEYS` | Storage Keys | frozen object |
| `SENSORY_CONFIG` | Sensory Factory | frozen object |
| `UI_CONFIG` | Behavioral UI | frozen object |
| `SCORING_CONFIG` | Scoring | frozen object |
| `BUBBLE_ENGINE_CONFIG` | Bubble Engine | frozen object |

All objects use `as const` for immutability. Types are properly co-located
with their data. The naming convention is consistent (SCREAMING_SNAKE_CASE
for objects, PascalCase for interfaces).

### 1.3 Section Organization ✅

The file is organized into clearly delimited sections with comment headers:
1. Global Scalars
2. Zone Config (existing — kept as-is)
3. Director Config
4. Star Tier Config
5. Pet Config
6. Theme Unlock Config
7. Mascot Unlock Config
8. Problem Type Progression
9. Memory Game Operations
10. Word Problem Difficulty Breakpoints
11. Arcade Mode Config
12. Session Config
13. Power-Up Config
14. Spawn Strategy Config
15. Invader Config
16. Practice Session Config
17. Frenzy Config
18. Storage Keys
19. Sensory Factory Config
20. Behavioral UI Config
21. Scoring Config
22. Bubble Engine Config
23. Deferred Constants (documented, not yet migrated)

This is clean and navigable. The "Deferred Constants" section at the bottom
transparently documents what was NOT migrated and why — badge thresholds
(content-adjacent) and daily challenge streak multipliers (challenge-specific).

---

## 2. Orphaned Constants Check

### 2.1 Found: `useSoundManager.ts` — Hardcoded `'isMuted'` String ⚠️ MINOR

**File:** `src/hooks/useSoundManager.ts`, lines 170 and 178

```typescript
// Line 170:
const saved = localStorage.getItem('isMuted');
// Line 178:
localStorage.setItem('isMuted', JSON.stringify(isMuted));
```

**Impact:** `STORAGE_KEYS.IS_MUTED` exists in worldConfig with value `'isMuted'`,
and `useSound.ts` (the sibling hook) correctly imports and uses `STORAGE_KEYS.IS_MUTED`.
However, `useSoundManager.ts` (the unified sound hook) uses the raw string
literal `'isMuted'` instead of importing from worldConfig.

**Risk:** Low — the value is the same string, so behavior is identical today.
But this breaks the "single source of truth" contract: if `IS_MUTED` is ever
renamed or reconfigured, `useSoundManager.ts` will silently desync.

**Fix:** Import `STORAGE_KEYS` and replace both occurrences:
```typescript
import { STORAGE_KEYS } from '../lib/worldConfig';
// ...
localStorage.getItem(STORAGE_KEYS.IS_MUTED)
localStorage.setItem(STORAGE_KEYS.IS_MUTED, JSON.stringify(isMuted))
```

### 2.2 Found: `ThemeContext.test.tsx` — Hardcoded `'hebrew-math-theme'` String ⚠️ MINOR

**File:** `src/context/ThemeContext.test.tsx`, lines 52 and 123

```typescript
localStorage.setItem('hebrew-math-theme', 'space');
expect(localStorage.getItem('hebrew-math-theme')).toBe('space');
```

**Impact:** Test file uses the raw string instead of importing `STORAGE_KEYS.THEME`.
If the key ever changes, the test will keep testing the old key while production
code uses the new one — a silent test gap.

**Fix:** Import `STORAGE_KEYS` in the test and use `STORAGE_KEYS.THEME`.

### 2.3 No Other Orphaned Constants Found ✅

Exhaustive grep for all other STORAGE_KEYS values, all major config objects
(DIRECTOR_CONFIG, STAR_CONFIG, SESSION_CONFIG, POWER_UP_CONFIG, SPAWN_CONFIG,
FRENZY_CONFIG, SCORING_CONFIG, BUBBLE_ENGINE_CONFIG, INVADER_CONFIG,
PRACTICE_CONFIG, SENSORY_CONFIG, UI_CONFIG, LEVEL_PROGRESSION,
BUBBLE_SUPPORTED_TYPES, MEMORY_LEVEL_OPS, DIFFICULTY_BREAKPOINTS,
THEME_UNLOCKS, MASCOT_UNLOCKS, PET_STAGES, ARCADE_CONFIGS,
ARCADE_MODE_LABELS, BOSS_LEVELS, BOSS_GATE_PROBLEM_COUNT, MAX_LEVEL, MIN_LEVEL)
found NO other hardcoded duplicates in production code.

---

## 3. Consumer Migration Audit

### 3.1 Fully Migrated Consumers (23 files) ✅

| File | Imports from worldConfig |
|------|-------------------------|
| `src/engines/GameDirector.ts` | `DIRECTOR_CONFIG`, `MAX_LEVEL` |
| `src/engines/bubble/useGameEngine.ts` | `POWER_UP_CONFIG`, `FRENZY_CONFIG`, `SCORING_CONFIG`, `BUBBLE_ENGINE_CONFIG` |
| `src/engines/bubble/strategies/MathStrategy.ts` | `SPAWN_CONFIG` |
| `src/engines/invader/useInvaderEngine.ts` | `FRENZY_CONFIG`, `SCORING_CONFIG` |
| `src/engines/invader/types.ts` | `INVADER_CONFIG` (re-exported for backward compat) |
| `src/engines/MathModule.ts` | `LEVEL_PROGRESSION`, `BUBBLE_SUPPORTED_TYPES` |
| `src/engines/memory/MemoryFactory.ts` | `MEMORY_LEVEL_OPS` |
| `src/engines/SensoryFactory.ts` | `SENSORY_CONFIG` |
| `src/components/games/BubbleGameContainer.tsx` | `SESSION_CONFIG`, `SESSION_THEMES`, `BOSS_LEVELS`, `MAX_LEVEL` |
| `src/components/MapZone.tsx` | `ZoneConfig` (type) |
| `src/components/WorldMap.tsx` | `WORLD_ZONES`, `ZoneConfig` |
| `src/components/mascot/MascotGreeting.tsx` | `UI_CONFIG` |
| `src/components/mascot/MascotSelector.tsx` | `MASCOT_UNLOCKS` |
| `src/components/PracticeMode.tsx` | `UI_CONFIG` |
| `src/components/sensory/Bubble.tsx` | `UI_CONFIG` |
| `src/components/cinematic/UnitCompleteCinematic.tsx` | `STORAGE_KEYS` |
| `src/context/ProfileContext.tsx` | `STORAGE_KEYS` |
| `src/context/ProgressContext.tsx` | `STORAGE_KEYS` |
| `src/context/QuestContext.tsx` | `STORAGE_KEYS` |
| `src/context/ThemeContext.tsx` | `STORAGE_KEYS` |
| `src/hooks/usePracticeSession.ts` | `PRACTICE_CONFIG` |
| `src/hooks/useSound.ts` | `STORAGE_KEYS` |
| `src/hooks/useMemoryGame.ts` | `STORAGE_KEYS` |
| `src/lib/arcadeModes.ts` | `ARCADE_CONFIGS`, `ARCADE_MODE_LABELS` (re-exports labels) |
| `src/lib/bossGate.ts` | `BOSS_GATE_PROBLEM_COUNT` |
| `src/lib/pet.ts` | `PET_STAGES` |
| `src/lib/stars.ts` | `STAR_CONFIG` |
| `src/lib/themes.ts` | `THEME_UNLOCKS` |
| `src/types/progress.ts` | `STORAGE_KEYS` (re-exports for backward compat) |
| `src/data/wordProblemTemplates.ts` | `DIFFICULTY_BREAKPOINTS` |

**Total: 30 production files** import from worldConfig. This is comprehensive.

### 3.2 Not Yet Migrated (1 file) ⚠️

| File | Issue |
|------|-------|
| `src/hooks/useSoundManager.ts` | Uses raw `'isMuted'` instead of `STORAGE_KEYS.IS_MUTED` |

### 3.3 Backward Compatibility Re-exports ✅

Two files re-export worldConfig values for backward compatibility:
- `src/types/progress.ts` → re-exports `STORAGE_KEYS.MEMORY_BEST_SCORE` and `STORAGE_KEYS.INVADERS_BEST_SCORE` as `MEMORY_BEST_SCORE_KEY` / `INVADERS_BEST_SCORE_KEY`
- `src/engines/invader/types.ts` → re-exports `INVADER_CONFIG` members
- `src/lib/arcadeModes.ts` → re-exports `ARCADE_MODE_LABELS`

These are clean, documented, and don't introduce circular dependencies.

---

## 4. Test Review

### 4.1 Parent Card Tests (worldConfig.test.ts) ✅

**118 tests** across 11 describe blocks:
1. Export presence (4 tests)
2. WORLD_ZONES data integrity (13 tests)
3. Zone level ranges (8 tests)
4. getZoneForLevel exhaustive lookup (19 tests)
5. Consumer contract — WorldMap & MapZone (11 tests)
6. Edge cases & invariants (16 tests)
7. STORAGE_KEYS (7 tests)
8. SENSORY_CONFIG (7 tests)
9. UI_CONFIG (7 tests)
10. SCORING_CONFIG (12 tests)
11. BUBBLE_ENGINE_CONFIG (14 tests)

All 118 tests pass. Coverage is thorough: data integrity, type safety, edge
cases (NaN, Infinity, negative, fractional), referential equality, consumer
contracts, and value pinning (prevents accidental rebalancing).

### 4.2 Leaf-Module Invariant Tests (worldConfig.leaf.test.ts) ✅

**11 tests** verifying the module imports only from allowed paths:
- ✅ Imports from `lucide-react` (allowed)
- ✅ Imports from `types/game` (allowed)
- ✅ Does NOT import from `engines/`, `components/`, `hooks/`, `context/`, `data/`
- ✅ Does NOT import from other `lib/` modules (except `types/game`)
- ✅ No dynamic imports from forbidden paths
- ✅ Exports config constants (not just re-exports)
- ✅ No circular self-imports

### 4.3 Full Test Suite ✅

```
Test Files  46 passed (46)
     Tests  968 passed (968)
  Duration  80.72s
```

All 968 tests pass. No regressions from the world config consolidation.

### 4.4 TypeScript Compilation ✅

`npx tsc --noEmit` completes with zero errors.

---

## 5. Config API Cleanliness

### 5.1 Naming Conventions ✅

- All config objects use `SCREAMING_SNAKE_CASE` (e.g., `DIRECTOR_CONFIG`, `STAR_CONFIG`)
- All interfaces use `PascalCase` (e.g., `ZoneConfig`, `PetStageConfig`, `ArcadeModeConfigEntry`)
- All object keys within config objects use `SCREAMING_SNAKE_CASE` (e.g., `CHALLENGE_THRESHOLD`, `BASE_SCORE_CORRECT`)
- All `as const` assertions for immutability — no runtime mutation possible
- Function names are clear (`getZoneForLevel`)

### 5.2 Type Safety ✅

- Interfaces co-located with their data (`ZoneConfig` next to `WORLD_ZONES`)
- `as const` provides literal type inference for all config objects
- `readonly` arrays used where appropriate (`BOSS_LEVELS`, `LEVEL_PROGRESSION` values, `PET_STAGES`)
- `ReadonlySet` used for `BUBBLE_SUPPORTED_TYPES`
- Types imported from `types/game.ts` (leaf-safe) for `WinConditionType`, `FailConditionType`, `ArcadeMode`

### 5.3 Documentation ✅

- File header clearly states the leaf-module contract
- Each section has a comment header explaining the category
- Non-obvious decisions are documented (e.g., why `THEME_UNLOCKS` only has star thresholds, not full theme objects)
- Deferred constants section transparently documents what was NOT moved and why
- Migration comments in consumer files (e.g., "Now from SPAWN_CONFIG in worldConfig") aid traceability

### 5.4 Ergonomics ✅

- Consumer files use clean, readable imports: `import { SESSION_CONFIG, SESSION_THEMES, BOSS_LEVELS, MAX_LEVEL } from '../../lib/worldConfig'`
- Nested access is ergonomic: `DIRECTOR_CONFIG.CHALLENGE_THRESHOLD`, `POWER_UP_CONFIG.DURATIONS.freeze`
- No unnecessary indirection layers — consumers import directly from the source

### 5.5 Minor API Observations (Non-blocking)

1. **`SESSION_THEMES` naming**: Could be `SESSION_THEME_COLORS` for clarity, since it's just bg/accent pairs, not full theme configs. Minor — current name is adequate.

2. **`ARCADE_MODE_LABELS` has inline emoji strings**: The labels include emoji and English text directly in the config. This is fine for now — i18n for arcade mode labels is a future enhancement, not a world-config concern.

3. **`POWER_UP_CONFIG.TYPES` is a readonly array, not a ReadonlySet**: If lookup performance matters, a Set would be better. But with only 6 types, linear search is fine.

4. **`BOSS_LEVELS` uses `as const` on an array literal**: This creates `readonly [3, 6, 9]`. The consumer correctly casts to `readonly number[]` before calling `.includes()`. This is a known TypeScript pattern and works correctly.

---

## 6. Summary

### Blockers: 0

### Major Issues: 0

### Minor Issues: 2

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| M1 | Minor | `src/hooks/useSoundManager.ts:170,178` | Hardcoded `'isMuted'` string instead of `STORAGE_KEYS.IS_MUTED` | Import `STORAGE_KEYS` from worldConfig and replace both occurrences |
| M2 | Minor | `src/context/ThemeContext.test.tsx:52,123` | Hardcoded `'hebrew-math-theme'` string instead of `STORAGE_KEYS.THEME` | Import `STORAGE_KEYS` in test and use `STORAGE_KEYS.THEME` |

### Positive Highlights

- ✅ Leaf-module invariant enforced by automated tests (11 tests)
- ✅ All 968 tests pass with zero regressions
- ✅ TypeScript compiles cleanly (zero errors)
- ✅ 30 production files successfully migrated to worldConfig imports
- ✅ Backward compatibility re-exports are clean and documented
- ✅ Comprehensive test coverage (118 tests for config values + 11 leaf tests)
- ✅ All config objects use `as const` for immutability
- ✅ Clear section organization with 23 labeled sections
- ✅ Deferred constants transparently documented
- ✅ Consumer migration comments aid traceability

### Recommendation

The world config consolidation is **production-ready**. The two minor issues
(hardcoded storage key strings in `useSoundManager.ts` and `ThemeContext.test.tsx`)
should be fixed in a follow-up cleanup pass but are not blocking — the string
values match the centralized keys today, so there's no functional impact.

The consolidation successfully establishes `worldConfig.ts` as the single source
of truth for all game-world constants, with strong test coverage, clean
architecture, and proper leaf-module isolation.
