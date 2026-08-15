/**
 * anomalyDetection.ts — Standalone anomaly detection & session health alerts.
 *
 * Detects unusual patterns in gameplay sessions and emits structured alerts
 * that can be logged to GA4 and/or surfaced to the UI.
 */

export type AnomalyType =
    | 'accuracy_drop'
    | 'session_duration_anomaly'
    | 'rage_clicking'
    | 'response_time_spike'
    | 'stall';

export type Severity = 'info' | 'warning' | 'critical';

export interface AnomalyAlert {
    type: AnomalyType;
    severity: Severity;
    message: string;
    context: Record<string, number | string | boolean>;
    timestamp: number;
}

interface AnswerRecord {
    correct: boolean;
    timestamp: number;
    responseTimeMs: number;
}

/**
 * AnomalyDetector — stateful detector that ingests answers and session metrics.
 *
 * Usage:
 *   const detector = new AnomalyDetector();
 *   detector.recordAnswer({ correct: false, timestamp: Date.now(), responseTimeMs: 5000 });
 *   const alerts = detector.check();
 *   // → [{ type: 'rage_clicking', severity: 'warning', ... }]
 */
export class AnomalyDetector {
    private answers: AnswerRecord[] = [];
    private sessionStartTime: number;
    private readonly maxTrackedAnswers = 50;
    private lastAlerts: AnomalyAlert[] = [];

    // Baseline stats (rolling, updated as data comes in)
    private baselineAccuracy: number | null = null;
    private baselineResponseTime: number | null = null;
    private readonly baselineWindowSize = 20;

    constructor(startTime = Date.now()) {
        this.sessionStartTime = startTime;
    }

    /** Record an answer event. */
    recordAnswer(record: AnswerRecord): void {
        this.answers.push(record);
        if (this.answers.length > this.maxTrackedAnswers) {
            this.answers.shift();
        }
        this.updateBaseline();
    }

    /** Update rolling baseline stats from the oldest entries. */
    private updateBaseline(): void {
        if (this.answers.length < this.baselineWindowSize) return;
        const baselineSlice = this.answers.slice(0, this.baselineWindowSize);
        const correct = baselineSlice.filter(a => a.correct).length;
        this.baselineAccuracy = correct / baselineSlice.length;
        this.baselineResponseTime = baselineSlice.reduce((sum, a) => sum + a.responseTimeMs, 0) / baselineSlice.length;
    }

    /** Check for anomalies and return any new alerts. */
    check(): AnomalyAlert[] {
        const alerts: AnomalyAlert[] = [];
        const now = Date.now();

        // 1. Accuracy drop — current accuracy >30% below baseline
        if (this.baselineAccuracy !== null && this.answers.length >= this.baselineWindowSize + 5) {
            const recent = this.answers.slice(-10);
            const recentAccuracy = recent.filter(a => a.correct).length / recent.length;
            const drop = this.baselineAccuracy - recentAccuracy;
            if (drop > 0.3) {
                alerts.push({
                    type: 'accuracy_drop',
                    severity: drop > 0.5 ? 'critical' : 'warning',
                    message: `Accuracy dropped ${(drop * 100).toFixed(0)}% below baseline`,
                    context: {
                        baseline_accuracy: this.baselineAccuracy,
                        recent_accuracy: recentAccuracy,
                        drop_percent: Math.round(drop * 100),
                    },
                    timestamp: now,
                });
            }
        }

        // 2. Rage clicking — >10 wrong answers in 30 seconds
        const windowMs = 30_000;
        const recentAnswers = this.answers.filter(a => now - a.timestamp <= windowMs);
        const wrongInWindow = recentAnswers.filter(a => !a.correct).length;
        if (wrongInWindow > 10) {
            alerts.push({
                type: 'rage_clicking',
                severity: wrongInWindow > 15 ? 'critical' : 'warning',
                message: `${wrongInWindow} wrong answers in 30 seconds`,
                context: {
                    wrong_count: wrongInWindow,
                    window_ms: windowMs,
                },
                timestamp: now,
            });
        }

        // 3. Response time spike — recent responses 3x baseline
        if (this.baselineResponseTime !== null && this.answers.length >= this.baselineWindowSize + 5) {
            const recent = this.answers.slice(-5);
            const avgRecent = recent.reduce((sum, a) => sum + a.responseTimeMs, 0) / recent.length;
            if (avgRecent > this.baselineResponseTime * 3) {
                alerts.push({
                    type: 'response_time_spike',
                    severity: 'info',
                    message: `Response time spiked to ${Math.round(avgRecent)}ms (3x baseline)`,
                    context: {
                        baseline_ms: Math.round(this.baselineResponseTime),
                        recent_ms: Math.round(avgRecent),
                    },
                    timestamp: now,
                });
            }
        }

        // 4. Session duration anomaly — session is 3x normal (~10 min = 600s)
        const sessionDurationMs = now - this.sessionStartTime;
        const normalDurationMs = 600_000; // 10 minutes
        if (sessionDurationMs > normalDurationMs * 3) {
            alerts.push({
                type: 'session_duration_anomaly',
                severity: 'info',
                message: `Session running for ${Math.round(sessionDurationMs / 60_000)} minutes`,
                context: {
                    duration_ms: sessionDurationMs,
                    expected_ms: normalDurationMs,
                },
                timestamp: now,
            });
        }

        // 5. Stall — no answers in the last 60 seconds
        if (this.answers.length > 0) {
            const lastAnswerTime = this.answers[this.answers.length - 1].timestamp;
            const silenceMs = now - lastAnswerTime;
            if (silenceMs > 60_000) {
                alerts.push({
                    type: 'stall',
                    severity: 'info',
                    message: `No answers in ${Math.round(silenceMs / 1000)}s — possible stall`,
                    context: {
                        silence_ms: Math.round(silenceMs),
                    },
                    timestamp: now,
                });
            }
        }

        this.lastAlerts = alerts;
        return alerts;
    }

    /** Get the last set of alerts without re-checking. */
    get lastAlertsSnapshot(): AnomalyAlert[] {
        return this.lastAlerts;
    }

    /** Reset the detector (e.g., on new session). */
    reset(): void {
        this.answers = [];
        this.lastAlerts = [];
        this.baselineAccuracy = null;
        this.baselineResponseTime = null;
        this.sessionStartTime = Date.now();
    }

    /** Get current stats summary. */
    getStats(): { totalAnswers: number; accuracy: number; avgResponseTimeMs: number } {
        if (this.answers.length === 0) {
            return { totalAnswers: 0, accuracy: 0, avgResponseTimeMs: 0 };
        }
        const correct = this.answers.filter(a => a.correct).length;
        const avgRt = this.answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / this.answers.length;
        return {
            totalAnswers: this.answers.length,
            accuracy: correct / this.answers.length,
            avgResponseTimeMs: Math.round(avgRt),
        };
    }
}

/**
 * ANOMALY_CONFIG — tunable constants for anomaly detection thresholds.
 */
export const ANOMALY_CONFIG = {
    ACCURACY_DROP_THRESHOLD: 0.3,       // 30% drop triggers alert
    ACCURACY_DROP_CRITICAL: 0.5,        // 50% drop is critical
    RAGE_CLICK_THRESHOLD: 10,            // wrong answers in window
    RAGE_CLICK_CRITICAL: 15,
    RAGE_CLICK_WINDOW_MS: 30_000,       // 30 seconds
    RESPONSE_TIME_SPIKE_FACTOR: 3,      // 3x baseline
    STALL_THRESHOLD_MS: 60_000,         // 60 seconds of silence
    SESSION_DURATION_NORMAL_MS: 600_000, // 10 minutes
    SESSION_DURATION_ANOMALY_FACTOR: 3,  // 3x normal
    BASELINE_WINDOW_SIZE: 20,
    MAX_TRACKED_ANSWERS: 50,
} as const;