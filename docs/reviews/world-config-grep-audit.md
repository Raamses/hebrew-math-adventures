# Grep Audit: World Config Magic Numbers

**Date:** 2026-08-11  
**Auditor:** tester-unit (Phase 5)  
**Branch:** sdlc/loop-v0  

## Purpose

Verify no hardcoded constants remain in game-logic files that should reference `worldConfig.ts`. This audit was conducted after adding 5 new config namespaces: `STORAGE_KEYS`, `SENSORY_CONFIG`, `UI_CONFIG`, `SCORING_CONFIG`, `BUBBLE_ENGINE_CONFIG`.

---

## 1. Bare localStorage key strings

**Status: ⚠️ FOUND (consumer migration pending)**

The `STORAGE_KEYS` namespace is now defined in `worldConfig.ts`, but consumer files still define their own local constants. This is expected — the builder phases (1-4) will migrate consumers to import from `STORAGE_KEYS`.

### Files with local storage key constants (should import from `STORAGE_KEYS`):
| File | Local Constant | Equivalent in STORAGE_KEYS |
|------|---------------|---------------------------|
| `src/context/ProfileContext.tsx:38` | `PROFILES_STORAGE_KEY = 'hebrew-math-profiles'` | `STORAGE_KEYS.PROFILES` |
| `src/context/ProgressContext.tsx:17` | `STORAGE_KEY = 'hebrew_game_saga_progress_v1'` | `STORAGE_KEYS.SAGA_PROGRESS` |
| `src/context/QuestContext.tsx:33` | `STORAGE_KEY = 'hebrew-math-daily-progress'` | `STORAGE_KEYS.DAILY_PROGRESS` |
| `src/context/ThemeContext.tsx:14` | `THEME_STORAGE_KEY = 'hebrew-math-theme'` | `STORAGE_KEYS.THEME` |
| `src/hooks/useMemoryGame.ts:18` | `BEST_SCORE_KEY = 'hebrew-math-memory-best'` | `STORAGE_KEYS.MEMORY_BEST_SCORE` |
| `src/types/progress.ts:55` | `MEMORY_BEST_SCORE_KEY = 'hebrew-math-memory-best'` | `STORAGE_KEYS.MEMORY_BEST_SCORE` |
| `src/types/progress.ts:58` | `INVADERS_BEST_SCORE_KEY = 'hebrew-math-invaders-best'` | `STORAGE_KEYS.INVADERS_BEST_SCORE` |
| `src/components/cinematic/UnitCompleteCinematic.tsx:37` | `CINEMATIC_SEEN_KEY = 'cinematic_seen_units'` | `STORAGE_KEYS.CINEMATIC_SEEN` |

### Files with inline localStorage string literals (no constant at all):
| File | Inline String | Equivalent in STORAGE_KEYS |
|------|--------------|---------------------------|
| `src/hooks/useSound.ts:25,33` | `'isMuted'` | `STORAGE_KEYS.IS_MUTED` |
| `src/hooks/useSoundManager.ts:170,178` | `'isMuted'` | `STORAGE_KEYS.IS_MUTED` |

**Active bug risk:** `useMemoryGame.ts` defines `BEST_SCORE_KEY` locally while `types/progress.ts` exports `MEMORY_BEST_SCORE_KEY` with the same value — key drift risk if one changes.

**Recommendation:** Builder Phase 1 should migrate all 8 consumer files to import from `STORAGE_KEYS` and remove local constants.

---

## 2. Inline frenzy multiplier duplicates

**Status: ⚠️ FOUND (1 instance)**

### Found:
| File | Line | Code | Should Reference |
|------|------|------|-----------------|
| `src/engines/bubble/useGameEngine.ts` | 698 | `newCombo >= 15 ? 5 : newCombo >= 10 ? 3 : newCombo >= 5 ? 2 : 1` | `FRENZY_CONFIG.MEGA_MULTIPLIER` (5), `SUPER_MULTIPLIER` (3), `FRENZY_MULTIPLIER` (2) |

### Already fixed:
`src/engines/invader/useInvaderEngine.ts:277` correctly uses `FRENZY_CONFIG.MEGA_THRESHOLD`, `SUPER_THRESHOLD`, `FRENZY_MULTIPLIER` etc.

**Recommendation:** Builder Phase 4 should replace the inline frenzy multiplier in `useGameEngine.ts:698` with `FRENZY_CONFIG` references.

---

## 3. Magic numbers in scoring/spawn/difficulty contexts

**Status: ⚠️ FOUND (multiple instances)**

### Scoring magic numbers:
| File | Line | Magic Number | Should Reference |
|------|------|-------------|-----------------|
| `useGameEngine.ts` | 570 | `500 * level` | `SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER * level` |
| `useGameEngine.ts` | 696 | `10 * (1 + newCombo * 0.1)` | `SCORING_CONFIG.BASE_SCORE_CORRECT * (1 + newCombo * SCORING_CONFIG.COMBO_SCORE_FACTOR)` |
| `useInvaderEngine.ts` | 278 | `100 : 10` (boss/normal baseScore) | `SCORING_CONFIG.BASE_SCORE_BOSS : SCORING_CONFIG.BASE_SCORE_CORRECT` |
| `useInvaderEngine.ts` | 290 | `500 * prev.level` | `SCORING_CONFIG.BOSS_DEFEAT_BONUS_MULTIPLIER * prev.level` |

### Spawn/difficulty magic numbers:
| File | Line | Magic Number | Should Reference |
|------|------|-------------|-----------------|
| `useGameEngine.ts` | 53 | `laneCount = useRef<number>(6)` | `BUBBLE_ENGINE_CONFIG.LANE_COUNT` |
| `useGameEngine.ts` | 209 | `Math.min(0.3, ... * 0.02)` | `Math.min(BUBBLE_ENGINE_CONFIG.COMBO_BONUS_CAP, ... * BUBBLE_ENGINE_CONFIG.COMBO_BONUS_PER_COMBO)` |
| `useGameEngine.ts` | 216 | `Math.min(1.6, ...)` | `Math.min(BUBBLE_ENGINE_CONFIG.SPEED_MULTIPLIER_CAP, ...)` |
| `useGameEngine.ts` | 296 | `110 + (spawnIndex * 12)` | `BUBBLE_ENGINE_CONFIG.SPAWN_Y_OFFSET + (spawnIndex * BUBBLE_ENGINE_CONFIG.SPAWN_Y_STEP)` |
| `useGameEngine.ts` | 345 | `35000 : 22000` | `BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS : DISTRACTOR_LIFESPAN_MS` |
| `useInvaderEngine.ts` | 148 | `2500 / speedMultiplier` | `SCORING_CONFIG.INVADER_SPAWN_BASE_INTERVAL_MS / speedMultiplier` |
| `useInvaderEngine.ts` | 188 | `baseInterval = 2000` | `SCORING_CONFIG.INVADER_ANSWER_SPAWN_BASE_INTERVAL_MS` |

### UI config magic numbers:
| File | Line | Magic Number | Should Reference |
|------|------|-------------|-----------------|
| `src/components/PracticeMode.tsx:28` | `SESSION_LENGTH = 10` | `UI_CONFIG.SESSION_LENGTH` |
| `src/components/sensory/Bubble.tsx:51` | `BOSS_SIZE_MULTIPLIER = 1.5` | `UI_CONFIG.BOSS_SIZE_MULTIPLIER` |
| `src/components/mascot/MascotGreeting.tsx:13` | `GREETING_DURATION_MS = 4000` | `UI_CONFIG.GREETING_DURATION_MS` |

### Sensory factory magic numbers:
| File | Line | Magic Number | Should Reference |
|------|------|-------------|-----------------|
| `src/engines/SensoryFactory.ts:13-16` | `DEFAULT_TARGET=5, DEFAULT_COUNT=15, DEFAULT_DENSITY=0.3, PROBABILITY_CLOSE_DISTRACTOR=0.3` | `SENSORY_CONFIG.*` |

**Recommendation:** Builder Phases 2-4 should migrate consumers to import from the new config namespaces. No new magic numbers should be introduced.

---

## 4. Summary

| Audit Category | Found | Status |
|----------------|-------|--------|
| Bare localStorage key strings | 10 instances in 8 files | ⚠️ Pending migration (Phase 1) |
| Inline frenzy multiplier duplicates | 1 instance | ⚠️ Pending migration (Phase 4) |
| Scoring/spawn magic numbers | 14 instances in 3 files | ⚠️ Pending migration (Phases 2-4) |
| UI config magic numbers | 3 instances in 3 files | ⚠️ Pending migration (Phases 2-3) |
| Sensory factory magic numbers | 4 instances in 1 file | ⚠️ Pending migration (Phase 2) |

**Note:** All magic numbers identified in the plan doc (`docs/plans/consolidate-world-config.md`) are accounted for. No new undocumented magic numbers were found. The config namespaces are now defined in `worldConfig.ts` — consumer migration is the responsibility of builder Phases 1-4.

---

*Audit complete. The config infrastructure is in place; consumer migration is the remaining work.*
