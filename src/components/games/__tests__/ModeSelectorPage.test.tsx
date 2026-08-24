import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelectorPage } from '../ModeSelectorPage';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';

const renderWithI18n = (ui: React.ReactElement) =>
    render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);

describe('ModeSelectorPage', () => {
    it('renders the math variant with all 5 mode cards', () => {
        renderWithI18n(<ModeSelectorPage variant="math" onSelectMode={vi.fn()} onBack={vi.fn()} />);
        expect(screen.getByTestId('mode-selector-page')).toBeInTheDocument();
        expect(screen.getByTestId('mode-card-STANDARD')).toBeInTheDocument();
        expect(screen.getByTestId('mode-card-TIME_ATTACK')).toBeInTheDocument();
        expect(screen.getByTestId('mode-card-SURVIVAL')).toBeInTheDocument();
        expect(screen.getByTestId('mode-card-MEMORY')).toBeInTheDocument();
        expect(screen.getByTestId('mode-card-INVADERS')).toBeInTheDocument();
    });

    it('renders the arcade variant with all 5 bubble modes', () => {
        renderWithI18n(<ModeSelectorPage variant="arcade" onSelectMode={vi.fn()} onBack={vi.fn()} />);
        expect(screen.getByTestId('arcade-mode-zen')).toBeInTheDocument();
        expect(screen.getByTestId('arcade-mode-classic')).toBeInTheDocument();
        expect(screen.getByTestId('arcade-mode-blitz')).toBeInTheDocument();
        expect(screen.getByTestId('arcade-mode-survival')).toBeInTheDocument();
        expect(screen.getByTestId('arcade-mode-fusion')).toBeInTheDocument();
    });

    it('calls onBack when back button is clicked', () => {
        const onBack = vi.fn();
        renderWithI18n(<ModeSelectorPage variant="math" onSelectMode={vi.fn()} onBack={onBack} />);
        // The back button uses onboarding.back key which is "חזרה" in Hebrew or "Back" in English
        // Find it by aria-label
        const backButton = screen.getByRole('button', { name: /חזרה|back/i });
        fireEvent.click(backButton);
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onSelectMode with the correct mode id when a card is clicked', () => {
        const onSelectMode = vi.fn();
        renderWithI18n(<ModeSelectorPage variant="math" onSelectMode={onSelectMode} onBack={vi.fn()} />);
        fireEvent.click(screen.getByTestId('mode-card-TIME_ATTACK'));
        expect(onSelectMode).toHaveBeenCalledWith('TIME_ATTACK');
    });

    it('calls onSelectMode with arcade mode id for arcade variant', () => {
        const onSelectMode = vi.fn();
        renderWithI18n(<ModeSelectorPage variant="arcade" onSelectMode={onSelectMode} onBack={vi.fn()} />);
        fireEvent.click(screen.getByTestId('arcade-mode-blitz'));
        expect(onSelectMode).toHaveBeenCalledWith('blitz');
    });

    it('displays best score when provided', () => {
        renderWithI18n(
            <ModeSelectorPage
                variant="math"
                onSelectMode={vi.fn()}
                onBack={vi.fn()}
                bestScores={{ STANDARD: 500 }}
            />
        );
        // Best score format in Hebrew: "שיא: 500" or English: "Best: 500"
        expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('displays no record when best score is not provided', () => {
        renderWithI18n(<ModeSelectorPage variant="math" onSelectMode={vi.fn()} onBack={vi.fn()} />);
        // Hebrew: "אין שיא" or English: "No Record"
        expect(screen.getAllByText(/אין שיא|no record/i).length).toBeGreaterThan(0);
    });

    it('does not render framer-motion AnimatePresence or overlay backdrop', () => {
        const { container } = renderWithI18n(
            <ModeSelectorPage variant="math" onSelectMode={vi.fn()} onBack={vi.fn()} />
        );
        // Should NOT have the fixed inset-0 z-50 overlay class from the old overlay
        const overlays = container.querySelectorAll('.fixed.inset-0.z-50');
        expect(overlays.length).toBe(0);
    });

    it('does not have a Cancel/X close button', () => {
        renderWithI18n(<ModeSelectorPage variant="math" onSelectMode={vi.fn()} onBack={vi.fn()} />);
        // The old overlay had a close (X) button with aria-label "close" — the page should not
        const closeButtons = screen.queryAllByLabelText(/סגור|close/i);
        expect(closeButtons.length).toBe(0);
        expect(screen.queryByText(/cancel|ביטול/i)).not.toBeInTheDocument();
    });

    it('supports keyboard navigation (Enter key on a card)', () => {
        const onSelectMode = vi.fn();
        renderWithI18n(<ModeSelectorPage variant="math" onSelectMode={onSelectMode} onBack={vi.fn()} />);
        const card = screen.getByTestId('mode-card-MEMORY');
        card.focus();
        fireEvent.keyDown(card, { key: 'Enter' });
        expect(onSelectMode).toHaveBeenCalledWith('MEMORY');
    });
});
