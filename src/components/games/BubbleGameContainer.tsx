import React, { useEffect } from 'react';
import type { GameConfig, IGameBehavior } from '../../engines/bubble/types';
import { useGameEngine } from '../../engines/bubble/useGameEngine';
import { Bubble } from '../sensory/Bubble';
import { SessionProgressBar } from '../SessionProgressBar';
import { Zap } from 'lucide-react';
import { SettingsMenu } from '../SettingsMenu';
import { useSound } from '../../hooks/useSound';

interface BubbleGameContainerProps {
    config: GameConfig;
    behavior: IGameBehavior;
    onComplete: (success: boolean) => void;
    title?: string;
    // Settings Props
    isMuted?: boolean;
    onToggleMute?: () => void;
    onOpenSettings?: () => void;
    onPause?: () => void;
}

export const BubbleGameContainer: React.FC<BubbleGameContainerProps> = ({
    config,
    behavior,
    onComplete,
    title,
    isMuted = false,
    onToggleMute = () => { },
    onOpenSettings = () => { },
    onPause = () => { }
}) => {

    // Initialize Behavior (Level Setup)
    useEffect(() => {
        // Container defaults to level 1 for initialization if behavior relies on it,
        // but typically behavior is pre-configured by wrapper.
        behavior.initializeLevel(1, config);
    }, [behavior, config]);

    // Hook into Engine
    const { entities, gameState, handlePop: enginePop, handleOffScreen } = useGameEngine(config, behavior);
    const { playSound } = useSound();

    const onPopWrapper = (id: string) => {
        const isCorrect = enginePop(id);
        if (isCorrect) {
            playSound('correct');
        } else if (isCorrect === false) { // distinct from undefined
            playSound('wrong');
        }
    };

    // Monitor Game Over / Victory
    useEffect(() => {
        if (gameState.isVictory) {
            playSound('levelUp');
            setTimeout(() => onComplete(true), 1500);
        } else if (gameState.isGameOver) {
            // Handle Loss - Retry?
            // For now just exit false
            playSound('wrong');
            setTimeout(() => onComplete(false), 1500);
        }
    }, [gameState.isVictory, gameState.isGameOver, onComplete, playSound]);

    const instruction = behavior.getInstruction ? behavior.getInstruction() : undefined;

    return (
        <div className="w-full min-h-screen bg-blue-50 flex flex-col items-center relative overflow-hidden">
            {/* Header Area */}
            <div className="w-full max-w-md flex flex-col items-center gap-2 z-20 p-4 pb-0">
                <div className="w-full flex items-center justify-between relative h-12">
                    {/* Stats */}
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-blue-100 z-10">
                        <Zap size={16} className="text-orange-500 fill-orange-500" />
                        <span className="font-bold text-slate-700 text-sm">{gameState.combo}</span>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <h1 className="text-2xl font-bold text-blue-600 whitespace-nowrap drop-shadow-sm">
                            {title || 'Blast Off'}
                        </h1>
                        {instruction && (
                            <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-2xl shadow-sm border border-blue-100 mt-1">
                                <span className="text-xl sm:text-2xl font-bold text-blue-600 tracking-wider font-mono">
                                    {instruction}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="z-20">
                        <SettingsMenu
                            isMuted={isMuted}
                            onToggleMute={onToggleMute}
                            onOpenSettings={onOpenSettings}
                            onPause={onPause}
                        />
                    </div>
                </div>

                {/* Progress Bar */}
                <SessionProgressBar
                    current={config.winCondition.type === 'target_count' ? gameState.targetsPopped : 0}
                    total={config.winCondition.value}
                />
            </div>

            {/* Game Area & Entities */}
            <div className="flex-grow w-full relative z-0 mt-4 overflow-hidden"
                style={{ perspective: '1000px' }}>
                {entities.map(e => (
                    <Bubble
                        key={e.id}
                        id={e.id}
                        value={e.content as number} // Cast for now, Bubble expects number
                        x={e.x} // Note: Bubble component uses 'left: xvw', engine uses 0-100 scale
                        delay={0} // Managed by engine/CSS
                        onClick={(id) => onPopWrapper(id)}
                        onOffScreen={(id) => handleOffScreen(id)}
                        isPopped={e.isPopped}
                        variant={e.variant}
                    />
                ))}
            </div>

            {/* TODO: Add Explosion Layer here if we want visuals */}
        </div>
    );
};
