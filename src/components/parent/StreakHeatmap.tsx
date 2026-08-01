import React from 'react';
import { useTranslation } from 'react-i18next';

interface StreakHeatmapProps {
    dailyStamps: string[];
}

/**
 * 7×5 grid (7 days × 5 weeks) GitHub-style heatmap.
 * Columns = weeks (oldest left, newest right in LTR; reversed for RTL).
 * Rows = days of week (Sun..Sat).
 */
export const StreakHeatmap: React.FC<StreakHeatmapProps> = ({ dailyStamps }) => {
    const { t } = useTranslation();
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Build a 5-week window ending today
    // 5 weeks = 35 days
    const totalDays = 35;
    const startOffset = totalDays - 1; // days back from today

    // Build grid: [week][day] where week 0 = oldest, week 4 = newest
    // day: 0=Sunday..6=Saturday
    const grid: { date: string; count: number }[][] = [];

    // Find the start (Sunday) of the week containing the oldest day
    const oldestDate = new Date(todayMidnight);
    oldestDate.setDate(oldestDate.getDate() - startOffset);
    const oldestSunday = new Date(oldestDate);
    oldestSunday.setDate(oldestSunday.getDate() - oldestSunday.getDay());

    for (let w = 0; w < 5; w++) {
        const week: { date: string; count: number }[] = [];
        for (let d = 0; d < 7; d++) {
            const cellDate = new Date(oldestSunday);
            cellDate.setDate(cellDate.getDate() + w * 7 + d);
            const dateStr = cellDate.toISOString().slice(0, 10);
            // Only count if cell is within range and not in the future
            const isFuture = cellDate > todayMidnight;
            const count = isFuture ? -1 : (dailyStamps.includes(dateStr) ? 1 : 0);
            week.push({ date: dateStr, count });
        }
        grid.push(week);
    }

    const getColor = (count: number): string => {
        if (count < 0) return '#f1f5f9'; // future — slate-100
        if (count === 0) return '#e2e8f0'; // no activity — slate-200
        if (count === 1) return '#22c55e'; // activity — green-500
        return '#15803d'; // multiple (shouldn't happen with stamps, but just in case) — green-700
    };

    const dayLabels: string[] = (t('parent.heatmap.dayLabels', { returnObjects: true }) as string[]) || ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    return (
        <div dir="rtl" className="w-full">
            <div className="flex gap-1">
                {/* Day labels column */}
                <div className="flex flex-col gap-1 justify-around" style={{ width: '16px' }}>
                    {dayLabels.map((label, i) => (
                        <div key={i} className="text-[10px] text-slate-400 font-medium text-center" style={{ height: '16px', lineHeight: '16px' }}>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Heatmap grid */}
                <div className="flex gap-1 flex-1">
                    {grid.map((week, wIdx) => (
                        <div key={wIdx} className="flex flex-col gap-1 flex-1">
                            {week.map((cell, dIdx) => (
                                <div
                                    key={dIdx}
                                    className="rounded-sm transition-all hover:ring-2 hover:ring-blue-300 cursor-default"
                                    style={{
                                        backgroundColor: getColor(cell.count),
                                        height: '16px',
                                        minHeight: '16px',
                                        aspectRatio: '1',
                                    }}
                                    title={cell.count < 0 ? t('parent.heatmap.future') : `${cell.date}${cell.count > 0 ? ' — ' + t('parent.heatmap.activity') : ''}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-[10px] text-slate-400">{t('parent.heatmap.less')}</span>
                <div className="flex gap-0.5">
                    <div className="w-3 h-3 rounded-sm bg-slate-200" />
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <div className="w-3 h-3 rounded-sm bg-green-700" />
                </div>
                <span className="text-[10px] text-slate-400">{t('parent.heatmap.more')}</span>
            </div>
        </div>
    );
};