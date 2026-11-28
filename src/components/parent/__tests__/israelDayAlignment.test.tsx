import { describe, it, expect, afterEach, vi } from 'vitest';
import { getWeeklyData } from '../../../lib/skillAnalysis';

// 00:30 Israel on Tue 17 Nov 2026 = 22:30 UTC on the 16th. The old code built local midnights and printed them
// with toISOString(), so its newest day depended on the host time zone (UTC host: the 16th; Israel host: each
// cell one day early). The parent views must show the Israel day whatever the host's zone.
const NOW = new Date('2026-11-16T22:30:00Z');

describe('parent views align to the Israel day (F1.2)', () => {
    afterEach(() => vi.useRealTimers());

    it('the weekly chart ends on the Israel today with the right weekday', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW);
        const days = getWeeklyData([
            { date: '2026-11-17', durationSec: 60, correct: 5, attempts: 6, skillFocus: 'add', gameMode: 'bubble' },
        ]);
        expect(days.map(d => d.date)).toEqual([
            '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17',
        ]);
        expect(days[6].dayIndex).toBe(2); // Tuesday
        expect(days[6].correct).toBe(5);
    });
});
