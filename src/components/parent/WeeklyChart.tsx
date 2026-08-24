import React from 'react';
import type { WeeklyBarData } from '../../lib/skillAnalysis';

interface WeeklyChartProps {
    data: WeeklyBarData[];
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({ data }) => {
    const maxCorrect = Math.max(...data.map(d => d.correct), 1);
    const barAreaHeight = 100; // px for bars
    const chartHeight = 120;  // total SVG height
    const gap = 8;
    const barWidth = 100 / data.length;

    return (
        <div className="w-full">
            <svg
                viewBox={`0 0 100 ${chartHeight}`}
                preserveAspectRatio="none"
                className="w-full"
                style={{ height: '120px' }}
            >
                <defs>
                    <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                </defs>

                {/* Bars */}
                {data.map((d, i) => {
                    const barH = d.correct > 0 ? (d.correct / maxCorrect) * barAreaHeight : 0;
                    const x = i * barWidth + gap / 2;
                    const w = barWidth - gap;
                    const y = barAreaHeight - barH;
                    return (
                        <g key={i}>
                            <rect
                                x={x}
                                y={y}
                                width={w}
                                height={barH}
                                fill="url(#barGradient)"
                                rx="1.5"
                                opacity={d.correct > 0 ? 1 : 0.15}
                            />
                            {d.correct > 0 && (
                                <text
                                    x={x + w / 2}
                                    y={y - 1.5}
                                    textAnchor="middle"
                                    fontSize="3.5"
                                    fill="#1e40af"
                                    fontWeight="bold"
                                >
                                    {d.correct}
                                </text>
                            )}
                            {/* Day label */}
                            <text
                                x={x + w / 2}
                                y={chartHeight - 2}
                                textAnchor="middle"
                                fontSize="4"
                                fill="#94a3b8"
                                fontWeight="600"
                            >
                                {d.day}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};