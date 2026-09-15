import { describe, it, expect } from 'vitest';
import { ARCADE_CONFIGS, BUBBLE_ENGINE_CONFIG, POWER_UP_CONFIG } from '../worldConfig';

describe('Tuning Audit', () => {
    it('verifies current spawn rates (which cause "too slow" feeling)', () => {
        expect(ARCADE_CONFIGS.zen.spawnIntervalMs).toBe(750);
        expect(ARCADE_CONFIGS.blitz.spawnIntervalMs).toBe(500);
        expect(ARCADE_CONFIGS.survival.spawnIntervalMs).toBe(500);
        expect(ARCADE_CONFIGS.classic.spawnIntervalMs).toBe(500);
        expect(ARCADE_CONFIGS.fusion.spawnIntervalMs).toBe(500);
        
        expect(BUBBLE_ENGINE_CONFIG.TARGET_LIFESPAN_MS).toBe(20000);
        expect(BUBBLE_ENGINE_CONFIG.DISTRACTOR_LIFESPAN_MS).toBe(15000);
        expect(BUBBLE_ENGINE_CONFIG.INITIAL_SPAWN_CREDITS).toBe(5);
        expect(BUBBLE_ENGINE_CONFIG.TARGET_DROUGHT_THRESHOLD_MS).toBe(3000);
    });

    it('verifies power-up activation rates (which cause "unimpressive" feeling)', () => {
        expect(POWER_UP_CONFIG.TYPES).toEqual(['lightning_chain', 'double_points', 'rainbow_magnet']);
        expect(POWER_UP_CONFIG.LIGHTNING_CHAIN_POP_COUNT).toBe(5);
        expect(POWER_UP_CONFIG.LIGHTNING_CHAIN_BONUS).toBe(50);
        expect(POWER_UP_CONFIG.DURATIONS.double_points).toBe(8000);
        expect(POWER_UP_CONFIG.DURATIONS.rainbow_magnet).toBe(6000);
    });

    it('verifies boss bubble behavior (which causes "not engaging enough" feeling)', () => {
        expect(BUBBLE_ENGINE_CONFIG.BOSS_VELOCITY_MULTIPLIER).toBe(0.5);
        expect(BUBBLE_ENGINE_CONFIG.BOSS_MAX_ON_SCREEN_FLOOR).toBe(7);
        expect(BUBBLE_ENGINE_CONFIG.BOSS_SPAWN_INTERVAL_FACTOR).toBe(0.7);
    });
});
