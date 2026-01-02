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

interface GameOrchestratorProps {
    targetLevel: number;
    onExit: () => void;
    node?: LearningNode | null;
}

type GameMode = 'LESSON' | 'PRACTICE' | 'SENSORY';

import { useTranslation } from 'react-i18next';

export const GameOrchestrator: React.FC<GameOrchestratorProps> = ({ targetLevel, onExit, node }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<GameMode>('PRACTICE');
    const [isLessonOpen, setIsLessonOpen] = useState(false);
    const { completeNode } = useProgress();

    useEffect(() => {
        // Priority: Node Config
        if (node) {
            // SENSORY nodes use BubbleGame
            // LESSON/PRACTICE/CHALLENGE use PracticeMode (GameDirector handles difficulty)
            // Note: LESSON currently falls back to Practice until we implement dynamic Lesson content loading
            setMode(node.type === 'SENSORY' ? 'SENSORY' : 'PRACTICE');
            return;
        }

        // Legacy Fallback (Default to Practice)
        setMode('PRACTICE');
    }, [targetLevel, node]);

    const handleLessonComplete = () => {
        setIsLessonOpen(false);
        if (node) {
            completeNode(node.id, 3);
            onExit();
        } else {
            setMode('PRACTICE'); // Legacy fallback
        }
    };

    if (mode === 'SENSORY') {
        const config = node?.config || {};
        let problem: SensoryProblem;

        let equation: string | undefined;

        // Math Bubble Blast Logic
        if (config.isMathSensory) {
            const mathModule = new MathModule();
            // Use node config ID to determine difficulty/type or fall back to generic arithmetic
            // Currently using 'arithmetic' to ensure 2+2 style

            // Mock profile for generation (or use real one from context if available, but orchestrator uses hooks differently)
            // We can just use the targetLevel passed in props
            const dummyProfile = { ...INITIAL_CAPABILITY_PROFILE, estimatedLevel: targetLevel };

            const mathProblem = mathModule.generateProblem(dummyProfile, {
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
                onComplete={(success) => {
                    console.log('Bubble Game Complete:', success);
                    if (success && node) {
                        completeNode(node.id, 3);
                    }
                    onExit();
                }}
                onExit={onExit}
            />
        );
    }

    if (mode === 'LESSON') {
        return (
            <LessonModal
                isOpen={isLessonOpen}
                lesson={MultiplicationLesson}
                onClose={onExit} // If they close the lesson, they exit to map
                onComplete={handleLessonComplete}
            />
        );
    }

    return (
        <PracticeMode
            targetLevel={targetLevel}
            onExit={onExit}
            problemConfig={node?.config}
            onComplete={(success) => {
                if (success && node) {
                    completeNode(node.id, 3);
                }
            }}
        />
    );
};
