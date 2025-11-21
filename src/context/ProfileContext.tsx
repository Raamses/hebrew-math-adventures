import React, { createContext, useContext, useState, useEffect } from 'react';
import { type UserProfile, XP_PER_LEVEL } from '../types/user';

interface ProfileContextType {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
    addXP: (amount: number) => void;
    resetStreak: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfileState] = useState<UserProfile | null>(() => {
        const saved = localStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (profile) {
            localStorage.setItem('userProfile', JSON.stringify(profile));
        }
    }, [profile]);

    const setProfile = (newProfile: UserProfile | null) => {
        setProfileState(newProfile);
        if (newProfile === null) {
            localStorage.removeItem('userProfile');
        }
    };

    const addXP = (amount: number) => {
        setProfileState(prev => {
            if (!prev) return null;

            let newXP = prev.xp + amount;
            let newLevel = prev.currentLevel;
            let newStreak = prev.streak;

            if (amount > 0) {
                newStreak += 1;
            } else {
                // Reset streak on penalty (negative XP)
                newStreak = 0;
            }

            // Prevent negative total XP
            if (newXP < 0) newXP = 0;

            // Level Up Logic
            if (newXP >= XP_PER_LEVEL) {
                newXP -= XP_PER_LEVEL;
                newLevel += 1;
            }

            return {
                ...prev,
                xp: newXP,
                currentLevel: newLevel,
                streak: newStreak
            };
        });
    };

    const resetStreak = () => {
        if (!profile) return;
        setProfileState({ ...profile, streak: 0 });
    };

    return (
        <ProfileContext.Provider value={{ profile, setProfile, addXP, resetStreak }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error('useProfile must be used within a ProfileProvider');
    return context;
};
