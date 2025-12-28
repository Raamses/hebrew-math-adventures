import React, { useState, useEffect } from 'react';
import { PracticeMode } from './PracticeMode';
import { LessonModal } from './lessons/LessonModal';
import { MultiplicationLesson } from '../lessons/lesson1_multiplication';

interface GameOrchestratorProps {
    targetLevel: number;
    onExit: () => void;
}

type GameMode = 'LESSON' | 'PRACTICE';

export const GameOrchestrator: React.FC<GameOrchestratorProps> = ({ targetLevel, onExit }) => {
    const [mode, setMode] = useState<GameMode>('PRACTICE');
    const [isLessonOpen, setIsLessonOpen] = useState(false);

    // Orchestration Logic
    useEffect(() => {
        // Rule: If Level 5 (Multiplication start), force Lesson first
        // In a real app, check user.completedLessons history
        if (targetLevel === 5) {
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
