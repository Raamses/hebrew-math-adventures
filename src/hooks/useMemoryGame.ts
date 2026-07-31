import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MemoryFactory, type MemoryCard, type MemoryGameConfig } from '../engines/memory/MemoryFactory';
import type { UserCapabilityProfile } from '../types/progress';

export interface MemoryGameStats {
    time: number;
    moves: number;
    matchedCount: number;
    totalPairs: number;
    isComplete: boolean;
}

export interface MemoryBestScore {
    bestTime: number | null;
    bestMoves: number | null;
}

const BEST_SCORE_KEY = 'hebrew-math-memory-best';

type GameStatus = 'idle' | 'playing' | 'complete';

interface UseMemoryGameOptions {
    config: MemoryGameConfig;
    profile?: UserCapabilityProfile;
}

export function useMemoryGame({ config, profile }: UseMemoryGameOptions) {
    const factory = useMemo(() => new MemoryFactory(), []);

    const [cards, setCards] = useState<MemoryCard[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [matchedCount, setMatchedCount] = useState(0);
    const [moves, setMoves] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [status, setStatus] = useState<GameStatus>('idle');
    const [wrongPair, setWrongPair] = useState<number[]>([]);

    // Refs to avoid stale closures in flipCard
    const cardsRef = useRef<MemoryCard[]>([]);
    const flippedRef = useRef<number[]>([]);
    const statusRef = useRef<GameStatus>('idle');
    const wrongRef = useRef<number[]>([]);
    const movesRef = useRef(0);
    const elapsedTimeRef = useRef(0);
    const totalPairsRef = useRef(Math.floor(config.cardCount / 2));

    // Keep refs in sync with state
    useEffect(() => { cardsRef.current = cards; }, [cards]);
    useEffect(() => { flippedRef.current = flippedIndices; }, [flippedIndices]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { wrongRef.current = wrongPair; }, [wrongPair]);
    useEffect(() => { movesRef.current = moves; }, [moves]);
    useEffect(() => { elapsedTimeRef.current = elapsedTime; }, [elapsedTime]);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const flipBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const totalPairs = Math.floor(config.cardCount / 2);

    // Load best score from localStorage
    const loadBestScore = useCallback((): MemoryBestScore => {
        try {
            const raw = localStorage.getItem(BEST_SCORE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    bestTime: parsed.bestTime ?? null,
                    bestMoves: parsed.bestMoves ?? null,
                };
            }
        } catch {
            // ignore parse errors
        }
        return { bestTime: null, bestMoves: null };
    }, []);

    // Save best score to localStorage
    const saveBestScore = useCallback((time: number, moves: number) => {
        try {
            const current = loadBestScore();
            const newBest = {
                bestTime: current.bestTime === null || time < current.bestTime ? time : current.bestTime,
                bestMoves: current.bestMoves === null || moves < current.bestMoves ? moves : current.bestMoves,
            };
            localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(newBest));
        } catch {
            // ignore storage errors
        }
    }, [loadBestScore]);

    // Start the timer when game is playing
    useEffect(() => {
        if (status === 'playing') {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [status]);

    // Cleanup flip-back timer on unmount
    useEffect(() => {
        return () => {
            if (flipBackTimer.current) clearTimeout(flipBackTimer.current);
        };
    }, []);

    // Initialize / restart the game
    const initGame = useCallback(() => {
        const newCards = factory.generate(config, profile);
        setCards(newCards);
        setFlippedIndices([]);
        setMatchedCount(0);
        setMoves(0);
        setElapsedTime(0);
        setWrongPair([]);
        setStatus('playing');
        if (flipBackTimer.current) {
            clearTimeout(flipBackTimer.current);
            flipBackTimer.current = null;
        }
    }, [factory, config, profile]);

    // Flip a card at the given index — uses refs to avoid stale closures
    const flipCard = useCallback((index: number) => {
        // Read current state from refs
        const currentCards = cardsRef.current;
        const currentFlipped = flippedRef.current;
        const currentStatus = statusRef.current;
        const currentWrong = wrongRef.current;

        if (currentStatus !== 'playing') return;
        if (index < 0 || index >= currentCards.length) return;

        // Can't flip already matched or already flipped cards
        if (currentCards[index].isMatched || currentCards[index].isFlipped) return;

        // Can't flip more than 2 at a time
        if (currentFlipped.length >= 2) return;

        // Can't flip during wrong-pair animation
        if (currentWrong.length > 0) return;

        // Flip the card
        setCards(prev => prev.map((card, i) =>
            i === index ? { ...card, isFlipped: true } : card
        ));

        const newFlipped = [...currentFlipped, index];
        setFlippedIndices(newFlipped);

        // When two cards are flipped, check for a match
        if (newFlipped.length === 2) {
            const [idx1, idx2] = newFlipped;
            const card1 = currentCards[idx1];
            const card2 = currentCards[idx2];

            // Increment moves
            setMoves(prev => prev + 1);

            // Check if they're a matching pair (same pairId)
            if (card1.pairId === card2.pairId) {
                // Match! Mark both as matched
                setCards(prev => prev.map((card, i) =>
                    i === idx1 || i === idx2
                        ? { ...card, isMatched: true }
                        : card
                ));
                setFlippedIndices([]);

                setMatchedCount(prev => {
                    const newCount = prev + 1;
                    if (newCount === totalPairsRef.current) {
                        setStatus('complete');
                        saveBestScore(elapsedTimeRef.current, movesRef.current + 1);
                    }
                    return newCount;
                });
            } else {
                // No match — flip back after 1s
                setWrongPair([idx1, idx2]);
                flipBackTimer.current = setTimeout(() => {
                    setCards(prev => prev.map((card, i) =>
                        i === idx1 || i === idx2
                            ? { ...card, isFlipped: false }
                            : card
                    ));
                    setFlippedIndices([]);
                    setWrongPair([]);
                }, 1000);
            }
        }
    }, [saveBestScore]);

    const stats: MemoryGameStats = {
        time: elapsedTime,
        moves,
        matchedCount,
        totalPairs,
        isComplete: status === 'complete',
    };

    return {
        cards,
        flippedIndices,
        matchedCount,
        moves,
        elapsedTime,
        status,
        wrongPair,
        totalPairs,
        stats,
        bestScore: loadBestScore(),
        initGame,
        flipCard,
    };
}