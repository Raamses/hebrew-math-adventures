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
    const [bestScore, setBestScore] = useState<MemoryBestScore>({ bestTime: null, bestMoves: null });
    const loadBestScore = useCallback(() => {
        try {
            const raw = localStorage.getItem(BEST_SCORE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                setBestScore({
                    bestTime: parsed.bestTime ?? null,
                    bestMoves: parsed.bestMoves ?? null,
                });
            }
        } catch {
            // ignore parse errors
        }
    }, []);

    // Save best score to localStorage
    const saveBestScore = useCallback((time: number, movesCount: number) => {
        try {
            const raw = localStorage.getItem(BEST_SCORE_KEY);
            const current = raw ? JSON.parse(raw) : { bestTime: null, bestMoves: null };
            const newBest = {
                bestTime: current.bestTime === null || time < current.bestTime ? time : current.bestTime,
                bestMoves: current.bestMoves === null || movesCount < current.bestMoves ? movesCount : current.bestMoves,
            };
            localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(newBest));
            setBestScore(newBest);
        } catch {
            // ignore storage errors
        }
    }, []);

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
            if (timerRef.current) clearInterval(timerRef.current);
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
        cardsRef.current = newCards;
        flippedRef.current = [];
        statusRef.current = 'playing';
        wrongRef.current = [];
        movesRef.current = 0;
        elapsedTimeRef.current = 0;
        if (flipBackTimer.current) {
            clearTimeout(flipBackTimer.current);
            flipBackTimer.current = null;
        }
        loadBestScore();
    }, [factory, config, profile, loadBestScore]);

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
        const newCards = currentCards.map((card, i) =>
            i === index ? { ...card, isFlipped: true } : card
        );
        cardsRef.current = newCards;
        setCards(newCards);

        const newFlipped = [...currentFlipped, index];
        flippedRef.current = newFlipped;
        setFlippedIndices(newFlipped);

        // When two cards are flipped, check for a match
        if (newFlipped.length === 2) {
            const [idx1, idx2] = newFlipped;
            const card1 = currentCards[idx1];
            const card2 = currentCards[idx2];

            // Increment moves
            const newMoves = movesRef.current + 1;
            movesRef.current = newMoves;
            setMoves(newMoves);

            // Check if they're a matching pair (same pairId)
            if (card1.pairId === card2.pairId) {
                // Match! Mark both as matched
                const matchedCards = newCards.map((card, i) =>
                    i === idx1 || i === idx2
                        ? { ...card, isMatched: true }
                        : card
                );
                cardsRef.current = matchedCards;
                setCards(matchedCards);
                flippedRef.current = [];
                setFlippedIndices([]);

                const newMatchedCount = matchedCount + 1;
                if (newMatchedCount === totalPairsRef.current) {
                    statusRef.current = 'complete';
                    setStatus('complete');
                    saveBestScore(elapsedTimeRef.current, newMoves);
                }
                setMatchedCount(newMatchedCount);
            } else {
                // No match — flip back after 1s
                wrongRef.current = [idx1, idx2];
                setWrongPair([idx1, idx2]);
                flipBackTimer.current = setTimeout(() => {
                    const flippedBack = cardsRef.current.map((card, i) =>
                        i === idx1 || i === idx2
                            ? { ...card, isFlipped: false }
                            : card
                    );
                    cardsRef.current = flippedBack;
                    setCards(flippedBack);
                    flippedRef.current = [];
                    setFlippedIndices([]);
                    wrongRef.current = [];
                    setWrongPair([]);
                }, 1000);
            }
        }
    }, [matchedCount, saveBestScore]);

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
        bestScore,
        initGame,
        flipCard,
    };
}