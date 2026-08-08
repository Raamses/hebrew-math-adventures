import type { IGameDirector, BaseGameConfig } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';

// The Smart Director's Logic
// Decision Tree:
// 1. Is user failing continuously? -> Rescue Mode (Drop Focus difficulty)
// 2. Is user on a hot streak? -> Challenge Mode (Increase Focus difficulty)
// 3. else -> Stability Mode (Keep current Focus)

export class GameDirector implements IGameDirector {
    private static readonly CHALLENGE_THRESHOLD = 5;
    private static readonly STREAK_THRESHOLD = 5; // Global streak

    private static readonly RESCUE_MULTIPLIER = 0.8;
    private static readonly CHALLENGE_MULTIPLIER = 1.2;
    private static readonly MIN_MAX_VALUE = 5;

    // The new "Decorator" method: Takes a base static config and adapts it to the user
    tuneConfig<T extends BaseGameConfig>(baseConfig: T, profile: UserCapabilityProfile): T {
        const tuned = { ...baseConfig };

        // Simple Hot Streak Check (computed up front; only used if rescue doesn't fire,
        // so it's safe to read before rescue's type-simplification heuristics run)
        const currentSkill = profile.skills[tuned.type as string || 'math_core'];

        // 1. Rescue Mode (Heuristic: >2 consecutive failures)
        // If the user is struggling, we simplify the problem temporarily.
        const rescueThreshold = profile.age && profile.age >= 8 ? 3 : 2;
        if (profile.consecutiveFailures >= rescueThreshold) {
            tuned.isRescue = true;
            tuned.isChallenge = false;

            // Heuristic A: Reduce Max Number
            if (typeof tuned.max === 'number') {
                tuned.max = Math.max(
                    GameDirector.MIN_MAX_VALUE,
                    Math.floor(tuned.max * GameDirector.RESCUE_MULTIPLIER)
                );
            }

            // Heuristic B: Simplify Sub-Types (e.g., remove borrowing)
            if (tuned.type === 'sub_borrow') tuned.type = 'sub_simple';
            if (tuned.type === 'addition_carry') tuned.type = 'addition_simple';

            // Heuristic C: Reduce Complexity for Series
            if (tuned.type === 'series' && !tuned.step) {
                tuned.step = 1; // Force simple 1-step
            }

            // Heuristic D: Force simpler density for sensory if applicable
            if (tuned.density && typeof tuned.density === 'number') {
                tuned.density = Math.max(0.1, tuned.density * 0.8);
            }

            // Heuristic E: Reduce distractors in rescue mode
            const dRatio = (tuned as any).distractorRatio;
            if (dRatio && typeof dRatio === 'number') {
                (tuned as any).distractorRatio = Math.max(1, Math.floor(dRatio * 0.7));
            }

            // Heuristic F: Slow down spawns and bubbles in rescue mode
            if (typeof (tuned as any).spawnIntervalMs === 'number') {
                (tuned as any).spawnIntervalMs = Math.round((tuned as any).spawnIntervalMs * 1.3);
            }
            if (typeof (tuned as any).baseVelocity === 'number') {
                (tuned as any).baseVelocity = (tuned as any).baseVelocity * 0.7;
            }
        }

        // 2. Challenge Mode (Heuristic: >5 consecutive correct on this specific skill)
        // Note: We need to know the *current topic* to check stats.
        // For now, we use a global heuristic or assume 'math_core' generic skills.
        else if ((currentSkill && currentSkill.consecutiveCorrect >= GameDirector.CHALLENGE_THRESHOLD) || (profile.streak > GameDirector.STREAK_THRESHOLD)) {
            tuned.isChallenge = true;
            tuned.isRescue = false;

            // Heuristic A: Increase Difficulty slightly (push limits)
            if (typeof tuned.max === 'number') {
                tuned.max = Math.floor(tuned.max * GameDirector.CHALLENGE_MULTIPLIER);
            }

            // Heuristic: Add more distractors in challenge mode
            const dRatio = (tuned as any).distractorRatio;
            if (dRatio && typeof dRatio === 'number') {
                (tuned as any).distractorRatio = dRatio + 1;
            }

            // Heuristic F: Speed up spawns and bubbles in challenge mode
            if (typeof (tuned as any).spawnIntervalMs === 'number') {
                (tuned as any).spawnIntervalMs = Math.round((tuned as any).spawnIntervalMs * 0.8);
            }
            if (typeof (tuned as any).baseVelocity === 'number') {
                (tuned as any).baseVelocity = (tuned as any).baseVelocity * 1.3;
            }
        }

        return tuned;
    }

    // Called *after* the user answers a question in App.tsx
    // Returns the UPDATED profile
    recordResult(profile: UserCapabilityProfile, isCorrect: boolean, onLevelUp?: (level: number) => void): UserCapabilityProfile {
        const newProfile = { ...profile }; // Shallow copy
        newProfile.skills = { ...profile.skills }; // Deep copy skills map so we don't mutate profile.skills

        // 1. Update Global Heuristics
        if (isCorrect) {
            newProfile.consecutiveFailures = 0;
        } else {
            newProfile.consecutiveFailures += 1;
        }

        // 2. Update Specific Skill Stats
        // For now, we assume 'currentFocus' is the skill key being played
        const focusKey = profile.currentFocus;
        const existingSkill = newProfile.skills[focusKey];
        newProfile.skills[focusKey] = existingSkill
            ? { ...existingSkill }
            : { attempts: 0, correct: 0, consecutiveCorrect: 0, consecutiveWrong: 0, lastPlayedAt: 0, avgSpeedMs: 0 };

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

        // 3. Mastery-based level growth
        const MASTERY_THRESHOLD = 10;
        const MASTERY_ACCURACY = 0.8;

        // ⚡ Bolt: Use for...in loop instead of Object.values().filter().length
        // to avoid allocating two intermediate arrays on every result update
        let masteredCount = 0;
        for (const key in newProfile.skills) {
            const s = newProfile.skills[key];
            if (s.attempts >= MASTERY_THRESHOLD && (s.correct / s.attempts) >= MASTERY_ACCURACY) {
                masteredCount++;
            }
        }

        const newLevel = Math.min(10, 1 + Math.floor(masteredCount / 3));
        if (newLevel > newProfile.estimatedLevel) {
            newProfile.estimatedLevel = newLevel;
            onLevelUp?.(newLevel);
        }

        return newProfile;
    }
}

// Singleton export
export const Director = new GameDirector();
