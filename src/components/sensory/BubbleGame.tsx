import React, { useMemo, useState } from 'react';
import { BubbleGameContainer } from '../games/BubbleGameContainer';
import { MathBehaviorStrategy } from '../../engines/bubble/strategies/MathStrategy';
import type { GameConfig } from '../../engines/bubble/types';
import type { SensoryProblem } from '../../lib/gameLogic';
import { useSound } from '../../hooks/useSound';
import { GameMenuModal } from '../GameMenuModal';
import { SettingsModal } from '../SettingsModal';
import { SessionSummary } from '../SessionSummary';
import { Confetti } from '../Confetti';

interface BubbleGameProps {
    problem: SensoryProblem;
    onComplete: (success: boolean) => void;
    onExit: () => void;
    title?: string;
    instruction?: string;
}

interface GameResult {
    readonly success: boolean;
    readonly score: number;
    readonly targetsPopped: number;
}

export const BubbleGame: React.FC<BubbleGameProps> = ({ problem, onComplete, onExit, title }) => {
    const { isMuted, toggleMute } = useSound();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // End-game feedback state
    const [showSummary, setShowSummary] = useState(false);
    const [gameResult, setGameResult] = useState<GameResult | null>(null);
    const [gameKey, setGameKey] = useState(0); // Key-change pattern for engine restart

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

    const handleGameComplete = (success: boolean, score: number, targetsPopped: number) => {
        setGameResult({ success, score, targetsPopped });
        setShowSummary(true);
    };

    const handlePlayAgain = () => {
        setShowSummary(false);
        setGameResult(null);
        setGameKey(k => k + 1); // Force engine remount
    };

    const handleExitWithResult = () => {
        if (gameResult) {
            onComplete(gameResult.success);
        }
        onExit();
    };

    const handleRestart = () => {
        setIsMenuOpen(false);
        setGameKey(k => k + 1); // Force engine remount
    };

    return (
        <>
            {/* Victory Confetti */}
            {showSummary && gameResult?.success && <Confetti />}

            <BubbleGameContainer
                key={gameKey}
                config={config}
                behavior={behavior}
                onComplete={handleGameComplete}
                title={title}

                // Settings Bindings
                isMuted={isMuted}
                onToggleMute={toggleMute}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onPause={handlePause}
            />

            {/* End-Game Feedback */}
            <SessionSummary
                isOpen={showSummary}
                starsGained={gameResult?.success ? 3 : 1}
                correctCount={gameResult?.targetsPopped || 0}
                totalCount={config.winCondition.value}
                totalScore={gameResult?.score || 0}
                onPlayAgain={handlePlayAgain}
                onExit={handleExitWithResult}
            />

            {/* Modals */}
            <GameMenuModal
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onRestart={handleRestart}
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
