import { describe, it, expect, beforeEach } from 'vitest';
import { RollingWindow, ROLLING_WINDOW_CONFIG } from '../rollingWindow';

describe('RollingWindow', () => {
    let rw: RollingWindow;

    beforeEach(() => {
        rw = new RollingWindow(10);
    });

    it('starts empty', () => {
        expect(rw.size).toBe(0);
        expect(rw.isFull).toBe(false);
        const stats = rw.stats();
        expect(stats.count).toBe(0);
        expect(stats.accuracy).toBe(0);
    });

    it('adds entries and tracks size', () => {
        rw.push({ correct: true, timestamp: 1 });
        rw.push({ correct: false, timestamp: 2 });
        expect(rw.size).toBe(2);
        expect(rw.stats().count).toBe(2);
    });

    it('evicts oldest entries when full', () => {
        for (let i = 0; i < 15; i++) {
            rw.push({ correct: i % 2 === 0, timestamp: i });
        }
        expect(rw.size).toBe(10);
        expect(rw.isFull).toBe(true);
    });

    it('computes accuracy correctly', () => {
        rw.push({ correct: true, timestamp: 1 });
        rw.push({ correct: true, timestamp: 2 });
        rw.push({ correct: false, timestamp: 3 });
        rw.push({ correct: true, timestamp: 4 });
        const stats = rw.stats();
        expect(stats.accuracy).toBe(0.75);
        expect(stats.correctCount).toBe(3);
        expect(stats.wrongCount).toBe(1);
    });

    it('computes average response time', () => {
        rw.push({ correct: true, timestamp: 1, responseTimeMs: 1000 });
        rw.push({ correct: false, timestamp: 2, responseTimeMs: 3000 });
        const stats = rw.stats();
        expect(stats.avgResponseTimeMs).toBe(2000);
    });

    it('handles entries without response time', () => {
        rw.push({ correct: true, timestamp: 1 });
        rw.push({ correct: true, timestamp: 2, responseTimeMs: 2000 });
        const stats = rw.stats();
        expect(stats.avgResponseTimeMs).toBe(2000);
    });

    it('returns steady signal when accuracy is mid-range', () => {
        for (let i = 0; i < 10; i++) {
            rw.push({ correct: i % 2 === 0, timestamp: i });
        }
        const signal = rw.signal();
        expect(signal.direction).toBe('steady');
        expect(signal.accuracy).toBe(0.5);
        expect(signal.confidence).toBe(1);
    });

    it('returns easier signal when accuracy is low', () => {
        for (let i = 0; i < 10; i++) {
            rw.push({ correct: i < 3, timestamp: i }); // 30% accuracy
        }
        const signal = rw.signal();
        expect(signal.direction).toBe('easier');
        expect(signal.accuracy).toBe(0.3);
    });

    it('returns harder signal when accuracy is high', () => {
        for (let i = 0; i < 10; i++) {
            rw.push({ correct: i < 10, timestamp: i }); // 100% accuracy (above 0.9 threshold)
        }
        const signal = rw.signal();
        expect(signal.direction).toBe('harder');
        expect(signal.accuracy).toBe(1);
    });

    it('returns steady with fewer than 3 entries', () => {
        rw.push({ correct: false, timestamp: 1 });
        rw.push({ correct: false, timestamp: 2 });
        const signal = rw.signal();
        expect(signal.direction).toBe('steady');
    });

    it('resets correctly', () => {
        for (let i = 0; i < 5; i++) {
            rw.push({ correct: true, timestamp: i });
        }
        rw.reset();
        expect(rw.size).toBe(0);
        expect(rw.stats().count).toBe(0);
    });

    it('confidence scales with window fill', () => {
        rw.push({ correct: true, timestamp: 1 });
        const signal = rw.signal();
        expect(signal.confidence).toBe(0.1); // 1/10
    });

    it('uses custom thresholds', () => {
        const rw2 = new RollingWindow(5);
        for (let i = 0; i < 5; i++) {
            rw2.push({ correct: i < 4, timestamp: i }); // 80% accuracy
        }
        // With default thresholds (0.4, 0.9), 80% is steady
        expect(rw2.signal().direction).toBe('steady');
        // With lower challenge threshold, 80% triggers harder
        expect(rw2.signal(0.3, 0.7).direction).toBe('harder');
    });

    it('ROLLING_WINDOW_CONFIG has expected values', () => {
        expect(ROLLING_WINDOW_CONFIG.WINDOW_SIZE).toBe(10);
        expect(ROLLING_WINDOW_CONFIG.EASE_THRESHOLD).toBe(0.4);
        expect(ROLLING_WINDOW_CONFIG.CHALLENGE_THRESHOLD).toBe(0.9);
    });
});