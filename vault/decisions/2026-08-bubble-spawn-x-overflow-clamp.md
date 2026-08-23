---
type: decision
decision_id: 2026-08-bubble-spawn-x-overflow-clamp
project: hebrew-math-adventures
updated: 2026-08-23
status: accepted
tags: [decision, bubble-spawn, e2e, flake, geometry, worldconfig]
---

# Variant-aware bubble spawn-X clamp (ADR 2026-08-23)

## Context

Raising Playwright `workers` from 1 to 3 on the Mac E2E hub cut suite wall-time
from ~28.5 min to ~10.5 min. A 3x stability validation surfaced one
non-reproducible test:

```
bubble-game.spec.ts :: Bubble overflow check — no bubble beyond viewport edges
  run 1: FAIL    run 2: PASS    run 3: PASS
```

### This was NOT caused by parallelism

The initial automated label ("shared-state leakage suspect") was wrong — it was
inferred from "status differed across runs", which only means *not
reproducible*. The real cause is `Math.random()` in the spawn path. The bug
predates `workers: 3`; faster runs simply rolled the dice more often per unit of
wall-clock. Parallelism made an existing bug **visible**, it did not create it.

## Root causes — there were TWO

The initial diagnosis found only cause #1. Fixing it moved the failure rate from
~1-in-3 to ~1-in-5 but did not close it. A polling diagnostic (719 bubble
observations in one session) then exposed cause #2, which was in fact dominant.

### Cause 1 — spawn-X clamp ignored element width

`Bubble.tsx` renders a **wrapper div** positioned with `left: ${x}vw` (sized to
`hitArea`), containing an **inner `motion.button`** sized to `size` and
flex-**centered** inside it. The e2e assertion measures the *inner button*
(`button[aria-label*="Pop bubble"]`), so its right edge is:

```
x + (hitArea - size)/2 + size
```

The spawn clamp in `useGameEngine.ts` was:

```ts
spawnX = Math.max(8, Math.min(92, spawnX));   // flat 92vw — ignores element width
```

At 393px (real Pixel 5 width) a wrapper at 92vw = 361.6px put the button's right
edge at:

| Variant | Button right edge | Overflow |
|---|---|---|
| small  | 411.6px | **+18.6px** |
| medium | 426.9px | **+33.9px** |
| large  | 448.0px | **+55.0px** |

A direct DOM probe confirmed rendered button widths of 40px/52px — the `size`
values, **not** `hitArea`. Replaying the pre-fix logic showed **14 of 18**
variant x viewport combinations overflowed, by up to +58px. Even `small`
bubbles overflowed on phones <= 414px.

### Cause 2 — vertical assertions raced a continuous animation (dominant)

Bubbles animate from `y: 110vh` to `y: -20vh` over 8-24s, so they are **always**
mid-flight. The test asserted `box.y >= 40` and `box.y + box.height <= height`
on any bubble whose *centre* happened to be on-screen at sample time.

Measured reality across 719 observations at 393x727:

| Axis | Worst observed | Old assertion | Result |
|---|---|---|---|
| Top edge    | **15.1px**   | `>= 40`     | would fail |
| Bottom edge | **1020.0px** | `<= 727`    | **+293px** |

These are legitimate in-flight positions, not defects. The assertion was a pure
timing race — which is why cause #1 alone only reduced the failure rate.

Compounding it, the old loop called `boundingBox()` **per bubble**, sampling each
one in a *different* animation frame.

### Why it was only intermittently flaky

Cause #1 needs lane 4-5 **and** positive jitter **and** (for the worst cases) the
20% `large` variant roll (`rand > SPAWN_CONFIG.CHANCE_LARGE`) to coincide inside
the test's 4s sample window. Cause #2 needs a bubble to be straddling an edge at
the exact sample instant.

### Why it survived so long

The assertion tolerance had been widened repeatedly instead of fixing the clamp:
`+5` -> `+20` -> `+5` -> `+10`. A `+10` tolerance masked overflows of 10-58px.

## Decision

**Fix 1 — geometry.** Implement a **per-variant, viewport-aware** clamp (option
A), rejecting a flat `74vw` cap (option B: compressed lanes unnecessarily for
narrow variants) and a `translateX(-50%)` recentre (option C: changes rendering,
needs visual re-verify at 375/768/1440).

1. `worldConfig.ts` becomes the single source of truth for bubble geometry:
   - `BUBBLE_HIT_AREA` (outer wrapper) + `BUBBLE_VISUAL_SIZE` (inner button)
   - `bubbleHitAreaCss()` / `bubbleVisualSizeCss()` build the CSS strings
   - `resolveButtonRightExtentPx()` = `inset + size`
   - `computeMaxSpawnXVw()` / `clampSpawnXVw()` do the clamping
2. `Bubble.tsx` reads **both** boxes from worldConfig — duplication is what let
   the two drift apart, so neither is hardcoded any more.
3. `useGameEngine.ts` clamps **both** spawn paths (normal bubbles and the
   always-`large` Frenzy Star), *after* both jitters are applied.
4. `x`/`y` now assigned **after** `...newBubbleProps` spreads, so engine-owned
   geometry can't be silently overridden if a strategy ever returns `x`.

### Clamp must be viewport-dependent

CSS `clamp()` px floors can resolve **wider** than the nominal vw on narrow
phones (e.g. `small` hitArea floors at 60px = 18.75vw at 320px, not 14vw), so a
single vw constant would still under-clamp.

**Fix 2 — assertion correctness.** In `bubble-game.spec.ts`:

1. Capture all geometry in **one `page.evaluate()`**, so every bubble is measured
   in the same animation frame.
2. **Horizontal** stays a hard invariant for every bubble (tolerance `+10` ->
   `+2`), with named `expect` messages that print the offending geometry.
3. **Vertical** only asserts on bubbles already fully inside the viewport.
   Bubbles are always mid-flight; a bubble straddling an edge is expected
   behaviour, so asserting on it tests animation timing rather than layout.

## Verification

- Unit: `src/lib/__tests__/bubbleSpawnClamp.test.ts` — 13 tests, 189
  deterministic combinations (7 viewports x 3 variants x 9 candidates), zero
  randomness. Includes an explicit check that the pre-fix flat-92 clamp *would*
  have overflowed, so the tests cannot pass vacuously.
- E2E: `bubble-game.spec.ts:186` — **8/8 green** (was ~1-in-3, then ~1-in-5).
- Geometry probe: 719 bubble observations over 120 samples at 393x727:
  - worst right edge **393.0px vs 393px limit — 0.0px excess** (clamp is exact
    at the boundary, not merely lucky)
  - worst left edge 76.4px (never near 0)
- `tsc -b` clean. `npm run lint` introduces no new findings (the two
  `useGameEngine` items — `_level` unused, and the `MAX_BANKED_CREDITS` /
  `isFusionMode` exhaustive-deps warning — are pre-existing).

## Consequences

- Bubbles can no longer overflow the viewport on any tested viewport/variant.
- E2E tolerance tightened `+10` -> `+2` (subpixel/float headroom only).
- Deterministic coverage moved to `src/lib/__tests__/bubbleSpawnClamp.test.ts`:
  189 combinations (7 viewports x 3 variants x 9 candidates), zero randomness.
- Slight reduction in usable spawn width at the right edge — relevant to the
  in-flight P0 Bubble Spawn Playability work (lane density), so worth
  re-checking there.
- `scripts/e2e-stability-check.sh` no longer asserts "shared-state leakage";
  it now ranks likely causes (Math.random > timing > wall-clock > shared state).

## Lessons

- **"Status differed across runs" != "shared state."** Rank `Math.random()` and
  animation timing first; those are far more common than cross-worker leakage.
- **Don't stop at the first root cause.** Fixing cause #1 cut the failure rate
  from 1-in-3 to 1-in-5, which *looked* like progress toward a fix but was
  actually a second, dominant bug hiding behind the first.
- **Measure the element the test measures.** A first attempt clamped against
  `hitArea` and still failed, because the assertion targets the inner button.
  A DOM probe (`cssLeft=auto`, `w=40`) found this in one shot; reasoning from
  source alone had produced the wrong box.
- **Verify the viewport, don't assume it.** The config says 390px; the Pixel 5
  device descriptor overrides it to **393px**.
- **N=3 is not enough for a 1-in-5 flake.** Three green runs would have declared
  victory here; runs 4-5 caught the failure. Prefer a bounded in-session probe
  (719 observations in ~54s) over repeated full-suite runs — it turns a
  probabilistic hunt into a measurement.
- **A widening tolerance is a bug smell.** The `+5 -> +20 -> +5 -> +10` history
  was the signal.
- **Assert only on settled state.** Asserting geometry on a continuously
  animating element measures timing, not layout.

## Related

- `playwright.config.ts` — `workers: 1` -> `3` (see `vault/decisions/` for the
  E2E parallelism note)
- `vault/roadmap/known-issues.md` — bubble spawn playability (94% drop-off)
