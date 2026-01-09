import type { UserCapabilityProfile } from './progress';

export type MascotId = 'owl' | 'bear' | 'ant' | 'lion';
export type ThemeId = 'default' | 'ocean' | 'jungle' | 'space';

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
}

export const XP_PER_LEVEL = 100; // Deprecated, kept for safe removal reference only
