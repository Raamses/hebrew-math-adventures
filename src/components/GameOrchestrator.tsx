import React, { useState, useEffect } from 'react';
import { PracticeMode } from './PracticeMode';
import { LessonModal } from './lessons/LessonModal';
import { MultiplicationLesson } from '../lessons/lesson1_multiplication';
import { BubbleGame } from './sensory/BubbleGame';
import { SensoryFactory } from '../engines/SensoryFactory';
import type { SensoryProblem, ArithmeticProblem } from '../lib/gameLogic';
import { useProgress } from '../context/ProgressContext';
import type { LearningNode } from '../types/learningPath';
import { MathModule } from '../engines/MathModule';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import { useProfile } from '../context/ProfileContext';
import { MemoryDuelGame } from './games/MemoryDuelGame';
import { MathInvadersGame } from './games/MathInvadersGame';

interface GameOrchestratorProps {
    targetLevel: number;
    onExit: () => void;
    node?: LearningNode | null;
    arcadeMode?: string;
    dailyChallengeMode?: string;
    dailyChallengeTarget?: number;
}

type GameMode = 'LESSON' | 'PRACTICE' | 'SENSORY' | 'MEMORY' | 'INVADERS';

import { useTranslation } from 'react-i18next';

import { useAnalytics } from '../hooks/useAnalytics';

export const GameOrchestrator: React.FC<GameOrchestratorProps> = ({ targetLevel, onExit, node, arcadeMode: _arcadeMode, dailyChallengeMode, dailyChallengeTarget }) => {
    const { t } = useTranslation();
    const { logEvent } = useAnalytics();
    const { profile } = useProfile();

    // Compute stars based on session accuracy
    const computeStars = (correct: number, attempts: number): number => {
        if (attempts === 0) return 1;
        const mistakes = attempts - correct;
        if (mistakes <= 1) return 3;
        if (mistakes <= 3) return 2;
        return 1;
    };

    // ... (existing state) ...
    const [internalMode, setInternalMode] = useState<GameMode | null>(null);

    // Determine effective mode
    const effectiveMode: GameMode = internalMode || (node?.type === 'SENSORY' ? 'SENSORY' : 'PRACTICE');

    const [isLessonOpen, setIsLessonOpen] = useState(false);
    const { completeNode } = useProgress();

    // Log node start
    useEffect(() => {
        if (node) {
            logEvent('node_start', {
                node_id: node.id,
                node_type: node.type,
                target_level: targetLevel
            });
        }
    }, [node, targetLevel, logEvent]);

    // Reset internal mode when node changes
    useEffect(() => {
        setInternalMode(null);
    }, [node]);

    const handleLessonComplete = () => {
        setIsLessonOpen(false);
        if (node) {
            completeNode(node.id, 3); // Lessons always give 3 stars on completion
            onExit();
        } else {
            setInternalMode('PRACTICE'); // Legacy fallback
        }
    };

    if (effectiveMode === 'SENSORY') {
        const config = node?.config || {};
        let problem: SensoryProblem;

        let equation: string | undefined;

        // Math Bubble Blast Logic
        if (config.isMathSensory) {
            const mathModule = new MathModule();
            // Use node config ID to determine difficulty/type or fall back to generic arithmetic
            // Currently using 'arithmetic' to ensure 2+2 style
            // Note: LESSON currently falls back to Practice until we implement dynamic Lesson content loading

            // Mock profile for generation (or use real one from context if available, but orchestrator uses hooks differently)
            // We can just use the targetLevel passed in props
            // Use real profile capabilities if available, fall back to initial
            const realCapabilities = profile?.capabilities || INITIAL_CAPABILITY_PROFILE;
            const adaptedProfile = { ...realCapabilities, estimatedLevel: targetLevel };

            const mathProblem = mathModule.generateProblem(adaptedProfile, {
                difficulty: targetLevel,
                type: 'addition_simple', // Force simple addition for Blast Off initially
                ...config // Allow node config to override (e.g. max: 20)
            });

            // Format equation string
            // Handle "missing answer" vs "missing operand"
            if (mathProblem.type === 'arithmetic') {
                const ap = mathProblem as ArithmeticProblem;
                equation = `${ap.num1} ${ap.operator} ${ap.num2} = ?`;
                if (ap.missing === 'num1') equation = `? ${ap.operator} ${ap.num2} = ${ap.answer}`;
                if (ap.missing === 'num2') equation = `${ap.num1} ${ap.operator} ? = ${ap.answer}`;
            } else {
                equation = `${mathProblem.answer}`; // Fallback
            }

            // Use the Adapter
            problem = SensoryFactory.generateFromProblem(mathProblem);

        } else {
            problem = SensoryFactory.generate(node?.id || 'sensory-demo', config);
        }

        return (
            <BubbleGame
                problem={problem}
                title={node ? t(`saga.${node.id}_title`) : undefined}
                instruction={equation || (node ? t('saga.pop_instruction', { number: config.target || 5 }) : undefined)}
                onComplete={(success, correct, attempts) => {
                    if (node) {
                        if (success) {
                            const stars = computeStars(correct || 1, attempts || 1);
                            completeNode(node.id, stars);
                        }
                        logEvent('node_complete', {
                            node_id: node.id,
                            success,
                            stars_earned: success ? computeStars(correct || 1, attempts || 1) : 0,
                            node_type: 'SENSORY'
                        });
                    }
                    onExit();
                }}
                onExit={onExit}
            />
        );
    }

    if (effectiveMode === 'LESSON') {
        return (
            <LessonModal
                isOpen={isLessonOpen}
                lesson={MultiplicationLesson}
                onClose={onExit} // If they close the lesson, they exit to map
                onComplete={handleLessonComplete}
            />
        );
    }

    if (effectiveMode === 'MEMORY') {
        return (
            <MemoryDuelGame
                level={targetLevel}
                onExit={onExit}
                onComplete={(stats) => {
                    console.log('Memory Duel Complete:', stats);
                    if (node) {
                        // Star rating: 3 stars if moves ≤ 8, 2 stars if ≤ 12, 1 star otherwise
                        const stars = stats.moves <= 8 ? 3 : stats.moves <= 12 ? 2 : 1;
                        completeNode(node.id, stars);
                        logEvent('node_complete', {
                            node_id: node.id,
                            success: true,
                            stars_earned: stars,
                            node_type: 'MEMORY',
                            time: stats.time,
                            moves: stats.moves,
                        });
                    }
                }}
            />
        );
    }

    if (effectiveMode === 'INVADERS') {
        return (
            <MathInvadersGame
                level={targetLevel}
                onExit={onExit}
                onComplete={(stats) => {
                    if (node) {
                        // Star rating: 3 stars if lives >= 2, 2 stars if lives = 1, 1 star if lives = 0 but won
                        const stars = stats.victory
                            ? (stats.lives >= 2 ? 3 : stats.lives === 1 ? 2 : 1)
                            : 0;
                        if (stats.victory) {
                            completeNode(node.id, stars);
                        }
                        logEvent('node_complete', {
                            node_id: node.id,
                            success: stats.victory,
                            stars_earned: stars,
                            node_type: 'INVADERS',
                            score: stats.score,
                            lives: stats.lives,
                        });
                    }
                }}
            />
        );
    }

    return (
        <PracticeMode
            targetLevel={targetLevel}
            onExit={onExit}
            problemConfig={node?.config}
            dailyChallengeMode={dailyChallengeMode}
            dailyChallengeTarget={dailyChallengeTarget}
            onMemoryMode={() => setInternalMode('MEMORY')}
            onInvadersMode={() => setInternalMode('INVADERS')}
            onComplete={(success, correct, attempts) => {
                if (node) {
                    if (success) {
                        const stars = computeStars(correct || 1, attempts || 1);
                        completeNode(node.id, stars);
                    }
                    logEvent('node_complete', {
                        node_id: node.id,
                        success,
                        stars_earned: success ? computeStars(correct || 1, attempts || 1) : 0,
                        node_type: 'PRACTICE'
                    });
                }
            }}
        />
    );
};