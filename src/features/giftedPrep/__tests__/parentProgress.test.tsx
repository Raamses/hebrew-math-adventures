import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { derivePrepTypeProgress, recentPrepMistakes, weakestPrepTypes } from '../engine/progress';
import { mistakeDetails, questionText } from '../engine/mistakeDetails';
import { exerciseItem } from '../engine/arithmetic';
import { PrepProgressPanel } from '../components/PrepProgressPanel';
import { PREP_SCHEMA_VERSION, type PrepAttempt, type PrepItem, type PrepProgressState } from '../types';

function attempt(overrides: Partial<PrepAttempt> = {}): PrepAttempt {
    return { itemId: 'i', section: 'math', skill: 'add', correct: true, ms: 1000, at: 1, ...overrides };
}

const state = (attempts: readonly PrepAttempt[]): PrepProgressState => ({
    schemaVersion: PREP_SCHEMA_VERSION, skills: {}, attempts, mocks: [], seenIds: [],
});

describe('G7.2 weakestPrepTypes', () => {
    it('orders by accuracy, then slower median, then more attempts; drops 100% types', () => {
        const types = derivePrepTypeProgress(state([
            attempt({ skill: 'add', correct: true }),                     // 100% -> never weak
            attempt({ skill: 'sub', correct: false, ms: 2000 }),          // 0%, 2.0 s
            attempt({ skill: 'money', correct: false, ms: 5000 }),        // 0%, 5.0 s -> first
            attempt({ skill: 'compare', correct: true }),
            attempt({ skill: 'compare', correct: false }),                // 50%
            attempt({ skill: 'literal', section: 'reading', correct: true }),
            attempt({ skill: 'literal', section: 'reading', correct: true }),
            attempt({ skill: 'literal', section: 'reading', correct: false }), // 67%
        ]));
        expect(weakestPrepTypes(types).map(t => t.skill)).toEqual(['money', 'sub', 'compare']);
        expect(weakestPrepTypes(types, 10).map(t => t.skill)).toEqual(['money', 'sub', 'compare', 'literal']);
    });

    it('is empty when every type is at 100% or there is no practice', () => {
        expect(weakestPrepTypes(derivePrepTypeProgress(state([attempt()])))).toEqual([]);
        expect(weakestPrepTypes([])).toEqual([]);
    });
});

describe('G7.2 mistakeDetails', () => {
    it('snapshots the equation, the key and the chosen option', () => {
        const item = exerciseItem(42, 1);
        const wrong = (item.answerIndex + 1) % 4;
        expect(mistakeDetails(item, wrong)).toEqual({
            question: item.stem.equation,
            answer: item.options[item.answerIndex],
            chosen: item.options[wrong],
        });
    });

    it('leaves `chosen` out for a blank answer and falls back to text, then id', () => {
        const base: PrepItem = {
            id: 'rc-001-q1', kind: 'reading', section: 'reading', skill: 'literal', difficulty: 1,
            stem: { text: 'מי הלך לים?' }, options: ['א', 'ב', 'ג', 'ד'], answerIndex: 2,
            explanation: '', source: 'bank',
        };
        expect(mistakeDetails(base, null)).toEqual({ question: 'מי הלך לים?', answer: 'ג' });
        expect(questionText({ ...base, stem: {} })).toBe('rc-001-q1');
        expect(questionText({ ...base, stem: { text: 'א'.repeat(400) } }).length).toBe(160);
    });

    it('flows through recentPrepMistakes, newest first', () => {
        const s = state([
            attempt({ itemId: 'a', correct: false, at: 1, question: '1 + 1 = ?', answer: '2', chosen: '3' }),
            attempt({ itemId: 'b', correct: false, at: 2 }),
        ]);
        const [newest, older] = recentPrepMistakes(s);
        expect(newest).toEqual({ itemId: 'b', skill: 'add', at: 2, ms: 1000 });
        expect(older).toEqual({ itemId: 'a', skill: 'add', at: 1, ms: 1000, question: '1 + 1 = ?', answer: '2', chosen: '3' });
    });
});

describe('G7.2 PrepProgressPanel', () => {
    it('shows the empty state for a profile with no practice', () => {
        render(<PrepProgressPanel progress={state([])} />);
        expect(screen.getByTestId('prep-progress-empty')).toBeTruthy();
        expect(screen.queryAllByTestId('prep-progress-type')).toHaveLength(0);
    });

    it('shows per-type rows, the weakest types and the mistakes with their answers', () => {
        const attempts: PrepAttempt[] = [
            attempt({ skill: 'add', correct: true, ms: 3000 }),
            attempt({ skill: 'add', correct: false, ms: 5000, at: 2, question: '37 + 25 = ?', answer: '62', chosen: '52' }),
            attempt({ skill: 'sub', correct: false, at: 3 }),
        ];
        render(<PrepProgressPanel progress={state(attempts)} />);
        const rows = screen.getAllByTestId('prep-progress-type');
        expect(rows.map(r => r.dataset.skill)).toEqual(['add', 'sub']);
        expect(rows[0].textContent).toContain('50%');
        expect(rows[0].textContent).toContain('4.0');
        expect(screen.getAllByTestId('prep-progress-weak-type').map(r => r.dataset.skill)).toEqual(['sub', 'add']);
        const mistakes = screen.getAllByTestId('prep-progress-mistake');
        expect(mistakes).toHaveLength(2);
        expect(within(mistakes[0]).getByTestId('prep-mistake-no-details')).toBeTruthy();
        expect(within(mistakes[1]).getByTestId('prep-mistake-question').textContent).toBe('37 + 25 = ?');
        expect(within(mistakes[1]).getByTestId('prep-mistake-answer').textContent).toBe('62');
    });

    it('caps the mistake list at 20', () => {
        const many = Array.from({ length: 30 }, (_, i) => attempt({ itemId: `m${i}`, correct: false, at: i, question: `${i}`, answer: '0' }));
        render(<PrepProgressPanel progress={state(many)} />);
        expect(screen.getAllByTestId('prep-progress-mistake')).toHaveLength(20);
    });
});
