/**
 * rollingWindow.ts — Standalone rolling-window adaptive difficulty module.
 *
 * Tracks the last N answers and computes accuracy/adaptation signals.
 * Used by GameDirector to make finer-grained difficulty adjustments
 * beyond the simple consecutive-failures/streak heuristics.
 */

export interface WindowEntry {
    correct: boolean;
    timestamp: number;
    responseTimeMs?: number;
}

export interface WindowStats {
    accuracy: number;          // 0..1
    count: number;             // entries in window
    correctCount: number;
    wrongCount: number;
    avgResponseTimeMs: number;
}

export interface AdaptationSignal {
    direction: 'easier' | 'harder' | 'steady';
    accuracy: number;
    confidence: number;        // 0..1 — how full the window is
}

export class RollingWindow {
    private entries: WindowEntry[] = [];
    private readonly maxSize: number;

    constructor(maxSize = 10) {
        this.maxSize = maxSize;
    }

    /** Add a result to the window, evicting the oldest if full. */
    push(entry: WindowEntry): void {
        this.entries.push(entry);
        if (this.entries.length > this.maxSize) {
            this.entries.shift();
        }
    }

    /** Clear all entries (e.g., on mode change). */
    reset(): void {
        this.entries = [];
    }

    /** Compute aggregate stats over the current window. */
    stats(): WindowStats {
        const count = this.entries.length;
        if (count === 0) {
            return { accuracy: 0, count: 0, correctCount: 0, wrongCount: 0, avgResponseTimeMs: 0 };
        }
        const correctCount = this.entries.filter(e => e.correct).length;
        const wrongCount = count - correctCount;
        const timedEntries = this.entries.filter(e => e.responseTimeMs != null);
        const avgResponseTimeMs = timedEntries.length > 0
            ? Math.round(timedEntries.reduce((sum, e) => sum + (e.responseTimeMs || 0), 0) / timedEntries.length)
            : 0;
        return {
            accuracy: correctCount / count,
            count,
            correctCount,
            wrongCount,
            avgResponseTimeMs,
        };
    }

    /**
     * Compute an adaptation signal based on accuracy thresholds.
     * - accuracy < easeThreshold → 'easier'
     * - accuracy > challengeThreshold → 'harder'
     * - else → 'steady'
     * Confidence scales with window fill (count/maxSize).
     */
    signal(easeThreshold = 0.4, challengeThreshold = 0.9): AdaptationSignal {
        const stats = this.stats();
        const confidence = stats.count / this.maxSize;
        let direction: AdaptationSignal['direction'] = 'steady';

        if (stats.count >= 3) {  // need at least 3 entries before adapting
            if (stats.accuracy < easeThreshold) {
                direction = 'easier';
            } else if (stats.accuracy > challengeThreshold) {
                direction = 'harder';
            }
        }

        return {
            direction,
            accuracy: stats.accuracy,
            confidence,
        };
    }

    /** Current window size (may be < maxSize until filled). */
    get size(): number {
        return this.entries.length;
    }

    /** Whether the window is full (size === maxSize). */
    get isFull(): boolean {
        return this.entries.length >= this.maxSize;
    }
}

/**
 * ROLLING_WINDOW_CONFIG — tunable constants for rolling-window adaptive difficulty.
 */
export const ROLLING_WINDOW_CONFIG = {
    WINDOW_SIZE: 10,
    EASE_THRESHOLD: 0.4,       // accuracy below 40% → ease
    CHALLENGE_THRESHOLD: 0.9,  // accuracy above 90% → challenge
    MIN_ENTRIES_BEFORE_ADAPT: 3,
    EASE_MULTIPLIERS: {
        distractorRatio: 0.7,   // reduce distractors by 30%
        spawnInterval: 1.3,     // slow spawns by 30%
        baseVelocity: 0.7,      // slow bubbles by 30%
    },
    CHALLENGE_MULTIPLIERS: {
        distractorRatio: 1.3,   // increase distractors by 30%
        spawnInterval: 0.8,     // speed spawns by 20%
        baseVelocity: 1.3,      // speed bubbles by 30%
    },
} as const;