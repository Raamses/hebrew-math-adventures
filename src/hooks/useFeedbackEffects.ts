import { useCallback, useEffect, useRef, useState } from 'react';
import type { MascotEmotion } from '../components/mascot/Mascot';

// Effect lifetimes (ms) — deliberately decoupled from the answer lock.
// The lock controls when the next QUESTION appears; these control how long the
// REWARD stays on screen. Rewards outliving the lock is intentional, not a bug.
const BUBBLE_MS = 1400;    // long enough to read a short Hebrew phrase
const CONFETTI_MS = 2200;  // max particle delay (0.2s) + max duration (2.0s)

export const useFeedbackEffects = () => {
    const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('idle');
    const [mascotMessage, setMascotMessage] = useState('');
    const [showBubble, setShowBubble] = useState(false);
    const [showStars, setShowStars] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    // Bumped on every answer. Consumers key effect components off this so a new
    // answer remounts them and replays the animation from the start.
    const [burstId, setBurstId] = useState(0);

    const timers = useRef<number[]>([]);
    const clearTimers = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    }, []);
    useEffect(() => clearTimers, [clearTimers]);

    const schedule = useCallback((fn: () => void, ms: number) => {
        timers.current.push(window.setTimeout(fn, ms));
    }, []);

    const celebrate = useCallback((message: string) => {
        clearTimers(); // rapid answers restart cleanly rather than stacking
        setBurstId(id => id + 1);
        setMascotEmotion('excited');
        setMascotMessage(message);
        setShowBubble(true);
        setShowStars(true);
        setShowConfetti(true);
        schedule(() => { setShowBubble(false); setMascotEmotion('idle'); }, BUBBLE_MS);
        schedule(() => setShowConfetti(false), CONFETTI_MS);
    }, [clearTimers, schedule]);

    const encourage = useCallback((message: string) => {
        clearTimers();
        setBurstId(id => id + 1);
        setMascotEmotion('encourage');
        setMascotMessage(message);
        setShowBubble(true);
        schedule(() => { setShowBubble(false); setMascotEmotion('idle'); }, BUBBLE_MS);
    }, [clearTimers, schedule]);

    const clearStars = useCallback(() => setShowStars(false), []);

    const clearAll = useCallback(() => {
        clearTimers();
        setShowBubble(false);
        setShowStars(false);
        setShowConfetti(false);
        setMascotEmotion('idle');
    }, [clearTimers]);

    return {
        mascotEmotion, mascotMessage, showBubble, showStars, showConfetti, burstId,
        celebrate, encourage, clearStars, clearAll,
    };
};
