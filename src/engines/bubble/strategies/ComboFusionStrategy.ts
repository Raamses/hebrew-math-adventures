import { MathBehaviorStrategy } from './MathStrategy';
import type { GameConfig, BubbleEntity } from '../types';
import { FUSION_CONFIG } from '../../../lib/worldConfig';

/**
 * ComboFusionStrategy — extends MathBehaviorStrategy to add the Combo Fusion
 * arcade mechanic. Reuses all math generation, distractor bags, anti-repeat,
 * and boss-gate logic from the parent, and only overrides `generateNext()` to
 * inject fusion properties onto target bubbles once the fusion streak reaches
 * MIN_FUSION_STREAK (3).
 *
 * The fusion streak is tracked SEPARATELY from the normal combo counter. The
 * engine calls `setFusionStreak()` on each correct/wrong answer. When a fusion
 * bubble is popped, the engine resets the fusion streak to 0 (the normal combo
 * continues).
 */
export class ComboFusionStrategy extends MathBehaviorStrategy {
    /** Current fusion streak, set by the engine via setFusionStreak() */
    private fusionStreak: number = 0;

    /** Set by engine on each correct/wrong answer */
    setFusionStreak(streak: number): void {
        this.fusionStreak = streak;
    }

    /** Get the multiplier for the current fusion streak */
    getFusionMultiplier(streak: number = this.fusionStreak): number {
        if (streak >= 10) return 5;
        if (streak >= 7) return 3;
        if (streak >= 5) return 2;
        if (streak >= 3) return 1.5;
        return 1; // No fusion at streak < 3
    }

    /** Get the tier index for visual styling */
    getFusionTier(streak: number = this.fusionStreak): 0 | 1 | 2 | 3 | 4 {
        if (streak >= 10) return 4;
        if (streak >= 7) return 3;
        if (streak >= 5) return 2;
        if (streak >= 3) return 1;
        return 0;
    }

    /** Check if a fusion bubble should spawn on the next target */
    shouldSpawnFusion(): boolean {
        return this.fusionStreak >= FUSION_CONFIG.MIN_FUSION_STREAK;
    }

    /**
     * Override generateNext to inject fusion properties on target bubbles.
     * Called by the engine's spawn loop. When fusionStreak >= 3, target
     * bubbles get isFusion=true with the appropriate multiplier.
     * Distractors, power-ups, and boss bubbles are never fusion bubbles.
     */
    generateNext(config: GameConfig, opts?: { forceTarget?: boolean }): Partial<BubbleEntity> {
        const base = super.generateNext(config, opts);

        // Only target bubbles can be fusion bubbles
        const isTarget = opts?.forceTarget || base.internalValue === this.getTargetValue();
        if (!isTarget) return base;

        // Don't fusion if already a power-up or boss
        if (base.isPowerUp || base.isBoss) return base;

        const multiplier = this.getFusionMultiplier();
        if (multiplier <= 1) return base;

        const tier = this.getFusionTier();

        return {
            ...base,
            isFusion: true,
            fusionMultiplier: multiplier,
            fusionTier: tier,
        };
    }
}
