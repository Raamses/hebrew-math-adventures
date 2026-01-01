import React, { useState, useEffect } from 'react';
import { PracticeMode } from './PracticeMode';
import { LessonModal } from './lessons/LessonModal';
import { MultiplicationLesson } from '../lessons/lesson1_multiplication';
import { BubbleGame } from './sensory/BubbleGame';
import { SensoryFactory } from '../engines/SensoryFactory';
import type { SensoryProblem } from '../lib/gameLogic';
import { useProgress } from '../context/ProgressContext';
import type { LearningNode } from '../types/learningPath';

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
        // Use node config if available, otherwise mock
        const config = node?.config || {};
        const problem = SensoryFactory.generate(node?.id || 'sensory-demo', config);

        return (
            <BubbleGame
                problem={problem}
                title={node ? t(`saga.${node.id}_title`) : undefined}
                instruction={node ? t('saga.pop_instruction', { number: config.target || 5 }) : undefined}
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
