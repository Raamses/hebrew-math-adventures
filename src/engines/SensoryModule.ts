import type { IGameModule, GameFeedback } from './interfaces';
import type { UserCapabilityProfile } from '../types/progress';
import type { UserProfile } from '../types/user';
import type { SensoryProblem } from '../lib/gameLogic';

export class SensoryModule implements IGameModule {
    moduleId = 'sensory_bubble';

    generateProblem(_profile: UserCapabilityProfile, params?: Record<string, any>): SensoryProblem {
        // Target number to finding (1-9 for now)
        // If profile has specific focus (e.g. "number_5"), use it.
        const target = params?.target || Math.floor(Math.random() * 5) + 1; // Default 1-5 for Stage 0

        const bubbleCount = 8;
        const items: Array<{ value: number; id: string }> = [];

        // Generate bubbles
        for (let i = 0; i < bubbleCount; i++) {
            // 40% chance of being the target, 60% distractor
            const isTarget = Math.random() < 0.4;
            let value = target;

            if (!isTarget) {
                // Generate distractor (not target)
                do {
                    value = Math.floor(Math.random() * 9) + 1;
                } while (value === target);
            }

            items.push({
                value,
                id: crypto.randomUUID()
            });
        }

        return {
            type: 'sensory',
            id: crypto.randomUUID(),
            answer: target, // Conceptual answer
            target,
            items
        };
    }

    evaluate(problem: SensoryProblem, answer: any, _profile: UserProfile): GameFeedback {
        // For Sensory mode, "answer" is the popped bubble's value or an event
        // But usually, the UI handles immediate feedback (pop!).
        // The Module evaluation might be called when the *level* is finished or per pop?
        // Let's assume standard flow: The "Answer" here is finishing the set?
        // OR: We evaluate per pop?

        // If we want to fit the standard "MathCard" model (one problem -> one answer),
        // we might consider the "Problem" as "Clear the screen".
        // But PracticeMode expects "submitAnswer(isCorrect)".

        // Let's assume the UI manages the "Game" (pops), and calls evaluate 
        // when the user clears all correct bubbles or runs out of time.

        // If answer === 'COMPLETE', it means they finished successfully.
        const isSuccess = answer === 'COMPLETE';

        return {
            isCorrect: isSuccess,
            correctAnswer: problem.target,
            xpGained: isSuccess ? 10 : 0, // Flat XP for sensory
            message: isSuccess ? 'Pop-tastic!' : 'Keep going!'
        };
    }
}
