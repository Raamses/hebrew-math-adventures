export interface UserProfile {
    name: string;
    age: number;
    currentLevel: number;
    xp: number;
    streak: number;
}

export const getInitialLevel = (age: number): number => {
    if (age <= 6) return 1;
    if (age === 7) return 2;
    if (age === 8) return 3;
    if (age === 9) return 4;
    if (age === 10) return 5;
    return 6; // Age 11+
};

export const XP_PER_LEVEL = 100;
