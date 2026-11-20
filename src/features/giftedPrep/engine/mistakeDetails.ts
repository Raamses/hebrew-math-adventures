import type { PrepAttempt, PrepItem } from '../types';

export type MistakeDetails = Pick<PrepAttempt, 'question' | 'answer' | 'chosen'>;

const MAX_QUESTION_CHARS = 160;

/** A pyramid as one line, top row first: "20 / ◻ ◻ / 3 ? 7". */
export const pyramidText = (rows: readonly (readonly string[])[]) => rows.map(r => r.map(c => c || '◻').join(' ')).join(' / ');

/** What the parent sees as "the item": the equation, else the picture lines, else the question text. */
export function questionText(item: PrepItem): string {
    const raw = item.stem.equation
        ?? (item.stem.pictureLines && item.stem.pictureLines.length > 0 ? item.stem.pictureLines.join(' · ') : undefined)
        ?? (item.stem.pyramid ? pyramidText(item.stem.pyramid) : undefined)
        ?? item.stem.text
        ?? item.id;
    return raw.length > MAX_QUESTION_CHARS ? `${raw.slice(0, MAX_QUESTION_CHARS - 1)}…` : raw;
}

/**
 * Snapshot of a wrong answer for the G7.2 parent progress view (plain text, never niqqud):
 * the question, the key and what the child chose. `choice` null = left blank.
 */
export function mistakeDetails(item: PrepItem, choice: number | null): MistakeDetails {
    return {
        question: questionText(item),
        answer: item.options[item.answerIndex],
        ...(choice != null && item.options[choice] !== undefined ? { chosen: item.options[choice] } : {}),
    };
}
