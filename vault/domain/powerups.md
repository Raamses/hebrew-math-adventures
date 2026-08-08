---
type: domain
project: hebrew-math-adventures
updated: 2026-08-08
status: active
tags: [domain, powerups, bubble, gameplay, mechanics]
---

# Power-Up System (Bubble Game)

**This is the canonical documentation for the power-up system** in the bubble game. Power-ups spawn as special bubbles; popping one activates its effect. All logic lives in `src/engines/bubble/useGameEngine.ts` with config in `src/lib/worldConfig.ts` (`POWER_UP_CONFIG`).

## Power-Up Types

Source: `src/engines/bubble/types.ts` → `PowerUpType`; config in `worldConfig.ts` → `POWER_UP_CONFIG`.

| Type | Emoji | Duration | Effect |
|---|---|---|---|
| `freeze` | ❄️ | 3000ms | Freezes all bubble movement (`getEffectiveSpeedMultiplier` → 0) |
| `double_points` | ✨ | 5000ms | 2× score on correct answers (stacks with frenzy multiplier) |
| `pop_distractors` | 💥 | instant | Pops all non-target bubbles on screen (no score) |
| `slow_motion` | 🐌 | 4000ms | Slows bubble speed to 0.3× |
| `lightning_chain` | ⚡ | instant | Pops the 3 distractors nearest screen center, +30 score |
| `rainbow_magnet` | 🌈 | 3000ms | Boosts target spawn ratio (more targets = easier to score) |

## Config (`POWER_UP_CONFIG` in `worldConfig.ts`)

```ts
export const POWER_UP_CONFIG = {
    SPAWN_INTERVAL_MS: 15000,   // min time between power-up spawns
    MAX_BANKED_CREDITS: 3,
    TYPES: ['freeze', 'double_points', 'pop_distractors', 'slow_motion', 'lightning_chain', 'rainbow_magnet'],
    DURATIONS: { freeze: 3000, double_points: 5000, pop_distractors: 0, slow_motion: 4000, lightning_chain: 0, rainbow_magnet: 3000 },
    EMOJI: { freeze: '❄️', double_points: '✨', pop_distractors: '💥', slow_motion: '🐌', lightning_chain: '⚡', rainbow_magnet: '🌈' },
};
```

## Spawning

In `useGameEngine.spawnSystem()`:
- A power-up bubble spawns instead of a normal bubble when `timeSinceLastPowerUp >= powerUpSpawnIntervalMs` (default `POWER_UP_CONFIG.SPAWN_INTERVAL_MS` = 15s) **and** `activeCount < maxOnScreen`.
- Type is chosen uniformly at random from `POWER_UP_TYPES`.
- Spawned via the same **lane-based placement** as normal bubbles (8–92vw, ±2vw jitter), `variant: 'medium'`, `isPowerUp: true`, `powerUpType` set.
- Power-up bubbles are **not** counted as targets (`isTargetEntity` excludes `isPowerUp`).

## Activation (`activatePowerUp`)

Called from `handlePop` when a popped bubble has `isPowerUp` + `powerUpType`:
- **Instant effects** (`pop_distractors`, `lightning_chain`): applied immediately, no ongoing `powerUpState`.
  - `pop_distractors`: marks all non-target, non-popped, non-powerup bubbles as popped (no score).
  - `lightning_chain`: pops the 3 distractors nearest `x=50`, awards +30 score.
- **Timed effects** (`freeze`, `double_points`, `slow_motion`, `rainbow_magnet`): set `powerUpState = { type, active: true, expiresAt: now + duration }`.
- Popping a power-up returns `undefined` from `handlePop` (no score change, no strike).

## Effect application

- **`getEffectiveSpeedMultiplier()`**: returns `0.3` for `slow_motion`, `0` for `freeze`, else `1`. Used by the game loop to scale bubble velocity.
- **`isDoublePointsActive()`**: true when `powerUpState.type === 'double_points'`.
- **Score**: in `handlePop`, `doublePointsMultiplier = 2` when `double_points` active, stacking with the frenzy multiplier (`combo ≥ 5 → 2×`, `≥ 10 → 3×`, `≥ 15 → 5×`).
- **Expiry**: `checkPowerUpExpiry()` runs each frame; when `Date.now() >= expiresAt`, `powerUpState` is cleared to `null`.

## UI
- `src/components/games/BubbleGameContainer.tsx` — renders power-up bubbles + HUD.
- `src/components/sensory/Bubble.tsx` — bubble rendering (power-up variant).
- `src/components/games/ArcadeHUD.tsx` — HUD showing active power-up state.

## Tests
- `src/engines/bubble/__tests__/useGameEngine.powerups.test.ts` — type/emoji coverage, all 6 types.
- `src/engines/bubble/__tests__/spawnOverhaul.test.ts` — spawn behavior.

## Related
- [[domain/bubble-spawn-design]] — spawn engine playability intent.
- [[domain/analytics]] — `powerup_activated` event (44 activations across 2 users in 28-day window; most users don't use power-ups).
- [[decisions/2026-07-spawn-overhaul]] — spawn engine overhaul that introduced lane-based placement.
