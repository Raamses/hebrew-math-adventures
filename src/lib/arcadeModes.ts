import type { ArcadeMode, GameConfig } from '../engines/bubble/types';

// Extended arcade mode type that includes 'memory' and 'invaders'
export type ExtendedArcadeMode = ArcadeMode | 'memory' | 'invaders';

/**
 * Returns partial GameConfig overrides for the given arcade mode.
 * These are merged into the base config by BubbleGameContainer.
 */
export function getArcadeModeConfig(mode: ArcadeMode): Partial<GameConfig> {
    switch (mode) {
        case 'zen':
            // No timer, no strikes — endless relaxing play
            return {
                winCondition: { type: 'endless', value: 0 },
                failCondition: { type: 'strikes', value: 0 },
                spawnIntervalMs: 2000,
                distractorRatio: 0.8,
            };

        case 'blitz':
            // 60-second timer, pop as many correct as possible, no fail
            return {
                winCondition: { type: 'time_limit', value: 60 },
                failCondition: { type: 'strikes', value: 0 },
                spawnIntervalMs: 1200,
                distractorRatio: 1.2,
            };

        case 'survival':
            // 3 strikes, endless, difficulty ramps faster
            return {
                winCondition: { type: 'endless', value: 0 },
                failCondition: { type: 'strikes', value: 3 },
                spawnIntervalMs: 800,
                levelMultiplier: 1.5,
                distractorRatio: 1.5,
            };

        case 'classic':
        default:
            // Current behavior — 10 targets to win, 3 strikes to fail
            return {
                winCondition: { type: 'target_count', value: 20 },
                failCondition: { type: 'strikes', value: 3 },
                spawnIntervalMs: 800,
                levelMultiplier: 1.0,
                distractorRatio: 1.5,
            };
    }
}

/** Human-readable label for each mode */
export const ARCADE_MODE_LABELS: Record<string, { emoji: string; name: string; desc: string }> = {
    zen:      { emoji: '🧘', name: 'Zen',      desc: 'Pop at your own pace — no timer, no fails' },
    classic:  { emoji: '🎯', name: 'Classic',  desc: 'Hit 10 targets — but watch your strikes!' },
    blitz:    { emoji: '⚡', name: 'Blitz',    desc: '60 seconds — pop as many as you can!' },
    survival: { emoji: '🔥', name: 'Survival', desc: 'Endless mode — 3 strikes and you\'re out' },
    memory:   { emoji: '🎴', name: 'Memory Duel', desc: 'Match equations with their answers!' },
    invaders: { emoji: '🚀', name: 'Math Invaders', desc: 'Defend your ship from math aliens!' },
};