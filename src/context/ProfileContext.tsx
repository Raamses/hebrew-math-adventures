import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserProfile, XP_PER_LEVEL } from '../types/user';

interface ProfileContextType {
    profile: UserProfile | null;
    allProfiles: UserProfile[];
    createProfile: (name: string, age: number, avatar: string, mascot: 'owl' | 'bear' | 'ant' | 'lion') => Promise<void>;
    switchProfile: (profileId: string) => void;
    deleteProfile: (profileId: string) => void;
    logout: () => void;
    addXP: (amount: number) => void;
    resetStreak: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const PROFILES_STORAGE_KEY = 'hebrew-math-profiles';
const LEGACY_PROFILE_KEY = 'userProfile';

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
    const [profile, setProfileState] = useState<UserProfile | null>(null);

    // Load profiles and handle migration on mount
    useEffect(() => {
        const savedProfiles = localStorage.getItem(PROFILES_STORAGE_KEY);
        let profiles: UserProfile[] = [];

        if (savedProfiles) {
            profiles = JSON.parse(savedProfiles);
            // Ensure all profiles have a mascot field (migration for existing profiles)
            profiles = profiles.map(p => ({
                ...p,
                mascot: p.mascot || 'owl'
            }));
        } else {
            // Migration: Check for legacy single profile
            const legacyProfile = localStorage.getItem(LEGACY_PROFILE_KEY);
            if (legacyProfile) {
                const parsedLegacy = JSON.parse(legacyProfile);
                // Convert legacy to new format with ID and default avatar
                const migratedProfile: UserProfile = {
                    ...parsedLegacy,
                    id: crypto.randomUUID(),
                    avatar: '🦁', // Default avatar for migrated users
                    mascot: 'owl' // Default mascot
                };
                profiles = [migratedProfile];
                localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
                localStorage.removeItem(LEGACY_PROFILE_KEY); // Clean up legacy
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

    const createProfile = async (name: string, age: number, avatar: string, mascot: 'owl' | 'bear' | 'ant' | 'lion') => {
        const newProfile: UserProfile = {
            id: crypto.randomUUID(),
            name,
            age,
            avatar,
            mascot,
            currentLevel: age <= 6 ? 1 : age === 7 ? 2 : age === 8 ? 3 : age === 9 ? 4 : age === 10 ? 5 : 6,
            xp: 0,
            streak: 0
        };

        setAllProfiles(prev => [...prev, newProfile]);
        setProfileState(newProfile); // Auto-login new user
    };

    const switchProfile = (profileId: string) => {
        const selected = allProfiles.find(p => p.id === profileId);
        if (selected) {
            setProfileState(selected);
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

    const addXP = (amount: number) => {
        if (!profile) return;

        const updatedProfile = { ...profile };
        let newXP = updatedProfile.xp + amount;
        let newLevel = updatedProfile.currentLevel;
        let newStreak = updatedProfile.streak;

        if (amount > 0) {
            newStreak += 1;
        } else {
            newStreak = 0;
        }

        if (newXP < 0) newXP = 0;

        if (newXP >= XP_PER_LEVEL) {
            newXP -= XP_PER_LEVEL;
            newLevel += 1;
        }

        updatedProfile.xp = newXP;
        updatedProfile.currentLevel = newLevel;
        updatedProfile.streak = newStreak;

        // Update both current state and the list
        setProfileState(updatedProfile);
        setAllProfiles(prev => prev.map(p => p.id === profile.id ? updatedProfile : p));
    };

    const resetStreak = () => {
        if (!profile) return;
        const updatedProfile = { ...profile, streak: 0 };
        setProfileState(updatedProfile);
        setAllProfiles(prev => prev.map(p => p.id === profile.id ? updatedProfile : p));
    };

    return (
        <ProfileContext.Provider value={{
            profile,
            allProfiles,
            createProfile,
            switchProfile,
            deleteProfile,
            logout,
            addXP,
            resetStreak
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
