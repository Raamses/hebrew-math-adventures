import React, { useMemo, useState } from 'react';
import { BubbleGameContainer } from '../games/BubbleGameContainer';
import { MathBehaviorStrategy } from '../../engines/bubble/strategies/MathStrategy';
import type { GameConfig } from '../../engines/bubble/types';
import type { SensoryProblem } from '../../lib/gameLogic';
import { useSound } from '../../hooks/useSound';
import { GameMenuModal } from '../GameMenuModal';
import { SettingsModal } from '../SettingsModal';

interface BubbleGameProps {
    problem: SensoryProblem;
    onComplete: (success: boolean) => void;
    onExit: () => void;
    title?: string;
    instruction?: string;
}

export const BubbleGame: React.FC<BubbleGameProps> = ({ problem, onComplete, onExit, title }) => {
    const { isMuted, toggleMute } = useSound();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // 1. Configure the Game Rule
    const config: GameConfig = useMemo(() => ({
        modeName: "Blast Off",
        spawnIntervalMs: 800, // Faster spawn (was 1500)
        maxOnScreen: 12,      // More bubbles (was 10)
        distractorRatio: 3, // ~40% Targets (was 4 aka 20%)
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
    }), [problem]);

    // 2. Define Behavior
    const behavior = useMemo(() => {
        const strategy = new MathBehaviorStrategy();
        strategy.setProblem(problem);
        return strategy;
    }, [problem]);

    // Handlers
    const handlePause = () => setIsMenuOpen(true);

    return (
        <>
            <BubbleGameContainer
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
                    // TODO: How to restart engine? Key change might be easiest for now
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
