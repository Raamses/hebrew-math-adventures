import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemoryGame } from '../../hooks/useMemoryGame';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useMemoryGame', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    it('initializes with playing status and correct card count', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        expect(result.current.cards).toHaveLength(12);
        expect(result.current.status).toBe('playing');
        expect(result.current.matchedCount).toBe(0);
        expect(result.current.moves).toBe(0);
        expect(result.current.elapsedTime).toBe(0);
    });

    it('all cards start face-down (isFlipped=false, isMatched=false)', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        result.current.cards.forEach(card => {
            expect(card.isFlipped).toBe(false);
            expect(card.isMatched).toBe(false);
        });
    });

    it('flips a card when flipCard is called', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        act(() => {
            result.current.flipCard(0);
        });

        expect(result.current.cards[0].isFlipped).toBe(true);
    });

    it('does not flip a card when game is not playing', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        // Game starts in 'idle' status — no initGame called
        act(() => {
            result.current.flipCard(0);
        });

        // Cards array is empty or card not flipped
        const card = result.current.cards[0];
        expect(card?.isFlipped ?? false).toBe(false);
    });

    it('does not flip an already flipped card', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        act(() => {
            result.current.flipCard(0);
        });

        expect(result.current.cards[0].isFlipped).toBe(true);

        act(() => {
            result.current.flipCard(0); // Should be ignored
        });

        const flipped = result.current.cards.filter(c => c.isFlipped);
        expect(flipped.length).toBe(1);
    });

    it('totalPairs equals cardCount / 2', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        expect(result.current.totalPairs).toBe(6);
    });

    it('does not flip more than 2 cards at once', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 12, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        // Flip first card
        act(() => {
            result.current.flipCard(0);
        });

        // Flip second card
        act(() => {
            result.current.flipCard(1);
        });

        // Try to flip third — should be ignored because 2 already flipped
        act(() => {
            result.current.flipCard(2);
        });

        const flipped = result.current.cards.filter(c => c.isFlipped);
        expect(flipped.length).toBeLessThanOrEqual(2);
    });

    it('matches a correct pair and marks them as matched', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 4, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        // Find the pair indices
        const cards = result.current.cards;
        const pair0Eq = cards.findIndex(c => c.pairId === 'pair-0' && c.type === 'equation');
        const pair0Ans = cards.findIndex(c => c.pairId === 'pair-0' && c.type === 'answer');

        expect(pair0Eq).toBeGreaterThanOrEqual(0);
        expect(pair0Ans).toBeGreaterThanOrEqual(0);

        // Flip equation card
        act(() => {
            result.current.flipCard(pair0Eq);
        });

        // Flip answer card — this triggers the match check
        act(() => {
            result.current.flipCard(pair0Ans);
        });

        // Should be matched
        expect(result.current.cards[pair0Eq].isMatched).toBe(true);
        expect(result.current.cards[pair0Ans].isMatched).toBe(true);
        expect(result.current.matchedCount).toBe(1);
        expect(result.current.moves).toBe(1);
    });

    it('flips back unmatched cards after delay', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 4, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        // Find indices of different pairs
        const cards = result.current.cards;
        const pair0Idx = cards.findIndex(c => c.pairId === 'pair-0');
        const pair1Idx = cards.findIndex(c => c.pairId === 'pair-1');

        // Flip two cards from different pairs (wrong match)
        act(() => {
            result.current.flipCard(pair0Idx);
        });

        act(() => {
            result.current.flipCard(pair1Idx);
        });

        // Both should be flipped but not matched
        expect(result.current.cards[pair0Idx].isFlipped).toBe(true);
        expect(result.current.cards[pair1Idx].isFlipped).toBe(true);
        expect(result.current.cards[pair0Idx].isMatched).toBe(false);
        expect(result.current.cards[pair1Idx].isMatched).toBe(false);
        expect(result.current.wrongPair).toHaveLength(2);

        // Advance timer to trigger flip-back
        act(() => {
            vi.advanceTimersByTime(1100);
        });

        // Cards should be flipped back
        expect(result.current.cards[pair0Idx].isFlipped).toBe(false);
        expect(result.current.cards[pair1Idx].isFlipped).toBe(false);
        expect(result.current.wrongPair).toHaveLength(0);

        vi.useRealTimers();
    });

    it('completes the game when all pairs are matched', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 4, problemTypes: [] }, // 2 pairs
        }));

        act(() => {
            result.current.initGame();
        });

        // Match pair-0
        let cards = result.current.cards;
        const p0eq = cards.findIndex(c => c.pairId === 'pair-0' && c.type === 'equation');
        const p0ans = cards.findIndex(c => c.pairId === 'pair-0' && c.type === 'answer');
        act(() => {
            result.current.flipCard(p0eq);
        });
        act(() => {
            result.current.flipCard(p0ans);
        });

        expect(result.current.matchedCount).toBe(1);
        expect(result.current.status).toBe('playing');

        // Match pair-1
        cards = result.current.cards;
        const p1eq = cards.findIndex(c => c.pairId === 'pair-1' && c.type === 'equation');
        const p1ans = cards.findIndex(c => c.pairId === 'pair-1' && c.type === 'answer');
        act(() => {
            result.current.flipCard(p1eq);
        });
        act(() => {
            result.current.flipCard(p1ans);
        });

        expect(result.current.matchedCount).toBe(2);
        expect(result.current.status).toBe('complete');
    });

    it('tracks moves correctly', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 4, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        expect(result.current.moves).toBe(0);

        // Flip a matching pair = 1 move
        const cards = result.current.cards;
        const p0eq = cards.findIndex(c => c.pairId === 'pair-0' && c.type === 'equation');
        const p0ans = cards.findIndex(c => c.pairId === 'pair-0' && c.type === 'answer');

        act(() => {
            result.current.flipCard(p0eq);
        });
        act(() => {
            result.current.flipCard(p0ans);
        });

        expect(result.current.moves).toBe(1);
    });

    it('saves best score to localStorage on completion', () => {
        const { result } = renderHook(() => useMemoryGame({
            config: { level: 1, cardCount: 4, problemTypes: [] },
        }));

        act(() => {
            result.current.initGame();
        });

        // Match both pairs
        for (let pairNum = 0; pairNum < 2; pairNum++) {
            const cards = result.current.cards;
            const eqIdx = cards.findIndex(c => c.pairId === `pair-${pairNum}` && c.type === 'equation');
            const ansIdx = cards.findIndex(c => c.pairId === `pair-${pairNum}` && c.type === 'answer');
            act(() => {
                result.current.flipCard(eqIdx);
            });
            act(() => {
                result.current.flipCard(ansIdx);
            });
        }

        // Best score should be saved
        const stored = localStorageMock.getItem('hebrew-math-memory-best');
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.bestTime).toBeDefined();
        expect(parsed.bestMoves).toBeDefined();
    });
});