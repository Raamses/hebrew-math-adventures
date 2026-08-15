import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnomalyDetector, ANOMALY_CONFIG, type AnomalyAlert } from '../anomalyDetection';

describe('AnomalyDetector', () => {
    let detector: AnomalyDetector;

    beforeEach(() => {
        detector = new AnomalyDetector(1000);
    });

    it('starts with no answers and no alerts', () => {
        // Use a recent start time so session_duration_anomaly doesn't fire
        const detector = new AnomalyDetector(Date.now());
        const alerts = detector.check();
        expect(alerts).toHaveLength(0);
        const stats = detector.getStats();
        expect(stats.totalAnswers).toBe(0);
    });

    it('records answers and tracks stats', () => {
        detector.recordAnswer({ correct: true, timestamp: 2000, responseTimeMs: 1000 });
        detector.recordAnswer({ correct: false, timestamp: 3000, responseTimeMs: 2000 });
        const stats = detector.getStats();
        expect(stats.totalAnswers).toBe(2);
        expect(stats.accuracy).toBe(0.5);
        expect(stats.avgResponseTimeMs).toBe(1500);
    });

    it('detects rage clicking (>10 wrong in 30s)', () => {
        const now = Date.now();
        for (let i = 0; i < 12; i++) {
            detector.recordAnswer({ correct: false, timestamp: now + i * 1000, responseTimeMs: 500 });
        }
        const alerts = detector.check();
        const rage = alerts.find(a => a.type === 'rage_clicking');
        expect(rage).toBeDefined();
        expect(rage!.severity).toBe('warning');
        expect(rage!.context.wrong_count).toBe(12);
    });

    it('detects critical rage clicking (>15 wrong in 30s)', () => {
        const now = Date.now();
        for (let i = 0; i < 16; i++) {
            detector.recordAnswer({ correct: false, timestamp: now + i * 1000, responseTimeMs: 500 });
        }
        const alerts = detector.check();
        const rage = alerts.find(a => a.type === 'rage_clicking');
        expect(rage).toBeDefined();
        expect(rage!.severity).toBe('critical');
    });

    it('detects accuracy drop after baseline established', () => {
        const now = Date.now();
        // Establish high-accuracy baseline (20 correct)
        for (let i = 0; i < 20; i++) {
            detector.recordAnswer({ correct: true, timestamp: now + i * 2000, responseTimeMs: 1000 });
        }
        // Then drop to 0% accuracy for 10 answers
        for (let i = 0; i < 10; i++) {
            detector.recordAnswer({ correct: false, timestamp: now + (20 + i) * 2000, responseTimeMs: 1000 });
        }
        const alerts = detector.check();
        const drop = alerts.find(a => a.type === 'accuracy_drop');
        expect(drop).toBeDefined();
        expect(drop!.severity).toBe('critical'); // >50% drop
    });

    it('detects response time spike (3x baseline)', () => {
        const now = Date.now();
        // Establish baseline response times (~1000ms)
        for (let i = 0; i < 20; i++) {
            detector.recordAnswer({ correct: true, timestamp: now + i * 2000, responseTimeMs: 1000 });
        }
        // Then spike to 4000ms
        for (let i = 0; i < 5; i++) {
            detector.recordAnswer({ correct: true, timestamp: now + (20 + i) * 2000, responseTimeMs: 4000 });
        }
        const alerts = detector.check();
        const spike = alerts.find(a => a.type === 'response_time_spike');
        expect(spike).toBeDefined();
        expect(spike!.severity).toBe('info');
    });

    it('detects stall (no answers in 60s)', () => {
        const now = Date.now();
        detector.recordAnswer({ correct: true, timestamp: now - 90_000, responseTimeMs: 1000 });
        // Check 90 seconds later
        const alerts = detector.check();
        const stall = alerts.find(a => a.type === 'stall');
        expect(stall).toBeDefined();
        expect(stall!.severity).toBe('info');
    });

    it('does not alert when accuracy is stable', () => {
        const now = Date.now();
        for (let i = 0; i < 30; i++) {
            detector.recordAnswer({ correct: i % 2 === 0, timestamp: now + i * 2000, responseTimeMs: 1000 });
        }
        const alerts = detector.check();
        expect(alerts.filter(a => a.type === 'accuracy_drop')).toHaveLength(0);
    });

    it('resets correctly', () => {
        for (let i = 0; i < 5; i++) {
            detector.recordAnswer({ correct: true, timestamp: i * 1000, responseTimeMs: 1000 });
        }
        detector.reset();
        expect(detector.getStats().totalAnswers).toBe(0);
        expect(detector.check()).toHaveLength(0);
    });

    it('lastAlertsSnapshot returns last check results', () => {
        const now = Date.now();
        for (let i = 0; i < 12; i++) {
            detector.recordAnswer({ correct: false, timestamp: now + i * 1000, responseTimeMs: 500 });
        }
        detector.check();
        const snapshot = detector.lastAlertsSnapshot;
        expect(snapshot.length).toBeGreaterThan(0);
    });

    it('ANOMALY_CONFIG has expected values', () => {
        expect(ANOMALY_CONFIG.RAGE_CLICK_THRESHOLD).toBe(10);
        expect(ANOMALY_CONFIG.RAGE_CLICK_WINDOW_MS).toBe(30_000);
        expect(ANOMALY_CONFIG.ACCURACY_DROP_THRESHOLD).toBe(0.3);
        expect(ANOMALY_CONFIG.STALL_THRESHOLD_MS).toBe(60_000);
    });

    it('caps tracked answers at MAX_TRACKED_ANSWERS', () => {
        for (let i = 0; i < 100; i++) {
            detector.recordAnswer({ correct: true, timestamp: i * 1000, responseTimeMs: 1000 });
        }
        // Internal cap is 50, but getStats works on the capped buffer
        const stats = detector.getStats();
        expect(stats.totalAnswers).toBeLessThanOrEqual(50);
    });
});