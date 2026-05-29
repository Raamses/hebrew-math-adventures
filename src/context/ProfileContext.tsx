import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { type UserProfile } from '../types/user';
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
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILES_STORAGE_KEY = 'hebrew-math-profiles';

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
                    settings: p.settings || { musicVolume: 1, sfxVolume: 1, isMuted: false },
                    capabilities: p.capabilities || { ...INITIAL_CAPABILITY_PROFILE },

                    streak: p.streak || 0,
                    arcadeStats: p.arcadeStats || {}
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
                isMuted: false
            },
            capabilities: { ...INITIAL_CAPABILITY_PROFILE },
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
            if (index !== -1) {
                const next = [...prev];
                next[index] = updatedProfile;
                return next;
            }
            return prev;
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
            if (index !== -1) {
                const next = [...prev];
                next[index] = updatedProfile;
                return next;
            }
            return prev;
        });
    }, [profile]);

    const updateMascot = useCallback((mascotId: 'owl' | 'bear' | 'ant' | 'lion') => {
        if (!profile) return;
        const oldMascot = profile.mascotId;
        const updatedProfile = { ...profile, mascotId };
        setProfileState(updatedProfile);
        setAllProfiles(prev => {
            const index = prev.findIndex(p => p.id === profile.id);
            if (index !== -1) {
                const next = [...prev];
                next[index] = updatedProfile;
                return next;
            }
            return prev;
        });

        logEvent('mascot_change', { old_mascot: oldMascot, new_mascot: mascotId, profile_id: profile.id });
    }, [profile, logEvent]);

    const updateProfile = useCallback((id: string, updates: Partial<UserProfile>) => {
        // Sanitize name if provided in updates
        const safeUpdates = { ...updates };
        if (safeUpdates.name !== undefined) {
            const sanitizedName = safeUpdates.name.trim();
            if (!isValidProfileName(sanitizedName)) {
                console.warn('Attempted to update profile with invalid name, skipping name update');
                delete safeUpdates.name;
            } else {
                safeUpdates.name = sanitizedName;
            }
        }

        setAllProfiles(prev => {
            const index = prev.findIndex(p => p.id === id);
            if (index !== -1) {
                const next = [...prev];
                next[index] = { ...next[index], ...safeUpdates };
                return next;
            }
            return prev;
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
        updateArcadeBestScore
    }), [profile, allProfiles, createProfile, switchProfile, deleteProfile, logout, resetStreak, incrementStreak, updateMascot, updateProfile, updateArcadeBestScore]);

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
