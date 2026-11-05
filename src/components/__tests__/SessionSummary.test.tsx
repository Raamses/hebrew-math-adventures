// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionSummary } from '../SessionSummary';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
    Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => React.createElement('div', p, children),
        button: ({ children, ...p }: any) => React.createElement('button', p, children),
    },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

describe('SessionSummary', () => {
    const defaultProps = {
        isOpen: true,
        starsGained: 3,
        correctCount: 8,
        totalCount: 10,
        totalScore: 120,
        onPlayAgain: vi.fn(),
        onExit: vi.fn(),
    };

    it('does not render anything when isOpen is false', () => {
        const { container } = render(<SessionSummary {...defaultProps} isOpen={false} />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByTestId('session-summary')).toBeNull();
    });

    it('renders the coin badge and displays coin amount when coinsEarned is provided and truthy', () => {
        render(<SessionSummary {...defaultProps} coinsEarned={15} />);
        const badge = screen.getByTestId('summary-coins');
        expect(badge).toBeInTheDocument();
        expect(screen.getByText('+15')).toBeInTheDocument();
        expect(badge).toHaveTextContent('+15');
    });

    it('renders the coin badge and displays coin amount when coins prop is provided and truthy', () => {
        render(<SessionSummary {...defaultProps} coins={25} />);
        const badge = screen.getByTestId('summary-coins');
        expect(badge).toBeInTheDocument();
        expect(screen.getByText('+25')).toBeInTheDocument();
        expect(badge).toHaveTextContent('+25');
    });

    it('does not render the coin badge when coins prop is absent', () => {
        render(<SessionSummary {...defaultProps} />);
        expect(screen.queryByTestId('summary-coins')).toBeNull();
    });

    it('does not render the coin badge when coins prop is zero', () => {
        render(<SessionSummary {...defaultProps} coinsEarned={0} />);
        expect(screen.queryByTestId('summary-coins')).toBeNull();
        expect(screen.queryByText('+0')).toBeNull();
    });

    it('does not render the coin badge when coins alias prop is zero', () => {
        render(<SessionSummary {...defaultProps} coins={0} />);
        expect(screen.queryByTestId('summary-coins')).toBeNull();
    });

    it('renders base summary stats and action buttons', () => {
        render(<SessionSummary {...defaultProps} starsGained={3} coinsEarned={10} />);
        expect(screen.getByTestId('summary-stars')).toHaveTextContent('+3');
        expect(screen.getByTestId('summary-accuracy')).toHaveTextContent('80%');
        expect(screen.getByTestId('summary-coins')).toHaveTextContent('+10');
        expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('triggers onPlayAgain callback when play again button is clicked', () => {
        const onPlayAgain = vi.fn();
        render(<SessionSummary {...defaultProps} onPlayAgain={onPlayAgain} />);
        fireEvent.click(screen.getByTestId('summary-play-again'));
        expect(onPlayAgain).toHaveBeenCalledTimes(1);
    });

    it('triggers onExit callback when exit button is clicked', () => {
        const onExit = vi.fn();
        render(<SessionSummary {...defaultProps} onExit={onExit} />);
        fireEvent.click(screen.getByTestId('summary-home'));
        expect(onExit).toHaveBeenCalledTimes(1);
    });
});
