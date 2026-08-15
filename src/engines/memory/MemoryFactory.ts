import { RandomUtils } from '../utils/ProblemUtils';
import type { UserCapabilityProfile } from '../../types/progress';
import { MEMORY_LEVEL_OPS } from '../../lib/worldConfig';

export interface MemoryCard {
    id: string;
    type: 'equation' | 'answer';
    pairId: string; // links equation card to answer card
    displayValue: string; // "7 + 5" or "12"
    numericAnswer: number;
    isFlipped: boolean;
    isMatched: boolean;
}

export interface MemoryGameConfig {
    level: number;
    cardCount: number; // must be even, e.g. 12
    problemTypes: string[]; // which problem types to generate
}

// MEMORY_LEVEL_OPS now imported from worldConfig (MEMORY_LEVEL_OPS)

export class MemoryFactory {
    /**
     * Generate a shuffled deck of MemoryCards for the memory duel game.
     * Each pair consists of an equation card and its answer card.
     *
     * We generate equations directly (not via MathModule) to guarantee:
     * 1. Every answer is a clean positive integer
     * 2. No duplicate answers (each answer maps to exactly one equation)
     * 3. Every equation is solvable and has a matching card
     */
    generate(config: MemoryGameConfig, _profile?: UserCapabilityProfile): MemoryCard[] {
        const pairs = Math.floor(config.cardCount / 2);
        const cards: MemoryCard[] = [];
        const usedAnswers = new Set<number>();
        const usedEquations = new Set<string>();

        const ops = [...(MEMORY_LEVEL_OPS[config.level] || MEMORY_LEVEL_OPS[5])];
        const maxAnswer = 20 + config.level * 5; // Scale answer range with level

        let attempts = 0;
        let generated = 0;
        const maxAttempts = pairs * 50; // Safety valve

        while (generated < pairs && attempts < maxAttempts) {
            attempts++;

            // Pick a random operation
            const op = RandomUtils.pickOne(ops);

            // Generate operands based on operation
            let n1: number, n2: number, answer: number;

            switch (op) {
                case '+':
                    n1 = RandomUtils.intInclusive(1, Math.min(15, maxAnswer - 1));
                    n2 = RandomUtils.intInclusive(1, Math.min(15, maxAnswer - n1));
                    answer = n1 + n2;
                    break;
                case '-':
                    n1 = RandomUtils.intInclusive(2, Math.min(20, maxAnswer));
                    n2 = RandomUtils.intInclusive(1, n1 - 1); // n2 < n1 so answer > 0
                    answer = n1 - n2;
                    break;
                case '×':
                    n1 = RandomUtils.intInclusive(2, Math.min(9, Math.floor(Math.sqrt(maxAnswer))));
                    n2 = RandomUtils.intInclusive(2, Math.min(9, Math.floor(maxAnswer / n1)));
                    answer = n1 * n2;
                    break;
                case '÷':
                    n2 = RandomUtils.intInclusive(2, 9); // divisor
                    answer = RandomUtils.intInclusive(2, Math.min(12, Math.floor(maxAnswer / n2))); // quotient
                    n1 = n2 * answer; // dividend (guaranteed clean division)
                    break;
            }

            // Skip if answer already used (prevents ambiguous matching)
            if (usedAnswers.has(answer)) continue;
            // Skip if answer is 0 or negative
            if (answer <= 0) continue;
            // Skip duplicate equations
            const equationStr = `${n1} ${op} ${n2}`;
            if (usedEquations.has(equationStr)) continue;

            usedAnswers.add(answer);
            usedEquations.add(equationStr);

            const pairId = `pair-${generated}`;

            // Equation card
            cards.push({
                id: `card-eq-${generated}`,
                type: 'equation',
                pairId,
                displayValue: equationStr,
                numericAnswer: answer,
                isFlipped: false,
                isMatched: false,
            });

            // Answer card
            cards.push({
                id: `card-ans-${generated}`,
                type: 'answer',
                pairId,
                displayValue: String(answer),
                numericAnswer: answer,
                isFlipped: false,
                isMatched: false,
            });

            generated++;
        }

        // Shuffle the cards (Fisher-Yates)
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }

        return cards;
    }
}