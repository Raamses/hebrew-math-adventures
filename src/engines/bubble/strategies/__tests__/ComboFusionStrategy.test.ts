import { describe, it, expect } from 'vitest';
import { ComboFusionStrategy } from '../ComboFusionStrategy';
import { FUSION_CONFIG } from '../../../../lib/worldConfig';
import type { GameConfig } from '../../types';

// Helper: minimal valid GameConfig
const makeConfig = (): GameConfig => ({
    modeName: 'fusion',
    spawnIntervalMs: 800,
    maxOnScreen: 8,
    distractorRatio: 1.5,
    baseVelocity: 0.5,
    winCondition: { type: 'time_limit', value: 120 },
    failCondition: { type: 'strikes', value: 3 },
    difficultyScale: 'linear',
    levelMultiplier: 1.2,
    theme: 'space',
    vfxEnabled: true,
});

describe('ComboFusionStrategy', () => {
    describe('Multiplier tiers', () => {
        it('returns 1× (no fusion) below streak 3', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionMultiplier(0)).toBe(1);
            expect(s.getFusionMultiplier(1)).toBe(1);
            expect(s.getFusionMultiplier(2)).toBe(1);
        });

        it('3-streak = 1.5×', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionMultiplier(3)).toBe(1.5);
        });

        it('5-streak = 2×', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionMultiplier(5)).toBe(2);
        });

        it('7-streak = 3×', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionMultiplier(7)).toBe(3);
        });

        it('10-streak = 5×', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionMultiplier(10)).toBe(5);
        });

        it('streaks above 10 stay at 5×', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionMultiplier(15)).toBe(5);
            expect(s.getFusionMultiplier(20)).toBe(5);
        });
    });

    describe('Fusion tier indices', () => {
        it('maps streak to tier index for visual styling', () => {
            const s = new ComboFusionStrategy();
            expect(s.getFusionTier(0)).toBe(0);
            expect(s.getFusionTier(2)).toBe(0);
            expect(s.getFusionTier(3)).toBe(1);
            expect(s.getFusionTier(5)).toBe(2);
            expect(s.getFusionTier(7)).toBe(3);
            expect(s.getFusionTier(10)).toBe(4);
        });
    });

    describe('shouldSpawnFusion', () => {
        it('returns false below MIN_FUSION_STREAK', () => {
            const s = new ComboFusionStrategy();
            s.setFusionStreak(2);
            expect(s.shouldSpawnFusion()).toBe(false);
        });

        it('returns true at MIN_FUSION_STREAK (3)', () => {
            const s = new ComboFusionStrategy();
            s.setFusionStreak(3);
            expect(s.shouldSpawnFusion()).toBe(true);
        });

        it('MIN_FUSION_STREAK is 3 (from FUSION_CONFIG)', () => {
            expect(FUSION_CONFIG.MIN_FUSION_STREAK).toBe(3);
        });
    });

    describe('generateNext fusion injection', () => {
        it('injects isFusion=true on target bubbles when streak >= 3', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(3);
            s.regenerateProblem(1, config);

            // Force a target spawn
            const bubble = s.generateNext(config, { forceTarget: true });
            expect(bubble.isFusion).toBe(true);
            expect(bubble.fusionMultiplier).toBe(1.5);
            expect(bubble.fusionTier).toBe(1);
        });

        it('does NOT inject fusion below streak 3', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(2);
            s.regenerateProblem(1, config);

            const bubble = s.generateNext(config, { forceTarget: true });
            expect(bubble.isFusion).toBeUndefined();
        });

        it('injects correct multiplier at streak 5 (2×)', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(5);
            s.regenerateProblem(1, config);

            const bubble = s.generateNext(config, { forceTarget: true });
            expect(bubble.isFusion).toBe(true);
            expect(bubble.fusionMultiplier).toBe(2);
            expect(bubble.fusionTier).toBe(2);
        });

        it('injects correct multiplier at streak 7 (3×)', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(7);
            s.regenerateProblem(1, config);

            const bubble = s.generateNext(config, { forceTarget: true });
            expect(bubble.isFusion).toBe(true);
            expect(bubble.fusionMultiplier).toBe(3);
            expect(bubble.fusionTier).toBe(3);
        });

        it('injects correct multiplier at streak 10 (5×)', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(10);
            s.regenerateProblem(1, config);

            const bubble = s.generateNext(config, { forceTarget: true });
            expect(bubble.isFusion).toBe(true);
            expect(bubble.fusionMultiplier).toBe(5);
            expect(bubble.fusionTier).toBe(4);
        });

        it('distractors are never fusion bubbles', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(10);
            s.regenerateProblem(1, config);

            // Generate many bubbles; any that are NOT the target value must not be fusion
            for (let i = 0; i < 200; i++) {
                const bubble = s.generateNext(config);
                const isTarget = bubble.internalValue === s.getTargetValue();
                if (!isTarget) {
                    expect(bubble.isFusion).toBeUndefined();
                }
            }
        });

        it('reuses math generation from parent (produces valid target values)', () => {
            const s = new ComboFusionStrategy();
            const config = makeConfig();
            s.setFusionStreak(3);
            s.regenerateProblem(1, config);

            const bubble = s.generateNext(config, { forceTarget: true });
            expect(bubble.internalValue).toBe(s.getTargetValue());
            expect(bubble.content).toBe(s.getTargetValue());
        });
    });
});
