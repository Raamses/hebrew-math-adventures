/**
 * Word Problem Templates — 20+ templates across 6 categories.
 * Each template defines the operation, difficulty, i18n key, emoji scene,
 * and numeric ranges for generating randomized word problems.
 */

export interface WordProblemTemplate {
    id: string;
    operation: '+' | '-' | '*' | '/';
    difficulty: 'easy' | 'medium' | 'hard';
    i18nKey: string; // e.g. 'wordProblems.shopping_add'
    emoji: string; // visual scene emoji (3-4 emojis)
    minN1: number;
    maxN1: number;
    minN2: number;
    maxN2: number;
}

export const WORD_PROBLEM_TEMPLATES: WordProblemTemplate[] = [
    // --- Shopping (5) ---
    {
        id: 'shopping_add',
        operation: '+',
        difficulty: 'easy',
        i18nKey: 'wordProblems.shopping_add',
        emoji: '🛒🍎➕',
        minN1: 2, maxN1: 8,
        minN2: 1, maxN2: 6,
    },
    {
        id: 'shopping_change',
        operation: '-',
        difficulty: 'medium',
        i18nKey: 'wordProblems.shopping_change',
        emoji: '💰🪙➖',
        minN1: 20, maxN1: 50,
        minN2: 5, maxN2: 25,
    },
    {
        id: 'shopping_compare',
        operation: '-',
        difficulty: 'medium',
        i18nKey: 'wordProblems.shopping_compare',
        emoji: '🏷️💲⚖️',
        minN1: 30, maxN1: 80,
        minN2: 10, maxN2: 60,
    },
    {
        id: 'shopping_bulk',
        operation: '*',
        difficulty: 'hard',
        i18nKey: 'wordProblems.shopping_bulk',
        emoji: '📦✖️🛍️',
        minN1: 3, maxN1: 6,
        minN2: 4, maxN2: 12,
    },
    {
        id: 'shopping_total',
        operation: '+',
        difficulty: 'medium',
        i18nKey: 'wordProblems.shopping_total',
        emoji: '🛒🥦🍎',
        minN1: 5, maxN1: 15,
        minN2: 3, maxN2: 12,
    },

    // --- Sharing (4) ---
    {
        id: 'sharing_cookies',
        operation: '/',
        difficulty: 'medium',
        i18nKey: 'wordProblems.sharing_cookies',
        emoji: '🍪➗👦',
        minN1: 12, maxN1: 24,
        minN2: 3, maxN2: 6,
    },
    {
        id: 'sharing_pizza',
        operation: '/',
        difficulty: 'easy',
        i18nKey: 'wordProblems.sharing_pizza',
        emoji: '🍕➗🍕',
        minN1: 8, maxN1: 16,
        minN2: 2, maxN2: 4,
    },
    {
        id: 'sharing_toys',
        operation: '/',
        difficulty: 'easy',
        i18nKey: 'wordProblems.sharing_toys',
        emoji: '🧸➗👧',
        minN1: 6, maxN1: 18,
        minN2: 2, maxN2: 3,
    },
    {
        id: 'sharing_candy',
        operation: '/',
        difficulty: 'medium',
        i18nKey: 'wordProblems.sharing_candy',
        emoji: '🍬➗🧒',
        minN1: 15, maxN1: 30,
        minN2: 3, maxN2: 6,
    },

    // --- Measurement (3) ---
    {
        id: 'measure_height',
        operation: '+',
        difficulty: 'medium',
        i18nKey: 'wordProblems.measure_height',
        emoji: '📏📐🔺',
        minN1: 30, maxN1: 80,
        minN2: 10, maxN2: 40,
    },
    {
        id: 'measure_length',
        operation: '-',
        difficulty: 'medium',
        i18nKey: 'wordProblems.measure_length',
        emoji: '📏✂️📐',
        minN1: 50, maxN1: 100,
        minN2: 10, maxN2: 45,
    },
    {
        id: 'measure_weight',
        operation: '+',
        difficulty: 'hard',
        i18nKey: 'wordProblems.measure_weight',
        emoji: '⚖️🍎 🍐',
        minN1: 200, maxN1: 500,
        minN2: 100, maxN2: 300,
    },

    // --- Time (3) ---
    {
        id: 'time_school',
        operation: '-',
        difficulty: 'medium',
        i18nKey: 'wordProblems.time_school',
        emoji: '🏫⏰📚',
        minN1: 8, maxN1: 14,
        minN2: 1, maxN2: 6,
    },
    {
        id: 'time_travel',
        operation: '+',
        difficulty: 'easy',
        i18nKey: 'wordProblems.time_travel',
        emoji: '🚗⏰📍',
        minN1: 10, maxN1: 30,
        minN2: 5, maxN2: 20,
    },
    {
        id: 'time_elapsed',
        operation: '-',
        difficulty: 'hard',
        i18nKey: 'wordProblems.time_elapsed',
        emoji: '🕐➖🕕',
        minN1: 14, maxN1: 23,
        minN2: 3, maxN2: 12,
    },

    // --- Multi-step (3) ---
    {
        id: 'multistep_lost_found',
        operation: '-',
        difficulty: 'medium',
        i18nKey: 'wordProblems.multistep_lost_found',
        emoji: '🎒🔍➖',
        minN1: 15, maxN1: 30,
        minN2: 3, maxN2: 10,
    },
    {
        id: 'multistep_bought_sold',
        operation: '-',
        difficulty: 'hard',
        i18nKey: 'wordProblems.multistep_bought_sold',
        emoji: '💰📉📦',
        minN1: 50, maxN1: 100,
        minN2: 15, maxN2: 45,
    },
    {
        id: 'multistep_earned_spent',
        operation: '+',
        difficulty: 'hard',
        i18nKey: 'wordProblems.multistep_earned_spent',
        emoji: '💵➕💰',
        minN1: 20, maxN1: 60,
        minN2: 10, maxN2: 40,
    },

    // --- Sports/Games (2) ---
    {
        id: 'sports_goals',
        operation: '+',
        difficulty: 'easy',
        i18nKey: 'wordProblems.sports_goals',
        emoji: '⚽🥅➕',
        minN1: 2, maxN1: 7,
        minN2: 1, maxN2: 5,
    },
    {
        id: 'sports_rounds',
        operation: '*',
        difficulty: 'hard',
        i18nKey: 'wordProblems.sports_rounds',
        emoji: '🎮✖️🏆',
        minN1: 3, maxN1: 8,
        minN2: 4, maxN2: 10,
    },

    // --- Original 2 (kept for backward compat) ---
    {
        id: 'apples_add',
        operation: '+',
        difficulty: 'easy',
        i18nKey: 'wordProblems.apples_add',
        emoji: '🍎🍎➕',
        minN1: 3, maxN1: 8,
        minN2: 1, maxN2: 4,
    },
    {
        id: 'candies_sub',
        operation: '-',
        difficulty: 'easy',
        i18nKey: 'wordProblems.candies_sub',
        emoji: '🍬🍬➖',
        minN1: 5, maxN1: 12,
        minN2: 1, maxN2: 5,
    },
];

/**
 * Get templates filtered by difficulty.
 * Maps kid ages to difficulty:
 *   easy: ages 5-7 (levels 1-3)
 *   medium: ages 7-9 (levels 3-5)
 *   hard: ages 9-11 (levels 5-10)
 */
import { DIFFICULTY_BREAKPOINTS } from '../lib/worldConfig';

export function getTemplatesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): WordProblemTemplate[] {
    return WORD_PROBLEM_TEMPLATES.filter((t) => t.difficulty === difficulty);
}

/**
 * Get difficulty based on target level.
 */
export function difficultyFromLevel(level: number): 'easy' | 'medium' | 'hard' {
    if (level <= DIFFICULTY_BREAKPOINTS.EASY_MAX_LEVEL) return 'easy';
    if (level <= DIFFICULTY_BREAKPOINTS.MEDIUM_MAX_LEVEL) return 'medium';
    return 'hard';
}