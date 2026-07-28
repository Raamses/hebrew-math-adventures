# Phase 2 — Bubble Game & Difficulty Progression Plan (Revised)

## Approved Items (8)
G (challenge mode 1.5x) was explicitly rejected by Ram.

---

## A. Progressive speed scaling with cap

**Problem:** `baseVelocity` and `spawnIntervalMs` are static throughout the session. The game feels identical at target #1 and target #9.

**Solution:** Scale spawn speed and bubble rise duration proportionally to progress, with a hard cap. Speed multiplier affects **newly spawned bubbles only** — bubbles already on screen keep their original animation duration (a natural "wave" effect).

**Implementation:**
- In `useGameEngine.ts`, compute `progressRatio = gameState.targetsPopped / config.winCondition.value` (0.0 → 1.0)
- Apply a speed multiplier: `speedMultiplier = 1 + (progressRatio * 0.4)` — max 1.4x at the last target
- Use this to reduce `spawnIntervalMs`: `effectiveInterval = config.spawnIntervalMs / speedMultiplier`
- Pass `speedMultiplier` into the bubble entity at spawn time as a new optional field `speedMultiplier?: number`
- In `Bubble.tsx`, read `speedMultiplier` from props (default 1.0) and use it in the `useMemo` that computes `randomDuration`: `duration = baseDuration / speedMultiplier`
- Since `useMemo` runs at mount time, each bubble gets the speed that was current when it spawned — no retroactive animation changes needed
- **Cap at 1.4x** — constant `MAX_SPEED_MULTIPLIER = 1.4`, easy to tune
- Frenzy multiplier (0.6x spawn interval) stacks on spawn timing only — it does not affect bubble rise speed. These are independent systems and should stay that way.

**Files touched:**
- `src/engines/bubble/types.ts` — add `speedMultiplier?: number` to `BubbleEntity`
- `src/engines/bubble/useGameEngine.ts` — compute progressRatio, apply to spawn interval, attach to new bubble entity
- `src/components/sensory/Bubble.tsx` — accept `speedMultiplier` prop, apply to `randomDuration` in `useMemo`
- `src/components/games/BubbleGameContainer.tsx` — pass `speedMultiplier` from entity to Bubble component

**Risk:** Low. The wave effect (new bubbles faster, old ones slower) is a natural difficulty ramp. 1.4x cap is conservative.

---

## B. Route bubble game through GameDirector

**Problem:** `BubbleGame.tsx` hardcodes its `GameConfig` and never passes through `GameDirector.tuneConfig()`. Rescue/challenge modes don't affect the bubble game.

**Solution:** Accept an optional `UserCapabilityProfile` prop in `BubbleGame`, pass config through `Director.tuneConfig()`. Add explicit `distractorRatio` handling to `tuneConfig` (not the inverse `density` field).

**Implementation:**
- `BubbleGame.tsx` accepts `profile?: UserCapabilityProfile` as new prop
- If profile provided, call `Director.tuneConfig(config, profile)` before passing to container
- **Add `distractorRatio` handling to `GameDirector.tuneConfig()`:**
  - Rescue mode: `distractorRatio = Math.max(1, Math.floor(distractorRatio * 0.7))` — fewer distractors, more targets, easier
  - Challenge mode: `distractorRatio = distractorRatio + 1` — more distractors, fewer targets, harder
  - This is direct and intuitive: higher ratio = harder. No inversion confusion.
- **Do NOT use the `density` field** for bubble game — it has inverse semantics and would invert the difficulty. The `density` case in `tuneConfig` stays for saga-node configs that use it; the new `distractorRatio` case handles bubble game.
- **`max` from tuneConfig** maps to distractor range in `MathBehaviorStrategy` — but only if C is implemented (C makes distractor range proportional to target). We pass `max` through config and `MathBehaviorStrategy` can optionally use it as an upper bound for distractors. If `max` is undefined, fall back to the C formula.
- If no profile provided (e.g. standalone play), use the hardcoded config as-is (backward compatible)

**Files touched:**
- `src/components/sensory/BubbleGame.tsx` — accept profile prop, call tuneConfig
- `src/engines/GameDirector.ts` — add `distractorRatio` case to rescue and challenge branches
- `src/engines/bubble/strategies/MathStrategy.ts` — optionally read `config.max` as distractor upper bound
- Wherever BubbleGame is rendered — pass the profile from ProgressContext

**Risk:** Moderate. The `distractorRatio` handling is new logic in `tuneConfig` — needs a test. But it's additive (new field check), not modifying existing `density` behavior.

---

## C. Fix distractor generation scaling

**Problem:** Distractors are `targetValue ± random(0-5)`. For target=3, distractors are 0-8 (wide range). For target=50, distractors are 45-55 (narrow range). Difficulty is inverted.

**Solution:** Scale distractor range proportionally to target value, with a minimum range and a target guard.

**Implementation:**
- In `MathBehaviorStrategy.generateDistractor()`, add guard at top: `const safeTarget = Math.max(1, this.targetValue)`
- Replace fixed `DISTRACTOR_RANGE: 10` / `DISTRACTOR_OFFSET: 5` with:
  ```
  const range = Math.max(10, Math.floor(safeTarget * 0.4));
  const offset = Math.floor(range / 2);
  ```
- For target=3: range=10, distractors span -2 to 12 (clamped to ≥0) — wide, easy to distinguish
- For target=50: range=20, distractors span 40-60 — proportionally wider
- For target=100: range=40, distractors span 80-120 — proportionally wider still
- Keep the `while (value === this.targetValue || value < 0)` guard
- Add upper bound clamp: `value = Math.min(value, 999)` (safety)
- If `config.max` is provided (from B), use `Math.min(range, config.max)` to cap the range

**Files touched:**
- `src/engines/bubble/strategies/MathStrategy.ts` — replace fixed constants with computed range, add guard

**Risk:** Very low. Self-contained math change with no side effects.

---

## D. Bubble spawn collision avoidance

**Problem:** Bubbles spawn at `random(5-95)` with no spacing check. On small screens, they overlap and are hard to tap.

**Solution:** Track active bubble x positions, reject new spawns too close to existing bubbles. Make `maxOnScreen` responsive to viewport width.

**Implementation:**
- **Responsive `maxOnScreen`:** Compute at game init in `BubbleGame.tsx`:
  ```
  const responsiveMax = window.innerWidth < 400 ? 8 : window.innerWidth < 600 ? 10 : 12;
  ```
  Use `responsiveMax` in the config instead of hardcoded `12`.
- **Collision check in `useGameEngine.ts` spawn system:**
  - Compute `minDistanceVw` from the largest bubble size: `minDistanceVw = 25` (25% of viewport). On 360px screen = 90px — larger than a small bubble (60px), enough for comfortable tapping.
  - With `responsiveMax=8` on narrow screens: 8 × 25vw = 200vw. Still more than 100vw, so not all positions will be valid — that's fine, the 3-attempt limit handles it.
  - Before accepting a spawn position, try up to **5** random x values:
    ```
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = Math.random() * 90 + 5;
      const tooClose = entitiesRef.current.some(e =>
        !e.isPopped && Math.abs(e.x - candidate) < minDistanceVw
      );
      if (!tooClose) { use candidate; break; }
    }
    ```
  - If all 5 attempts fail, skip this spawn tick (try again next frame — the `requestAnimationFrame` loop will retry in ~16ms)
  - Cost: O(5 × n) per spawn attempt, n ≤ 12 → max 60 comparisons. Negligible.
- **Fallback:** If the screen is very full (activeCount ≥ maxOnScreen - 1), relax minDistance to `minDistanceVw * 0.6` to avoid starvation.

**Files touched:**
- `src/engines/bubble/useGameEngine.ts` — add collision check with 5 attempts + fallback relaxation
- `src/components/sensory/BubbleGame.tsx` — compute responsive `maxOnScreen`

**Risk:** Low. If collisions are too strict, spawn rate drops — but the catch-up mechanic (already in the engine) compensates by trying more frequently when screen is empty.

---

## E. Responsive bubble sizes

**Problem:** Bubble sizes are fixed px (60/80/110px). On 320px screens, large bubbles clip. On tablets, they're too small relative to screen.

**Solution:** Use CSS `clamp()` for responsive sizing.

**Implementation:**
- In `Bubble.tsx`, replace fixed `BUBBLE_SIZES` px values with `clamp()`:
  ```
  small:  { size: 'clamp(45px, 12vw, 60px)',  hitArea: 'clamp(70px, 18vw, 90px)',   fontSize: 'text-xl sm:text-2xl' }
  medium: { size: 'clamp(60px, 16vw, 80px)',  hitArea: 'clamp(90px, 24vw, 120px)',  fontSize: 'text-3xl sm:text-4xl' }
  large:  { size: 'clamp(80px, 22vw, 110px)', hitArea: 'clamp(110px, 30vw, 150px)', fontSize: 'text-4xl sm:text-5xl' }
  ```
- `clamp(min, preferred, max)`:
  - 320px screen: small=45px, medium=60px, large=80px — no clipping
  - 400px screen: small=48px, medium=64px, large=88px — comfortable
  - 768px tablet: small=60px, medium=80px, large=110px (hits max) — good proportion
- The hit area scales proportionally, maintaining ~1.5x ratio to bubble size.
- RTL: `left: ${x}vw` is physical left in CSS, unaffected by RTL. ✅

**Files touched:**
- `src/components/sensory/Bubble.tsx` — replace `BUBBLE_SIZES` with clamp values, adjust fontSize classes

**Risk:** Very low. CSS clamp is 96%+ browser support. Visual-only change.

---

## F. Dynamic `currentFocus` based on problem type

**Problem:** `INITIAL_CAPABILITY_PROFILE.currentFocus` is hardcoded to `'addition_sum_5'` and never changes. All skill tracking writes to the same key regardless of what the kid is practicing.

**Solution:** Set `currentFocus` dynamically based on the saga node's config type when a session starts, and persist it to the profile.

**Implementation:**
- Define `SKILL_KEY_MAP` in `src/types/progress.ts` (exported):
  ```
  export const SKILL_KEY_MAP: Record<string, string> = {
    'addition_simple': 'addition',
    'addition_carry': 'addition_carry',
    'addition_missing': 'addition_missing',
    'sub_simple': 'subtraction',
    'sub_borrow': 'subtraction_borrow',
    'multiplication': 'multiplication',
    'division': 'division',
    'series_simple': 'series',
    'series_geometric': 'series_geometric',
    'comparison_simple': 'comparison',
    'comparison_complex': 'comparison',
    'word_simple': 'word_problems',
    'word': 'word_problems',
    'algebraic': 'algebraic',
  };
  ```
- **Sensory nodes** (no `config.type`, have `config.target`): map to `'sensory'` as a catch-all skill key.
- **Challenge nodes** (`type: 'CHALLENGE'`, config is `{ max: N }` with no type): map to `'mixed_challenge'`. These test everything, so a generic key is appropriate.
- **Lesson nodes** (`type: 'LESSON'`): lessons don't produce answers, so `currentFocus` doesn't matter — set to `'lesson'` or skip.
- In `usePracticeSession.ts`, when a session starts:
  ```
  const skillKey = node.config.type
    ? SKILL_KEY_MAP[node.config.type] || node.config.type
    : node.type === 'SENSORY' ? 'sensory'
    : node.type === 'CHALLENGE' ? 'mixed_challenge'
    : 'general';
  ```
- Call `updateProfile` (from ProgressContext) to persist `capabilities.currentFocus = skillKey` **before** the first answer is processed. This ensures `Director.recordResult()` writes to the correct skill key.
- **Legacy migration:** On profile load in `ProgressContext.tsx`, if `skills` has only `addition_sum_5` and no other keys, leave it as-is. New sessions will write to the correct key going forward. No data loss, no rewrite.

**Files touched:**
- `src/types/progress.ts` — export `SKILL_KEY_MAP`
- `src/hooks/usePracticeSession.ts` — set currentFocus on session start
- `src/components/sensory/BubbleGame.tsx` — set currentFocus for sensory sessions (or pass from parent)
- `src/context/ProgressContext.tsx` — persist currentFocus update via existing updateProfile

**Risk:** Low-moderate. The key mapping is simple. The persistence uses the existing `updateProfile` flow. Legacy data is preserved.

---

## H. Age-based rescue threshold

**Problem:** Rescue mode triggers after 2 consecutive failures regardless of age. Too aggressive for older kids.

**Solution:** Make the rescue threshold dynamic based on the child's age. Add `age?: number` to `UserCapabilityProfile` and set it from `UserProfile.age` when constructing the capability profile.

**Implementation:**
- Add `age?: number` to `UserCapabilityProfile` in `src/types/progress.ts`
- When `ProfileContext.tsx` creates or loads a profile, populate `capabilities.age` from `profile.age`
- In `GameDirector.tuneConfig()`, replace the static `RESCUE_THRESHOLD = 2`:
  ```
  const rescueThreshold = profile.age && profile.age >= 8 ? 3 : 2;
  if (profile.consecutiveFailures >= rescueThreshold) { ... }
  ```
- Remove `private static readonly RESCUE_THRESHOLD = 2` — it's now dynamic
- `recordResult()` doesn't need changes — it just increments/resets `consecutiveFailures`
- **Edge case:** `age` undefined (legacy profiles, parent profiles) → falsy → threshold 2 (conservative). ✅
- **Edge case:** `age = 0` or negative (bad data) → falsy → threshold 2. ✅

**Files touched:**
- `src/types/progress.ts` — add `age?: number` to `UserCapabilityProfile`, update `INITIAL_CAPABILITY_PROFILE` (omit age — it's set per-profile)
- `src/engines/GameDirector.ts` — compute `rescueThreshold` dynamically
- `src/context/ProfileContext.tsx` — populate `capabilities.age` from `profile.age` on create and load

**Risk:** Low. The type change is additive (optional field). The dynamic threshold is a one-line change.

---

## I. Long-term `estimatedLevel` growth

**Problem:** `estimatedLevel` is set once (from age) and never increases. No organic progression.

**Solution:** Increase `estimatedLevel` based on **mastery across diverse skills**, not raw correct count. This prevents farming easy nodes from inflating the level.

**Implementation:**
- In `GameDirector.recordResult()`, after updating skill stats, count **mastered skills**:
  ```
  const MASTERY_THRESHOLD = 10; // min attempts
  const MASTERY_ACCURACY = 0.8; // 80%+ correct
  const masteredCount = Object.values(newProfile.skills)
    .filter(s => s.attempts >= MASTERY_THRESHOLD && (s.correct / s.attempts) >= MASTERY_ACCURACY)
    .length;
  const newLevel = Math.min(10, 1 + Math.floor(masteredCount / 3)); // 3 mastered skills per level
  ```
- **3 mastered skills per level:** level 2 at 3 skills, level 3 at 6, level 4 at 9, cap at 10. A kid who only farms "Pop the 7s" (one skill) will never level up — they need to demonstrate mastery across at least 3 different skill areas.
- **Sensory skills count** — but they're grouped under `'sensory'`, so all sensory nodes contribute to one skill key. A kid can't farm 3 different sensory nodes for 3 mastered skills.
- **Level-up callback:** If `newLevel > newProfile.estimatedLevel`, set the new level and invoke an optional callback (passed to `recordResult` or via an event emitter):
  ```
  if (newLevel > newProfile.estimatedLevel) {
    newProfile.estimatedLevel = newLevel;
    onLevelUp?.(newLevel); // optional callback
  }
  ```
- The callback is wired in `usePracticeSession.ts` and triggers a visual celebration (confetti/sound/mascot). The celebration UI is a **separate task** — for now, just log the event via `useAnalytics` and show a simple toast. Full celebration can be a follow-up.
- `pickProblemType(level)` in `MathModule` already uses `estimatedLevel` to unlock new problem types. This connection works automatically once `estimatedLevel` grows.

**Files touched:**
- `src/engines/GameDirector.ts` — add mastery-based level-up logic to `recordResult`, add optional `onLevelUp` callback param
- `src/engines/interfaces.ts` — update `IGameDirector.recordResult` signature if callback is on the interface (or keep it as an extra param)
- `src/hooks/usePracticeSession.ts` — wire the `onLevelUp` callback to analytics + toast

**Risk:** Moderate. The mastery formula needs tuning — 3 skills per level might be too slow or too fast depending on how many distinct skills exist in practice. The `SKILL_KEY_MAP` (from F) defines ~14 skill keys, so at 3 skills/level, max reachable level is ~5-6 from skills alone. The remaining levels (7-10) would need challenge/mixed mastery. This is probably fine — levels 7-10 are the "advanced" tier and should require broad mastery.

**Tuning note:** `MASTERY_THRESHOLD`, `MASTERY_ACCURACY`, and the `3 skills per level` ratio should all be constants at the top of `GameDirector` for easy adjustment.

---

## Cross-cutting considerations

### A × D interaction
Progressive speed (A) makes new bubbles rise faster. Collision avoidance (D) makes spawning slower when crowded. Together: late game speeds up new bubbles but slows spawning when screen is full → net effect is a natural tension that keeps the game challenging without becoming impossible. **Test with both enabled.**

### D × E interaction
Responsive bubble sizes (E) make bubbles smaller on phones. Collision avoidance (D) uses a fixed `minDistanceVw = 25`. Since bubbles are smaller on phones, 25vw is generous — no conflict. On tablets, bubbles are larger but screen is wider, so 25vw is still appropriate. ✅

### B × F interaction
B routes bubble game through `tuneConfig`, which reads `profile.skills[currentFocus]` for challenge mode. F sets `currentFocus` to `'sensory'` for sensory nodes. First play: no `'sensory'` skill stats → `currentSkill` is undefined → challenge mode won't trigger (correct: no history yet). After a few sessions, skill stats accumulate and challenge/rescue can kick in. ✅

### F × I interaction
F creates ~14 distinct skill keys. I requires mastery of 3 skills per level. This means a kid must practice at least 3 different node types to level up — preventing farming. ✅

---

## Implementation Order (revised)

1. **E** — Responsive bubble sizes (no deps, visual win, zero risk)
2. **C** — Distractor scaling (no deps, self-contained)
3. **D** — Collision avoidance + responsive maxOnScreen (builds on E's size logic)
4. **A** — Progressive speed (builds on D; test together)
5. **F** — Dynamic currentFocus (touches profile persistence, needed by B and I)
6. **H** — Age-based rescue (adds `age` to capability profile type)
7. **B** — Route through GameDirector (depends on F; adds distractorRatio to tuneConfig)
8. **I** — Level growth (depends on F for skill keys; most impactful behavioral change)

**Total: 8 changes, ~15 files touched.**
Each is independently testable. The existing 46 Vitest tests should continue passing; new tests should be added for:
- `GameDirector.tuneConfig` with `distractorRatio` (B)
- `GameDirector.recordResult` mastery-based level-up (I)
- `MathBehaviorStrategy.generateDistractor` scaling (C)
- Collision avoidance in `useGameEngine` (D) — may need integration test

---

## File list (complete)

| File | Items |
|---|---|
| `src/components/sensory/Bubble.tsx` | A, E |
| `src/components/sensory/BubbleGame.tsx` | B, D, F |
| `src/components/games/BubbleGameContainer.tsx` | A |
| `src/engines/bubble/useGameEngine.ts` | A, D |
| `src/engines/bubble/types.ts` | A |
| `src/engines/bubble/strategies/MathStrategy.ts` | B, C |
| `src/engines/GameDirector.ts` | B, H, I |
| `src/engines/interfaces.ts` | I |
| `src/types/progress.ts` | F, H |
| `src/context/ProfileContext.tsx` | F, H |
| `src/hooks/usePracticeSession.ts` | F, I |
| App.tsx or node renderer (TBD) | B |