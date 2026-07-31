import React, { useEffect, useMemo, useState } from 'react';
import { BubbleGameContainer } from '../games/BubbleGameContainer';
import { MathBehaviorStrategy } from '../../engines/bubble/strategies/MathStrategy';
import type { GameConfig, ArcadeMode } from '../../engines/bubble/types';
import type { SensoryProblem } from '../../lib/gameLogic';
import { getArcadeModeConfig } from '../../lib/arcadeModes';
import { useSound } from '../../hooks/useSound';
import { GameMenuModal } from '../GameMenuModal';
import { SettingsModal } from '../SettingsModal';
import { Director } from '../../engines/GameDirector';
import type { UserCapabilityProfile } from '../../types/progress';

interface BubbleGameProps {
    problem: SensoryProblem;
    onComplete: (success: boolean, correct: number, attempts: number) => void;
    onExit: () => void;
    title?: string;
    instruction?: string;
    profile?: UserCapabilityProfile;
    arcadeMode?: ArcadeMode;
}

export const BubbleGame: React.FC<BubbleGameProps> = ({ problem, onComplete, onExit, title, profile, arcadeMode }) => {
    const { isMuted, toggleMute } = useSound();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [gameId, setGameId] = useState(0);

    // 1. Configure the Game Rule
    const baseConfig: GameConfig = {
        modeName: arcadeMode ? `${arcadeMode.charAt(0).toUpperCase() + arcadeMode.slice(1)} Mode` : "Blast Off",
        spawnIntervalMs: 1200, // Balanced spawn rate
        maxOnScreen: typeof window !== 'undefined' && window.innerWidth < 400 ? 5 : typeof window !== 'undefined' && window.innerWidth < 600 ? 6 : 8,
        distractorRatio: 2, // ~33% Targets
        baseVelocity: 0.5,
        winCondition: {
            type: 'target_count',
            value: problem.items.filter(i => i.value === problem.target).length || 10
        },
        failCondition: {
            type: 'strikes',
            value: 3
        },
        difficultyScale: 'linear',
        levelMultiplier: 1.0,
        theme: 'space',
        vfxEnabled: true
    };

    // Apply arcade mode overrides if specified
    const config = useMemo(() => {
        let cfg = baseConfig;
        if (arcadeMode) {
            const modeOverrides = getArcadeModeConfig(arcadeMode);
            cfg = { ...cfg, ...modeOverrides };
        }
        if (profile) {
            return Director.tuneConfig(cfg, profile);
        }
        return cfg;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problem, profile, arcadeMode]);

    // 2. Define Behavior — stable instance via useState, update problem in effect
    const [behavior] = useState(() => new MathBehaviorStrategy());
    useEffect(() => {
        behavior.setProblem(problem);
    }, [problem, behavior]);

    // Handlers
    const handlePause = () => setIsMenuOpen(true);

    return (
        <>
            <BubbleGameContainer
                key={gameId}
                config={config}
                behavior={behavior}
                onComplete={onComplete}
                title={title}

                // Settings Bindings
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onPause={handlePause}
            />

            {/* Modals */}
            <GameMenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onRestart={() => {
                    setGameId(prev => prev + 1);
                    setIsMenuOpen(false);
                }}
                onExit={onExit}
                onSettings={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                }}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
};
