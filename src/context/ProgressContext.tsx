import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SagaProgress } from '../types/learningPath';
import { CURRICULUM } from '../data/learningPath';
import { useProfile } from './ProfileContext';
import { getInitialProgress } from '../lib/progression';

interface ProgressContextType {
    progress: SagaProgress;
    completeNode: (nodeId: string, stars: number) => void;
    isNodeLocked: (nodeId: string) => boolean;
    getStars: (nodeId: string) => number;
    totalStars: number;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const STORAGE_KEY = 'hebrew_game_saga_progress_v1';

const loadProgressForProfile = (profile: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!profile) return {};

    const userKey = `${STORAGE_KEY}_${profile.id}`;
    const saved = localStorage.getItem(userKey);

    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to load progress for user", profile.id, e);
            // Fallback to age-based init on corruption
            return getInitialProgress(profile.age || 5);
        }
    } else {
        // New User or Migration
        // Check for legacy global progress to migrate
        const legacyGlobal = localStorage.getItem(STORAGE_KEY);
        if (legacyGlobal) {
            try {
                const legacyProgress = JSON.parse(legacyGlobal);
                // Only migrate if it looks valid
                if (Object.keys(legacyProgress).length > 0) {
                    return legacyProgress;
                    // Optional: Clear legacy? Better to keep as backup for now.
                    // localStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                return getInitialProgress(profile.age || 5);
            }
        }

        // Brand new user, no legacy
        return getInitialProgress(profile.age || 5);
    }
};

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useProfile();
    // Use undefined so it strictly matches `profile?.id` when there is no profile initially
    const [prevProfileId, setPrevProfileId] = useState<string | undefined>(profile?.id);
    const [progress, setProgress] = useState<SagaProgress>(() => loadProgressForProfile(profile));

    // Handle profile switch during render to avoid cascading re-renders
    if (profile?.id !== prevProfileId) {
        setPrevProfileId(profile?.id);
        setProgress(loadProgressForProfile(profile));
    }

    // Save on change (Debounced slightly by React batching, but good to be safe)
    useEffect(() => {
        if (profile && Object.keys(progress).length > 0) {
            const userKey = `${STORAGE_KEY}_${profile.id}`;
            try {
                localStorage.setItem(userKey, JSON.stringify(progress));
            } catch (e) {
                console.warn('Failed to save progress to localStorage', e);
            }
        }
    }, [progress, profile]);

    // Derived State: Total Stars
    const totalStars = React.useMemo(() => {
        let sum = 0;
        for (const key in progress) {
            // progress[key] might not have stars defined or it could be 0
            sum += progress[key].stars || 0;
        }
        return sum;
    }, [progress]);

    const completeNode = (nodeId: string, stars: number): void => {
        if (!profile) return; // Guard: No anonymous progress

        setProgress(prev => {
            const current = prev[nodeId] || { isLocked: false, stars: 0 };

            // Only update if score is better
            const newStars = Math.max(current.stars, stars);

            const newProgress = {
                ...prev,
                [nodeId]: { ...current, stars: newStars, isLocked: false } // Mark current completed
            };

            // Unlock next node logic
            // Simple traversal (Flatten the curriculum)
            let found = false;
            let nextNodeId: string | null = null;

            for (const unit of CURRICULUM) {
                for (const node of unit.nodes) {
                    if (found) {
                        nextNodeId = node.id;
                        break;
                    }
                    if (node.id === nodeId) {
                        found = true;
                    }
                }
                if (nextNodeId) break;
            }

            if (nextNodeId) {
                // Initialize next node detection
                const nextState = newProgress[nextNodeId] || { stars: 0, mistakes: 0 };
                newProgress[nextNodeId] = { ...nextState, isLocked: false };
            }

            return newProgress;
        });
    };

    const isNodeLocked = (nodeId: string): boolean => {
        // If not in progress map, it's locked
        return !progress[nodeId] || progress[nodeId].isLocked;
    };

    const getStars = (nodeId: string): number => progress[nodeId]?.stars || 0;

    return (
        <ProgressContext.Provider value={{ progress, completeNode, isNodeLocked, getStars, totalStars }}>
            {children}
        </ProgressContext.Provider>
    );
};

export const useProgress = () => {
    const context = useContext(ProgressContext);
    if (!context) throw new Error("useProgress must be used within ProgressProvider");
    return context;
};
