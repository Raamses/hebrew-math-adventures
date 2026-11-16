import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { StreakHeatmap } from '../StreakHeatmap';
import { getWeeklyData } from '../../../lib/skillAnalysis';

// 00:30 Israel on Tue 17 Nov 2026 = 22:30 UTC on the 16th. The old code built local midnights and printed them
// with toISOString(), so its newest day depended on the host time zone (UTC host: the 16th; Israel host: each
// cell one day early). The parent views must show the Israel day whatever the host's zone.
const NOW = new Date('2026-11-16T22:30:00Z');

describe('parent views align to the Israel day (F1.2)', () => {
    afterEach(() => vi.useRealTimers());

    it('the heatmap marks a stamp on the Israel today, and its newest cell is today', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW);
        const { container } = render(<StreakHeatmap dailyStamps={['2026-11-17', '2026-11-15']} />);
        const titles = [...container.querySelectorAll('[title]')].map(el => el.getAttribute('title') ?? '');
        const dated = titles.filter(t => /^\d{4}-\d{2}-\d{2}/.test(t));
        expect(dated.some(t => t.startsWith('2026-11-17 —'))).toBe(true); // today, with activity
        expect(dated.some(t => t.startsWith('2026-11-15 —'))).toBe(true);
        expect(dated.some(t => t.startsWith('2026-11-16 —'))).toBe(false);
        expect(dated.map(t => t.slice(0, 10)).sort().at(-1)).toBe('2026-11-17');
    });

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
