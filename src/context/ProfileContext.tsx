import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserProfile } from '../types/user';
import { INITIAL_CAPABILITY_PROFILE } from '../types/progress';
import { useAnalytics } from '../hooks/useAnalytics';

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
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILES_STORAGE_KEY = 'hebrew-math-profiles';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [profile, setProfileState] = useState<UserProfile | null>(null);
    const { logEvent } = useAnalytics();

    // Load profiles and handle migration on mount
    useEffect(() => {
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
                    streak: p.streak || 0
                }));
            } catch (error) {
                console.error('Failed to parse profiles from local storage:', error);
                // Fallback creates an empty list, so corrupted data is effectively reset to avoid perma-crash
                profiles = [];
            }
        }
        setAllProfiles(profiles);
    }, []);

    // Persist profiles whenever they change
    useEffect(() => {
        if (allProfiles.length > 0) {
            localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(allProfiles));
        }
    }, [allProfiles]);

    const createProfile = async (name: string, age: number, avatarId: string, mascotId: 'owl' | 'bear' | 'ant' | 'lion') => {
        const newProfile: UserProfile = {
            id: crypto.randomUUID(),
            name,
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
            capabilities: { ...INITIAL_CAPABILITY_PROFILE }
        };

        setAllProfiles(prev => [...prev, newProfile]);
        setProfileState(newProfile); // Auto-login new user

        logEvent('signup', { age, avatar_id: avatarId, mascot_id: mascotId });
        logEvent('login', { profile_id: newProfile.id, mascot_id: mascotId, age_group: age < 6 ? 'pre-k' : 'primary' });
    };

    const switchProfile = (profileId: string) => {
        const selected = allProfiles.find(p => p.id === profileId);
        if (selected) {
            setProfileState(selected);
            logEvent('login', { profile_id: selected.id, mascot_id: selected.mascotId });
        }
    };

    const deleteProfile = (profileId: string) => {
        setAllProfiles(prev => prev.filter(p => p.id !== profileId));
        if (profile?.id === profileId) {
            setProfileState(null);
        }
    };

    const logout = () => {
        setProfileState(null);
    };

    const incrementStreak = () => {
        if (!profile) return;
        const newStreak = (profile.streak || 0) + 1;
        const updatedProfile = { ...profile, streak: newStreak };
        setProfileState(updatedProfile);
        setAllProfiles(prev => prev.map(p => p.id === profile.id ? updatedProfile : p));

        if (newStreak % 5 === 0) {
            logEvent('streak_milestone', { streak_count: newStreak, profile_id: profile.id });
        }
    };

    const resetStreak = () => {
        if (!profile) return;
        const updatedProfile = { ...profile, streak: 0 };
        setProfileState(updatedProfile);
        setAllProfiles(prev => prev.map(p => p.id === profile.id ? updatedProfile : p));
    };

    const updateMascot = (mascotId: 'owl' | 'bear' | 'ant' | 'lion') => {
        if (!profile) return;
        const oldMascot = profile.mascotId;
        const updatedProfile = { ...profile, mascotId };
        setProfileState(updatedProfile);
        setAllProfiles(prev => prev.map(p => p.id === profile.id ? updatedProfile : p));

        logEvent('mascot_change', { old_mascot: oldMascot, new_mascot: mascotId, profile_id: profile.id });
    };

    const updateProfile = (id: string, updates: Partial<UserProfile>) => {
        setAllProfiles(prev => prev.map(p => {
            if (p.id === id) {
                const updated = { ...p, ...updates };
                // If we updated the currently logged-in profile, update state
                if (profile && profile.id === id) {
                    setProfileState(updated);
                }
                return updated;
            }
            return p;
        }));
    };

    return (
        <ProfileContext.Provider value={{
            profile,
            allProfiles,
            createProfile,
            switchProfile,
            deleteProfile,
            logout,
            resetStreak,
            incrementStreak,
            updateMascot,
            updateProfile
        }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error('useProfile must be used within a ProfileProvider');
    return context;
};
