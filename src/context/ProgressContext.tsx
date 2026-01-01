import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SagaProgress } from '../types/learningPath';
import { CURRICULUM } from '../data/learningPath';

interface ProgressContextType {
    progress: SagaProgress;
    completeNode: (nodeId: string, stars: number) => void;
    isNodeLocked: (nodeId: string) => boolean;
    getStars: (nodeId: string) => number;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const STORAGE_KEY = 'hebrew_game_saga_progress_v1';

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [progress, setProgress] = useState<SagaProgress>({});

    // Load from storage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        let currentProgress: SagaProgress = {};

        if (saved) {
            try {
                currentProgress = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to load progress", e);
            }
        }

        // Ensure first node is always unlocked (migration/fallback)
        const firstNodeId = CURRICULUM[0]?.nodes[0]?.id;
        if (firstNodeId && (!currentProgress[firstNodeId] || currentProgress[firstNodeId].isLocked)) {
            // If missing or locked (shouldn't be), unlock it
            currentProgress = {
                ...currentProgress,
                [firstNodeId]: { stars: 0, isLocked: false, mistakes: 0 }
            };
        }

        setProgress(currentProgress);
    }, []);

    // Save on change
    useEffect(() => {
        if (Object.keys(progress).length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        }
    }, [progress]);

    const completeNode = (nodeId: string, stars: number) => {
        setProgress(prev => {
            const current = prev[nodeId] || { isLocked: false, stars: 0 };

            // Only update if score is better
            const newStars = Math.max(current.stars, stars);

            const newProgress = {
                ...prev,
                [nodeId]: { ...current, stars: newStars, isLocked: false } // Mark current completed
            };

            // Unlock next node logic
            // Find current node index
            let found = false;
            let nextNodeId: string | null = null;

            // Simple traversal (Flatten the curriculum)
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

    const isNodeLocked = (nodeId: string) => {
        // If not in progress map, it's locked (unless it's the very first one logic handled in init)
        // Actually simpler: defaults to locked if not in map
        return !progress[nodeId] || progress[nodeId].isLocked;
    };

    const getStars = (nodeId: string) => progress[nodeId]?.stars || 0;

    return (
        <ProgressContext.Provider value={{ progress, completeNode, isNodeLocked, getStars }}>
            {children}
        </ProgressContext.Provider>
    );
};

export const useProgress = () => {
    const context = useContext(ProgressContext);
    if (!context) throw new Error("useProgress must be used within ProgressProvider");
    return context;
};
