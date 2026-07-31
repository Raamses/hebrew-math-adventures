import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { type UserProfile } from '../types/user';
import type { SessionRecord } from '../types/analytics';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import { useAnalytics } from '../hooks/useAnalytics';
import { isValidProfileName } from '../lib/validation';

interface ProfileContextType {
    profile: UserProfile | null;
    allProfiles: UserProfile[];
    createProfile: (name: string, age: number, avatarId: string, mascotId: 'owl' | 'bear' | 'ant' | 'lion') => Promise<void>;
    switchProfile: (profileId: string) => void;
    deleteProfile: (profileId: string) => void;
    logout: () => void;
    resetStreak: () => void;
    incrementStreak: () => void;
    updateMascot: (mascotId: 'owl' | 'bear' | 'ant' | 'lion') => void;
    updateProfile: (id: string, updates: Partial<UserProfile>) => void;
    updateArcadeBestScore: (mode: string, score: number) => void;
    addCoins: (amount: number) => void;
    spendCoins: (amount: number) => boolean;
    unlockBadge: (badgeId: string) => void;
    buyItem: (itemId: string, price: number) => boolean;
    equipItem: (category: string, itemId: string) => void;
    toggleSoundGarden: () => void;
    recordSession: (record: SessionRecord) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILES_STORAGE_KEY = 'hebrew-math-profiles';

const VALID_MASCOT_IDS: UserProfile['mascotId'][] = ['owl', 'bear', 'ant', 'lion'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

// Only known, mutable UserProfile fields pass through; everything else (including
// id/createdAt/lastPlayedAt and any unrecognized keys) is stripped.
const validateProfileUpdate = (updates: Partial<UserProfile>): Partial<UserProfile> => {
    const sanitized: Partial<UserProfile> = {};

    if (updates.name !== undefined) {
        const sanitizedName = updates.name.trim();
        if (isValidProfileName(sanitizedName)) {
            sanitized.name = sanitizedName;
        } else {
            console.warn('Attempted to update profile with invalid name, skipping name update');
        }
    }

    if (updates.avatarId !== undefined) {
        if (typeof updates.avatarId === 'string') {
            sanitized.avatarId = updates.avatarId;
        } else {
            console.warn('Attempted to update profile with invalid avatarId, skipping update');
        }
    }

    if (updates.themeId !== undefined) {
        if (typeof updates.themeId === 'string') {
            sanitized.themeId = updates.themeId;
        } else {
            console.warn('Attempted to update profile with invalid themeId, skipping update');
        }
    }

    if (updates.mascotId !== undefined) {
        if (VALID_MASCOT_IDS.includes(updates.mascotId)) {
            sanitized.mascotId = updates.mascotId;
        } else {
            console.warn('Attempted to update profile with invalid mascotId, skipping update');
        }
    }

    if (updates.arcadeStats !== undefined) {
        if (isPlainObject(updates.arcadeStats) && Object.values(updates.arcadeStats).every(v => typeof v === 'number')) {
            sanitized.arcadeStats = updates.arcadeStats;
        } else {
            console.warn('Attempted to update profile with invalid arcadeStats, skipping update');
        }
    }

    if (updates.settings !== undefined) {
        const s = updates.settings;
        if (
            isPlainObject(s) &&
            typeof s.musicVolume === 'number' &&
            typeof s.sfxVolume === 'number' &&
            typeof s.isMuted === 'boolean'
        ) {
            sanitized.settings = {
                musicVolume: s.musicVolume,
                sfxVolume: s.sfxVolume,
                isMuted: s.isMuted,
                soundGarden: typeof s.soundGarden === 'boolean' ? s.soundGarden : false,
            };
        } else {
            console.warn('Attempted to update profile with invalid settings, skipping update');
        }
    }

    if (updates.age !== undefined) {
        if (typeof updates.age === 'number' && Number.isFinite(updates.age) && updates.age > 0) {
            sanitized.age = updates.age;
        } else {
            console.warn('Attempted to update profile with invalid age, skipping update');
        }
    }

    if (updates.capabilities !== undefined) {
        if (isPlainObject(updates.capabilities)) {
            sanitized.capabilities = updates.capabilities;
        } else {
            console.warn('Attempted to update profile with invalid capabilities, skipping update');
        }
    }

    if (updates.streak !== undefined) {
        if (typeof updates.streak === 'number' && Number.isFinite(updates.streak)) {
            sanitized.streak = updates.streak;
        } else {
            console.warn('Attempted to update profile with invalid streak, skipping update');
        }
    }

    if (updates.isParent !== undefined) {
        if (typeof updates.isParent === 'boolean') {
            sanitized.isParent = updates.isParent;
        } else {
            console.warn('Attempted to update profile with invalid isParent, skipping update');
        }
    }

    if (updates.sessionHistory !== undefined) {
        if (Array.isArray(updates.sessionHistory)) {
            sanitized.sessionHistory = updates.sessionHistory;
        } else {
            console.warn('Attempted to update profile with invalid sessionHistory, skipping update');
        }
    }

    if (updates.coins !== undefined) {
        if (typeof updates.coins === 'number' && Number.isFinite(updates.coins) && updates.coins >= 0) {
            sanitized.coins = updates.coins;
        } else {
            console.warn('Attempted to update profile with invalid coins, skipping update');
        }
    }

    if (updates.unlockedBadges !== undefined) {
        if (Array.isArray(updates.unlockedBadges) && updates.unlockedBadges.every(v => typeof v === 'string')) {
            sanitized.unlockedBadges = updates.unlockedBadges;
        } else {
            console.warn('Attempted to update profile with invalid unlockedBadges, skipping update');
        }
    }

    if (updates.ownedItems !== undefined) {
        if (Array.isArray(updates.ownedItems) && updates.ownedItems.every(v => typeof v === 'string')) {
            sanitized.ownedItems = updates.ownedItems;
        } else {
            console.warn('Attempted to update profile with invalid ownedItems, skipping update');
        }
    }

    if (updates.equippedItems !== undefined) {
        if (isPlainObject(updates.equippedItems)) {
            sanitized.equippedItems = updates.equippedItems;
        } else {
            console.warn('Attempted to update profile with invalid equippedItems, skipping update');
        }
    }

    if (updates.dailyStamps !== undefined) {
        if (Array.isArray(updates.dailyStamps) && updates.dailyStamps.every(v => typeof v === 'string')) {
            sanitized.dailyStamps = updates.dailyStamps;
        } else {
            console.warn('Attempted to update profile with invalid dailyStamps, skipping update');
        }
    }

    if (updates.lastDailyDate !== undefined) {
        if (updates.lastDailyDate === null || typeof updates.lastDailyDate === 'string') {
            sanitized.lastDailyDate = updates.lastDailyDate;
        } else {
            console.warn('Attempted to update profile with invalid lastDailyDate, skipping update');
        }
    }

    return sanitized;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>(() => {
        const savedProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
        let profiles: UserProfile[] = [];

        if (savedProfiles) {
            try {
                profiles = JSON.parse(savedProfiles);
                // Ensure all profiles have new fields (migration)
                profiles = profiles.map(p => ({
                    ...p,
                    mascotId: p.mascotId || (p as any).mascot || 'owl',
                    avatarId: p.avatarId || (p as any).avatar || '🦁',
                    settings: p.settings || { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
                    capabilities: p.capabilities || { ...INITIAL_CAPABILITY_PROFILE, age: p.age },
                    streak: p.streak || 0,
                    arcadeStats: p.arcadeStats || {},
                    coins: p.coins ?? 0,
                    unlockedBadges: p.unlockedBadges || [],
                    ownedItems: p.ownedItems || [],
                    equippedItems: p.equippedItems || {},
                    dailyStamps: p.dailyStamps || [],
                    lastDailyDate: p.lastDailyDate ?? null,
                    sessionHistory: p.sessionHistory || [],
                }));
            } catch (error) {
                console.error('Failed to parse profiles from local storage:', error);
                // Fallback creates an empty list, so corrupted data is effectively reset to avoid perma-crash
                profiles = [];
            }
        }
        return profiles;
    });
    const [profile, setProfileState] = useState<UserProfile | null>(null);
    const { logEvent } = useAnalytics();

    // Persist profiles whenever they change
    useEffect(() => {
        if (allProfiles.length > 0) {
            localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(allProfiles));
        }
    }, [allProfiles]);

    const createProfile = useCallback(async (name: string, age: number, avatarId: string, mascotId: 'owl' | 'bear' | 'ant' | 'lion') => {
        if (allProfiles.length >= 10) {
            throw new Error('Maximum number of profiles reached (10)');
        }

        const sanitizedName = name.trim();
        if (!isValidProfileName(sanitizedName)) {
            throw new Error('Invalid profile name');
        }

        const newProfile: UserProfile = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: sanitizedName,
            age,
            avatarId,
            mascotId,
            themeId: 'default',
            streak: 0,
            createdAt: Date.now(),
            lastPlayedAt: Date.now(),
            settings: {
                musicVolume: 1,
                sfxVolume: 1,
                isMuted: false,
                soundGarden: false
            },
            capabilities: { ...INITIAL_CAPABILITY_PROFILE, age },
            arcadeStats: {}
        };

        setAllProfiles(prev => [...prev, newProfile]);
        setProfileState(newProfile); // Auto-login new user

        logEvent('signup', { age, avatar_id: avatarId, mascot_id: mascotId });
        logEvent('login', { profile_id: newProfile.id, mascot_id: mascotId, age_group: age < 6 ? 'pre-k' : 'primary' });
    }, [logEvent, allProfiles]);

    const switchProfile = useCallback((profileId: string) => {
        const selected = allProfiles.find(p => p.id === profileId);
        if (selected) {
            setProfileState(selected);
            logEvent('login', { profile_id: selected.id, mascot_id: selected.mascotId });
        }
    }, [allProfiles, logEvent]);

    const deleteProfile = useCallback((profileId: string) => {
        setAllProfiles(prev => prev.filter(p => p.id !== profileId));
        if (profile?.id === profileId) {
            setProfileState(null);
        }
    }, [profile]);

    const logout = useCallback(() => {
        setProfileState(null);
    }, []);

    const incrementStreak = useCallback(() => {
        if (!profile) return;
        const newStreak = (profile.streak || 0) + 1;
        const updatedProfile = { ...profile, streak: newStreak };
        setProfileState(updatedProfile);
        setAllProfiles(prev => {
            const index = prev.findIndex(p => p.id === profile.id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = updatedProfile;
            return next;
        });

        if (newStreak % 5 === 0) {
            logEvent('streak_milestone', { streak_count: newStreak, profile_id: profile.id });
        }
    }, [profile, logEvent]);

    const resetStreak = useCallback(() => {
        if (!profile) return;
        const updatedProfile = { ...profile, streak: 0 };
        setProfileState(updatedProfile);
        setAllProfiles(prev => {
            const index = prev.findIndex(p => p.id === profile.id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = updatedProfile;
            return next;
        });
    }, [profile]);

    const updateMascot = useCallback((mascotId: 'owl' | 'bear' | 'ant' | 'lion') => {
        if (!profile) return;
        const oldMascot = profile.mascotId;
        const updatedProfile = { ...profile, mascotId };
        setProfileState(updatedProfile);
        setAllProfiles(prev => {
            const index = prev.findIndex(p => p.id === profile.id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = updatedProfile;
            return next;
        });

        logEvent('mascot_change', { old_mascot: oldMascot, new_mascot: mascotId, profile_id: profile.id });
    }, [profile, logEvent]);

    const updateProfile = useCallback((id: string, updates: Partial<UserProfile>) => {
        const safeUpdates = validateProfileUpdate(updates);

        setAllProfiles(prev => {
            const index = prev.findIndex(p => p.id === id);
            if (index === -1) return prev;
            const next = [...prev];
            next[index] = { ...next[index], ...safeUpdates };
            return next;
        });

        // Also update local profile state if it matches
        if (profile && profile.id === id) {
            setProfileState(prev => prev ? { ...prev, ...safeUpdates } : null);
        }
    }, [profile]);

    const updateArcadeBestScore = useCallback((mode: string, score: number) => {
        if (!profile) return;
        const currentBest = profile.arcadeStats?.[mode] || 0;
        if (score > currentBest) {
            updateProfile(profile.id, {
                arcadeStats: {
                    ...(profile.arcadeStats || {}),
                    [mode]: score
                }
            });
            // Optional: You could log an event here 'new_high_score'
        }
    }, [profile, updateProfile]);

    const addCoins = useCallback((amount: number) => {
        if (!profile || amount <= 0) return;
        updateProfile(profile.id, { coins: (profile.coins || 0) + amount });
    }, [profile, updateProfile]);

    const spendCoins = useCallback((amount: number): boolean => {
        if (!profile) return false;
        const current = profile.coins || 0;
        if (current < amount) return false;
        updateProfile(profile.id, { coins: current - amount });
        return true;
    }, [profile, updateProfile]);

    const unlockBadge = useCallback((badgeId: string) => {
        if (!profile) return;
        const existing = profile.unlockedBadges || [];
        if (existing.includes(badgeId)) return;
        updateProfile(profile.id, {
            unlockedBadges: [...existing, badgeId],
        });
    }, [profile, updateProfile]);

    const buyItem = useCallback((itemId: string, price: number): boolean => {
        if (!profile) return false;
        const currentCoins = profile.coins || 0;
        if (currentCoins < price) return false;
        const owned = profile.ownedItems || [];
        if (owned.includes(itemId)) return false;
        updateProfile(profile.id, {
            coins: currentCoins - price,
            ownedItems: [...owned, itemId],
        });
        return true;
    }, [profile, updateProfile]);

    const equipItem = useCallback((category: string, itemId: string) => {
        if (!profile) return;
        const equipped = profile.equippedItems || {};
        updateProfile(profile.id, {
            equippedItems: { ...equipped, [category]: itemId },
        });
    }, [profile, updateProfile]);

    const toggleSoundGarden = useCallback(() => {
        if (!profile) return;
        const currentSettings = profile.settings || { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false };
        updateProfile(profile.id, {
            settings: {
                ...currentSettings,
                soundGarden: !currentSettings.soundGarden,
            },
        });
    }, [profile, updateProfile]);

    const recordSession = useCallback((record: SessionRecord) => {
        if (!profile) return;
        const history = profile.sessionHistory || [];
        const newHistory = [...history, record];
        // Cap at 100 entries (FIFO)
        if (newHistory.length > 100) {
            newHistory.splice(0, newHistory.length - 100);
        }
        updateProfile(profile.id, { sessionHistory: newHistory });
    }, [profile, updateProfile]);

    const value = useMemo(() => ({
        profile,
        allProfiles,
        createProfile,
        switchProfile,
        deleteProfile,
        logout,
        resetStreak,
        incrementStreak,
        updateMascot,
        updateProfile,
        updateArcadeBestScore,
        addCoins,
        spendCoins,
        unlockBadge,
        buyItem,
        equipItem,
        toggleSoundGarden,
        recordSession
    }), [profile, allProfiles, createProfile, switchProfile, deleteProfile, logout, resetStreak, incrementStreak, updateMascot, updateProfile, updateArcadeBestScore, addCoins, spendCoins, unlockBadge, buyItem, equipItem, toggleSoundGarden, recordSession]);

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error('useProfile must be used within a ProfileProvider');
    return context;
};
