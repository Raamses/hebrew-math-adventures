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
    updateMascot: (mascot: 'owl' | 'bear' | 'ant' | 'lion') => void;
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
            // Ensure all profiles have new fields (migration)
            profiles = profiles.map(p => ({
                ...p,
                mascot: p.mascot || 'owl',
                totalScore: p.totalScore ?? ((p.currentLevel - 1) * XP_PER_LEVEL + p.xp) // Estimate total score for existing users
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
                    mascot: 'owl', // Default mascot
                    totalScore: 0
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
            streak: 0,
            totalScore: 0
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
            updatedProfile.totalScore = (updatedProfile.totalScore || 0) + amount;
        } else {
            newStreak = 0;
            // No penalty to totalScore for now, or maybe small penalty? User asked for total score to "keep going up" implies only positive?
            // "total score to xp, xp should be reset after a level up but not score"
            // Let's assume we ADD amount even if it's negative? No, calculateRewards returns negative for wrong answers.
            // If amount is negative, totalScore would decrease. 
            // "i want to show me where the changes should be to support this change" -> "xp should be reset ... but not score"
            // This implies score accumulates. If we subtract points, it should probably subtract from total too, or maybe Total Score is "Lifetime XP"?
            // Usually "Score" means "Current Game Score" or "Lifetime Accumulated".
            // If I subtract, it might go down.
            // Let's implement: Total Score is separate accumulator. 
            // If amount is negative, do we subtract? Yes, consistent with XP.
            if (amount < 0 && updatedProfile.totalScore + amount < 0) {
                updatedProfile.totalScore = 0; // Clamp at 0
            } else if (amount < 0) {
                updatedProfile.totalScore += amount;
            }
        }

        if (newXP < 0) newXP = 0;

        while (newXP >= XP_PER_LEVEL) {
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

    const updateMascot = (mascot: 'owl' | 'bear' | 'ant' | 'lion') => {
        if (!profile) return;
        const updatedProfile = { ...profile, mascot };
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
            resetStreak,
            updateMascot
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
