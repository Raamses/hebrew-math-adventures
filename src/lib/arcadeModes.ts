import type { GameConfig } from '../engines/bubble/types';
import type { ArcadeMode } from '../types/game';
import { ARCADE_CONFIGS, ARCADE_MODE_LABELS } from './worldConfig';

// Re-export ARCADE_MODE_LABELS for backward compatibility (previously defined locally)
export { ARCADE_MODE_LABELS };

// Extended arcade mode type that includes 'memory' and 'invaders'
export type ExtendedArcadeMode = ArcadeMode | 'memory' | 'invaders';

/**
 * Returns partial GameConfig overrides for the given arcade mode.
 * These are merged into the base config by BubbleGameContainer.
 */
export function getArcadeModeConfig(mode: ArcadeMode): Partial<GameConfig> {
    const config = ARCADE_CONFIGS[mode] ?? ARCADE_CONFIGS.classic;
    return {
        winCondition: config.winCondition,
        failCondition: config.failCondition,
        spawnIntervalMs: config.spawnIntervalMs,
        distractorRatio: config.distractorRatio,
        ...(config.levelMultiplier !== undefined ? { levelMultiplier: config.levelMultiplier } : {}),
    };
}

// ARCADE_MODE_LABELS now defined in worldConfig.ts — re-exported here for backward compat.
// (Import is at the top of this file.)