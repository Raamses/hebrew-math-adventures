import type { UserCapabilityProfile } from './progress';
import type { SessionRecord } from './analytics';

export type MascotId = 'owl' | 'bear' | 'ant' | 'lion';
export type ThemeId = 'default' | 'forest' | 'space' | 'candy';

export type PetSpecies = 'owl' | 'cat' | 'dragon' | 'robot';
export interface PetState {
    species: PetSpecies;
    name: string;
    happiness: number;
    unlockedTricks: string[];
    lastFedDate: string | null;
}

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
        soundGarden?: boolean;
    };
    capabilities?: UserCapabilityProfile;
    streak: number;
    arcadeStats?: {
        [mode: string]: number; // e.g. 'TIME_ATTACK': 12000
    };
    // --- Daily Challenge + Economy fields ---
    coins?: number;
    unlockedBadges?: string[];
    ownedItems?: string[];
    equippedItems?: Record<string, string>; // category → item id
    dailyStamps?: string[]; // dates of completed daily challenges (YYYY-MM-DD)
    lastDailyDate?: string | null;
    sessionHistory?: SessionRecord[]; // capped at 100 entries (FIFO)
    // Phase 3 fields
    pet?: PetState | null;
    gems?: number;
}

export const XP_PER_LEVEL = 100; // Deprecated, kept for safe removal reference only
