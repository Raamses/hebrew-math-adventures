import React, { useState, useEffect, useRef } from 'react';
import { PracticeMode } from './PracticeMode';
import { LessonModal } from './lessons/LessonModal';
import { getLessonForNode } from '../lessons';
import { BubbleGame } from './sensory/BubbleGame';
import { SensoryFactory } from '../engines/SensoryFactory';
import type { SensoryProblem, ArithmeticProblem } from '../lib/gameLogic';
import { useProgress } from '../context/ProgressContext';
import type { LearningNode } from '../types/learningPath';
import { MathModule } from '../engines/MathModule';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import { useProfile } from '../context/ProfileContext';
import { useQuest } from '../context/QuestContext';
import { computeStarsByTier } from '../lib/stars';
import { MemoryDuelGame } from './games/MemoryDuelGame';
import { MathInvadersGame } from './games/MathInvadersGame';
import type { ArcadeMode } from '../engines/bubble/types';

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

export const GameOrchestrator: React.FC<GameOrchestratorProps> = ({ targetLevel, onExit, node, arcadeMode, dailyChallengeMode, dailyChallengeTarget }) => {
    const { t } = useTranslation();
    const { logEvent } = useAnalytics();
    const { profile } = useProfile();
    const { todayChallenge, addDailyChallengeCorrect, completeDailyChallenge, dailyChallengeCorrect } = useQuest();

    // --- Daily Challenge tracking for arcade (SENSORY) modes ---
    // Mirrors the logic in PracticeMode: accumulate correct answers and check completion.
    const dailyChallengeClaimedRef = useRef(false);
    const dailyChallengeCorrectRef = useRef(dailyChallengeCorrect);
    useEffect(() => {
        dailyChallengeCorrectRef.current = dailyChallengeCorrect;
    }, [dailyChallengeCorrect]);

    const checkArcadeDailyChallenge = (correct: number) => {
        if (dailyChallengeClaimedRef.current) return;
        if (correct <= 0) return;

        // Determine the effective challenge mode and target.
        // dailyChallengeMode is set when the user explicitly launched the challenge.
        // If not set (free play), still check if the arcade mode matches today's challenge.
        const effectiveDailyMode = dailyChallengeMode || todayChallenge.mode;
        const effectiveDailyTarget = dailyChallengeTarget || todayChallenge.target;

        // Match: arcadeMode must match the daily challenge mode (zen→zen, classic→classic, etc.)
        const currentArcadeMode = (arcadeMode || '').toLowerCase();
        const challengeMode = effectiveDailyMode.toLowerCase();
        if (currentArcadeMode !== challengeMode) return;

        // Accumulate correct answers into the daily total
        addDailyChallengeCorrect(correct);

        // Check if accumulated total meets the target.
        // Compute expected accumulated value from the current ref + this batch.
        const accumulated = dailyChallengeCorrectRef.current + correct;
        if (accumulated < effectiveDailyTarget) return;

        const result = completeDailyChallenge();
        if (result) {
            dailyChallengeClaimedRef.current = true;
            console.log(`[DC DEBUG] Arcade daily challenge complete! +${result.total} coins, streak: ${result.newStreak}`);
        }
    };

    // Compute stars based on session accuracy (Pass/Good/Perfect tier).
    // Delegates to the shared star-tier helper so every mode uses one source of truth.
    const computeStars = (correct: number, attempts: number): number => computeStarsByTier(correct, attempts);

    const [internalMode, setInternalMode] = useState<GameMode | null>(null);

    // Determine effective mode
    // arcadeMode: 'zen' | 'classic' | 'blitz' | 'survival' → route to SENSORY (bubble game)
    const effectiveMode: GameMode = internalMode || (arcadeMode ? 'SENSORY' : node?.type === 'SENSORY' ? 'SENSORY' : node?.type === 'LESSON' ? 'LESSON' : 'PRACTICE');

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

    // Open lesson modal when effective mode is LESSON (node-driven, not internal mode override)
    useEffect(() => {
        if (effectiveMode === 'LESSON' && internalMode === null) {
            setIsLessonOpen(true);
        }
    }, [effectiveMode, internalMode]);

    const handleLessonComplete = (performance: { correct: number; attempts: number }) => {
        setIsLessonOpen(false);
        if (node) {
            // Award stars dynamically by the lesson's Pass/Good/Perfect tier
            // instead of hardcoding a full 3-star completion.
            const stars = computeStars(performance.correct, performance.attempts);
            completeNode(node.id, stars);
            logEvent('node_complete', {
                node_id: node.id,
                success: true,
                stars_earned: stars,
                node_type: 'LESSON',
                correct: performance.correct,
                attempts: performance.attempts,
            });
            onExit();
        } else {
            setInternalMode('PRACTICE');
        }
    };

    if (effectiveMode === 'SENSORY') {
        const config = node?.config || {};
        let problem: SensoryProblem;
        let equation: string | undefined;

        if (arcadeMode && !node) {
            // Arcade mode (no node) — generate a math problem for the bubble game
            const mathModule = new MathModule();
            const realCapabilities = profile?.capabilities || INITIAL_CAPABILITY_PROFILE;
            const adaptedProfile = { ...realCapabilities, estimatedLevel: Math.min(targetLevel || 1, 10) };
            const mathProblem = mathModule.generateProblem(adaptedProfile, {
                difficulty: Math.min(targetLevel || 1, 10),
            });
            if (mathProblem.type === 'arithmetic') {
                const ap = mathProblem as ArithmeticProblem;
                equation = `${ap.num1} ${ap.operator} ${ap.num2} = ?`;
                if (ap.missing === 'num1') equation = `? ${ap.operator} ${ap.num2} = ${ap.answer}`;
                if (ap.missing === 'num2') equation = `${ap.num1} ${ap.operator} ? = ${ap.answer}`;
            } else {
                equation = `${mathProblem.answer}`;
            }
            problem = SensoryFactory.generateFromProblem(mathProblem);
        } else if (config.isMathSensory) {
            // Math Bubble Blast Logic (from saga node)
            const mathModule = new MathModule();
            const realCapabilities = profile?.capabilities || INITIAL_CAPABILITY_PROFILE;
            const adaptedProfile = { ...realCapabilities, estimatedLevel: targetLevel };
            const mathProblem = mathModule.generateProblem(adaptedProfile, {
                difficulty: targetLevel,
                ...config
            });
            if (mathProblem.type === 'arithmetic') {
                const ap = mathProblem as ArithmeticProblem;
                equation = `${ap.num1} ${ap.operator} ${ap.num2} = ?`;
                if (ap.missing === 'num1') equation = `? ${ap.operator} ${ap.num2} = ${ap.answer}`;
                if (ap.missing === 'num2') equation = `${ap.num1} ${ap.operator} ? = ${ap.answer}`;
            } else {
                equation = `${mathProblem.answer}`;
            }
            problem = SensoryFactory.generateFromProblem(mathProblem);
        } else {
            problem = SensoryFactory.generate(node?.id || 'sensory-demo', config);
        }

        const arcadeTitle = arcadeMode
            ? `${arcadeMode.charAt(0).toUpperCase() + arcadeMode.slice(1)} Mode`
            : undefined;

        return (
            <BubbleGame
                problem={problem}
                title={node ? t(`saga.${node.id}_title`) : arcadeTitle}
                instruction={equation || (node ? t('saga.pop_instruction', { number: config.target || 5 }) : undefined)}
                arcadeMode={arcadeMode as ArcadeMode | undefined}
                profile={profile?.capabilities || undefined}
                onComplete={(success, correct, attempts) => {
                    // Track daily challenge progress for arcade modes
                    if (arcadeMode && !node) {
                        checkArcadeDailyChallenge(correct || 0);
                    }
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
        // Each LESSON node opens its own micro-lesson (addition/subtraction/
        // multiplication/division). Unregistered nodes fall back to the default
        // lesson rather than rendering nothing. The `key` forces a fresh
        // LessonEngine when the child moves between lesson nodes.
        const lesson = getLessonForNode(node?.id);

        return (
            <LessonModal
                key={lesson.id}
                isOpen={isLessonOpen}
                lesson={lesson}
                nodeId={node?.id}
                onClose={onExit}
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