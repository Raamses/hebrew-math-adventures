# Bubble-Spawn Playability — Measurement & Design Plan

**Date:** 2026-08-11  
**Author:** planner2 (OpenClaw Workboard)  
**Status:** P0+P1 implemented & tested. P2 remaining.  
**Parent card:** b14fe89b (Goal: Make bubble-spawn playability measurable, then rebuild spawn logic)

---

## 1. Problem Statement

The bubble game had severe playability issues:
- **Dead zones:** Long stretches with no target bubbles on screen
- **Gambler's streak:** Random `Math.random() < targetChance` created streaks of 5+ distractors
- **Stale phases:** Players waited doing nothing for up to a minute with no bubble to pop
- **Slow refill:** Empty screen took 16+ seconds to repopulate (fixed interval, no catch-up)
- **Anti-repeat lockup:** Small problem space at low levels caused duplicate problems
- **Flat progression:** 25 correct answers in Blitz barely moved spawn speed

## 2. What Was Implemented (P0 + P1 — COMPLETE)

All 8 tasks from `SPAWN_OVERHAUL_PLAN.md` are implemented in the codebase.

### P0 — Structural Fixes

| # | Task | File(s) | Status | Evidence |
|---|------|---------|--------|----------|
| 1 | **Shuffled bag** for target/distractor ratio | `MathStrategy.ts` | ✅ Done | `buildSpawnBag()`, Fisher-Yates, integer proportions, `forceTarget` bypass, ratio-change reset |
| 2 | **Target safety net** (6s hard guarantee) | `useGameEngine.ts` | ✅ Done | `lastTargetSeenTime` ref, strict `isTargetEntity()` filter (excludes popped/powerup/boss), single-force clearing |
| 3 | **Credit accumulator** spawn scheduler | `useGameEngine.ts` | ✅ Done | Per-frame `dt`, `MAX_BANKED_CREDITS=3`, tab-backgrounding reset (>2000ms), multi-spawn with Y stagger |
| 4 | **Progressive anti-repeat** relaxation | `MathStrategy.ts` | ✅ Done | 8→1 signature windows, `FALLBACK_PROBLEM` perturbation, trivial signature filtering, `MAX_RECENT_SIGNATURES=12` |

### P1 — Progression & Placement

| # | Task | File(s) | Status | Evidence |
|---|------|---------|--------|----------|
| 5 | **Timed-mode progression** fix | `useGameEngine.ts` | ✅ Done | `comboBonus + timeBonus → speedMultiplier`, capped at 1.6x |
| 6 | **Lane-based spawn** placement | `useGameEngine.ts` | ✅ Done | Dynamic lane count from screen width, proximity-based occupation (y>85), free-lane assignment, jitter |
| 7 | **Asymmetric despawn TTL** | `useGameEngine.ts` | ✅ Done | Targets: 35s, Distractors: 25s (plan said 22s, code uses 25s — acceptable) |
| 8 | **Arcade mode config** tuning | `worldConfig.ts` | ✅ Done | Zen=0.8, Classic=1.5, Blitz=1.2, Survival=1.5 |

### Test Coverage

All 7 required unit tests from the devil's-advocate review are implemented in `spawnOverhaul.test.ts`:
1. ✅ Tab-backgrounding credit reset
2. ✅ Boss-fight target visibility
3. ✅ Bag integrity after `spawnBoss`
4. ✅ `forceTarget` + multi-spawn exact count
5. ✅ Fractional ratio (1.5 → integer bag, no RangeError)
6. ✅ No back-to-back `FALLBACK_PROBLEM`
7. ✅ Trivial signature filtering

**Full suite: 805/805 tests pass** (verified 2026-08-11 15:42 GMT+3).

### Files Touched
- `src/engines/bubble/strategies/MathStrategy.ts` — bag, anti-repeat, forceTarget
- `src/engines/bubble/useGameEngine.ts` — credit accumulator, safety net, lanes, TTL, progression
- `src/engines/bubble/types.ts` — `IGameBehavior.generateNext` signature with `forceTarget`
- `src/lib/worldConfig.ts` — `ARCADE_CONFIGS`, `SPAWN_CONFIG`, `POWER_UP_CONFIG.MAX_BANKED_CREDITS`
- `src/engines/bubble/__tests__/spawnOverhaul.test.ts` — 7 unit tests
- `src/lib/arcadeModes.ts` — re-exports from worldConfig

---

## 3. Gaps Identified

### Gap A: No spawn playability instrumentation (CRITICAL)
The "measure current behavior" part of the card is unaddressed. We rebuilt the spawn logic but have no way to measure whether it actually improved playability in production.

**What's needed:**
- GA4 events for spawn-related metrics: `target_gap_ms` (time between consecutive target spawns), `zero_target_duration_ms` (how long zero-target windows last), `bubbles_on_screen` (periodic count), `force_target_triggered` (safety net activations)
- A diagnostic mode that logs spawn timing to console for playtesting
- A/B comparison: old `Math.random()` vs new bag system (if we can toggle)

**Why it matters:** The engagement analytics (card 41e57b05) show per-user engagement declining from 129s → 11.6s. We need to know if the spawn overhaul actually reversed this trend or if further tuning is needed.

**Proposed child card:** "Build: Add spawn playability instrumentation events"

### Gap B: No initial burst on round start (MEDIUM)
The SPAWN_OVERHAUL_PLAN P2 section mentions "Consider initial burst of 4 bubbles on round start (staggered)". Currently the game starts with an empty screen and the credit accumulator fills at 1 bubble per `spawnIntervalMs`. This means the first 4-8 seconds of a round are visually empty.

**What's needed:**
- Seed `spawnCredits.current = 3` on game start (or first rAF callback)
- Or spawn 3-4 bubbles immediately in the first frame with staggered Y coordinates
- Test that this doesn't cause issues with the safety net or lane system

**Proposed child card:** "Build: Add initial bubble burst on round start"

### Gap C: GameDirector.tuneConfig → configRef wiring unverified (MEDIUM)
The plan's P2 says "Trace `GameDirector.tuneConfig` → verify Challenge Mode fires at combo≥5". The `BubbleGameContainer` calls `Director.tuneConfig()` in `handleSessionLeveling`, but we haven't verified that the tuned config actually reaches `configRef.current` in the game loop. If it doesn't, adaptive difficulty changes are invisible to the spawn system.

**What's needed:**
- Trace the data flow: `Director.tuneConfig()` → return value → `configRef.current` update
- Add a test that verifies config changes propagate to the spawn loop
- Verify Challenge Mode (combo≥5) actually increases `distractorRatio` and decreases `spawnIntervalMs`

**Proposed child card:** "Audit: Verify GameDirector.tuneConfig reaches spawn loop"

### Gap D: Distractor TTL discrepancy (LOW)
Plan specifies 22s for distractors, code uses 25s. Not functionally critical but should be aligned with the design document.

### Gap E: No on-device profiling on Pi 5 (LOW)
The plan mentions profiling on the target hardware (Raspberry Pi 5). The credit accumulator and multi-spawn path could cause frame drops on low-power hardware if many bubbles spawn in a single frame.

---

## 4. Proposed Child Cards

### Card 1: Build — Add spawn playability instrumentation
**Priority:** Normal  
**Scope:** Add GA4 events and console diagnostics for spawn behavior metrics  
**Files:** `useGameEngine.ts`, `BubbleGameContainer.tsx`, `src/types/analytics.ts`  
**Acceptance:** 
- GA4 events: `spawn_target_gap`, `spawn_zero_target_window`, `spawn_force_target`, `spawn_bubble_count`
- Console diagnostic mode toggle via a URL param `?spawnDebug=1`
- Tests for the instrumentation logic

### Card 2: Build — Add initial bubble burst on round start
**Priority:** Normal  
**Scope:** Seed spawn credits or directly spawn 3-4 bubbles on first rAF callback  
**Files:** `useGameEngine.ts`  
**Acceptance:**
- First frame has 3-4 bubbles visible (staggered Y, lane-assigned)
- Safety net doesn't fire on cold start (already seeded with `lastTargetSeenTime`)
- Test coverage for initial burst

### Card 3: Audit — Verify GameDirector.tuneConfig reaches spawn loop
**Priority:** Normal  
**Scope:** Trace and test the adaptive difficulty data flow  
**Files:** `BubbleGameContainer.tsx`, `useGameEngine.ts`, `GameDirector.test.ts`  
**Acceptance:**
- Documented data flow: `Director.tuneConfig()` → config object → `configRef.current`
- Test that config changes propagate to `spawnSystem` within 1 frame
- Test that Challenge Mode (combo≥5) increases distractor ratio

---

## 5. Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ BubbleGameContainer                                             │
│  ├── GameDirector.tuneConfig() → adaptive config                │
│  ├── handleSessionLeveling() → behavior.regenerateProblem()     │
│  └── useGameEngine(config, behavior)                            │
│       ├── spawnSystem(time)                                     │
│       │    ├── Credit Accumulator (dt-based, max 3 banked)       │
│       │    ├── Lane Assignment (dynamic count, proximity-based) │
│       │    ├── Safety Net (6s → forceTarget)                    │
│       │    └── Power-up Spawn (15s interval)                     │
│       ├── cleanupSystem()                                       │
│       │    └── Asymmetric TTL (targets 35s, distractors 25s)     │
│       ├── timerSystem(time)                                     │
│       └── MathBehaviorStrategy                                  │
│            ├── buildSpawnBag(ratio) → Fisher-Yates shuffled     │
│            ├── generateNext({forceTarget}) → target/distractor  │
│            ├── generateAndSetProblem() → anti-repeat relaxation │
│            └── validateAgainst() → stale bubble detection        │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Verification Commands

```bash
# Type check
npx tsc -b

# Full test suite
npx vitest run

# Spawn overhaul tests only
npx vitest run src/engines/bubble/__tests__/spawnOverhaul.test.ts
```

**Last verified:** 2026-08-11 15:42 GMT+3 — 805/805 tests pass, 42 test files.
