# Arcade Overhaul Plan — Senior Architect Review

**Reviewer:** Claude (senior game engine architect)
**Date:** 2026-07-31
**Verdict:** Plan is structurally sound. Phase 1 fixes target the right bugs but have architectural gaps that will cause regressions if not addressed. Phase 2–4 range from feasible to over-ambitious.

---

## Phase 1: Critical Bug Fixes

### 1.1 Fix Progression — Session-Internal Leveling
**Verdict: APPROVE WITH CHANGES**

**What the plan gets right:**
The diagnosis is correct. `GameDirector.recordResult()` (lines 60–80) calculates `newLevel` from `masteredCount` — the count of skills with ≥10 attempts and ≥80% accuracy. In arcade mode, only `currentFocus` (`'addition_sum_5'` per `INITIAL_CAPABILITY_PROFILE`) ever gets updated. A single skill can never produce 3 mastered skills, so `estimatedLevel` stays at 1 forever. 25 correct answers → no level change. The plan's instinct to add session-internal leveling is correct.

**Problems with the proposed fix:**

1. **`MathBehaviorStrategy.initializeLevel()` has an early-return guard that blocks regeneration.** Line 33: `if (this.currentProblem) return;`. The plan says "regenerate the problem with harder params" at level-up, but calling `initializeLevel()` a second time will no-op because `currentProblem` is already set. The plan must explicitly call out clearing `this.currentProblem = null` before re-calling `initializeLevel()`, or add a distinct `regenerateProblem(level, config)` method. The plan mentions `regenerateProblem` in the "Files touched" section but doesn't describe its contract. **This is a blocking gap** — without it, the level-up will silently do nothing.

2. **`BubbleGameContainer` calls `behavior.initializeLevel(1, config)` in a `useEffect` with `[behavior, config]` deps (line 22).** Adding `sessionLevel` state means every level-up triggers a re-render, which re-fires this effect (if `config` is recreated), which calls `initializeLevel` again — but the early-return guard prevents it from doing anything. The wiring needs to be explicit: either a `useEffect` on `sessionLevel` that calls a new `regenerateProblem` method, or the effect needs to pass `sessionLevel` as the level argument (not hardcoded `1`).

3. **The `GameDirector.recordResult()` streak-based bump (every 10 consecutive correct → +1 estimatedLevel) is redundant with session leveling and potentially harmful.** It mutates the persistent profile's `estimatedLevel` based on session streaks, which conflates session performance with cross-session mastery. Keep the session-level purely in `BubbleGameContainer` state. Only update `estimatedLevel` via the existing mastery-based logic. If you want faster cross-session progression, lower `MASTERY_THRESHOLD` or the `masteredCount / 3` divisor — don't add a parallel streak path that bypasses mastery.

4. **The `INITIAL_CAPABILITY_PROFILE.currentFocus` is `'addition_sum_5'`** but `MathModule.pickProblemType()` returns `'addition_simple'` (which maps to `SKILL_KEY_MAP['addition_simple'] = 'addition'`). The `recordResult` method writes to `profile.skills[profile.currentFocus]` — so it's recording under `'addition_sum_5'`, but the problem type cycling in 1.2 would generate `'sub_simple'`, `'comparison'`, etc. These would all record under the same `'addition_sum_5'` key, corrupting the skill stats. **The plan must update `currentFocus` when rotating problem types**, or use a separate session-scoped tracking key.

**Concrete changes required:**
- Add `regenerateProblem(level: number, config: GameConfig): void` to `IGameBehavior` interface and `MathBehaviorStrategy`. This method: clears `currentProblem`, generates a new problem at the given level, updates `targetValue`, and resets `recentSignatures`.
- In `BubbleGameContainer`, add `sessionLevel` state (default 1, max 10). Add a `useEffect` watching `gameState.targetsPopped` that increments `sessionLevel` every N correct (configurable, default 5). On level-up, call `behavior.regenerateProblem(sessionLevel, config)`.
- **Remove** the streak-based `estimatedLevel` bump from `GameDirector.recordResult()`. Keep mastery-based leveling only.
- When problem types rotate (1.2), update `profile.currentFocus` to match the new type's skill key via `SKILL_KEY_MAP`.

---

### 1.2 Fix Problem Diversity — Anti-Repeat + Problem Rotation
**Verdict: APPROVE WITH CHANGES**

**What the plan gets right:**
Anti-repeat signatures and problem rotation are the correct approach. The signature format `${type}:${num1}:${operator}:${num2}:${answer}` is sufficient for detecting duplicates.

**Problems with the proposed fix:**

1. **`MathBehaviorStrategy` only holds ONE problem at a time (`this.currentProblem`).** Bubbles on screen all show the *same* target value. The "diversity" problem isn't just consecutive duplicates — it's that every bubble in a single session shows the same equation. When the plan says "regenerateProblem at each level-up," that helps across level-ups, but within a level (5 correct answers), the player sees the same `targetValue` on every bubble. **This is actually fine for the BubbleGame mechanic** (pop the bubble matching the answer), but the plan should explicitly acknowledge this design decision. The real diversity fix is ensuring level-ups happen frequently enough (every 5 correct) and that each level-up produces a visibly different problem.

2. **The `recentSignatures` array in `MathBehaviorStrategy` is unnecessary if `regenerateProblem` generates a fresh problem each time.** Since there's only one problem per level, you just need to ensure the new problem's signature differs from the *previous* one. A `lastSignature: string | null` field is sufficient. The 5-element array is over-engineered for a single-problem-at-a-time strategy. Keep it only if you plan to support multiple concurrent problems in the future.

3. **`MathModule.generateProblem()` anti-repeat (plan mentions adding `lastProblemSignature` ref to `MathModule`):** This is the right place to add it, but `MathModule` is stateless — it's instantiated fresh in `MathBehaviorStrategy`'s constructor. The ref would need to be an instance field on `MathModule` or passed in as a param. The plan should clarify: add an optional `avoidSignatures?: string[]` param to `generateProblem()`.

4. **Problem type rotation at level-up:** The plan says "Level 1-2: addition_simple, sub_simple, comparison; Level 3+: add multiplication, division, carry, borrow." But `MathModule.LEVEL_PROGRESSION` already defines this mapping (lines 44–50). The issue is that `pickProblemType()` randomly selects from the pool, but `MathBehaviorStrategy.initializeLevel()` forces `type: 'addition_simple'` when `config.isMathSensory` is true (line 38). **The plan must remove or condition this `isMathSensory` override** so problem types actually rotate.

5. **The `GameOrchestrator` also forces `type: 'addition_simple'`** (line ~95: `type: 'addition_simple'` in the `generateProblem` call). Even if `MathBehaviorStrategy` rotates types, `GameOrchestrator` hardcodes the type on initial problem generation. Both places need to be updated.

**Concrete changes required:**
- Simplify to `lastSignature: string | null` on `MathBehaviorStrategy`. In `regenerateProblem()`, generate up to 3 attempts, rejecting if signature matches `lastSignature`.
- Add `avoidSignatures?: string[]` to `MathModule.generateProblem()` params.
- Remove or condition the `isMathSensory` type override in `MathBehaviorStrategy.initializeLevel()` (line 38).
- Remove the `type: 'addition_simple'` hardcode in `GameOrchestrator` (line ~95), or make it configurable.
- Update `profile.currentFocus` when problem type changes.

---

### 1.3 Fix "0 + 0 = ?" Specifically
**Verdict: APPROVE WITH CHANGES**

**What the plan gets right:**
The anti-repeat from 1.2 prevents consecutive duplicates, which solves the "0+0 twice in a row" case.

**Problems with the proposed fix:**

1. **The root cause of "0+0=?" is actually in `ArithmeticFactory`.** For `addition_simple` at level ≤ 2 (lines 30–33): `num1 = intInRange(1, Math.floor(max/2)+1)`, `num2 = intInRange(1, max - num1 + 1)`. With `max=10`: `num1 = intInRange(1, 6)` → min is 1, never 0. `num2 = intInRange(1, 11 - num1)` → min is 1, never 0. So **"0+0=?" should not be generated by `ArithmeticFactory`** for addition_simple. The plan's claim that "intInRange(1, 6) can return 0" is wrong — `intInRange(min, max)` returns `Math.floor(Math.random() * (max - min)) + min`, so `intInRange(1, 6)` returns 1–5. **The "0+0" bug must come from somewhere else.**

2. **The likely source of "0+0=?" is the `SensoryFactory.generateFromProblem()` adapter** or the fallback problem in `MathBehaviorStrategy.FALLBACK_PROBLEM` (`{num1: 1, num2: 1, answer: 2}` — that's not 0+0). Alternatively, if the profile has `estimatedLevel` high enough to hit the `else` branch in `ArithmeticFactory` (level > 3, lines 37–40): `num2 = intInRange(0, max - num1)` — here `num2` CAN be 0, and if `num1` is also small... no, `num1 = intInRange(10, max)`, so `num1 ≥ 10`. The real culprit may be **subtraction**: `sub_simple` at level ≤ 3: `num1 = intInRange(2, max)`, `num2 = intInRange(1, num1)`. If `num1 = 2, num2 = 2`, answer = 0. That's valid math but produces a target value of 0, and the distractor generator (`generateDistractor()`, line 71) does `safeTarget = Math.max(1, this.targetValue)` — so when `targetValue = 0`, distractors are based on `safeTarget = 1`, producing values like 1, 2, 0, -1 (but `value < 0` is rejected). This means **all distractors cluster around 1 when the answer is 0**, making it trivially easy. And if the same 2-2=0 problem appears multiple times (no anti-repeat), it feels like "0+0=?" even though it's "2-2=0".

3. **The plan should investigate the actual source of "0+0=?"** before prescribing fixes. But regardless, the anti-repeat fix in 1.2 handles the repetition. For subtraction producing answer=0: add a guard that if `answer === 0` in `sub_simple`, regenerate with different numbers (not a hacky offset — just re-roll). This keeps 0 as a valid answer in higher levels but avoids it in early levels where it produces trivial distractors.

**Concrete changes required:**
- In `ArithmeticFactory`, `SUBTRACTION_SIMPLE` case: if `level <= 2` and `answer === 0`, re-roll `num1` and `num2` (loop up to 3 times). Don't add offsets.
- Verify the actual source of the "0+0" report by checking if `SensoryFactory.generateFromProblem()` can produce it. The plan should include a debugging step.

---

## Phase 2: Gameplay Improvements

### 2.1 Adaptive Difficulty Within Session
**Verdict: APPROVE WITH CHANGES**

**What the plan gets right:**
Wiring `GameDirector.tuneConfig()` into BubbleGame is sensible — the logic already exists and is tested.

**Problems:**

1. **`tuneConfig()` operates on `BaseGameConfig` (from `interfaces.ts`), not `GameConfig` (from `bubble/types.ts`).** They are different types. `GameConfig` has `spawnIntervalMs`, `distractorRatio`, `baseVelocity`, etc. `tuneConfig()` modifies `max`, `type`, `density`, `distractorRatio` — but it doesn't touch `spawnIntervalMs` or `baseVelocity`. To make "faster spawn" in challenge mode work, `tuneConfig()` needs to also adjust `spawnIntervalMs` and `baseVelocity`, or the session-level logic in 1.1 needs to handle it.

2. **`tuneConfig()` reads `profile.consecutiveFailures` and `skill.consecutiveCorrect`** — but in BubbleGame, these are updated via `Director.recordResult()` in `onPopWrapper` (BubbleGameContainer line ~50). The profile passed to `tuneConfig()` in `BubbleGame.tsx` (line ~30) is the one from props, which comes from `ProfileContext`. This should work, but the plan should verify the profile updates are actually propagating (React re-render on `profile` change → `useMemo` recompute → `config` update). The `useMemo` deps are `[problem, profile]` — profile changes will recompute config. **However**, `MathBehaviorStrategy` is initialized once with `useState(() => new MathBehaviorStrategy())` and the problem is set via `behavior.setProblem(problem)` in a `useEffect`. The `config` change doesn't re-call `initializeLevel()`. So tuneConfig's adjustments to `max` and `type` won't reach the behavior strategy's problem generation. **The session-level `regenerateProblem()` from 1.1 needs to accept the tuned config.**

**Concrete changes required:**
- Extend `tuneConfig()` or add a BubbleGame-specific tuning step that also adjusts `spawnIntervalMs` and `baseVelocity` for rescue/challenge modes.
- Ensure `regenerateProblem(sessionLevel, tunedConfig)` passes the tuned config to `MathModule.generateProblem()`.

---

### 2.2 Problem Rotation Mid-Session
**Verdict: APPROVE**

Already covered in 1.2 concrete changes. The `LEVEL_PROGRESSION` map in `MathModule` is the right source of truth. Just need to ensure `pickProblemType()` is called (not bypassed by the `isMathSensory` override).

---

### 2.3 Reduced correctDelay
**Verdict: APPROVE WITH CHANGES**

`useAnswerFlow.ts` line 7: `correctDelay = 2000`. This is used by PracticeMode, not BubbleGame. In BubbleGame, correct answers are instant (bubble pop → immediate game state update). The plan correctly notes this "mainly affects PracticeMode."

**Minor concern:** Reducing to 1000ms is fine, but the plan should note that this changes the PracticeMode feel, not just arcade. If PracticeMode needs the 2000ms delay for pedagogical reasons (let the answer sink in), consider making it configurable per-mode rather than globally reducing it.

**Concrete change:** Make `correctDelay` a prop on the PracticeMode component, defaulting to 2000, and pass 1000 for arcade-style modes. Or just reduce to 1200ms globally as a compromise.

---

## Phase 3: Creative New Features

### 3.1 Power-Up Bubbles
**Verdict: APPROVE WITH CHANGES**

**Feasibility: Moderate.** The `IGameBehavior` interface and `useGameEngine` are the key integration points.

**Concerns:**

1. **`behavior.generateNext(config)` returns `Partial<BubbleEntity>`** — it only provides `content`, `internalValue`, and `variant`. Power-up bubbles need a `type` field (normal, freeze, double-points, etc.) to differentiate them. `BubbleEntity` doesn't have a `type` or `powerUpType` field. **Add `powerUpType?: 'freeze' | 'doublePoints' | 'popAll' | 'slowMotion'` to `BubbleEntity`** and `special?: boolean` to the return of `generateNext()`.

2. **Power-up spawning should be timer-based, not mixed into `behavior.generateNext()`.** The plan says "every ~15s" — this should be a separate spawn path in `useGameEngine` that bypasses `behavior.generateNext()` and creates a power-up bubble directly. Otherwise, the math strategy would need to know about power-ups, violating separation of concerns.

3. **Power-up effect application** (freeze, slow motion) requires modifying `useGameEngine`'s game loop: adding a global speed multiplier state, a timer for effect duration, and visual state for active effects. This is a medium-sized refactor of the engine hook. Feasible but not trivial.

4. **`handlePop` in `useGameEngine`** (line ~80) validates via `behavior.validate(entity)`. Power-up bubbles should bypass this validation — they're always "correct" when popped. Add a check: `if (entity.powerUpType) { applyPowerUp(entity.powerUpType); return true; }` before calling `behavior.validate()`.

**Concrete changes required:**
- Add `powerUpType` to `BubbleEntity` type.
- Add power-up spawn timer to `useGameEngine` (separate from normal spawn).
- Add effect state management (active effects, timers) to `useGameEngine`.
- Modify `handlePop` to short-circuit for power-up bubbles.
- Power-up bubbles don't go through `behavior.generateNext()` or `behavior.validate()`.

---

### 3.2 Boss Bubbles
**Verdict: APPROVE WITH CHANGES**

**Feasibility: Moderate-Hard.** This is the most architecturally complex feature.

**Concerns:**

1. **A boss bubble with a health bar requires a new entity type** — `BubbleEntity` doesn't support multiple hits. Add `health?: number` and `maxHealth?: number` to `BubbleEntity`. The boss needs a different visual rendering (oversized, health bar), which means `Bubble` component needs a `isBoss` prop or variant.

2. **`handlePop` currently does binary correct/incorrect validation.** A boss bubble needs to track hits: decrement health on correct pop, ignore wrong pops (or damage the player?). This requires a new code path in `handlePop`.

3. **Boss spawn timing** (every 3rd session level) is straightforward — tie it to the `sessionLevel` state from 1.1. When `sessionLevel % 3 === 0`, spawn a boss instead of normal bubbles.

4. **The boss problem needs to be generated at the current session level**, with potentially harder params. This is just `regenerateProblem(sessionLevel + 1, config)`.

5. **While a boss is active, should normal bubbles still spawn?** The plan doesn't say. Recommend: pause normal spawning while boss is alive (set `maxOnScreen` to 1 for boss duration, or add a `bossActive` flag that suppresses normal spawns).

**Concrete changes required:**
- Add `health`, `maxHealth`, `isBoss` to `BubbleEntity`.
- Add boss spawn logic to `useGameEngine` (triggered by sessionLevel).
- Modify `handlePop` for multi-hit logic.
- Add boss rendering to `Bubble` component (health bar, larger size).
- Add `bossActive` state to suppress normal spawns.

---

### 3.3 Visual Progression — Theme Changes
**Verdict: APPROVE**

**Feasibility: High.** This is the simplest feature. `BubbleGameContainer` already has a hardcoded `bg-blue-50` class (line ~93). The `worldConfig.ts` already defines zones with `backgroundClass` properties. The session-level state from 1.1 maps directly to theme levels.

**Minor note:** The plan's theme levels (1-2 Beach, 3-4 Forest, 5-6 Mountain, 7-8 Space, 9-10 Volcano) differ from `worldConfig.ts` zones (Beach 0-10, Island 1-2, Forest 3-4, Mountain 5-10). Align them or use the existing config. The existing `WORLD_ZONES` has only 4 zones; the plan adds a 5th (Volcano). Either extend `WORLD_ZONES` or define a separate `SESSION_THEMES` array for arcade mode.

**Concrete change:** Add a `SESSION_THEMES` array in a new `src/lib/sessionThemes.ts` and use `sessionLevel` to index it. Apply via dynamic className on `BubbleGameContainer`'s root div.

---

### 3.4 Speed Modes
**Verdict: APPROVE WITH CHANGES**

**Feasibility: High.** `GameConfig` already supports `time_limit` and `endless` win conditions, plus `strikes` fail condition. The types are there.

**Concerns:**

1. **The mode selector needs a UI.** The plan says "Add mode selector on the SagaMap arcade entry" but doesn't describe the component. This is a new React component with state management for the selected mode, passed as a prop to `GameOrchestrator` → `BubbleGame` → `BubbleGameContainer`.

2. **Zen mode (no timer, no strikes)** requires `failCondition.type` to be... what? There's no "none" type in `FailConditionType`. Add `'none'` to the union: `type FailConditionType = 'timer_zero' | 'screen_full' | 'missed_target_limit' | 'strikes' | 'none'`. And `winCondition.type: 'endless'` already exists but needs a UI exit (back button).

3. **Blitz mode (60s timer)**: `winCondition: { type: 'time_limit', value: 60 }`. But `useGameEngine` doesn't implement the timer countdown! `timeLeft` is initialized in `gameState` but never decremented in the game loop. **This is an existing bug** — the plan should note that Blitz mode requires implementing the timer countdown in `useGameEngine`'s `update` loop.

4. **Survival mode**: `failCondition: { type: 'strikes', value: 3 }` with `winCondition: { type: 'endless' }`. The `isVictory` check in `handlePop` only fires for `target_count`. For `endless`, there's no victory — just play until 3 strikes. This already works with the current code (victory never triggers for endless). But the UI needs a way to exit (back button / manual quit).

**Concrete changes required:**
- Add `'none'` to `FailConditionType`.
- Implement `timeLeft` countdown in `useGameEngine.update()` for `time_limit` win conditions.
- Create a `ModeSelector` component on SagaMap.
- Pass selected mode config through to `BubbleGame`.
- Add exit/quit UI for Zen and Endless modes.

---

### 3.5 Combo Milestone Effects
**Verdict: APPROVE WITH CHANGES**

**Feasibility: Moderate.** Frenzy mode already exists (`gameState.isFrenzy` at combo ≥ 5, set in `useGameEngine.handlePop` line ~100). The `FrenzyOverlay` component already renders.

**Concerns:**

1. **The plan adds "Super Frenzy" (combo 10, 3x score) and "Mega Frenzy" (combo 15, 5x score).** The current score calculation in `handlePop` (line ~95): `scoreBonus = 10 * (1 + newCombo * 0.1)`. At combo 10: `10 * (1 + 1) = 20`. At combo 15: `10 * (1 + 1.5) = 25`. The plan wants 3x and 5x multipliers — this requires changing the score formula to support tiered multipliers. Add a `frenzyTier` to `GameState` (0 = none, 1 = frenzy, 2 = super, 3 = mega) and apply a multiplier per tier.

2. **"Screen shake" and "all bubbles slow down"** at mega frenzy require modifying `useGameEngine` to support a global speed modifier and a screen-shake state passed to `BubbleGameContainer`. Feasible but requires new state plumbing.

3. **The combo milestone sound** — `useSound` already has `play('streak')` for combo 5. The plan should add `play('milestone')` (which already exists in the sound library per `BubbleGameContainer` line ~42) for combo 10/15.

**Concrete changes required:**
- Add `frenzyTier: 0 | 1 | 2 | 3` to `GameState`.
- Update score calculation to use tiered multipliers.
- Add screen-shake state to `BubbleGameContainer` (CSS animation toggle).
- Add global speed modifier to `useGameEngine` based on frenzy tier.

---

### 3.6 Daily Challenge
**Verdict: APPROVE WITH CHANGES**

**Feasibility: Moderate.** Seeded RNG is straightforward. The `RandomUtils` class uses `Math.random()` — to make it seedable, you'd need a seeded PRNG (e.g., `mulberry32`) and an option to inject it.

**Concerns:**

1. **Seeding needs to propagate through `ArithmeticFactory`, `ComparisonFactory`, etc.** All factories use `RandomUtils.intInRange()`, `RandomUtils.chance()`, `RandomUtils.pickOne()`. These all call `Math.random()`. To seed, either: (a) replace `Math.random` globally (hacky, affects other code), (b) add a `RNG` instance to `RandomUtils` that can be seeded, or (c) pass a seeded RNG through the factory chain. Option (b) is cleanest: make `RandomUtils` methods accept an optional `rng: () => number` param, defaulting to `Math.random`.

2. **Leaderboard "in Parent Dashboard (future)"** — fine to defer, but note that this requires backend infrastructure (Firebase). The plan correctly marks this as future.

3. **"Daily Challenge" badge on the map** — requires adding a visual element to `SagaMap`. Small UI change.

**Concrete changes required:**
- Add seeded PRNG (mulberry32) to `RandomUtils`.
- Pass seed through `MathModule.generateProblem()` → factory chain.
- Add Daily Challenge entry on `SagaMap`.
- Defer leaderboard to future backend work.

---

## Phase 4: Polish

### 4.1 Sound Improvements
**Verdict: APPROVE**

The `useSound` hook and sound library exist. Adding new sound keys (`'boss'`, `'powerup'`, `'superFrenzy'`) is straightforward. Check that sound assets exist or need to be created.

### 4.2 Visual Juice
**Verdict: APPROVE**

All feasible with CSS animations and existing React state. Confetti burst on level-up can use a lightweight library (canvas-confetti) or simple CSS particle effects. The combo counter animation should reuse the existing `ArcadeHUD` pattern.

### 4.3 Level-Up Banner
**Verdict: APPROVE**

Simple overlay component triggered by `sessionLevel` change. 2-second display with CSS transition. The "what new problem types are unlocked" text can read from `MathModule.LEVEL_PROGRESSION`.

---

## Recommended Implementation Order

The plan's execution order is mostly right but should be adjusted:

1. **1.2 + 1.3 first** (anti-repeat + zero guard) — these are pure logic fixes with no state management changes. Lowest risk, immediate user-visible improvement.
2. **1.1 second** (session leveling) — depends on 1.2's `regenerateProblem()` method. Must be done after 1.2 because it calls `regenerateProblem` on level-up.
3. **Verify: tests + build**
4. **2.1 + 2.3** (adaptive difficulty + delay) — wiring existing logic, mechanical.
5. **2.2** (problem rotation) — depends on 1.1's sessionLevel and 1.2's type override removal.
6. **Verify: tests + build**
7. **3.3** (theme changes) — standalone, no dependencies. Can be done in parallel with 3.4.
8. **3.4** (speed modes) — standalone config work. Note: requires timer implementation for Blitz mode.
9. **3.1** (power-ups) — new entity type, medium refactor of `useGameEngine`.
10. **3.5** (combo milestones) — extends existing frenzy system, low risk.
11. **3.2** (boss bubbles) — most complex, depends on power-up infrastructure (for effect handling) and sessionLevel (for spawn timing). Do last.
12. **3.6** (daily challenge) — depends on seeded RNG, can be done anytime but lower priority.
13. **4.1–4.3** (polish) — iterative, do last.
14. **Final verify + deploy.**

**Parallelization opportunities:**
- 3.3 + 3.4 can run in parallel (no shared dependencies).
- 3.5 can run in parallel with 3.1 (different parts of `useGameEngine`).
- 3.6 can run in parallel with 3.2 (different systems entirely).

---

## Tests That Need To Be Added or Updated

### Must-add tests (Phase 1):

1. **`MathBehaviorStrategy.regenerateProblem()`** — verify it clears the old problem, generates a new one at the given level, and the new problem's signature differs from the previous one.
2. **`MathBehaviorStrategy` anti-repeat** — generate 20 problems in sequence, verify no two consecutive problems have the same signature.
3. **`ArithmeticFactory` subtraction guard** — verify that for `level <= 2`, `sub_simple` never produces `answer === 0`.
4. **`BubbleGameContainer` session leveling** — verify that `sessionLevel` increments after N correct answers and that `regenerateProblem` is called. (May require integration testing or mocking `behavior`.)
5. **`GameDirector.recordResult` — no streak-based level bump** — update existing test to ensure `estimatedLevel` only changes via mastery, not consecutive correct.
6. **`MathModule.generateProblem` with `avoidSignatures`** — verify it avoids provided signatures.
7. **Problem type rotation** — verify that at level 3+, `pickProblemType()` can return multiplication, division, etc. (not just `addition_simple`).

### Must-update tests:

1. **`GameDirector.test.ts`** — the test "grows estimatedLevel when 3 skills are mastered" should remain valid. But if the plan adds a streak-based bump, add a test for it. (Review recommends removing the streak bump, so no new test needed — but verify existing tests still pass.)
2. **`ProblemFactory.test.ts`** — add test cases for level > 3 addition_simple to verify `num2` can be 0 but `num1` is always ≥ 10.

### Should-add tests (Phase 2–3):

3. **`useGameEngine` timer countdown** — for Blitz mode, verify `timeLeft` decrements and `isGameOver` fires when it reaches 0.
4. **Power-up bubble spawning** — verify power-up bubbles appear at the configured interval and bypass `behavior.validate()`.
5. **Boss bubble** — verify boss spawns at sessionLevel 3/6/9, has correct health, and normal spawning is suppressed while boss is active.
6. **Frenzy tiers** — verify `frenzyTier` updates at combo 5/10/15 and score multipliers apply correctly.
7. **Theme switching** — verify CSS class changes at sessionLevel thresholds.
8. **Daily challenge seeding** — verify same seed produces same problem sequence.

---

## Summary Matrix

| Item | Verdict | Key Risk |
|------|---------|----------|
| 1.1 Progression | APPROVE WITH CHANGES | `initializeLevel` early-return guard blocks regeneration; `currentFocus` mismatch |
| 1.2 Anti-repeat | APPROVE WITH CHANGES | `isMathSensory` type override prevents rotation; `MathModule` is stateless |
| 1.3 Zero guard | APPROVE WITH CHANGES | Root cause may be subtraction `2-2=0`, not `0+0`; investigate actual source |
| 2.1 Adaptive difficulty | APPROVE WITH CHANGES | `tuneConfig` doesn't adjust `spawnIntervalMs`/`baseVelocity`; config changes don't reach behavior |
| 2.2 Problem rotation | APPROVE | Covered by 1.2 changes |
| 2.3 Reduced delay | APPROVE WITH CHANGES | Make per-mode configurable, don't globally reduce |
| 3.1 Power-ups | APPROVE WITH CHANGES | Needs new entity fields; separate spawn path; effect state management |
| 3.2 Boss bubbles | APPROVE WITH CHANGES | Multi-hit logic; boss-active state; most complex feature |
| 3.3 Theme changes | APPROVE | Simplest feature; align with existing `worldConfig.ts` |
| 3.4 Speed modes | APPROVE WITH CHANGES | Timer countdown not implemented in `useGameEngine`; needs `'none'` fail type |
| 3.5 Combo milestones | APPROVE WITH CHANGES | Tiered scoring; screen shake state plumbing |
| 3.6 Daily challenge | APPROVE WITH CHANGES | Needs seeded PRNG through factory chain |
| 4.1–4.3 Polish | APPROVE | Straightforward; check sound assets exist |

**Overall:** The plan is a solid foundation. The Phase 1 fixes target the right bugs but have wiring gaps that would cause silent no-ops if implemented as written. The creative features are feasible but escalate complexity in `useGameEngine` significantly — power-ups and bosses should be the last features implemented, after the core fixes are stable.