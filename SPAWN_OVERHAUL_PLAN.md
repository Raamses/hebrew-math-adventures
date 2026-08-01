# Bubble Spawn System Overhaul — Final Implementation Plan
# (Revised after Claude + Gemini devil's advocate review)

## Goal
Eliminate dead zones, guarantee target visibility, fix anti-repeat, and make progression feel responsive. All changes confined to `MathStrategy.ts`, `useGameEngine.ts`, `arcadeModes.ts`, and `types.ts`.

---

## P0 — Structural Fixes

### Task 1: Shuffled Bag for Target/Distractor Ratio
**File:** `src/engines/bubble/strategies/MathStrategy.ts`

**What:**
- Replace `Math.random() < targetChance` in `generateNext()` with a Fisher-Yates shuffled bag.
- Maintain `private spawnBag: boolean[]` — refill when empty.
- **CRITICAL (Gemini #1):** Convert fractional `distractorRatio` to integer proportions. For ratio 1.5 → bag = `[true, true, false, false, false]` (2 targets, 3 distractors). For ratio 0.8 → `[true, true, true, true, false]` (4 targets, 1 distractor). Use `Math.round(ratio * 10)` as denominator, `Math.round(ratio * 10)` as distractor count, `10 - distractorCount` as target count, then scale down if > 15 total.
- **CRITICAL (Claude #5):** `spawnBoss` must NOT consume a bag slot. Add `forceTarget: true` path that bypasses the bag entirely (doesn't pop from it).
- **CRITICAL (Gemini #5):** Reset `spawnBag` whenever `distractorRatio` changes (detect via comparing current config ratio to last-used ratio).
- Add `private lastRatio: number` to track.

**Signature change:**
```typescript
generateNext(config: GameConfig, opts?: { forceTarget?: boolean }): Partial<BubbleEntity>
```
- `forceTarget: true` → return target value WITHOUT touching the bag.
- Normal call → pop from bag.

**Why:** Eliminates gambler's-streak dead zones. Bag guarantees max gap = ratio+1 draws.
**Risk:** Low — self-contained to one class.

### Task 2: Target Safety Net in Spawn Loop
**File:** `src/engines/bubble/useGameEngine.ts`

**What:**
- In `spawnSystem()`, extend the active-count loop to also count `activeTargetCount`.
- **CRITICAL (Claude #4, Gemini #4):** Filter strictly: `!e.isPopped && !e.isPowerUp && !e.isBoss` before calling `behavior.validate(e)`.
- Track `lastTargetSeenTime` ref (init from first rAF callback, NOT 0).
- If `activeTargetCount === 0` and `time - lastTargetSeenTime > 6000`, set `forceTarget = true` on the next `generateNext` call.
- **CRITICAL (Claude #8):** In the multi-spawn credit loop, clear `forceTarget` after exactly ONE forced target spawn. Recompute the "do we still need force" check per loop iteration.
- Update `lastTargetSeenTime` whenever a target is spawned (including forced).

**Why:** Hard guarantee — a target appears within 6s even if bag + despawn timing align against it.
**Risk:** Medium — touches `IGameBehavior` interface (optional param, backward compatible).

### Task 3: Credit Accumulator Spawn Scheduler
**File:** `src/engines/bubble/useGameEngine.ts`

**What:**
- Add `lastFrameTime = useRef(0)` — updated EVERY frame (not just on spawn).
- Add `spawnCredits = useRef(0)`.
- Each frame: `const dt = time - lastFrameTime.current; lastFrameTime.current = time;`
- **CRITICAL (Claude #2):** Use `dt` (per-frame delta), NOT `time - lastSpawnTime.current` for credit accumulation.
- `spawnCredits.current += dt / currentInterval;`
- **CRITICAL (Gemini #2, Claude #3):** Clamp: `spawnCredits.current = Math.min(spawnCredits.current, MAX_BANKED_CREDITS)` where `MAX_BANKED_CREDITS = 3`.
- **CRITICAL (Gemini #2):** If `dt > 2000` (tab was backgrounded), reset `spawnCredits.current = 0` and skip accumulation that frame.
- **CRITICAL (Claude #3):** On first rAF callback, seed `lastFrameTime.current = time` and `lastSpawnTime.current = time` — don't accumulate from 0.
- `while (spawnCredits.current >= 1 && activeCount < effectiveMaxOnScreen)`: spawn, decrement credit, cap at 3 spawns per frame.
- Remove the `activeCount < maxOnScreen - 2 → ×0.5 interval` catch-up hack.
- **CRITICAL (Gemini #2):** Stagger Y coordinates if spawning multiple in one frame: `y = 110 + (spawnIndex * 12)`.
- Update `lastSpawnTime.current = time` after spawning.

**Why:** Empty screen refills in 1-2 frames instead of 16 seconds. Survives tab-backgrounding.
**Risk:** Low-medium.

### Task 4: Progressive Anti-Repeat Relaxation
**File:** `src/engines/bubble/strategies/MathStrategy.ts`

**What:**
- **CRITICAL (Claude #9):** In `generateAndSetProblem()`, after `MAX_REGEN_ATTEMPTS` fails:
  1. Retry with last 8 signatures
  2. Retry with last 1 signature (guarantees no back-to-back)
  3. Accept last generated
- **CRITICAL (Claude #9):** Also subject `FALLBACK_PROBLEM` to the last-1-signature check. If `FALLBACK_PROBLEM` signature matches last used, perturb it (e.g. swap to `2+1=3` or `1+2=3`).
- **CRITICAL (Claude #10):** "3+ correct answers" filter — pass `correctCount` from `BubbleGameContainer` via `regenerateProblem(level, config, correctCount)`. When `correctCount >= 3`, filter trivial problems (`0+0`, `1-1`, `0×N`) from generation.
- **Claude #9 precedence:** Signature relaxation runs BEFORE level-fallback (cheaper, less disruptive).
- Reduce `MAX_RECENT_SIGNATURES` from 18 to 12 (Gemini suggestion — prevents pool lockup on low difficulty while still preventing duplicates).

**Why:** Guarantees no back-to-back duplicates even in rescue mode with small problem space.
**Risk:** Low.

---

## P1 — Progression & Placement

### Task 5: Fix Timed-Mode Progression
**File:** `src/engines/bubble/useGameEngine.ts`

**What:**
- Replace `progressRatio = targetsPopped / winCondition.value` with:
  - `comboBonus = Math.min(0.3, gameStateRef.current.combo * 0.02)`
  - For `time_limit` modes: `const elapsed = (config.winCondition.value - (gameStateRef.current.timeLeft ?? 0)); const timeBonus = (elapsed / config.winCondition.value) * 0.2`
  - For non-time modes: `timeBonus = 0`
  - `speedMultiplier = Math.min(1.6, 1 + comboBonus + timeBonus)`
- Guard `timeBonus` to only compute when `winCondition.type === 'time_limit'` (avoids NaN).
- Also trace `GameDirector.tuneConfig` wiring — verify Challenge Mode output reaches `configRef`.

**Why:** 25 correct in Blitz barely moved the needle. Progression should feel immediate.
**Risk:** Medium.

### Task 6: Lane-Based Spawn Placement (revised)
**File:** `src/engines/bubble/useGameEngine.ts`

**What:**
- **CRITICAL (Claude #1):** Lane width must be ≥ largest bubble hit-area. Compute:
  ```typescript
  const minLaneWidthVw = 26; // matches large variant hit-area
  const maxLanes = Math.floor(84 / minLaneWidthVw); // = 3 lanes on narrow, more on wide
  const laneCount = Math.min(currentConfig.maxOnScreen, maxLanes);
  ```
- **CRITICAL (Gemini #3):** Lane occupation is proximity-based: a lane is "occupied" only if an active bubble in that lane has `y > 85` (near bottom). Bubbles higher up don't block spawns.
- **CRITICAL (Claude #6):** Free lanes in ALL three removal paths: `handlePop`, `handleOffScreen`, AND `cleanupSystem` TTL sweep.
- **CRITICAL (Gemini #6):** Dynamic lane count from screen width: `Math.min(maxOnScreen, Math.floor(window.innerWidth / 80))`.
- Assign first free lane + ±2vw jitter.
- Migrate BOTH collision-avoidance call sites (normal bubbles AND power-ups) to lane system (Claude #10 medium).
- Track `laneOccupied: boolean[]` in a ref, indexed by lane number. Each entity stores its `lane` index.

**Why:** O(1) placement, no wasted attempts, better tap accuracy.
**Risk:** Medium.

### Task 7: Asymmetric Despawn TTL
**File:** `src/engines/bubble/useGameEngine.ts`

**What:**
- In `cleanupSystem()`, targets get 35s TTL, distractors get 22s.
- Check `behavior.validate(e)` to determine if target (with same filtering as Task 2: exclude popped/powerup/boss).
- **CRITICAL (Claude #6):** Also free lane on TTL removal.

**Why:** Targets are scarce resource — keeping them visible longer reduces zero-target windows.
**Risk:** Low.

### Task 8: Tune Arcade Mode Configs (corrected)
**File:** `src/lib/arcadeModes.ts`

**What:**
- **CRITICAL (Claude #7):** Zen: `distractorRatio` 1→**0.8** (MORE targets, not fewer)
- Classic: `distractorRatio` 2→1.5, `spawnIntervalMs` 800→700
- **CRITICAL (Claude #7):** Blitz: ADD `distractorRatio: 1.2` (doesn't exist currently — inherits base 2)
- Survival: `distractorRatio` 2→1.5

**Why:** Higher target ratio = less waiting. Credit accumulator makes interval less critical.
**Risk:** Low.

---

## P2 — Polish (after playtesting P0+P1)

- Trace `GameDirector.tuneConfig` → verify Challenge Mode fires at combo≥5
- Consider initial burst of 4 bubbles on round start (staggered)
- On-device profiling on Pi 5

---

## Required Unit Tests (from devil's advocate)

1. **Tab-backgrounding credit reset**: synthetic `time` jump > 2000ms → credits reset to 0, no flood.
2. **Boss-fight target visibility**: mock `behavior.validate` + `isBoss` entity → safety net still forces target spawn.
3. **Bag integrity after `spawnBoss`**: call `generateNext({forceTarget:true})` → bag state unchanged.
4. **`forceTarget` + multi-spawn**: force flag set, 3 credits available → exactly 1 forced target, 2 normal.
5. **Lane leak via TTL**: entity removed by `cleanupSystem` → lane freed.
6. **Fractional ratio**: `distractorRatio = 1.5` → bag has integer counts, no `RangeError`.
7. **No back-to-back `FALLBACK_PROBLEM`**: trigger fallback twice → different problems.

---

## Verification

After each task:
1. `npx tsc -b` — type check
2. `npx vitest run` — unit tests pass

After all P0 tasks:
3. Playwright smoke test (profile → Start Challenge → bubbles render, no crash, targets visible within 6s)
4. Full playtest with Ram