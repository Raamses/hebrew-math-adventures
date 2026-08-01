import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => React.createElement('div', p, children),
        p: ({ children, ...p }: any) => React.createElement('p', p, children),
    },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

vi.mock('../../hooks/useSound', () => ({
    useSound: () => ({ play: vi.fn(), playSound: vi.fn(), isMuted: false }),
}));

import { FrenzyOverlay } from '../FrenzyOverlay';

describe('FrenzyOverlay', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // Helper: advance past the burst timer (1.8s per counsel design)
    const advancePastBurst = () => {
        act(() => {
            vi.advanceTimersByTime(2000);
        });
    };

    // 1. Does not render when isActive is false
    it('does not render anything when isActive is false', () => {
        const { container } = render(<FrenzyOverlay isActive={false} combo={0} variant="bubble" />);
        expect(container.firstChild).toBeNull();
    });

    it('does not render when isActive is false even with high combo', () => {
        const { container } = render(<FrenzyOverlay isActive={false} combo={20} variant="bubble" />);
        expect(container.firstChild).toBeNull();
    });

    // 2. Renders burst text when isActive is true and combo >= 5
    it('renders burst text when active with combo >= 5', () => {
        render(<FrenzyOverlay isActive={true} combo={5} variant="bubble" />);
        // The tier label should appear (FRENZY, SUPER FRENZY, or MEGA FRENZY)
        expect(screen.getByText(/FRENZY/i)).toBeInTheDocument();
    });

    it('does not render frenzy text when active but combo < 5', () => {
        render(<FrenzyOverlay isActive={true} combo={3} variant="bubble" />);
        // No frenzy tier reached, so no label should appear
        expect(screen.queryByText(/FRENZY/i)).not.toBeInTheDocument();
    });

    // 3. Shows correct tier label for each combo threshold
    it('shows "FRENZY!" label at combo 5', () => {
        render(<FrenzyOverlay isActive={true} combo={5} variant="bubble" />);
        expect(screen.getByText('FRENZY!')).toBeInTheDocument();
    });

    it('shows "SUPER FRENZY!" label at combo 10', () => {
        render(<FrenzyOverlay isActive={true} combo={10} variant="bubble" />);
        expect(screen.getByText('SUPER FRENZY!')).toBeInTheDocument();
    });

    it('shows "MEGA FRENZY!" label at combo 15', () => {
        render(<FrenzyOverlay isActive={true} combo={15} variant="bubble" />);
        expect(screen.getByText('MEGA FRENZY!')).toBeInTheDocument();
    });

    // 4. Shows correct multiplier for each tier
    it('does not show multiplier for base frenzy tier (combo 5)', () => {
        // Base frenzy (2x) does not show the multiplier subtitle per the component design
        render(<FrenzyOverlay isActive={true} combo={5} variant="bubble" />);
        expect(screen.queryByText(/2x Score/i)).not.toBeInTheDocument();
    });

    it('shows 3x multiplier for super frenzy (combo 10)', () => {
        render(<FrenzyOverlay isActive={true} combo={10} variant="bubble" />);
        expect(screen.getByText('3x Score!')).toBeInTheDocument();
    });

    it('shows 5x multiplier for mega frenzy (combo 15)', () => {
        render(<FrenzyOverlay isActive={true} combo={15} variant="bubble" />);
        expect(screen.getByText('5x Score!')).toBeInTheDocument();
    });

    // 5. Badge persists (does not depend on burst state)
    it('badge remains visible after burst animation fades', () => {
        const { container } = render(<FrenzyOverlay isActive={true} combo={7} variant="bubble" />);
        // Advance past the burst timeout
        advancePastBurst();
        // The overlay container should still be present (badge + border persist)
        // Look for the outer container with pointer-events-none
        const overlayContainer = container.querySelector('[class*="pointer-events-none"]');
        expect(overlayContainer).toBeTruthy();
    });

    it('badge disappears when frenzy deactivates', () => {
        const { container, rerender } = render(<FrenzyOverlay isActive={true} combo={7} variant="bubble" />);
        advancePastBurst();
        expect(container.querySelector('[class*="pointer-events-none"]')).toBeTruthy();

        rerender(<FrenzyOverlay isActive={false} combo={3} variant="bubble" />);
        expect(container.querySelector('[class*="pointer-events-none"]')).toBeNull();
    });

    // 6. pointer-events-none is on the outer container
    it('outer container has pointer-events-none class', () => {
        const { container } = render(<FrenzyOverlay isActive={true} combo={5} variant="bubble" />);
        const overlayDiv = container.querySelector('[class*="pointer-events-none"]');
        expect(overlayDiv).toBeTruthy();
        expect(overlayDiv?.className).toContain('pointer-events-none');
    });

    // 7. Renders with each variant without crashing
    it('renders with variant="bubble" without crashing', () => {
        expect(() => render(<FrenzyOverlay isActive={true} combo={5} variant="bubble" />)).not.toThrow();
    });

    it('renders with variant="practice" without crashing', () => {
        expect(() => render(<FrenzyOverlay isActive={true} combo={5} variant="practice" />)).not.toThrow();
    });

    it('renders with variant="invaders" without crashing', () => {
        expect(() => render(<FrenzyOverlay isActive={true} combo={5} variant="invaders" />)).not.toThrow();
    });

    // 8. Defaults gracefully when no variant is passed (backward compat)
    it('renders without variant prop (backward compat)', () => {
        expect(() => render(<FrenzyOverlay isActive={true} combo={5} />)).not.toThrow();
        expect(screen.getByText('FRENZY!')).toBeInTheDocument();
    });
});