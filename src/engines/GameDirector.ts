import type { IGameDirector, GameSessionConfig } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';

// The Smart Director's Logic
// Decision Tree:
// 1. Is user failing continuously? -> Rescue Mode (Drop Focus difficulty)
// 2. Is user on a hot streak? -> Challenge Mode (Increase Focus difficulty)
// 3. else -> Stability Mode (Keep current Focus)

export class GameDirector implements IGameDirector {
    // The new "Decorator" method: Takes a base static config and adapts it to the user
    tuneConfig(baseConfig: any, profile: UserCapabilityProfile): any {
        const tuned = { ...baseConfig };

        // 1. Rescue Mode (Heuristic: >2 consecutive failures)
        // If the user is struggling, we simplify the problem temporarily.
        if (profile.consecutiveFailures >= 2) {
            tuned.isRescue = true;
            tuned.isChallenge = false;

            // Heuristic A: Reduce Max Number
            if (tuned.max) {
                tuned.max = Math.max(5, Math.floor(tuned.max * 0.8));
            }

            // Heuristic B: Simplify Sub-Types (e.g., remove borrowing)
            if (tuned.type === 'sub_borrow') tuned.type = 'sub_simple';
            if (tuned.type === 'addition_carry') tuned.type = 'addition_simple';

            // Heuristic C: Reduce Complexity for Series
            if (tuned.type === 'series' && !tuned.step) {
                tuned.step = 1; // Force simple 1-step
            }
        }

        // 2. Challenge Mode (Heuristic: >5 consecutive correct on this specific skill)
        // Note: We need to know the *current topic* to check stats. 
        // For now, we use a global heuristic or assume 'math_core' generic skills.
        // Ideally: const stat = profile.skills[tuned.type];

        // Simple Hot Streak Check
        const currentSkill = profile.skills[tuned.type || 'math_core'];
        if ((currentSkill && currentSkill.consecutiveCorrect >= 5) || (profile.streak > 5)) {
            tuned.isChallenge = true;
            tuned.isRescue = false;

            // Heuristic A: Increase Difficulty slightly (push limits)
            if (tuned.max) {
                tuned.max = Math.floor(tuned.max * 1.2);
            }
        }

        return tuned;
    }

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
