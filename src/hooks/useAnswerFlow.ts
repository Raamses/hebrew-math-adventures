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
    const timeoutRef = useRef<number | null>(null);

    const onCorrectCompleteRef = useRef(onCorrectComplete);
    const onWrongCompleteRef = useRef(onWrongComplete);

    useEffect(() => {
        onCorrectCompleteRef.current = onCorrectComplete;
        onWrongCompleteRef.current = onWrongComplete;
    }, [onCorrectComplete, onWrongComplete]);

    // Clear timeout on unmount or reset
    const clearFlowTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        return clearFlowTimeout;
    }, [clearFlowTimeout]);

    const submitAnswer = useCallback((isCorrect: boolean) => {
        // Prevent double submission if already processing a result
        if (status !== 'idle') return;

        clearFlowTimeout();

        if (isCorrect) {
            setStatus('correct');
            timeoutRef.current = window.setTimeout(() => {
                setStatus('idle');
                onCorrectCompleteRef.current?.();
            }, correctDelay);
        } else {
            setStatus('wrong');
            timeoutRef.current = window.setTimeout(() => {
                setStatus('idle');
                onWrongCompleteRef.current?.();
            }, wrongDelay);
        }
    }, [status, correctDelay, wrongDelay, clearFlowTimeout]);

    const reset = useCallback(() => {
        clearFlowTimeout();
        setStatus('idle');
    }, [clearFlowTimeout]);

    return {
        status,
        isProcessing: status !== 'idle',
        submitAnswer,
        reset
    };
};
