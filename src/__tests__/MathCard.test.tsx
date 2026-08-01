import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MathCard } from '../components/MathCard';
import type { Problem } from '../lib/gameLogic';

describe('MathCard', () => {
    const mockProblem: Problem = {
        type: 'arithmetic',
        id: 'test-1',
        num1: 5,
        operator: '+',
        num2: 3,
        answer: 8,
        missing: 'answer'
    };

    const mockOnAnswer = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders problem text correctly', () => {
        render(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback={null}
            />
        );

        // Problem title (Hebrew for "How much is")
        expect(screen.getByText('?כמה זה')).toBeInTheDocument();
        // Number operands and operators
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('+')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('=')).toBeInTheDocument();
    });

    it("empty submit triggers shake + shows 'מספר?' feedback", async () => {
        const user = userEvent.setup();
        render(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback={null}
            />
        );

        const checkButton = screen.getByRole('button', { name: /בדיקה/i });
        await user.click(checkButton);

        expect(screen.getByText('מספר?')).toBeInTheDocument();
        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('typing a digit clears the empty-input warning', async () => {
        const user = userEvent.setup();
        render(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback={null}
            />
        );

        const checkButton = screen.getByRole('button', { name: /בדיקה/i });
        await user.click(checkButton);
        expect(screen.getByText('מספר?')).toBeInTheDocument();

        const input = screen.getByRole('textbox');
        await user.type(input, '8');

        await waitFor(() => {
            expect(screen.queryByText('מספר?')).not.toBeInTheDocument();
        });
    });

    it('correct answer shows success feedback', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback={null}
            />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, '8');

        const checkButton = screen.getByRole('button', { name: /בדיקה/i });
        await user.click(checkButton);

        expect(mockOnAnswer).toHaveBeenCalledWith(true);

        // Rerender with success feedback prop passed from parent
        rerender(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback="!כל הכבוד"
            />
        );

        expect(screen.getByText('!כל הכבוד')).toBeInTheDocument();
        expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('wrong answer shows error feedback', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback={null}
            />
        );

        const input = screen.getByRole('textbox');
        await user.type(input, '4');

        const checkButton = screen.getByRole('button', { name: /בדיקה/i });
        await user.click(checkButton);

        expect(mockOnAnswer).toHaveBeenCalledWith(false);

        // Rerender with wrong feedback prop
        rerender(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback="נסה שוב"
            />
        );

        expect(screen.getByText('נסה שוב')).toBeInTheDocument();
        expect(screen.getByText('❌')).toBeInTheDocument();
    });

    it('hint button opens hint modal', async () => {
        const user = userEvent.setup();
        render(
            <MathCard
                problem={mockProblem}
                onAnswer={mockOnAnswer}
                feedback={null}
            />
        );

        // Submit a wrong answer first to trigger wrongAttempts >= 1
        const input = screen.getByRole('textbox');
        await user.type(input, '4');
        const checkButton = screen.getByRole('button', { name: /בדיקה/i });
        await user.click(checkButton);

        // Hint button should now appear
        const hintButton = screen.getByRole('button', { name: /\?איך עושים את זה/i });
        expect(hintButton).toBeInTheDocument();

        await user.click(hintButton);

        // Hint modal header should be visible
        expect(screen.getByText('תנו לי לעזור!')).toBeInTheDocument();
    });
});
