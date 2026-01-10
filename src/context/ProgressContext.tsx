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

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useProfile();
    const [progress, setProgress] = useState<SagaProgress>({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Load progress when profile changes
    useEffect(() => {
        if (!profile) {
            setProgress({});
            setIsLoaded(false);
            return;
        }

        const userKey = `${STORAGE_KEY}_${profile.id}`;
        const saved = localStorage.getItem(userKey);

        if (saved) {
            try {
                setProgress(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load progress for user", profile.id, e);
                // Fallback to age-based init on corruption
                setProgress(getInitialProgress(profile.age || 5));
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
                        setProgress(legacyProgress);
                        // Optional: Clear legacy? Better to keep as backup for now.
                        // localStorage.removeItem(STORAGE_KEY); 
                    } else {
                        throw new Error("Empty legacy");
                    }
                } catch {
                    setProgress(getInitialProgress(profile.age || 5));
                }
            } else {
                // Brand new user, no legacy
                setProgress(getInitialProgress(profile.age || 5));
            }
        }
        setIsLoaded(true);
    }, [profile]);

    // Save on change (Debounced slightly by React batching, but good to be safe)
    useEffect(() => {
        if (profile && isLoaded && Object.keys(progress).length > 0) {
            const userKey = `${STORAGE_KEY}_${profile.id}`;
            localStorage.setItem(userKey, JSON.stringify(progress));
        }
    }, [progress, profile, isLoaded]);

    // Derived State: Total Stars
    const totalStars = React.useMemo(() => {
        return Object.values(progress).reduce((acc, node) => acc + (node.stars || 0), 0);
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
