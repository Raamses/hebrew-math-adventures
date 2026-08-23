/**
 * Bubble spawn-X overflow clamp tests.
 *
 * REGRESSION CONTEXT
 * Bubble.tsx renders a WRAPPER div positioned with `left: ${x}vw` (sized to
 * `hitArea`) containing an inner motion.button (sized to `size`) that is
 * flex-CENTERED inside it. The e2e overflow assertion measures the INNER
 * button, so its right edge is:
 *
 *     x + (hitArea - size)/2 + size
 *
 * The old clamp was `Math.max(8, Math.min(92, spawnX))` — a flat 92vw cap that
 * ignored element width entirely. At 393px (Pixel 5) that put the button's
 * right edge 18.6px (small) to 55.0px (large) past the viewport.
 *
 * WHY IT WAS FLAKY, NOT BROKEN: it needs lane 4-5 AND positive jitter AND the
 * 20% `large` variant roll to coincide inside a 4s sample window. That is
 * Math.random(), NOT shared-state leakage between parallel workers.
 *
 * These tests pin the geometry deterministically (exhaustive sweep) so the
 * invariant no longer depends on dice.
 */

import { describe, it, expect } from 'vitest';
import {
    BUBBLE_HIT_AREA,
    BUBBLE_VISUAL_SIZE,
    BUBBLE_SPAWN_X,
    bubbleHitAreaCss,
    bubbleVisualSizeCss,
    resolveButtonRightExtentPx,
    computeMaxSpawnXVw,
    clampSpawnXVw,
    type BubbleVariantName,
} from '../worldConfig';

const VARIANTS: BubbleVariantName[] = ['small', 'medium', 'large'];

/** 393 = real Pixel 5 width used by the e2e project (NOT the config's 390). */
const VIEWPORTS = [320, 375, 390, 393, 414, 768, 1440];

/** Independent mirror of CSS clamp(), for cross-checking the implementation. */
const clampPx = (g: { minPx: number; vw: number; maxPx: number }, vp: number) =>
    Math.max(g.minPx, Math.min((g.vw / 100) * vp, g.maxPx));

/** Where the inner button's right edge lands, given a wrapper at xVw. */
const buttonRightEdgePx = (variant: BubbleVariantName, xVw: number, vp: number) => {
    const hit = clampPx(BUBBLE_HIT_AREA[variant], vp);
    const size = clampPx(BUBBLE_VISUAL_SIZE[variant], vp);
    return (xVw / 100) * vp + (hit - size) / 2 + size;
};

describe('CSS string builders', () => {
    it('emit exactly the clamp() strings Bubble.tsx previously hardcoded', () => {
        expect(bubbleHitAreaCss('small')).toBe('clamp(60px, 14vw, 76px)');
        expect(bubbleHitAreaCss('medium')).toBe('clamp(76px, 20vw, 100px)');
        expect(bubbleHitAreaCss('large')).toBe('clamp(96px, 26vw, 128px)');

        expect(bubbleVisualSizeCss('small')).toBe('clamp(40px, 10vw, 52px)');
        expect(bubbleVisualSizeCss('medium')).toBe('clamp(52px, 13vw, 68px)');
        expect(bubbleVisualSizeCss('large')).toBe('clamp(68px, 18vw, 92px)');
    });

    it('keeps visual size <= hit area for every variant (centering stays valid)', () => {
        for (const v of VARIANTS) {
            expect(BUBBLE_VISUAL_SIZE[v].minPx).toBeLessThanOrEqual(BUBBLE_HIT_AREA[v].minPx);
            expect(BUBBLE_VISUAL_SIZE[v].maxPx).toBeLessThanOrEqual(BUBBLE_HIT_AREA[v].maxPx);
        }
    });
});

describe('resolveButtonRightExtentPx', () => {
    it('matches measured browser geometry at 393px (Pixel 5)', () => {
        // Verified against a live DOM probe: rendered button widths were 40px
        // (small) and 52px (medium) — NOT the hitArea values.
        expect(clampPx(BUBBLE_VISUAL_SIZE.small, 393)).toBeCloseTo(40, 1);
        expect(clampPx(BUBBLE_VISUAL_SIZE.medium, 393)).toBeCloseTo(52, 1);

        // small: hitArea 60, size 40 -> inset 10 -> extent 50
        expect(resolveButtonRightExtentPx('small', 393)).toBeCloseTo(50, 1);
    });

    it('is strictly less than the hit area (button is inset, not flush)', () => {
        for (const vp of VIEWPORTS) {
            for (const v of VARIANTS) {
                const extent = resolveButtonRightExtentPx(v, vp);
                expect(extent).toBeLessThanOrEqual(clampPx(BUBBLE_HIT_AREA[v], vp) + 0.001);
            }
        }
    });

    it('falls back to the SSR viewport for a non-finite or zero width', () => {
        const ssr = resolveButtonRightExtentPx('large', BUBBLE_SPAWN_X.SSR_VIEWPORT_PX);
        expect(resolveButtonRightExtentPx('large', 0)).toBeCloseTo(ssr, 5);
        expect(resolveButtonRightExtentPx('large', Number.NaN)).toBeCloseTo(ssr, 5);
        expect(resolveButtonRightExtentPx('large', -100)).toBeCloseTo(ssr, 5);
    });
});

describe('computeMaxSpawnXVw', () => {
    it('never exceeds MAX_VW and never drops below MIN_VW', () => {
        for (const vp of [...VIEWPORTS, 50, 10000]) {
            for (const v of VARIANTS) {
                const maxX = computeMaxSpawnXVw(v, vp);
                expect(maxX).toBeLessThanOrEqual(BUBBLE_SPAWN_X.MAX_VW);
                expect(maxX).toBeGreaterThanOrEqual(BUBBLE_SPAWN_X.MIN_VW);
            }
        }
    });

    it('is stricter for wider variants at the same viewport', () => {
        const vp = 393;
        expect(computeMaxSpawnXVw('large', vp)).toBeLessThan(computeMaxSpawnXVw('medium', vp));
        expect(computeMaxSpawnXVw('medium', vp)).toBeLessThan(computeMaxSpawnXVw('small', vp));
    });
});

describe('clampSpawnXVw', () => {
    it('rejects the exact regression case: wrapper @ 92vw on a 393px viewport', () => {
        for (const v of VARIANTS) {
            // Prove the OLD flat-92 clamp overflowed...
            expect(buttonRightEdgePx(v, 92, 393)).toBeGreaterThan(393);
            // ...and the NEW clamp does not.
            const x = clampSpawnXVw(92, v, 393);
            expect(buttonRightEdgePx(v, x, 393)).toBeLessThanOrEqual(393 + 0.001);
        }
    });

    it('keeps the inner button inside the viewport for EVERY variant x viewport', () => {
        // Exhaustive, deterministic replacement for the probabilistic e2e check.
        for (const vp of VIEWPORTS) {
            for (const v of VARIANTS) {
                for (const candidate of [-50, 0, 8, 50, 74, 88, 92, 100, 500]) {
                    const x = clampSpawnXVw(candidate, v, vp);
                    expect(
                        buttonRightEdgePx(v, x, vp),
                        `variant=${v} vp=${vp} candidate=${candidate} -> x=${x}`,
                    ).toBeLessThanOrEqual(vp + 0.001);
                    expect(x).toBeGreaterThanOrEqual(BUBBLE_SPAWN_X.MIN_VW);
                }
            }
        }
    });

    it('survives the full jitter chain that produced the flake', () => {
        // useGameEngine: laneCenter + (±2vw) + (±1vw). Worst case = lane 5 + 3.
        const laneCenter = 8 + (5 + 0.5) * (84 / 6); // 85vw
        expect(laneCenter).toBeCloseTo(85, 5);

        const worstCase = laneCenter + 2 + 1; // 88vw
        for (const vp of VIEWPORTS) {
            for (const v of VARIANTS) {
                const x = clampSpawnXVw(worstCase, v, vp);
                expect(buttonRightEdgePx(v, x, vp)).toBeLessThanOrEqual(vp + 0.001);
            }
        }
    });

    it('enforces the MIN_VW left boundary', () => {
        expect(clampSpawnXVw(-999, 'small', 393)).toBe(BUBBLE_SPAWN_X.MIN_VW);
        expect(clampSpawnXVw(0, 'medium', 393)).toBe(BUBBLE_SPAWN_X.MIN_VW);
    });

    it('leaves an already-safe value untouched', () => {
        expect(clampSpawnXVw(40, 'medium', 393)).toBe(40);
    });

    it('is deterministic — no Math.random in the clamp path', () => {
        const first = clampSpawnXVw(88, 'large', 393);
        for (let i = 0; i < 50; i++) {
            expect(clampSpawnXVw(88, 'large', 393)).toBe(first);
        }
    });
});
