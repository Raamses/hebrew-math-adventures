import type { IGameDirector, GameSessionConfig } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';

// The Smart Director's Logic
// Decision Tree:
// 1. Is user failing continuously? -> Rescue Mode (Drop Focus difficulty)
// 2. Is user on a hot streak? -> Challenge Mode (Increase Focus difficulty)
// 3. else -> Stability Mode (Keep current Focus)

export class GameDirector implements IGameDirector {
    // Constructor removed as it was only setting unused modules

    getNextConfig(profile: UserCapabilityProfile): GameSessionConfig {
        // 1. Check for "Rescue Mode"
        if (profile.consecutiveFailures >= 2) {
            // Heuristic: If 2 failures in a row (meaning 3-6 bad questions), drop 'estimatedLevel' temporary
            // Note: In full implementation, we would switch 'currentFocus' to a mapped easier skill
            return {
                moduleId: 'math_core',
                params: { mode: 'rescue', difficulty: Math.max(1, (profile.estimatedLevel || 1) - 1) }
            };
        }

        // 2. Check for "Challenge Mode" (Hot Streak)
        // We verify this by looking at successful stats for the *currentFocus*
        const currentSkill = profile.skills[profile.currentFocus];
        if (currentSkill && currentSkill.consecutiveCorrect >= 10) {
            return {
                moduleId: 'math_core',
                params: { mode: 'challenge', difficulty: (profile.estimatedLevel || 1) + 1 }
            };
        }

        // 3. Default: Stability
        return {
            moduleId: 'math_core',
            params: { difficulty: profile.estimatedLevel || 1 }
        };
    }

    // Called *after* the user answers a question in App.tsx
    // Returns the UPDATED profile
    recordResult(profile: UserCapabilityProfile, isCorrect: boolean): UserCapabilityProfile {
        const newProfile = { ...profile }; // Shallow copy

        // 1. Update Global Heuristics
        if (isCorrect) {
            newProfile.consecutiveFailures = 0;
        } else {
            newProfile.consecutiveFailures += 1;
        }

        // 2. Update Specific Skill Stats
        // For now, we assume 'currentFocus' is the skill key being played
        const focusKey = profile.currentFocus;
        if (!newProfile.skills[focusKey]) {
            newProfile.skills[focusKey] = {
                attempts: 0, correct: 0, consecutiveCorrect: 0, consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0
            };
        }

        const skill = newProfile.skills[focusKey];
        skill.attempts++;
        skill.lastPlayedAt = Date.now();

        if (isCorrect) {
            skill.correct++;
            skill.consecutiveCorrect++;
            skill.consecutiveWrong = 0;
        } else {
            skill.consecutiveCorrect = 0;
            skill.consecutiveWrong++;
        }

        return newProfile;
    }
}

// Singleton export
export const Director = new GameDirector();
