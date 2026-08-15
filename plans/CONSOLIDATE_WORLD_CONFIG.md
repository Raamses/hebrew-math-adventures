# Plan: Consolidate World Config

**Branch:** sdlc/loop-v0
**Date:** 2026-08-07
**Author:** planner (GLM-5.2)
**Status:** Draft - awaiting review

---

## 1. Executive Summary

The codebase currently has world config constants scattered across 14+ files with no single source of truth. Zone definitions, level ranges, boss-gate thresholds, pet stages, theme unlocks, star tiers, arcade mode settings, session-internal leveling, problem-type progression, memory-game operations, invader game constants, daily quest targets, and word-problem difficulty mappings are all defined independently in their respective modules. This creates silent coupling: changing maxLevel: 10 in worldConfig.ts does not propagate to the Math.min(10,...) cap in GameDirector.ts or the BOSS_LEVELS = [3, 6, 9] in BubbleGameContainer.tsx.

This plan proposes a single worldConfig.ts module that exports all game-world constants, organized into typed namespaces, with downstream files importing from it instead of hardcoding their own copies.

---

## 2. Current State - Full Config Audit

### 2.1 Files that DEFINE world config constants

| # | File | Constants defined | Notes |
|---|---|---|---|
| 1 | src/lib/worldConfig.ts | ZoneConfig interface, WORLD_ZONES array (4 zones), getZoneForLevel() | Current world config - but only covers zones. Zone ranges: sensory 0-10, addition 1-2, subtraction 3-4, multiplication 5-10. |
| 2 | src/lib/themes.ts | Theme interface, THEMES array (4 themes), unlockStars thresholds (0/30/60/90), getThemeById(), getUnlockedThemes(), isThemeUnlocked() | Independent unlock thresholds - not referenced by any central config. |
| 3 | src/lib/pet.ts | PetStage interface, PET_STAGES array (5 stages with minLevel: 1/2/4/6/8), PET_EMOJI map, PET_SPECIES_OPTIONS | Level thresholds for pet evolution are independent from zone/level config. |
| 4 | src/lib/stars.ts | StarTier type, STAR_TIERS array, PerformanceResult interface, getTier(), tierToStars(), computeStarsByTier() | Mistake thresholds (<=1=PERFECT, <=3=GOOD, else=PASS) are hardcoded in getTier(). |
| 5 | src/lib/arcadeModes.ts | ExtendedArcadeMode type, getArcadeModeConfig() (zen/blitz/survival/classic configs), ARCADE_MODE_LABELS | Spawn intervals, distractor ratios, win/fail conditions all hardcoded per mode. |
| 6 | src/lib/bossGate.ts | BossGateType, BossGate interface, GATE_PROBLEM_COUNT = 3, boss type selection logic | GATE_PROBLEM_COUNT is a local const; boss levels (3/6/9) are implicit in the type formula (level / 3 - 1) % types.length. |
| 7 | src/engines/GameDirector.ts | CHALLENGE_THRESHOLD = 5, STREAK_THRESHOLD = 5, RESCUE_MULTIPLIER = 0.8, CHALLENGE_MULTIPLIER = 1.2, MIN_MAX_VALUE = 5, MASTERY_THRESHOLD = 10, MASTERY_ACCURACY = 0.8, level cap Math.min(10,...) | All private statics. The level cap of 10 is duplicated with worldConfig.ts maxLevel. Mastery threshold of 10 attempts and 80% accuracy are local to recordResult(). |
| 8 | src/engines/MathModule.ts | LEVEL_PROGRESSION map (levels 1-5 to new problem types), BUBBLE_SUPPORTED_TYPES set | Level to problem-type unlock schedule is independent from zone level ranges. |
| 9 | src/engines/memory/MemoryFactory.ts | LEVEL_OPS map (levels 1-10 to allowed operations) | Duplicates the level range (1-10) and operation progression concept from MathModule. |
| 10 | src/engines/bubble/types.ts | GameConfig interface, PowerUpType, PowerUpState, GameState, BubbleEntity | GameConfig holds spawn/difficulty/velocity settings that are set per arcade mode. |
| 11 | src/engines/bubble/useGameEngine.ts | POWER_UP_SPAWN_INTERVAL_MS = 15000, POWER_UP_TYPES array, POWER_UP_DURATIONS map, POWER_UP_EMOJI map, MAX_BANKED_CREDITS = 3 | Power-up timing and limits are local to the hook. |
| 12 | src/engines/bubble/strategies/MathStrategy.ts | MAX_RECENT_SIGNATURES = 12, MAX_REGEN_ATTEMPTS = 8, CONFIG = { CHANCE_LARGE: 0.8, CHANCE_MEDIUM: 0.5 } | Spawn distribution probabilities and anti-repeat limits. |
| 13 | src/engines/invader/types.ts | INITIAL_LIVES = 3, MAX_LIVES = 3, VICTORY_TIME_MS = 60000, BOSS_WAVE_INTERVAL_MS = 30000, SPEED_RAMP_INTERVAL_MS = 10000, FRENZY_COMBO_THRESHOLD = 5 | Invader game constants - completely independent from other game modes. |
| 14 | src/components/games/BubbleGameContainer.tsx | SESSION_THEMES (5 visual themes), ANSWER_LOCK_MS = 120, LEVEL_UP_THRESHOLDS = [5,5,4,4,3,3,3,3,3], LEVEL_DOWN_THRESHOLD = 3, PROBLEM_ROTATION_EVERY = 3, BOSS_LEVELS = [3,6,9] | Heaviest scatter. Session-internal leveling, boss levels, and visual themes are all local to the component. |
| 15 | src/hooks/usePracticeSession.ts | INITIAL_LIVES = 3, INITIAL_TIME = 60, TIME_BONUS = 2 | Duplicates INITIAL_LIVES with invader types. |
| 16 | src/data/wordProblemTemplates.ts | WORD_PROBLEM_TEMPLATES array, difficultyFromLevel() (level <=3 = easy, <=6 = medium, else hard) | Level to difficulty mapping is local to this data file. |
| 17 | src/data/dailyQuests.ts | Quest POOL with targets (15/25/5/2/1/1) and gem rewards (3-7) | Quest targets are data, but reward logic is config. |
| 18 | src/data/dailyChallenges.ts | MODES, PROBLEM_TYPES, target range (10-19), reward range (10-18), time limits (60/90s) | Daily challenge generation parameters. |
| 19 | src/data/shopItems.ts | SHOP_ITEMS array with prices | Economy constants. |
| 20 | src/components/mascot/MascotSelector.tsx | MASCOTS array with unlockStars (0/50/100/150) | Duplicates the unlock-by-stars pattern from themes.ts with different thresholds. |
| 21 | src/types/progress.ts | INITIAL_CAPABILITY_PROFILE, SKILL_KEY_MAP | Initial profile and skill key mapping - arguably config. |
| 22 | src/data/learningPath.ts | CURRICULUM array (5 units, 50 nodes) with per-node targetLevel and config | The learning path is structured data but embeds level mappings (1-10) and per-node game config. |

### 2.2 Files that CONSUME world config (import/use)

| Consumer | What it imports | From where |
|---|---|---|
| src/components/WorldMap.tsx | WORLD_ZONES, ZoneConfig | ../lib/worldConfig |
| src/components/MapZone.tsx | ZoneConfig (type only) | ../lib/worldConfig |
| src/lib/__tests__/worldConfig.test.ts | WORLD_ZONES, getZoneForLevel, ZoneConfig | ../worldConfig |
| Implicit consumers (hardcoded duplicates) | | |
| src/engines/GameDirector.ts | Level cap 10 | Local hardcoded |
| src/components/games/BubbleGameContainer.tsx | BOSS_LEVELS = [3,6,9], level cap 10 | Local hardcoded |
| src/lib/bossGate.ts | Boss level formula level/3-1 | Local hardcoded |
| src/engines/memory/MemoryFactory.ts | Level range 1-10, op progression | Local LEVEL_OPS |
| src/engines/MathModule.ts | Level to type progression 1-5 | Local LEVEL_PROGRESSION |
| src/data/wordProblemTemplates.ts | Level to difficulty breakpoints 3/6 | Local difficultyFromLevel() |
| src/components/mascot/MascotSelector.tsx | Star unlock thresholds | Local MASCOTS |
| src/lib/themes.ts | Star unlock thresholds | Local THEMES |
| src/lib/pet.ts | Level thresholds 1/2/4/6/8 | Local PET_STAGES |

### 2.3 Silent coupling / drift risks identified

| Risk | Files involved | Impact |
|---|---|---|
| Level cap mismatch | worldConfig.ts (maxLevel=10), GameDirector.ts (Math.min(10,...)), BubbleGameContainer.tsx (Math.min(..., 10)) | If max level changes to 12, three files must be updated manually. Missing one causes silent level capping. |
| Boss level duplication | BubbleGameContainer.tsx (BOSS_LEVELS = [3,6,9]), bossGate.ts (formula level/3-1) | Boss levels are defined in two places with different representations. Adding a boss at level 12 requires updating both. |
| Star unlock inconsistency | themes.ts (0/30/60/90), MascotSelector.tsx (0/50/100/150) | Two independent unlock systems using stars. No central registry of what star count unlocks what. |
| Operation progression drift | MathModule.ts (LEVEL_PROGRESSION), MemoryFactory.ts (LEVEL_OPS) | Two separate level to operation mappings. Adding a new operation at level 7 requires updating both. |
| Difficulty breakpoint mismatch | wordProblemTemplates.ts (difficultyFromLevel: <=3=easy, <=6=medium), worldConfig.ts (zone ranges: 1-2, 3-4, 5-10) | Difficulty breakpoints dont align with zone boundaries. Not necessarily a bug, but the relationship is implicit. |
| Initial lives duplication | invader/types.ts (INITIAL_LIVES = 3), usePracticeSession.ts (INITIAL_LIVES = 3) | Two independent definitions of the same constant. |
| Pet level thresholds vs zone levels | pet.ts (minLevel: 1/2/4/6/8), worldConfig.ts (zones: 0-10, 1-2, 3-4, 5-10) | Pet evolution thresholds dont align with zone boundaries. This may be intentional but is implicit. |
| Session theme vs world zone | BubbleGameContainer.tsx (SESSION_THEMES: 5 visual themes by session level), worldConfig.ts (4 zones by global level) | Session visual themes are completely separate from world zone themes. Confusing for developers. |

---

## 3. Proposed Design - Single Source-of-Truth Config Module

### 3.1 Module structure

```
src/lib/worldConfig.ts  (expanded - single source of truth)
  - World Constants (global scalars): MAX_LEVEL, MIN_LEVEL, BOSS_LEVELS, BOSS_GATE_PROBLEM_COUNT
  - Zone Config (existing, kept as-is): ZoneConfig, WORLD_ZONES, getZoneForLevel()
  - Progression Config: LEVEL_PROGRESSION, LEVEL_OPS/MEMORY_LEVEL_OPS, DIFFICULTY_BREAKPOINTS, BUBBLE_SUPPORTED_TYPES
  - Director Config: CHALLENGE_THRESHOLD, STREAK_THRESHOLD, RESCUE_MULTIPLIER, CHALLENGE_MULTIPLIER, MIN_MAX_VALUE, MASTERY_THRESHOLD, MASTERY_ACCURACY
  - Star Config: STAR_CONFIG (mistake thresholds)
  - Pet Config: PET_STAGES, PET_SPECIES_OPTIONS
  - Theme Config: THEMES, THEME_UNLOCKS
  - Unlock Registry (new): UNLOCK_THRESHOLDS
  - Arcade Mode Config: ARCADE_CONFIGS, ARCADE_MODE_LABELS
  - Session Config (bubble game): LEVEL_UP_THRESHOLDS, LEVEL_DOWN_THRESHOLD, PROBLEM_ROTATION_EVERY, ANSWER_LOCK_MS, SESSION_THEMES
  - Power-Up Config: POWER_UP_SPAWN_INTERVAL_MS, POWER_UP_DURATIONS, POWER_UP_TYPES, MAX_BANKED_CREDITS
  - Invader Config: INITIAL_LIVES, MAX_LIVES, VICTORY_TIME_MS, BOSS_WAVE_INTERVAL_MS, SPEED_RAMP_INTERVAL_MS, FRENZY_COMBO_THRESHOLD
  - Practice Session Config: INITIAL_LIVES, INITIAL_TIME, TIME_BONUS
  - Spawn Config: MAX_RECENT_SIGNATURES, MAX_REGEN_ATTEMPTS, CHANCE_LARGE, CHANCE_MEDIUM
  - Daily Config: DAILY_QUEST_POOL, DAILY_CHALLENGE_CONFIG, SHOP_ITEMS
```

### 3.2 Design principles

1. **Data-only module** - worldConfig.ts exports constants and plain objects only. No functions with business logic. Lookup functions (getZoneForLevel, getThemeById, getTier, etc.) stay in their current modules but reference config from worldConfig.ts.

2. **Typed namespaces** - Each config group is a typed const (e.g., DIRECTOR_CONFIG, PET_CONFIG, ARCADE_CONFIG). This provides autocomplete and prevents typos.

3. **Single import point** - Downstream files do:
   ```ts
   import { WORLD_ZONES, DIRECTOR_CONFIG, BOSS_LEVELS } from '../lib/worldConfig';
   ```
   Instead of hardcoding their own constants.

4. **No circular dependencies** - worldConfig.ts imports only from lucide-react (for zone icons) and possibly types/ (for shared interfaces). Everything else is self-contained.

5. **Backward-compatible migration** - Existing exports (WORLD_ZONES, getZoneForLevel, ZoneConfig) remain in worldConfig.ts. Other files gradually switch from local constants to imports from worldConfig.ts.

6. **Test coverage** - The existing worldConfig.test.ts is expanded to cover all new exports. Each namespace gets its own test suite section.

### 3.3 Proposed new exports

Key new exports to add to worldConfig.ts:

```typescript
// Global scalars
export const MAX_LEVEL = 10;
export const MIN_LEVEL = 0;
export const BOSS_LEVELS = [3, 6, 9] as const;
export const BOSS_GATE_PROBLEM_COUNT = 3;

// Director config
export const DIRECTOR_CONFIG = {
  CHALLENGE_THRESHOLD: 5,
  STREAK_THRESHOLD: 5,
  RESCUE_MULTIPLIER: 0.8,
  CHALLENGE_MULTIPLIER: 1.2,
  MIN_MAX_VALUE: 5,
  MASTERY_THRESHOLD: 10,
  MASTERY_ACCURACY: 0.8,
} as const;

// Star tier thresholds
export const STAR_CONFIG = {
  PERFECT_MAX_MISTAKES: 1,
  GOOD_MAX_MISTAKES: 3,
} as const;

// Pet stages
export const PET_STAGES = [
  { index: 0, key: 'egg',   minLevel: 1 },
  { index: 1, key: 'baby',  minLevel: 2 },
  { index: 2, key: 'child', minLevel: 4 },
  { index: 3, key: 'teen',  minLevel: 6 },
  { index: 4, key: 'adult', minLevel: 8 },
] as const;

// Theme unlock thresholds
export const THEME_UNLOCKS = [
  { id: 'default', unlockStars: 0 },
  { id: 'forest',  unlockStars: 30 },
  { id: 'space',   unlockStars: 60 },
  { id: 'candy',   unlockStars: 90 },
] as const;

// Mascot unlock thresholds
export const MASCOT_UNLOCKS = [
  { id: 'owl',  unlockStars: 0 },
  { id: 'bear', unlockStars: 50 },
  { id: 'ant',  unlockStars: 100 },
  { id: 'lion', unlockStars: 150 },
] as const;

// Problem type progression
export const LEVEL_PROGRESSION: Record<number, readonly string[]> = {
  1: ['sub_simple', 'comparison'],
  2: ['series'],
  3: ['addition_carry', 'sub_borrow', 'word'],
  4: ['multiplication'],
  5: ['division', 'sub_zero'],
} as const;

export const BUBBLE_SUPPORTED_TYPES = new Set([
  'addition_simple', 'addition_carry',
  'sub_simple', 'sub_borrow', 'sub_zero',
  'multiplication', 'division',
]);

// Memory game operations
export const MEMORY_LEVEL_OPS: Record<number, readonly ('+' | '-' | 'x' | 'd')[]> = {
  1: ['+', '-'], 2: ['+', '-'], 3: ['+', '-'],
  4: ['+', '-', 'x'], 5: ['+', '-', 'x', 'd'],
  6: ['+', '-', 'x', 'd'], 7: ['+', '-', 'x', 'd'],
  8: ['+', '-', 'x', 'd'], 9: ['+', '-', 'x', 'd'],
  10: ['+', '-', 'x', 'd'],
} as const;

// Word problem difficulty breakpoints
export const DIFFICULTY_BREAKPOINTS = {
  EASY_MAX_LEVEL: 3,
  MEDIUM_MAX_LEVEL: 6,
} as const;

// Arcade mode configs
export const ARCADE_CONFIGS = {
  zen:      { winCondition: { type: 'endless', value: 0 }, failCondition: { type: 'strikes', value: 0 }, spawnIntervalMs: 2000, distractorRatio: 0.8 },
  blitz:    { winCondition: { type: 'time_limit', value: 60 }, failCondition: { type: 'strikes', value: 0 }, spawnIntervalMs: 1200, distractorRatio: 1.2 },
  survival: { winCondition: { type: 'endless', value: 0 }, failCondition: { type: 'strikes', value: 3 }, spawnIntervalMs: 800, levelMultiplier: 1.5, distractorRatio: 1.5 },
  classic:  { winCondition: { type: 'target_count', value: 20 }, failCondition: { type: 'strikes', value: 3 }, spawnIntervalMs: 800, levelMultiplier: 1.0, distractorRatio: 1.5 },
} as const;

// Session leveling (bubble game)
export const SESSION_CONFIG = {
  LEVEL_UP_THRESHOLDS: [5, 5, 4, 4, 3, 3, 3, 3, 3] as const,
  LEVEL_DOWN_THRESHOLD: 3,
  PROBLEM_ROTATION_EVERY: 3,
  ANSWER_LOCK_MS: 120,
} as const;

export const SESSION_THEMES = [
  { bg: 'bg-blue-50',    accent: 'text-blue-600' },
  { bg: 'bg-emerald-50', accent: 'text-emerald-600' },
  { bg: 'bg-amber-50',   accent: 'text-amber-600' },
  { bg: 'bg-indigo-50',  accent: 'text-indigo-600' },
  { bg: 'bg-rose-50',    accent: 'text-rose-600' },
] as const;

// Power-up config
export const POWER_UP_CONFIG = {
  SPAWN_INTERVAL_MS: 15000,
  MAX_BANKED_CREDITS: 3,
  TYPES: ['freeze', 'double_points', 'pop_distractors', 'slow_motion', 'lightning_chain', 'rainbow_magnet'] as const,
  DURATIONS: { freeze: 3000, double_points: 5000, pop_distractors: 0, slow_motion: 4000, lightning_chain: 0, rainbow_magnet: 3000 } as const,
} as const;

// Spawn strategy config
export const SPAWN_CONFIG = {
  MAX_RECENT_SIGNATURES: 12,
  MAX_REGEN_ATTEMPTS: 8,
  CHANCE_LARGE: 0.8,
  CHANCE_MEDIUM: 0.5,
} as const;

// Invader config
export const INVADER_CONFIG = {
  INITIAL_LIVES: 3, MAX_LIVES: 3,
  VICTORY_TIME_MS: 60000, BOSS_WAVE_INTERVAL_MS: 30000,
  SPEED_RAMP_INTERVAL_MS: 10000, FRENZY_COMBO_THRESHOLD: 5,
} as const;

// Practice session config
export const PRACTICE_CONFIG = {
  INITIAL_LIVES: 3, INITIAL_TIME: 60, TIME_BONUS: 2,
} as const;

// Frenzy config
export const FRENZY_CONFIG = {
  COMBO_THRESHOLDS: { frenzy: 5, super: 10, mega: 15 },
} as const;
```

### 3.4 What stays in place (NOT moved)

| File | What stays | Reason |
|---|---|---|
| src/lib/worldConfig.ts | getZoneForLevel() function | Pure lookup, no config data |
| src/lib/stars.ts | getTier(), tierToStars(), computeStarsByTier() | Business logic - only thresholds move |
| src/lib/themes.ts | getThemeById(), getUnlockedThemes(), isThemeUnlocked() | Business logic - only data moves |
| src/lib/pet.ts | getPetStage(), getPetEmoji(), decayedHappiness() | Business logic - only data moves |
| src/lib/arcadeModes.ts | getArcadeModeConfig() | Switch statement - only the data values it returns move |
| src/engines/GameDirector.ts | tuneConfig(), recordResult() | Business logic - only statics move |
| src/engines/MathModule.ts | pickProblemType(), generateProblem(), evaluate() | Business logic - only LEVEL_PROGRESSION and BUBBLE_SUPPORTED_TYPES move |
| src/data/learningPath.ts | CURRICULUM array | Content data (50 nodes) - too large and content-like for a config module. However, the level range (1-10) should be validated against MAX_LEVEL from worldConfig.ts. |

---

## 4. Implementation Order (phased)

### Phase 1: Expand worldConfig.ts (additive only, zero risk)
- Add all new config namespaces to worldConfig.ts
- Expand worldConfig.test.ts with test coverage for all new exports
- No existing code changes - purely additive

### Phase 2: Migrate standalone constants (low risk)
- bossGate.ts: import BOSS_GATE_PROBLEM_COUNT
- useGameEngine.ts: import POWER_UP_CONFIG
- MathStrategy.ts: import SPAWN_CONFIG
- invader/types.ts: import INVADER_CONFIG
- usePracticeSession.ts: import PRACTICE_CONFIG
- GameDirector.ts: import DIRECTOR_CONFIG, MAX_LEVEL
- BubbleGameContainer.tsx: import SESSION_CONFIG, BOSS_LEVELS, MAX_LEVEL, SESSION_THEMES

### Phase 3: Migrate data-bearing modules (medium risk)
- MathModule.ts: import LEVEL_PROGRESSION, BUBBLE_SUPPORTED_TYPES
- MemoryFactory.ts: import MEMORY_LEVEL_OPS
- wordProblemTemplates.ts: import DIFFICULTY_BREAKPOINTS
- stars.ts: import STAR_CONFIG
- pet.ts: import PET_STAGES (keep functions)
- themes.ts: import THEME_UNLOCKS (keep functions + THEMES data reference)
- arcadeModes.ts: import ARCADE_CONFIGS (keep getArcadeModeConfig function)
- MascotSelector.tsx: import MASCOT_UNLOCKS

### Phase 4: Migrate daily/economy config (low priority)
- dailyQuests.ts: quest targets/rewards from config
- dailyChallenges.ts: challenge parameters from config
- shopItems.ts: debatable whether to move (content vs config)

### Phase 5: Validation and cleanup
- Run full test suite
- Grep for remaining hardcoded 10, 3, 5, etc. that should reference config
- Add ESLint rule (optional): warn on magic numbers in game logic files
- Update vault/domain/curriculum-levels.md to reference worldConfig.ts as source of truth

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Circular import introduced | Low | High | worldConfig.ts imports only from lucide-react and types/. No engine or component imports from it except as a leaf. |
| Test breakage from moved constants | Medium | Low | Phase 1 is additive only. Phase 2-3 update imports in test files alongside source. |
| as const breaking mutability expectations | Low | Medium | Some code may currently mutate these objects. Audit: all current usages are read-only. |
| Type narrowing from as const | Low | Medium | readonly arrays may not be assignable to mutable param types. Use readonly in interfaces or remove as const where needed. |
| Over-centralization making module too large | Medium | Low | At ~200 lines of config, it is still manageable. If it grows beyond 400 lines, split into worldConfig/ directory with sub-modules. |

---

## 6. Scope boundaries

**In scope:**
- Consolidate all game-world config constants into src/lib/worldConfig.ts
- Migrate all consumers to import from the central module
- Expand test coverage

**Out of scope:**
- Changing any config values (e.g., boss levels, star thresholds) - this is consolidation only, not rebalancing
- Refactoring business logic (functions stay where they are)
- Moving CURRICULUM (learning path data) - too large, content not config
- Moving i18n locale data
- Moving Firebase config (env-based, not game config)
- UI changes

---

## 7. Child card decomposition recommendation

This plan is large enough to warrant 3 child cards:

1. **builder** - Phase 1 + Phase 2: Expand worldConfig.ts and migrate standalone constants
2. **builder** - Phase 3: Migrate data-bearing modules (MathModule, MemoryFactory, stars, pet, themes, arcadeModes, MascotSelector)
3. **tester-unit** - Phase 5: Full test suite validation, grep audit, update vault docs

---

## 8. Open questions for review

1. **Should CURRICULUM (learning path) reference MAX_LEVEL from worldConfig.ts?** It embeds targetLevel 1-10 per node but does not import from worldConfig. Recommend: add a runtime invariant test that all targetLevel values are <= MAX_LEVEL.

2. **Should SHOP_ITEMS move to worldConfig.ts?** It is borderline - prices are config but items are content. Recommend: leave as-is for now.

3. **Should INITIAL_CAPABILITY_PROFILE move?** It is in types/progress.ts and is more of a type/default than game config. Recommend: leave as-is.

4. **Should we split into a worldConfig/ directory?** At current scale, a single file is simpler. If the file exceeds 300 lines after migration, split into worldConfig/index.ts, worldConfig/zones.ts, worldConfig/progression.ts, etc.

5. **Should SESSION_THEMES be unified with WORLD_ZONES?** Currently they are separate systems (session-internal visual themes vs world map zones). Recommend: keep separate but document the relationship.
