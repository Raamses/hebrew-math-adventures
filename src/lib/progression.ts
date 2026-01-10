import { CURRICULUM } from '../data/learningPath';
import type { SagaProgress } from '../types/learningPath';

/**
 * Determines the recommended starting unit ID based on the child's age.
 * Mapped to Common Core / International standards.
 */
export const getRecommendedStartingUnit = (age: number): string => {
    if (age < 5) return 'unit_1'; // Pre-K: Counting, Simple Sums
    if (age <= 6) return 'unit_2'; // K-1: Sums to 20, Subtraction
    if (age <= 8) return 'unit_3'; // 2nd-3rd: Multiplication, Tens
    return 'unit_4'; // 9+: Division, Larger Ops
};

/**
 * Generates the initial progress state for a new user based on their age.
 * "Unlocks" previous units so they can play them if they want, but focuses
 * them on the age-appropriate unit.
 */
export const getInitialProgress = (age: number): SagaProgress => {
    const progress: SagaProgress = {};
    const startingUnitId = getRecommendedStartingUnit(age);

    // Find the index of the starting unit
    const startingUnitIndex = CURRICULUM.findIndex(u => u.id === startingUnitId);

    // Safety check: if unit not found, default to 0
    const targetIndex = startingUnitIndex === -1 ? 0 : startingUnitIndex;

    // Unlock all units up to and including the target unit
    // We do this by unlocking the FIRST node of each unit
    for (let i = 0; i <= targetIndex; i++) {
        const unit = CURRICULUM[i];
        if (unit.nodes.length > 0) {
            const firstNodeId = unit.nodes[0].id;

            // Mark as unlocked
            progress[firstNodeId] = {
                stars: 0,
                isLocked: false,
                mistakes: 0
            };
        }
    }

    return progress;
};
