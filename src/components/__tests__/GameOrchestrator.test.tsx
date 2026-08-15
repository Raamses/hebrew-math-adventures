/**
 * Phase 0c: Unit test guard for LESSON effectiveMode
 *
 * Prevents regression of the LESSON dead-code bug (§3.0b) where
 * GameOrchestrator.effectiveMode never returned 'LESSON' for LESSON-type
 * nodes, causing LessonModal to never render.
 *
 * Tests:
 *  1. LESSON node → effectiveMode === 'LESSON' (LessonModal rendered)
 *  2. LESSON node → isLessonOpen === true → LessonModal visible
 *  3. PRACTICE node → PracticeMode rendered (not LessonModal)
 *  4. SENSORY node → BubbleGame rendered (not LessonModal)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ─── Mock all dependencies ───────────────────────────────────────────

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

vi.mock('../../hooks/useAnalytics', () => ({
    useAnalytics: () => ({ logEvent: vi.fn() }),
}));

vi.mock('../../context/ProgressContext', () => ({
    useProgress: () => ({
        completeNode: vi.fn(),
        progress: {},
    }),
}));

vi.mock('../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: {
            id: 'test',
            name: 'Test',
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false, soundGarden: false },
            capabilities: { skills: {} },
            stats: { totalStars: 0, totalCoins: 0, badges: [], arcadeBestScores: {}, dailyStamps: {} },
            arcadeStats: {},
        },
    }),
}));

vi.mock('../../context/QuestContext', () => ({
    useQuest: () => ({
        todayChallenge: { mode: 'zen', target: 10, date: '2026-08-11' },
        hasCompletedToday: false,
        dailyStreak: 0,
        dailyProgress: { dailyStamps: [], totalCoinsEarned: 0, dailyChallengeCorrect: 0, dailyChallengeDate: '' },
        dailyChallengeCorrect: 0,
        addDailyChallengeCorrect: vi.fn(),
        completeDailyChallenge: vi.fn(() => null),
        stampAlbumProgress: 0,
        todayQuests: [],
        questProgress: {},
        questClaimed: [],
        recordQuestEvent: vi.fn(),
        claimQuest: vi.fn(),
    }),
}));

// Mock LessonModal — track whether it renders and with isOpen=true
vi.mock('../lessons/LessonModal', () => ({
    LessonModal: ({ isOpen }: { isOpen: boolean; lesson: unknown; onClose: () => void; onComplete: () => void }) =>
        isOpen ? <div data-testid="lesson-modal">LessonModal</div> : null,
}));

// Mock PracticeMode
vi.mock('../PracticeMode', () => ({
    PracticeMode: ({ targetLevel }: { targetLevel: number; onExit: () => void }) =>
        <div data-testid="practice-mode">PracticeMode (level {targetLevel})</div>,
}));

// Mock BubbleGame
vi.mock('../sensory/BubbleGame', () => ({
    BubbleGame: ({ title }: { title?: string; problem: unknown; onComplete: () => void; onExit: () => void }) =>
        <div data-testid="bubble-game">BubbleGame{title ? ` — ${title}` : ''}</div>,
}));

// Mock MemoryDuelGame
vi.mock('../games/MemoryDuelGame', () => ({
    MemoryDuelGame: () => <div data-testid="memory-duel">MemoryDuelGame</div>,
}));

// Mock MathInvadersGame
vi.mock('../games/MathInvadersGame', () => ({
    MathInvadersGame: () => <div data-testid="math-invaders">MathInvadersGame</div>,
}));

// Mock SensoryFactory
vi.mock('../../engines/SensoryFactory', () => ({
    SensoryFactory: {
        generate: () => ({ type: 'sensory', id: 'test', answer: 5, target: 5, items: [] }),
        generateFromProblem: () => ({ type: 'sensory', id: 'test', answer: 5, target: 5, items: [] }),
    },
}));

// Mock MathModule
vi.mock('../../engines/MathModule', () => ({
    MathModule: vi.fn().mockImplementation(() => ({
        generateProblem: () => ({ type: 'arithmetic', id: 'p1', num1: 2, num2: 3, operator: '+', answer: 5 }),
    })),
}));

// Mock framer-motion (used by some child components)
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...p }: any) => React.createElement('div', p, children),
        button: ({ children, ...p }: any) => React.createElement('button', p, children),
    },
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

// Mock useSoundManager (used by BubbleGame)
vi.mock('../../hooks/useSoundManager', () => ({
    useSoundManager: () => ({
        isMuted: false,
        toggleMute: vi.fn(),
        playSound: vi.fn(),
        playMelodyNote: vi.fn(),
        playWrongMelody: vi.fn(),
        isSoundGarden: false,
        toggleSoundGarden: vi.fn(),
        melodyCombo: 0,
    }),
}));

// ─── Import after mocks ──────────────────────────────────────────────
import { GameOrchestrator } from '../GameOrchestrator';
import type { LearningNode } from '../../types/learningPath';

// ─── Helpers ─────────────────────────────────────────────────────────

const baseNode = (overrides: Partial<LearningNode> = {}): LearningNode => ({
    id: 'test-node',
    unitId: 'unit-1',
    title: 'Test Node',
    description: 'Test',
    type: 'LESSON',
    position: { x: 0, y: 0 },
    ...overrides,
});

const renderOrchestrator = (node: LearningNode | null, props?: Record<string, unknown>) => {
    return render(
        <GameOrchestrator
            targetLevel={1}
            onExit={vi.fn()}
            node={node}
            {...props}
        />
    );
};

// ─── Tests ────────────────────────────────────────────────────────────

describe('GameOrchestrator — effectiveMode guard (Phase 0c)', () => {

    it('1. LESSON node → effectiveMode === LESSON → LessonModal rendered', async () => {
        const node = baseNode({ id: 'n3_1', type: 'LESSON' });
        renderOrchestrator(node);

        // LessonModal should appear after useEffect sets isLessonOpen=true
        await waitFor(() => {
            expect(screen.getByTestId('lesson-modal')).toBeTruthy();
        });
    });

    it('2. LESSON node → isLessonOpen becomes true (LessonModal visible, not null)', async () => {
        const node = baseNode({ id: 'n3_1', type: 'LESSON' });
        renderOrchestrator(node);

        // The LessonModal mock only renders content when isOpen=true.
        // If isLessonOpen stayed false, the mock would render null.
        await waitFor(() => {
            const modal = screen.getByTestId('lesson-modal');
            expect(modal).toBeTruthy();
            // Verify it's visible in the DOM
            expect(modal.textContent).toBe('LessonModal');
        });
    });

    it('3. PRACTICE node → PracticeMode rendered (not LessonModal)', () => {
        const node = baseNode({ id: 'n1_2', type: 'PRACTICE' });
        renderOrchestrator(node);

        expect(screen.getByTestId('practice-mode')).toBeTruthy();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });

    it('4. SENSORY node → BubbleGame rendered (not LessonModal)', () => {
        const node = baseNode({ id: 'n1_1', type: 'SENSORY' });
        renderOrchestrator(node);

        expect(screen.getByTestId('bubble-game')).toBeTruthy();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });

    it('5. LESSON node with arcadeMode → SENSORY takes priority (arcade override)', async () => {
        // arcadeMode should override node type and route to SENSORY
        const node = baseNode({ id: 'n3_1', type: 'LESSON' });
        renderOrchestrator(node, { arcadeMode: 'zen' });

        expect(screen.getByTestId('bubble-game')).toBeTruthy();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });

    it('6. null node (no node) → defaults to PRACTICE', () => {
        renderOrchestrator(null);

        expect(screen.getByTestId('practice-mode')).toBeTruthy();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });

    it('7. SENSORY node without arcadeMode → BubbleGame rendered', () => {
        const node = baseNode({ id: 'n2_1', type: 'SENSORY', config: { target: 5 } });
        renderOrchestrator(node);

        expect(screen.getByTestId('bubble-game')).toBeTruthy();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });

    it('8. CHALLENGE node → effectiveMode === PRACTICE (not LESSON or SENSORY)', () => {
        // CHALLENGE nodes (e.g. n1_9 "Beach Master") should fall through to PRACTICE,
        // not be routed to LESSON or SENSORY. This guards against the dead-code bug
        // where effectiveMode never returned 'LESSON' — if CHALLENGE accidentally
        // matched LESSON, it would render LessonModal instead of PracticeMode.
        const node = baseNode({ id: 'n1_9', type: 'CHALLENGE' });
        renderOrchestrator(node);

        // Should render PracticeMode, NOT LessonModal or BubbleGame
        expect(screen.getByTestId('practice-mode')).toBeTruthy();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
        expect(screen.queryByTestId('bubble-game')).toBeNull();
    });

});
