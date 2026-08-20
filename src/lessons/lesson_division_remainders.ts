import type { LessonDefinition, LessonStep, LessonItem, LessonTarget } from '../types/lesson';

/**
 * Division with remainders: 14 stars shared among 3 stations → 4 each, 2 remainder.
 * Matches saga node n5_1a (NEW NODE — Division with remainders).
 * Simplified per Claude analysis: use star sprite, 3 crystal_row targets.
 */

const STATION_X = [22, 50, 78];
const STATION_Y = 55;

const station = (index: number): LessonTarget => ({
    id: `station${index + 1}`,
    position: { x: STATION_X[index], y: STATION_Y },
    capacity: 5,
    currentCount: 0,
    accepts: ['star'],
    visual: 'crystal_row',
    columns: 5,
    hideCounter: true,
});

const stations = (currentCount = 0) => STATION_X.map((_, i) => ({ ...station(i), currentCount }));

const slot = (stationIndex: number, column: number) => ({
    x: STATION_X[stationIndex] + (column - 2) * 5,
    y: STATION_Y,
});

const loose = (id: string, x: number): LessonItem => ({
    id,
    type: 'star',
    position: { x, y: 18 },
});

const placed = (stationIndex: number, column: number): LessonItem => ({
    id: `placed_${stationIndex}_${column}`,
    type: 'star',
    position: slot(stationIndex, column),
    interactive: false,
});

const steps: LessonStep[] = [
    {
        id: 'intro',
        type: 'dialog',
        mascotText: 'lessons.divisionRemainders.intro',
        mascotEmotion: 'happy',
        items: [],
        targets: [],
    },
    {
        id: 'meet_stations',
        type: 'dialog',
        mascotText: 'lessons.divisionRemainders.setup',
        mascotEmotion: 'idle',
        items: [],
        targets: stations(),
    },
    {
        id: 'share_stars',
        type: 'interactive_drag',
        mascotText: 'lessons.divisionRemainders.share',
        mascotEmotion: 'thinking',
        hint: 'lessons.divisionRemainders.hint',
        items: Array.from({ length: 14 }, (_, i) => loose(`s${i+1}`, 5 + i * 6.5)),
        targets: stations(),
        validationCriteria: (_items, targets) => targets.every(t => t.currentCount === 4),
    },
    {
        id: 'see_remainder',
        type: 'dialog',
        mascotText: 'lessons.divisionRemainders.remainder',
        mascotEmotion: 'excited',
        items: [
            ...STATION_X.flatMap((_, s) => Array.from({ length: 4 }, (_, c) => placed(s, c))),
            loose('r1', 40), loose('r2', 55),
        ],
        targets: stations(4),
        showEquation: '14 ÷ 3 = 4 R2',
    },
    {
        id: 'conclusion',
        type: 'dialog',
        mascotText: 'lessons.divisionRemainders.conclusion',
        mascotEmotion: 'excited',
        items: [
            ...STATION_X.flatMap((_, s) => Array.from({ length: 4 }, (_, c) => placed(s, c))),
            loose('r1', 40), loose('r2', 55),
        ],
        targets: stations(4),
        showEquation: '14 ÷ 3 = 4 R2',
    },
];

export const DivisionRemaindersLesson: LessonDefinition = {
    id: 'division_remainders',
    title: 'lessons.divisionRemainders.title',
    theme: 'space',
    operation: 'division',
    steps,
};
