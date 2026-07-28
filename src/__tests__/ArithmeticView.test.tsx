import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArithmeticView } from '../components/math-card/ArithmeticView';
import type { Problem } from '../lib/gameLogic';

describe('ArithmeticView', () => {
    const mockProblem: Problem = {
        type: 'arithmetic',
        num1: 12,
        operator: '+',
        num2: 4,
        answer: 16,
        missing: 'answer'
    };

    it('renders the arithmetic problem (num1, operator, num2)', () => {
        render(
            <ArithmeticView
                problem={mockProblem}
                answer=""
                setAnswer={vi.fn()}
                wrongAttempts={0}
            />
        );

        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('+')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('=')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('input field accepts numeric input', async () => {
        const user = userEvent.setup();
        const setAnswerMock = vi.fn();

        render(
            <ArithmeticView
                problem={mockProblem}
                answer=""
                setAnswer={setAnswerMock}
                wrongAttempts={0}
            />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, '16');

        expect(setAnswerMock).toHaveBeenCalledWith('1');
        expect(setAnswerMock).toHaveBeenCalledWith('6');
    });

    it('input is disabled during processing', () => {
        render(
            <ArithmeticView
                problem={mockProblem}
                answer=""
                setAnswer={vi.fn()}
                isProcessing={true}
                wrongAttempts={0}
            />
        );

        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
    });
});
