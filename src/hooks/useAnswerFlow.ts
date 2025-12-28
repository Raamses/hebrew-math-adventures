import { useState, useEffect, useRef, useCallback } from 'react';

export type AnswerStatus = 'idle' | 'correct' | 'wrong';

interface UseAnswerFlowProps {
    onCorrectComplete?: () => void;
    onWrongComplete?: () => void;
    correctDelay?: number;
    wrongDelay?: number;
}

export const useAnswerFlow = ({
    onCorrectComplete,
    onWrongComplete,
    correctDelay = 2000,
    wrongDelay = 500,
}: UseAnswerFlowProps = {}) => {
    const [status, setStatus] = useState<AnswerStatus>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const submitAnswer = useCallback((isCorrect: boolean) => {
        if (isProcessing) return;

        setIsProcessing(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (isCorrect) {
            setStatus('correct');
            timeoutRef.current = setTimeout(() => {
                setStatus('idle');
                setIsProcessing(false);
                onCorrectComplete?.();
            }, correctDelay);
        } else {
            setStatus('wrong');
            // For wrong answers, logic is:
            // 1. Show 'wrong' state (feedback)
            // 2. Wait for delay
            // 3. Return to 'idle' to allow retry
            timeoutRef.current = setTimeout(() => {
                setStatus('idle');
                setIsProcessing(false);
                onWrongComplete?.();
            }, wrongDelay);
        }
    }, [isProcessing, correctDelay, wrongDelay, onCorrectComplete, onWrongComplete]);

    const reset = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus('idle');
        setIsProcessing(false);
    }, []);

    return {
        status,
        isProcessing,
        submitAnswer,
        reset
    };
};
