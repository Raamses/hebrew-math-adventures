import type { UserCapabilityProfile } from './progress';

export type MascotId = 'owl' | 'bear' | 'ant' | 'lion';

export interface UserProfile {
    id: string;
    name: string;
    age: number;
    avatar: string;
    mascot: MascotId;
    currentLevel: number;
    xp: number;
    streak: number;
    totalScore: number;
    capabilities?: UserCapabilityProfile;
}

export const getInitialLevel = (age: number): number => {
    if (age <= 6) return 1;
    if (age === 7) return 2;
    if (age === 8) return 3;
    if (age === 9) return 4;
    if (age === 10) return 5;
    return 6; // Age 11+
};

export const calculateLevelXP = (level: number): number => {
    // Base 100 XP, increasing by 50% each level
    return Math.floor(100 * Math.pow(1.5, level - 1));
};

export const getXPForNextLevel = (currentLevel: number): number => {
    return calculateLevelXP(currentLevel);
};

// Deprecated: kept for temporary compatibility if needed, but should be replaced
export const XP_PER_LEVEL = 100;
