import React, { useState, useEffect } from 'react';
import { PracticeMode } from './PracticeMode';
import { LessonModal } from './lessons/LessonModal';
import { MultiplicationLesson } from '../lessons/lesson1_multiplication';
import { BubbleGame } from './sensory/BubbleGame';
import type { SensoryProblem } from '../lib/gameLogic';

interface GameOrchestratorProps {
    targetLevel: number;
    onExit: () => void;
}

type GameMode = 'LESSON' | 'PRACTICE' | 'SENSORY';

export const GameOrchestrator: React.FC<GameOrchestratorProps> = ({ targetLevel, onExit }) => {
    const [mode, setMode] = useState<GameMode>('PRACTICE');
    const [isLessonOpen, setIsLessonOpen] = useState(false);

    // Orchestration Logic
    useEffect(() => {
        // Simple check: If targetLevel is -1 (Convention for Sensory), trigger sensory
        if (targetLevel === -1) {
            setMode('SENSORY');
        } else if (targetLevel === 5) {
            setMode('LESSON');
            setIsLessonOpen(true);
        } else {
            setMode('PRACTICE');
        }
    }, [targetLevel]);

    const handleLessonComplete = () => {
        setIsLessonOpen(false);
        setMode('PRACTICE');
        // Ideally save "lesson completed" to profile here
    };

    if (mode === 'SENSORY') {
        // Mock problem for now until we have a real generator
        const mockSensoryProblem: SensoryProblem = {
            type: 'sensory',
            id: 'sensory-1',
            answer: 5,
            target: 5,
            items: Array.from({ length: 20 }, (_, i) => ({
                id: `bubble-${i}`,
                value: i < 8 ? 5 : Math.floor(Math.random() * 10)
            })).sort(() => Math.random() - 0.5)
        };

        return (
            <BubbleGame
                problem={mockSensoryProblem}
                onComplete={(success) => {
                    console.log('Bubble Game Complete:', success);
                    onExit();
                }}
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
        />
    );
};
