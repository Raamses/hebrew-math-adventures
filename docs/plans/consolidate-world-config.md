# Plan: Consolidate World Config

## Status: Audit Complete — Design Proposal

## Executive Summary

`src/lib/worldConfig.ts` already exists as a well-structured single source of truth for the majority of game-world constants. It was created in a prior consolidation pass and currently exports **18 config namespaces** consumed by **20+ modules** across engines, components, hooks, and lib.

However, a full audit reveals **~35 additional hardcoded constants** scattered across the codebase that have not yet been consolidated. This document maps the current state, identifies every remaining gap, and proposes a phased migration plan to achieve complete consolidation.

---

## Part 1: Current State — What's Already Consolidated

### worldConfig.ts Exports (18 namespaces)

| Namespace | Type | Consumers |
|-----------|------|-----------|
| `MAX_LEVEL` | `const = 10` | `GameDirector`, `BubbleGameContainer` |
| `MIN_LEVEL` | `const = 0` | (declared, no active consumers) |
| `BOSS_LEVELS` | `readonly [3, 6, 9]` | `BubbleGameContainer` |
| `BOSS_GATE_PROBLEM_COUNT` | `const = 3` | `bossGate.ts` |
| `WORLD_ZONES` | `ZoneConfig[]` (4 zones) | `WorldMap`, `MapZone`, tests |
| `getZoneForLevel()` | function | consumers via import |
| `DIRECTOR_CONFIG` | object (9 fields) | `GameDirector` |
| `STAR_CONFIG` | object (2 fields) | `stars.ts` |
| `PET_STAGES` | `PetStageConfig[]` (5 stages) | `pet.ts` |
| `THEME_UNLOCKS` | array (4 themes) | `themes.ts` |
| `MASCOT_UNLOCKS` | array (4 mascots) | `MascotSelector` |
| `LEVEL_PROGRESSION` | `Record<number, string[]>` | `MathModule` |
| `BUBBLE_SUPPORTED_TYPES` | `ReadonlySet<string>` | `MathModule` |
| `MEMORY_LEVEL_OPS` | `Record<number, op[]>` | `MemoryFactory` |
| `DIFFICULTY_BREAKPOINTS` | object (2 fields) | `wordProblemTemplates` |
| `ARCADE_CONFIGS` | `Record<mode, config>` (4 modes) | `arcadeModes.ts` |
| `ARCADE_MODE_LABELS` | `Record<string, {emoji,name,desc}>` (6 modes) | `arcadeModes.ts` |
| `SESSION_CONFIG` | object (4 fields) | `BubbleGameContainer` |
| `SESSION_THEMES` | array (5 theme pairs) | `BubbleGameContainer` |
| `POWER_UP_CONFIG` | object (TYPES, DURATIONS, EMOJI, etc.) | `useGameEngine` |
| `SPAWN_CONFIG` | object (4 fields) | `MathStrategy` |
| `INVADER_CONFIG` | object (6 fields) | `invader/types.ts`, `useInvaderEngine` |
| `PRACTICE_CONFIG` | object (3 fields) | `usePracticeSession` |
| `FRENZY_CONFIG` | object (6 fields) | `useInvaderEngine` |

### Consumer Map (src/ only, excluding tests & worktrees)

| File | Imports from worldConfig |
|------|--------------------------|
| `lib/bossGate.ts` | `BOSS_GATE_PROBLEM_COUNT` |
| `lib/arcadeModes.ts` | `ARCADE_CONFIGS`, `ARCADE_MODE_LABELS` |
| `lib/stars.ts` | `STAR_CONFIG` |
| `lib/pet.ts` | `PET_STAGES` |
| `lib/themes.ts` | `THEME_UNLOCKS` |
| `engines/GameDirector.ts` | `DIRECTOR_CONFIG`, `MAX_LEVEL` |
| `engines/MathModule.ts` | `LEVEL_PROGRESSION`, `BUBBLE_SUPPORTED_TYPES` |
| `engines/bubble/useGameEngine.ts` | `POWER_UP_CONFIG` |
| `engines/bubble/strategies/MathStrategy.ts` | `SPAWN_CONFIG` |
| `engines/invader/types.ts` | `INVADER_CONFIG` |
| `engines/invader/useInvaderEngine.ts` | `FRENZY_CONFIG` |
| `engines/memory/MemoryFactory.ts` | `MEMORY_LEVEL_OPS` |
| `hooks/usePracticeSession.ts` | `PRACTICE_CONFIG` |
| `components/WorldMap.tsx` | `WORLD_ZONES`, `ZoneConfig` |
| `components/MapZone.tsx` | `ZoneConfig` (type only) |
| `components/games/BubbleGameContainer.tsx` | `SESSION_CONFIG`, `SESSION_THEMES`, `BOSS_LEVELS`, `MAX_LEVEL` |
| `components/mascot/MascotSelector.tsx` | `MASCOT_UNLOCKS` |
| `data/wordProblemTemplates.ts` | `DIFFICULTY_BREAKPOINTS` |

### Leaf-Module Invariant

`worldConfig.ts` is a **true leaf module**: it imports only from `lucide-react` (icons) and `types/game` (shared types). This is enforced by `worldConfig.leaf.test.ts` which greps the source for forbidden import paths. **No changes to this invariant are needed** — all proposed additions must preserve it.

---

## Part 2: Gap Analysis — What's NOT Yet Consolidated

### Category A: Storage Keys (7 constants across 5 files)

These are localStorage keys scattered across context providers and hooks. They should live in a `STORAGE_KEYS` namespace in worldConfig.

| File | Constant | Value | Notes |
|------|----------|-------|-------|
| `context/ProfileContext.tsx` | `PROFILES_STORAGE_KEY` | `'hebrew-math-profiles'` | |
| `context/ProgressContext.tsx` | `STORAGE_KEY` | `'hebrew_game_saga_progress_v1'` | Per-user key with `_${profile.id}` suffix |
| `context/QuestContext.tsx` | `STORAGE_KEY` | `'hebrew-math-daily-progress'` | |
| `context/ThemeContext.tsx` | `THEME_STORAGE_KEY` | `'hebrew-math-theme'` | |
| `hooks/useMemoryGame.ts` | `BEST_SCORE_KEY` | `'hebrew-math-memory-best'` | Duplicate of `types/progress.ts` |
| `types/progress.ts` | `MEMORY_BEST_SCORE_KEY` | `'hebrew-math-memory-best'` | Should be in worldConfig |
| `types/progress.ts` | `INVADERS_BEST_SCORE_KEY` | `'hebrew-math-invaders-best'` | |
| `components/cinematic/UnitCompleteCinematic.tsx` | `CINEMATIC_SEEN_KEY` | `'cinematic_seen_units'` | |
| `hooks/useSound.ts` | (inline string) | `'isMuted'` | Hardcoded in quotes |

**Risk:** Key drift — `useMemoryGame.ts` duplicates the `types/progress.ts` constant as a local string. If one changes, the other silently breaks.

### Category B: UI/Display Constants (8 constants across 6 files)

These are presentational constants (particle counts, durations, colors, avatars). They are **pure UI** and could go in worldConfig or a separate `uiConfig.ts`. Given the leaf-module constraint (no component imports), they fit cleanly in worldConfig.

| File | Constant | Value |
|------|----------|-------|
| `components/PracticeMode.tsx` | `SESSION_LENGTH` | `10` |
| `components/Confetti.tsx` | `PARTICLE_COUNT` | `50` |
| `components/Confetti.tsx` | `COLORS` | `['#FFC700', '#FF0000', '#2E3192', '#41BBC7', '#73C92D']` |
| `components/Effects.tsx` | `STAR_COUNT` | `5` |
| `components/Effects.tsx` | `ANIMATION_DURATION` | `1` |
| `components/Effects.tsx` | `STAGGER_DELAY` | `0.1` |
| `components/games/FrenzyOverlay.tsx` | `PARTICLE_COUNT` | `5` |
| `components/mascot/MascotGreeting.tsx` | `GREETING_DURATION_MS` | `4000` |
| `components/parent/ProgressOverview.tsx` | `TOTAL_POSSIBLE_STARS` | `150` |
| `components/parent/ProgressOverview.tsx` | `TOTAL_BADGES` | `12` |
| `components/ProfileSetup.tsx` | `AVATARS` | `['🦁','🐯','🐻','🐨','🐼','🐸','🦄','🐲','🚀','⭐']` |
| `components/sensory/Bubble.tsx` | `BOSS_SIZE_MULTIPLIER` | `1.5` |
| `components/games/MemoryDuelGame.tsx` | `MASCOT_EMOJI` | `'🦉'` |

**Decision:** These are borderline. `SESSION_LENGTH` and `BOSS_SIZE_MULTIPLIER` affect game behavior and should be consolidated. Pure visual constants (Confetti colors, particle counts) are cosmetic and low-risk to leave local. **Recommendation: consolidate behavioral, leave cosmetic.**

### Category C: Game Logic Constants (5 constants across 4 files)

These affect game behavior and should definitely be in worldConfig.

| File | Constant | Value | Impact |
|------|----------|-------|--------|
| `components/PracticeMode.tsx` | `SESSION_LENGTH` | `10` | Questions per session |
| `components/sensory/Bubble.tsx` | `BOSS_SIZE_MULTIPLIER` | `1.5` | Boss bubble rendering scale |
| `engines/SensoryFactory.ts` | `DEFAULT_TARGET` | `5` | Sensory game default target |
| `engines/SensoryFactory.ts` | `DEFAULT_COUNT` | `15` | Sensory game default item count |
| `engines/SensoryFactory.ts` | `DEFAULT_DENSITY` | `0.3` | Target-to-distractor ratio |
| `engines/SensoryFactory.ts` | `PROBABILITY_CLOSE_DISTRACTOR` | `0.3` | Distractor proximity chance |
| `engines/ProblemFactory.ts` (static) | `WordProblemFactory.recentIds` limit | `5` | Anti-repeat tracking window |
| `data/dailyChallenges.ts` | `MODES` | `['zen','classic','blitz','survival']` | Daily rotation pool |
| `data/dailyChallenges.ts` | `PROBLEM_TYPES` | `['addition_simple','sub_simple','multiplication','series','compare']` | Daily rotation pool |
| `data/dailyChallenges.ts` | streak thresholds | `3 → 1.5x, 7 → 2x` | Streak bonus gates |
| `data/dailyQuests.ts` | gem rewards | `3, 5, 7` (slot-based) | Quest gem economy |
| `data/dailyQuests.ts` | quest targets | `15, 25, 5, 2, 1, 1` | Quest difficulty targets |

### Category D: Content Data (acknowledged deferred — no action)

The bottom of `worldConfig.ts` already acknowledges these as deferred:

- **Badge thresholds** in `data/badges.ts` — 12 badges with hardcoded check thresholds (10, 50, 100, 10, 3, 3, 3, 7, 500, 7, 500). These are content-adjacent.
- **Streak multipliers** in `data/dailyChallenges.ts` — Already noted as deferred.
- **Shop prices** in `data/shopItems.ts` — Economy constants (30-120 gems). These are game-economy content.

**Recommendation:** Leave these in their data files. They are content, not engine config. The worldConfig.ts deferred comments are correct.

### Category E: ProblemFactory Hardcoded Ranges

`ProblemFactory.ts` contains level-based max-value heuristics hardcoded in switch cases:

- Level ≤ 2 addition: `max = 10`
- Level 3 addition: `max = 20`
- Level 4+ addition: `max = 100`
- Subtraction level ≤ 3: `max = 10`
- Subtraction level 4+: `max = 100`
- Carry addition: `range = 500`
- Multiplication: `max = 10`
- Division: `answerMax = 10`

**Recommendation:** These are tightly coupled to the factory's generation logic and pedagogical design. Moving them to worldConfig would force the factory to import config for every problem generation call. **Leave as-is** but consider extracting a `PROBLEM_RANGES` config if the curriculum team needs to tune difficulty without code changes. This is a **future consideration**, not a current gap.

---

## Part 3: Design — Proposed Additions to worldConfig.ts

### Phase 1: Storage Keys (HIGH PRIORITY — key drift risk)

```typescript
// ================================================================
//  Storage Keys
// ================================================================

export const STORAGE_KEYS = {
    PROFILES: 'hebrew-math-profiles',
    SAGA_PROGRESS: 'hebrew_game_saga_progress_v1',
    DAILY_PROGRESS: 'hebrew-math-daily-progress',
    THEME: 'hebrew-math-theme',
    MEMORY_BEST_SCORE: 'hebrew-math-memory-best',
    INVADERS_BEST_SCORE: 'hebrew-math-invaders-best',
    CINEMATIC_SEEN: 'cinematic_seen_units',
    IS_MUTED: 'isMuted',
} as const;
```

**Migration plan:**
1. Add `STORAGE_KEYS` to `worldConfig.ts`
2. Update all 8 consumer files to import from worldConfig
3. Remove duplicate constants from `types/progress.ts` and local files
4. Update `useMemoryGame.ts` to use the shared key (fixes existing duplicate)
5. Test: all localStorage reads/writes still work with same keys

**Risk:** Low — same string values, just centralized references.

### Phase 2: Sensory Factory Config (MEDIUM PRIORITY)

```typescript
// ================================================================
//  Sensory Factory Config
// ================================================================

export const SENSORY_CONFIG = {
    DEFAULT_TARGET: 5,
    DEFAULT_COUNT: 15,
    DEFAULT_DENSITY: 0.3,
    PROBABILITY_CLOSE_DISTRACTOR: 0.3,
} as const;
```

**Migration plan:**
1. Add `SENSORY_CONFIG` to `worldConfig.ts`
2. Update `SensoryFactory.ts` to import and use config values
3. Test: sensory factory output unchanged

**Risk:** Low — values unchanged, just moved.

### Phase 3: Behavioral UI Constants (MEDIUM PRIORITY)

```typescript
// ================================================================
//  Behavioral UI Config
// ================================================================

export const UI_CONFIG = {
    SESSION_LENGTH: 10,           // questions per practice session
    BOSS_SIZE_MULTIPLIER: 1.5,    // boss bubble visual scale
    GREETING_DURATION_MS: 4000,   // mascot greeting display time
} as const;
```

**Migration plan:**
1. Add `UI_CONFIG` to `worldConfig.ts`
2. Update `PracticeMode.tsx`, `Bubble.tsx`, `MascotGreeting.tsx` to import
3. Test: UI behavior unchanged

**Risk:** Low.

### Phase 4: Daily Challenge Config (LOW PRIORITY — content-adjacent)

```typescript
// ================================================================
//  Daily Challenge Config
// ================================================================

export const DAILY_CHALLENGE_CONFIG = {
    MODES: ['zen', 'classic', 'blitz', 'survival'] as const,
    PROBLEM_TYPES: ['addition_simple', 'sub_simple', 'multiplication', 'series', 'compare'],
    TARGET_MIN: 10,
    TARGET_RANGE: 10,       // target = TARGET_MIN + (seed % TARGET_RANGE)
    REWARD_MIN: 10,
    REWARD_STEP: 2,
    REWARD_STEPS: 5,        // reward = REWARD_MIN + (seed % REWARD_STEPS) * REWARD_STEP
    BLITZ_TIME: 60,
    DEFAULT_TIME: 90,
    STREAK_THRESHOLD_1: 3,
    STREAK_MULTIPLIER_1: 1.5,
    STREAK_THRESHOLD_2: 7,
    STREAK_MULTIPLIER_2: 2,
} as const;
```

**Migration plan:**
1. Add `DAILY_CHALLENGE_CONFIG` to `worldConfig.ts`
2. Update `dailyChallenges.ts` to import config values
3. Test: daily challenge generation deterministic and unchanged

**Risk:** Low — values are the same, just centralized. However, this is content-adjacent. **Only do this if the curriculum team needs to tune without touching code.**

### Phase 5: Daily Quest Config (LOW PRIORITY — content-adjacent)

```typescript
export const DAILY_QUEST_CONFIG = {
    QUESTS_PER_DAY: 3,
    GEM_REWARDS: [3, 5, 7] as const,  // slot-based
    POOL: [
        { metric: 'correct_answers', target: 15, titleKey: 'quest.pop15',  descKey: 'quest.pop15_d',  icon: '🎯' },
        { metric: 'correct_answers', target: 25, titleKey: 'quest.pop25',  descKey: 'quest.pop25_d',  icon: '🫧' },
        { metric: 'combo_reached',   target: 5,  titleKey: 'quest.combo5', descKey: 'quest.combo5_d', icon: '⚡' },
        { metric: 'games_finished',  target: 2,  titleKey: 'quest.play2',  descKey: 'quest.play2_d',  icon: '🎮' },
        { metric: 'boss_defeated',   target: 1,  titleKey: 'quest.boss1',  descKey: 'quest.boss1_d',  icon: '🛡️' },
        { metric: 'daily_challenge', target: 1,  titleKey: 'quest.daily',  descKey: 'quest.daily_d',  icon: '📅' },
    ],
} as const;
```

**Risk:** Medium — this is essentially content data, not config. Moving it risks making the quest system harder to extend. **Consider leaving as-is.**

---

## Part 4: Migration Safety

### Leaf-Module Invariant

All proposed additions to `worldConfig.ts` use only:
- Primitive types (string, number, boolean, arrays, objects)
- `as const` assertions
- No imports from engines/, components/, hooks/, context/, data/

The leaf test (`worldConfig.leaf.test.ts`) will continue to pass.

### Backward Compatibility

All existing exports remain untouched. New namespaces are purely additive. Consumers can migrate incrementally.

### Test Coverage

- `worldConfig.test.ts` — 530+ lines of tests covering existing exports
- `worldConfig.leaf.test.ts` — leaf-module invariant
- New namespaces should add corresponding test sections to `worldConfig.test.ts`

---

## Part 5: Summary & Recommendations

### Already Done ✅
- 18 config namespaces consolidated in `worldConfig.ts`
- 20+ consumer files importing from the central module
- Leaf-module invariant enforced by tests
- Backward-compat re-exports in `arcadeModes.ts`, `invader/types.ts`, `pet.ts`

### Must Do (Phase 1) 🔴
- **Storage keys** — 7 constants across 5 files with one known duplicate (`useMemoryGame.ts` vs `types/progress.ts`). Key drift is an active bug risk.

### Should Do (Phases 2-3) 🟡
- **Sensory factory config** — 4 constants, clean extraction
- **Behavioral UI config** — 3 constants that affect game behavior

### Consider (Phases 4-5) 🟢
- **Daily challenge/quest config** — content-adjacent, only if tuning-without-code is needed
- **ProblemFactory ranges** — pedagogical design, leave for now

### Leave as-is ❌
- Badge thresholds (content)
- Shop prices (content)
- Cosmetic constants (Confetti colors, particle counts, animation timings)
- `types/progress.ts` `SKILL_KEY_MAP` (type mapping, not config)
- `types/user.ts` `XP_PER_LEVEL` (deprecated)

---

## Effort Estimates

| Phase | Files Touched | Lines Changed | Effort | Risk |
|-------|--------------|---------------|--------|------|
| Phase 1: Storage Keys | 8 | ~40 | 1-2h | Low |
| Phase 2: Sensory Config | 2 | ~20 | 30min | Low |
| Phase 3: UI Config | 4 | ~20 | 30min | Low |
| Phase 4: Daily Challenge | 2 | ~30 | 1h | Low |
| Phase 5: Daily Quests | 2 | ~30 | 1h | Medium |
| **Total** | **~18** | **~140** | **~4-5h** | **Low** |

---

## Dependency Graph

```
Phase 1 (Storage Keys) ──┐
                         ├──> Done
Phase 2 (Sensory) ────────┤
                         │
Phase 3 (UI Config) ─────┘
                         
Phase 4 (Daily Challenge) ──> independent, can defer
Phase 5 (Daily Quests) ─────> independent, can defer
```

Phases 1-3 can be done in parallel. Phases 4-5 are independent and can be deferred indefinitely.

---

*Audited by: planner (GLM-5.2) on 2026-08-08*
*Branch: sdlc/loop-v0*
