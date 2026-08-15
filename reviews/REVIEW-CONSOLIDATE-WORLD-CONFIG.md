# Review: Consolidate World Config Plan

**Reviewer:** reviewer-opus (GLM-5.2)
**Date:** 2026-08-07
**Card:** fd38a025-ca00-4088-b0d7-5de85d98205a
**Plan commit:** cd5aad9
**Verdict:** APPROVED with conditions

## Summary

Devil's advocate review of the world config consolidation plan. The plan is thorough, well-structured, and follows sound engineering principles (additive-first, data-only module, phased migration). However, 5 issues must be addressed before implementation.

## Blockers (must fix before builder starts)

### 1. arcadeModes.ts → engines/bubble/types layer violation
ARCADE_CONFIGS contains fields typed as WinConditionType/FailConditionType from engines/bubble/types.ts. Moving ARCADE_CONFIGS to worldConfig.ts (lib/) creates a lib→engines dependency. Fix: move these types to types/ or keep ARCADE_CONFIGS in arcadeModes.ts.

### 2. No leaf-module invariant test for worldConfig.ts
worldConfig.ts must remain a true leaf (only imports from lucide-react and types/). Add a CI grep test that fails if worldConfig.ts imports from engines/, components/, hooks/, context/, or data/.

## Minor issues (fix in plan doc)

### 3. ProblemFactory.ts is a consumer of difficultyFromLevel
Missing from consumer audit table 2.2. Add it so the builder knows to update its import.

### 4. Missed constants
- rescueThreshold in GameDirector.ts (age-based: 3 for age≥8, else 2) — should go in DIRECTOR_CONFIG
- Badge thresholds in badges.ts (totalCorrect ≥ 10/50/100, maxCombo ≥ 10) — acknowledge and defer
- Streak multiplier thresholds in dailyChallenges.ts (streak ≥ 3 = 1.5x, ≥ 7 = 2x) — acknowledge and defer

### 5. THEMES vs THEME_UNLOCKS relationship unclear
Plan separates THEME_UNLOCKS (just star thresholds) from THEMES (full objects with colors). Must specify: does THEMES stay in themes.ts? Does themes.ts import THEME_UNLOCKS from worldConfig.ts? Same question for MASCOTS vs MASCOT_UNLOCKS.

## Non-blocking observations

- Frenzy score multipliers (2x/3x/5x) are duplicated in useGameEngine.ts and useInvaderEngine.ts — add to FRENZY_CONFIG
- POWER_UP_EMOJI map missing from POWER_UP_CONFIG proposal
- BOSS_LEVELS [3,6,9] vs bossGate.ts formula (level/3-1) — add invariant test
- SESSION_THEMES count should be validated against MAX_LEVEL
- POWER_UP_SPAWN_INTERVAL_MS is a fallback, not sole source (GameConfig can override)
- Phase 2→3 ordering: single source of truth not achieved until Phase 3 completes

## Proof

Reviewed all 22 files catalogued in the plan audit. Verified:
- src/lib/worldConfig.ts (current state)
- src/lib/themes.ts, pet.ts, stars.ts, arcadeModes.ts, bossGate.ts
- src/engines/GameDirector.ts, MathModule.ts, memory/MemoryFactory.ts
- src/engines/bubble/types.ts, useGameEngine.ts, strategies/MathStrategy.ts
- src/engines/invader/types.ts, useInvaderEngine.ts
- src/hooks/usePracticeSession.ts
- src/components/games/BubbleGameContainer.tsx
- src/data/wordProblemTemplates.ts, dailyQuests.ts, dailyChallenges.ts, shopItems.ts, badges.ts, learningPath.ts
- src/components/mascot/MascotSelector.tsx
- src/types/progress.ts
- Import graph analysis for circular dependency risk assessment
