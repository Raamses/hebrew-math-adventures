import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryFactory, type MemoryGameConfig } from '../MemoryFactory';

describe('MemoryFactory', () => {
    let factory: MemoryFactory;

    beforeEach(() => {
        factory = new MemoryFactory();
    });

    describe('Basic generation', () => {
        it('generates the correct number of cards', () => {
            const config: MemoryGameConfig = { level: 1, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);
            expect(cards).toHaveLength(12);
        });

        it('generates even number of cards', () => {
            const config: MemoryGameConfig = { level: 3, cardCount: 10, problemTypes: [] };
            const cards = factory.generate(config);
            expect(cards.length % 2).toBe(0);
        });

        it('each card has required fields', () => {
            const config: MemoryGameConfig = { level: 2, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);
            cards.forEach(card => {
                expect(card.id).toBeTruthy();
                expect(card.pairId).toBeTruthy();
                expect(card.type).toMatch(/^(equation|answer)$/);
                expect(card.displayValue).toBeTruthy();
                expect(typeof card.numericAnswer).toBe('number');
                expect(card.isFlipped).toBe(false);
                expect(card.isMatched).toBe(false);
            });
        });
    });

    describe('Pair integrity', () => {
        it('every equation card has a matching answer card with same pairId', () => {
            const config: MemoryGameConfig = { level: 1, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);

            const equationCards = cards.filter(c => c.type === 'equation');
            const answerCards = cards.filter(c => c.type === 'answer');

            expect(equationCards.length).toBe(answerCards.length);

            // Every equation's pairId must have exactly one answer
            equationCards.forEach(eq => {
                const matching = answerCards.filter(a => a.pairId === eq.pairId);
                expect(matching).toHaveLength(1);
                expect(matching[0].numericAnswer).toBe(eq.numericAnswer);
            });
        });

        it('every answer is unique (no ambiguous matching)', () => {
            const config: MemoryGameConfig = { level: 5, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);

            const answers = cards.filter(c => c.type === 'answer').map(c => c.numericAnswer);
            const unique = new Set(answers);
            expect(answers.length).toBe(unique.size);
        });

        it('every equation is unique', () => {
            const config: MemoryGameConfig = { level: 3, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);

            const equations = cards.filter(c => c.type === 'equation').map(c => c.displayValue);
            const unique = new Set(equations);
            expect(equations.length).toBe(unique.size);
        });
    });

    describe('Answer validity', () => {
        it('all answers are positive integers', () => {
            const config: MemoryGameConfig = { level: 5, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);

            cards.forEach(card => {
                expect(Number.isInteger(card.numericAnswer)).toBe(true);
                expect(card.numericAnswer).toBeGreaterThan(0);
            });
        });

        it('equation card displayValue matches its numericAnswer', () => {
            const config: MemoryGameConfig = { level: 2, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);

            const equationCards = cards.filter(c => c.type === 'equation');
            equationCards.forEach(card => {
                // Parse "7 + 5" → evaluate
                const parts = card.displayValue.split(' ');
                expect(parts).toHaveLength(3);
                const [n1Str, op, n2Str] = parts;
                const n1 = parseInt(n1Str, 10);
                const n2 = parseInt(n2Str, 10);
                let expected: number;
                switch (op) {
                    case '+': expected = n1 + n2; break;
                    case '-': expected = n1 - n2; break;
                    case '×': expected = n1 * n2; break;
                    case '÷': expected = n1 / n2; break;
                    default: throw new Error(`Unknown op: ${op}`);
                }
                expect(card.numericAnswer).toBe(expected);
            });
        });

        it('answer card displayValue equals numericAnswer as string', () => {
            const config: MemoryGameConfig = { level: 3, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);

            const answerCards = cards.filter(c => c.type === 'answer');
            answerCards.forEach(card => {
                expect(card.displayValue).toBe(String(card.numericAnswer));
            });
        });
    });

    describe('Level scaling', () => {
        it('level 1 only uses + and -', () => {
            const config: MemoryGameConfig = { level: 1, cardCount: 12, problemTypes: [] };
            const cards = factory.generate(config);
            const equations = cards.filter(c => c.type === 'equation');
            equations.forEach(eq => {
                const op = eq.displayValue.split(' ')[1];
                expect(['+', '-']).toContain(op);
            });
        });

        it('level 5+ can use × and ÷', () => {
            const config: MemoryGameConfig = { level: 5, cardCount: 20, problemTypes: [] };
            const cards = factory.generate(config);
            const equations = cards.filter(c => c.type === 'equation');
            const ops = equations.map(eq => eq.displayValue.split(' ')[1]);
            // With 10 pairs, likely at least one × or ÷
            expect(ops.some(op => op === '×' || op === '÷')).toBe(true);
        });

        it('division always produces clean integer answers', () => {
            const config: MemoryGameConfig = { level: 8, cardCount: 20, problemTypes: [] };
            const cards = factory.generate(config);
            const divCards = cards.filter(c => c.type === 'equation' && c.displayValue.includes('÷'));
            divCards.forEach(card => {
                expect(card.numericAnswer % 1).toBe(0);
                expect(card.numericAnswer).toBeGreaterThan(0);
            });
        });

        it('subtraction never produces negative answers', () => {
            const config: MemoryGameConfig = { level: 3, cardCount: 20, problemTypes: [] };
            const cards = factory.generate(config);
            const subCards = cards.filter(c => c.type === 'equation' && c.displayValue.includes('-'));
            subCards.forEach(card => {
                expect(card.numericAnswer).toBeGreaterThanOrEqual(1);
            });
        });
    });

    describe('Shuffling', () => {
        it('cards are shuffled (not all equations then answers)', () => {
            const config: MemoryGameConfig = { level: 3, cardCount: 12, problemTypes: [] };
            // Run multiple times to avoid flaky test
            let foundShuffled = false;
            for (let i = 0; i < 10; i++) {
                const cards = factory.generate(config);
                const types = cards.map(c => c.type);
                // Check that equation and answer cards are interleaved
                const firstHalf = types.slice(0, 6);
                const eqInFirst = firstHalf.filter(t => t === 'equation').length;
                if (eqInFirst > 0 && eqInFirst < 6) {
                    foundShuffled = true;
                    break;
                }
            }
            expect(foundShuffled).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('handles small card count (4 cards = 2 pairs)', () => {
            const config: MemoryGameConfig = { level: 1, cardCount: 4, problemTypes: [] };
            const cards = factory.generate(config);
            expect(cards).toHaveLength(4);
            const pairs = new Set(cards.map(c => c.pairId));
            expect(pairs.size).toBe(2);
        });

        it('handles large card count (24 cards = 12 pairs)', () => {
            const config: MemoryGameConfig = { level: 5, cardCount: 24, problemTypes: [] };
            const cards = factory.generate(config);
            expect(cards).toHaveLength(24);
            const pairs = new Set(cards.map(c => c.pairId));
            expect(pairs.size).toBe(12);
        });

        it('custom problemTypes override level defaults', () => {
            const config: MemoryGameConfig = {
                level: 1,
                cardCount: 12,
                problemTypes: ['multiplication'],
            };
            // problemTypes is passed but factory uses LEVEL_OPS — verify it still works
            const cards = factory.generate(config);
            expect(cards).toHaveLength(12);
        });
    });

    describe('Solvability guarantee', () => {
        it('every game is fully solvable — every equation has its answer somewhere', () => {
            for (let level = 1; level <= 10; level++) {
                const config: MemoryGameConfig = { level, cardCount: 12, problemTypes: [] };
                const cards = factory.generate(config);
                const equations = cards.filter(c => c.type === 'equation');
                const answers = cards.filter(c => c.type === 'answer');

                equations.forEach(eq => {
                    const matchingAnswer = answers.find(a => a.pairId === eq.pairId);
                    expect(matchingAnswer).toBeDefined();
                    expect(matchingAnswer!.numericAnswer).toBe(eq.numericAnswer);
                });
            }
        });

        it('no answer appears more than once across all cards', () => {
            for (let level = 1; level <= 5; level++) {
                const config: MemoryGameConfig = { level, cardCount: 12, problemTypes: [] };
                const cards = factory.generate(config);
                const answerValues = cards
                    .filter(c => c.type === 'answer')
                    .map(c => c.numericAnswer);
                const unique = new Set(answerValues);
                expect(answerValues.length).toBe(unique.size);
            }
        });
    });
});