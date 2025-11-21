import type { Problem } from '../lib/gameLogic';

import { QuestionGenerator } from './QuestionGenerator';

export const generateProblemForLevel = (level: number): Problem => {
    return QuestionGenerator.getInstance().generate(level);
};

export const calculateRewards = (level: number, isCorrect: boolean, streak: number): number => {
    if (!isCorrect) {
        // Penalty: -2 base, plus level penalty (higher level = higher risk)
        return -(2 + level);
    }

    const baseXP = 5; // Reduced from 10
    const levelBonus = level * 2;
    const streakBonus = streak * 2; // Reduced from 5 (User requested "make it less rewarding")

    let milestoneBonus = 0;
    if (streak > 0 && streak % 5 === 0) {
        milestoneBonus = 20;
    }

    return baseXP + levelBonus + streakBonus + milestoneBonus;
};
