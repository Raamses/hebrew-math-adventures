import type { UserCapabilityProfile } from './progress';

export type MascotId = 'owl' | 'bear' | 'ant' | 'lion';
export type ThemeId = 'default' | 'forest' | 'space' | 'candy';

export interface UserProfile {
    id: string;
    name: string;
    age: number;
    avatarId: string;
    mascotId: MascotId;
    themeId: ThemeId;
    isParent?: boolean;
    createdAt: number;
    lastPlayedAt: number;
    settings: {
        musicVolume: number;
        sfxVolume: number;
        isMuted: boolean;
    };
    capabilities?: UserCapabilityProfile;
    streak: number;
    arcadeStats?: {
        [mode: string]: number; // e.g. 'TIME_ATTACK': 12000
    };
}

export const XP_PER_LEVEL = 100; // Deprecated, kept for safe removal reference only
