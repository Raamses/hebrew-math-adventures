import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeriesView } from '../components/math-card/SeriesView';
import type { Problem } from '../lib/gameLogic';

describe('SeriesView', () => {
    it("renders sequence with null slot as '?'", () => {
        const problem: Problem = {
            type: 'series',
            id: 'test-1',
            rule: 'arithmetic',
            sequence: [2, null, 6, 8],
            missingIndex: 0, // slot 0 is input, slot 1 is null and not missing
            answer: 0
        };

        render(
            <SeriesView
                problem={problem}
                answer=""
                setAnswer={vi.fn()}
            />
        );

        // Slot 1 has null value and is not missingIndex, so it renders '?'
        expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders numbers correctly for non-missing slots', () => {
        const problem: Problem = {
            type: 'series',
            id: 'test-2',
            rule: 'arithmetic',
            sequence: [10, 20, 30, null],
            missingIndex: 3,
            answer: 40
        };

        render(
            <SeriesView
                problem={problem}
                answer=""
                setAnswer={vi.fn()}
            />
        );

        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('input field is shown for missing slot', async () => {
        const user = userEvent.setup();
        const setAnswerMock = vi.fn();
        const problem: Problem = {
            type: 'series',
            id: 'test-3',
            rule: 'arithmetic',
            sequence: [5, 10, null, 20],
            missingIndex: 2,
            answer: 15
        };

        render(
            <SeriesView
                problem={problem}
                answer=""
                setAnswer={setAnswerMock}
            />
        );

        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();

        await user.type(input, '15');
        expect(setAnswerMock).toHaveBeenCalledWith('1');
        expect(setAnswerMock).toHaveBeenCalledWith('5');
    });
});
