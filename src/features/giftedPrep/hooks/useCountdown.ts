'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Seconds left in a mock section. Stops while `paused`; calls `onExpire` once at 0.
 * Measured against the clock (not tick counting), so a throttled background tab stays accurate.
 */
export function useCountdown(totalSec: number, paused: boolean, onExpire: () => void): number {
    const [left, setLeft] = useState(totalSec);
    const leftRef = useRef(totalSec);
    const expired = useRef(false);
    const expireRef = useRef(onExpire);
    useEffect(() => { expireRef.current = onExpire; }, [onExpire]);

    useEffect(() => {
        if (paused || expired.current) return;
        const startedAt = Date.now();
        const startLeft = leftRef.current;
        const id = window.setInterval(() => {
            const next = Math.max(0, startLeft - Math.floor((Date.now() - startedAt) / 1000));
            leftRef.current = next;
            setLeft(next);
            if (next === 0 && !expired.current) {
                expired.current = true;
                window.clearInterval(id);
                expireRef.current();
            }
        }, 250);
        return () => window.clearInterval(id);
    }, [paused]);

    return left;
}

export const mmss = (sec: number) => ({
    min: String(Math.floor(sec / 60)),
    sec: String(sec % 60).padStart(2, '0'),
});
