import React, { useState, useEffect } from 'react';
import { PracticeMode } from './PracticeMode';
import { LessonModal } from './lessons/LessonModal';
import { MultiplicationLesson } from '../lessons/lesson1_multiplication';
import { BubbleGame } from './sensory/BubbleGame';
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

    // Orchestration Logic
    useEffect(() => {
        // Priority: Node Config -> Legacy Level Logic
        if (node) {
            if (node.type === 'SENSORY') {
                setMode('SENSORY');
            } else if (node.type === 'LESSON') {
                // Future lesson handling
                // For now, if no specific ID match, fallback (or implement generic lesson)
                // Previously hardcoded 'node_1_2', now removed.
                setMode('PRACTICE');
            } else {
                setMode('PRACTICE');
            }
            return;
        }

        // Legacy Fallback
        if (targetLevel === -1) {
            setMode('SENSORY');
        } else if (targetLevel === 5) {
            setMode('LESSON');
            setIsLessonOpen(true);
        } else {
            setMode('PRACTICE');
        }
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

        const mockSensoryProblem: SensoryProblem = {
            type: 'sensory',
            id: node?.id || 'sensory-1',
            answer: config.target || 5,
            target: config.target || 5,
            items: Array.from({ length: config.itemCount || 20 }, (_, i) => ({
                id: `bubble-${i}`,
                value: i < 8 ? (config.target || 5) : Math.floor(Math.random() * 10)
            })).sort(() => Math.random() - 0.5)
        };

        return (
            <BubbleGame
                problem={mockSensoryProblem}
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
