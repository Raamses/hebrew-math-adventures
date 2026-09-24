import type { BaseProblemConfig } from '../engines/ProblemFactory';
import { deriveSkillInsights, type SkillAnalysisResult } from './skillAnalysis';
import type { UserCapabilityProfile } from '../types/progress';

export interface SkillConfigEntry {
    i18nKey: string;
    defaultLabelHe: string;
    config: BaseProblemConfig;
}

/**
 * Canonical skill configurations mapping skill keys to i18n translation keys,
 * default Hebrew display labels, and targeted problem configurations.
 * Single source of truth for both SkillBreakdown and PostcardHub.
 */
export const SKILL_CONFIGS: Record<string, SkillConfigEntry> = {
    addition: {
        i18nKey: 'skills.addition',
        defaultLabelHe: 'חיבור',
        config: { type: 'addition_simple' },
    },
    addition_carry: {
        i18nKey: 'skills.addition',
        defaultLabelHe: 'חיבור עם המרה',
        config: { type: 'addition_carry' },
    },
    subtraction: {
        i18nKey: 'skills.subtraction',
        defaultLabelHe: 'חיסור',
        config: { type: 'sub_simple' },
    },
    subtraction_borrow: {
        i18nKey: 'skills.subtraction',
        defaultLabelHe: 'חיסור עם פריטה',
        config: { type: 'sub_borrow' },
    },
    multiplication: {
        i18nKey: 'skills.multiplication',
        defaultLabelHe: 'כפל',
        config: { type: 'multiplication' },
    },
    division: {
        i18nKey: 'skills.division',
        defaultLabelHe: 'חילוק',
        config: { type: 'division' },
    },
    series: {
        i18nKey: 'skills.series',
        defaultLabelHe: 'סדרות',
        config: { type: 'series_simple' },
    },
    comparison: {
        i18nKey: 'skills.comparison',
        defaultLabelHe: 'השוואה',
        config: { type: 'comparison_simple' },
    },
    word_problems: {
        i18nKey: 'skills.word_problems',
        defaultLabelHe: 'בעיות מילוליות',
        config: { type: 'word' },
    },
    algebraic: {
        i18nKey: 'skills.algebraic',
        defaultLabelHe: 'משוואות',
        config: { type: 'addition_simple' }, // fallback
    },
};

export const DEFAULT_PRACTICE_CONFIG: BaseProblemConfig = { type: 'addition_simple' };

export const SKILL_LABELS: Record<string, string> = Object.fromEntries(
    Object.entries(SKILL_CONFIGS).map(([k, v]) => [k, v.defaultLabelHe])
);

export const SKILL_PRACTICE_CONFIGS: Record<string, { label: string; config: BaseProblemConfig }> =
    Object.fromEntries(
        Object.entries(SKILL_CONFIGS).map(([k, v]) => [k, { label: v.defaultLabelHe, config: v.config }])
    );

export interface PracticeFocusTarget {
    skillKey: string;
    label: string;
    i18nKey: string;
    accuracy: number;
    avgSpeedSec?: number;
    config: BaseProblemConfig;
}

/**
 * Returns the problem configuration for targeted practice of a skill.
 */
export function getSkillPracticeConfig(skillKey?: string): BaseProblemConfig {
    if (!skillKey) return DEFAULT_PRACTICE_CONFIG;
    return SKILL_CONFIGS[skillKey]?.config || DEFAULT_PRACTICE_CONFIG;
}

/**
 * Returns the Hebrew label for a skill key.
 */
export function getSkillLabel(skillKey?: string): string {
    if (!skillKey) return 'חיבור';
    return SKILL_CONFIGS[skillKey]?.defaultLabelHe || skillKey;
}

/**
 * Selects the weakest-skill practice target.
 * Shared by both PostcardHub (for its action chip) and SkillBreakdown (for weakest card / practice).
 */
export function selectPracticeTarget(
    capabilitiesOrAnalysis?: UserCapabilityProfile | SkillAnalysisResult | null
): PracticeFocusTarget {
    if (!capabilitiesOrAnalysis) {
        return {
            skillKey: 'addition',
            label: 'חיבור',
            i18nKey: 'skills.addition',
            accuracy: 0,
            avgSpeedSec: 0,
            config: DEFAULT_PRACTICE_CONFIG,
        };
    }

    const analysis: SkillAnalysisResult =
        'insights' in capabilitiesOrAnalysis
            ? capabilitiesOrAnalysis
            : deriveSkillInsights(capabilitiesOrAnalysis);

    if (analysis.weakest) {
        const key = analysis.weakest.skillKey;
        const entry = SKILL_CONFIGS[key];
        return {
            skillKey: key,
            label: entry?.defaultLabelHe || key,
            i18nKey: entry?.i18nKey || 'skills.addition',
            accuracy: analysis.weakest.accuracy,
            avgSpeedSec: analysis.weakest.avgSpeedSec,
            config: entry?.config || DEFAULT_PRACTICE_CONFIG,
        };
    }

    // If no weakest skill (fewer than 5 attempts), select insight with lowest accuracy if available
    if (analysis.insights && analysis.insights.length > 0) {
        const lowest = [...analysis.insights].sort((a, b) => a.accuracy - b.accuracy)[0];
        const key = lowest.skillKey;
        const entry = SKILL_CONFIGS[key];
        return {
            skillKey: key,
            label: entry?.defaultLabelHe || key,
            i18nKey: entry?.i18nKey || 'skills.addition',
            accuracy: lowest.accuracy,
            avgSpeedSec: lowest.avgSpeedSec,
            config: entry?.config || DEFAULT_PRACTICE_CONFIG,
        };
    }

    return {
        skillKey: 'addition',
        label: 'חיבור',
        i18nKey: 'skills.addition',
        accuracy: 0,
        avgSpeedSec: 0,
        config: DEFAULT_PRACTICE_CONFIG,
    };
}
