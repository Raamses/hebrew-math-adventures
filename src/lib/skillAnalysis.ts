import type { UserCapabilityProfile } from '../types/progress';
import type { SessionRecord } from '../types/analytics';
import { SKILL_KEY_MAP } from '../types/progress';

export interface SkillInsight {
    skillKey: string;
    attempts: number;
    correct: number;
    accuracy: number; // 0-100
    avgSpeedSec: number; // seconds, 1 decimal
    consecutiveCorrect: number;
}

export interface SkillAnalysisResult {
    insights: SkillInsight[];
    weakest: SkillInsight | null;
    strongest: SkillInsight | null;
}

/**
 * Derive per-skill insights from a user's capability profile.
 * Groups by the canonical operation key (addition, subtraction, etc.)
 */
export function deriveSkillInsights(
    capabilities: UserCapabilityProfile | undefined,
): SkillAnalysisResult {
    if (!capabilities || !capabilities.skills) {
        return { insights: [], weakest: null, strongest: null };
    }

    // Group skills by canonical operation
    const grouped: Record<string, { totalAttempts: number; totalCorrect: number; totalSpeedMs: number; count: number; consecutiveCorrect: number }> = {};

    for (const [skillKey, stats] of Object.entries(capabilities.skills)) {
        const canonical = SKILL_KEY_MAP[skillKey] || skillKey;
        if (!grouped[canonical]) {
            grouped[canonical] = { totalAttempts: 0, totalCorrect: 0, totalSpeedMs: 0, count: 0, consecutiveCorrect: 0 };
        }
        grouped[canonical].totalAttempts += stats.attempts;
        grouped[canonical].totalCorrect += stats.correct;
        grouped[canonical].totalSpeedMs += stats.avgSpeedMs;
        grouped[canonical].count += 1;
        grouped[canonical].consecutiveCorrect = Math.max(grouped[canonical].consecutiveCorrect, stats.consecutiveCorrect);
    }

    const insights: SkillInsight[] = Object.entries(grouped).map(([key, val]) => {
        const accuracy = val.totalAttempts > 0 ? (val.totalCorrect / val.totalAttempts) * 100 : 0;
        const avgSpeedSec = val.count > 0 ? (val.totalSpeedMs / val.count) / 1000 : 0;
        return {
            skillKey: key,
            attempts: val.totalAttempts,
            correct: val.totalCorrect,
            accuracy: Math.round(accuracy),
            avgSpeedSec: Math.round(avgSpeedSec * 10) / 10,
            consecutiveCorrect: val.consecutiveCorrect,
        };
    });

    // Sort by attempts descending so most-practiced skills appear first
    insights.sort((a, b) => b.attempts - a.attempts);

    // Find weakest and strongest (only among skills with >= 5 attempts)
    const withData = insights.filter(i => i.attempts >= 5);
    let weakest: SkillInsight | null = null;
    let strongest: SkillInsight | null = null;

    if (withData.length > 0) {
        weakest = withData.reduce((min, cur) => cur.accuracy < min.accuracy ? cur : min, withData[0]);
        strongest = withData.reduce((max, cur) => cur.accuracy > max.accuracy ? cur : max, withData[0]);
    }

    return { insights, weakest, strongest };
}

export interface WeeklyBarData {
    day: string;       // Hebrew day label
    dayIndex: number;  // 0=Sunday .. 6=Saturday
    correct: number;
    attempts: number;
    date: string;     // YYYY-MM-DD
}

/**
 * Aggregate the last 7 days of session history into weekly bar chart data.
 */
export function getWeeklyData(sessionHistory: SessionRecord[] | undefined): WeeklyBarData[] {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sunday=א .. Saturday=ש

    // Initialize 7 days
    const days: WeeklyBarData[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(todayMidnight);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayIndex = d.getDay(); // 0=Sunday
        days.push({
            day: dayLabels[dayIndex],
            dayIndex,
            correct: 0,
            attempts: 0,
            date: dateStr,
        });
    }

    if (!sessionHistory || sessionHistory.length === 0) return days;

    // Map sessions to days
    for (const session of sessionHistory) {
        const dayEntry = days.find(d => d.date === session.date);
        if (dayEntry) {
            dayEntry.correct += session.correct;
            dayEntry.attempts += session.attempts;
        }
    }

    return days;
}