import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: {
            id: 't', name: 'T',
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
            capabilities: { skills: {} },
            stats: { totalStars: 0, totalCoins: 0, badges: [], arcadeBestScores: {}, dailyStamps: {} },
            arcadeStats: {},
        },
        updateArcadeBestScore: vi.fn(),
        recordSession: vi.fn(),
        toggleSoundGarden: vi.fn(),
    }),
}));
vi.mock('../../../hooks/useSound', () => ({
    useSound: () => ({ playSound: vi.fn(), isMuted: false }),
}));
vi.mock('../../../hooks/useMusicalSound', () => ({
    useMusicalSound: () => ({
        playMelodyNote: vi.fn(),
        playWrongMelody: vi.fn(),
        isSoundGarden: false,
        toggleSoundGarden: vi.fn(),
        melodyCombo: 0,
        isMuted: false,
    }),
}));
vi.mock('../../../engines/invader/useInvaderEngine', () => ({
    useInvaderEngine: () => ({
        state: {
            equations: [
                { id: 'e1', equation: '3 + 5', x: 50, y: 20, isBoss: false },
                { id: 'e2', equation: '7 - 2', x: 30, y: 40, isBoss: false },
            ],
            answers: [
                { id: 'a1', value: 8, x: 25, y: 70, isPopped: false, equationId: 'e1' },
                { id: 'a2', value: 5, x: 75, y: 70, isPopped: false, equationId: 'e2' },
                { id: 'a3', value: 3, x: 50, y: 85, isPopped: false, equationId: 'e1' },
            ],
            score: 0,
            lives: 3,
            level: 1,
            combo: 0,
            frenzy: false,
            isGameOver: false,
            isVictory: false,
            isBossWave: false,
        },
        handleAnswerTap: vi.fn(() => true),
        reset: vi.fn(),
    }),
}));
vi.mock('./FrenzyOverlay', () => ({
    FrenzyOverlay: () => null,
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, f: string) => f }),
}));
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
        button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));
vi.mock('lucide-react', () => ({
    ArrowLeft: () => <span>←</span>,
    RotateCcw: () => <span>↻</span>,
    Trophy: () => <span>🏆</span>,
    Heart: () => <span>♥</span>,
    Zap: () => <span>⚡</span>,
    Star: () => <span>★</span>,
}));

const m: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (k: string) => m[k] ?? null,
        setItem: (k: string, v: string) => { m[k] = v; },
        removeItem: (k: string) => { delete m[k]; },
        clear: () => { Object.keys(m).forEach(k => delete m[k]); },
    },
});
Object.defineProperty(navigator, 'vibrate', { value: vi.fn(), writable: true });

import { MathInvadersGame } from '../MathInvadersGame';

describe('MathInvadersGame', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders without crashing', () => {
        render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        expect(screen.getByText(/Math Invaders/)).toBeInTheDocument();
    });

    it('has a back button that calls onExit', () => {
        const onExit = vi.fn();
        render(<MathInvadersGame level={1} onExit={onExit} />);
        fireEvent.click(screen.getByLabelText('Back'));
        expect(onExit).toHaveBeenCalled();
    });

    it('shows level in HUD', () => {
        render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        expect(screen.getByText(/Level 1/)).toBeInTheDocument();
    });

    it('renders equation bubbles with dir=ltr', () => {
        const { container } = render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        const equationSpans = container.querySelectorAll('span[dir="ltr"]');
        // Should have at least 2 equation spans + 3 answer spans = 5
        expect(equationSpans.length).toBeGreaterThanOrEqual(5);
    });

    it('all equation and answer spans have dir=ltr', () => {
        const { container } = render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        // Only check spans inside the game area (equations + answers), not HUD spans
        const gameArea = container.querySelector('.relative.w-full.max-w-3xl.flex-1');
        expect(gameArea).toBeTruthy();
        const mathSpans = gameArea!.querySelectorAll('span[dir="ltr"]');
        expect(mathSpans.length).toBeGreaterThan(0);
        mathSpans.forEach(s => {
            expect(s.getAttribute('dir')).toBe('ltr');
        });
    });

    it('root container is dir=rtl (Hebrew UI)', () => {
        const { container } = render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        const root = container.firstElementChild;
        expect(root?.getAttribute('dir')).toBe('rtl');
    });

    it('equation content reads left-to-right (number operator number)', () => {
        const { container } = render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        const ltrSpans = container.querySelectorAll('span[dir="ltr"]');
        const mathSpans = Array.from(ltrSpans).filter(s =>
            /[+\-×÷]/.test(s.textContent ?? '')
        );
        expect(mathSpans.length).toBeGreaterThan(0);
        mathSpans.forEach(s => {
            const text = s.textContent ?? '';
            // Should match "3 + 5" pattern (number, operator, number) — not reversed
            expect(/^\d+\s*[+\-×÷]\s*\d+/.test(text)).toBe(true);
        });
    });

    it('answer bubbles also have dir=ltr', () => {
        const { container } = render(<MathInvadersGame level={1} onExit={vi.fn()} />);
        const ltrSpans = container.querySelectorAll('span[dir="ltr"]');
        // Answers are numbers like "8", "5", "3" — check at least some contain just a number
        const answerSpans = Array.from(ltrSpans).filter(s => /^\d+$/.test(s.textContent?.trim() ?? ''));
        expect(answerSpans.length).toBeGreaterThan(0);
        answerSpans.forEach(s => {
            expect(s.getAttribute('dir')).toBe('ltr');
        });
    });
});