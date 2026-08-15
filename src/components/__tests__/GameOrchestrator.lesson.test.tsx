// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameOrchestrator } from '../GameOrchestrator';
import type { LearningNode } from '../../types/learningPath';

// --- Mocks for all context/hook dependencies ---

vi.mock('../../context/ProgressContext', () => ({
    useProgress: () => ({
        completeNode: vi.fn(),
        isNodeLocked: vi.fn().mockReturnValue(false),
        getStars: vi.fn().mockReturnValue(0),
        totalStars: 0,
        progress: {},
    }),
}));

vi.mock('../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: {
            id: 'test-id',
            name: 'Test User',
            age: 10,
            avatarId: 'lion',
            mascotId: 'owl',
            themeId: 'default',
            streak: 5,
            createdAt: Date.now(),
            lastPlayedAt: Date.now(),
            settings: { musicVolume: 1, sfxVolume: 1, isMuted: false },
            capabilities: {
                skills: {},
                currentFocus: 'arithmetic',
                consecutiveFailures: 0,
                estimatedLevel: 1,
                streak: 0,
            },
            arcadeStats: {},
        },
    }),
}));

vi.mock('../../context/QuestContext', () => ({
    useQuest: () => ({
        todayChallenge: { mode: 'zen', target: 10 },
        hasCompletedToday: false,
        dailyStreak: 1,
        dailyProgress: {
            dailyStamps: [],
            totalCoinsEarned: 0,
            dailyChallengeCorrect: 0,
            dailyChallengeDate: '',
        },
        addDailyChallengeCorrect: vi.fn(),
        completeDailyChallenge: vi.fn().mockReturnValue(null),
        dailyChallengeCorrect: 0,
    }),
}));

vi.mock('../../hooks/useAnalytics', () => ({
    useAnalytics: () => ({
        logEvent: vi.fn(),
    }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

// Mock LessonModal to surface a testable marker when it renders
vi.mock('../lessons/LessonModal', () => ({
    LessonModal: ({ isOpen }: { isOpen: boolean }) => {
        if (!isOpen) return null;
        return <div data-testid="lesson-modal">Lesson Modal Rendered</div>;
    },
}));

// Mock PracticeMode so it never tries to mount heavy children
vi.mock('../PracticeMode', () => ({
    PracticeMode: () => <div data-testid="practice-mode">Practice</div>,
}));

// Mock BubbleGame
vi.mock('../sensory/BubbleGame', () => ({
    BubbleGame: () => <div data-testid="bubble-game">Bubble Game</div>,
}));

// Mock SensoryFactory
vi.mock('../../engines/SensoryFactory', () => ({
    SensoryFactory: {
        generate: vi.fn().mockReturnValue({}),
        generateFromProblem: vi.fn().mockReturnValue({}),
    },
}));

// Mock MathModule
vi.mock('../../engines/MathModule', () => ({
    MathModule: vi.fn().mockImplementation(() => ({
        generateProblem: vi.fn().mockReturnValue({
            type: 'arithmetic',
            num1: 2,
            num2: 3,
            operator: '+',
            answer: 5,
            missing: 'answer',
        }),
    })),
}));

// Mock MemoryDuelGame and MathInvadersGame
vi.mock('../games/MemoryDuelGame', () => ({
    MemoryDuelGame: () => <div data-testid="memory-duel">Memory Duel</div>,
}));

vi.mock('../games/MathInvadersGame', () => ({
    MathInvadersGame: () => <div data-testid="math-invaders">Math Invaders</div>,
}));

// Mock framer-motion so LessonModal's motion components don't error in jsdom
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock Mascot and SpeechBubble
vi.mock('../mascot/Mascot', () => ({
    Mascot: () => <div data-testid="mascot">Mascot</div>,
}));

vi.mock('../mascot/SpeechBubble', () => ({
    SpeechBubble: () => <div data-testid="speech-bubble">Speech</div>,
}));


describe('GameOrchestrator – LESSON node routing', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    const lessonNode: LearningNode = {
        id: 'n3_1',
        unitId: 'unit_3',
        title: 'Groups of 2',
        description: 'Lesson: 2, 4, 6',
        type: 'LESSON',
        position: { x: 50, y: 0 },
        targetLevel: 4,
    };

    it('routes LESSON-type nodes to LessonModal (not PracticeMode)', () => {
        render(
            <GameOrchestrator
                targetLevel={4}
                onExit={() => {}}
                node={lessonNode}
            />,
        );

        // The LessonModal should be rendered in the DOM
        expect(screen.getByTestId('lesson-modal')).toBeDefined();
        // PracticeMode should NOT be rendered
        expect(screen.queryByTestId('practice-mode')).toBeNull();
    });

    it('routes PRACTICE-type nodes to PracticeMode (not LessonModal)', () => {
        const practiceNode: LearningNode = {
            ...lessonNode,
            id: 'n3_2',
            type: 'PRACTICE',
        };

        render(
            <GameOrchestrator
                targetLevel={4}
                onExit={() => {}}
                node={practiceNode}
            />,
        );

        expect(screen.getByTestId('practice-mode')).toBeDefined();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });

    it('routes SENSORY-type nodes to BubbleGame (not LessonModal)', () => {
        const sensoryNode: LearningNode = {
            ...lessonNode,
            id: 'n3_3',
            type: 'SENSORY',
        };

        render(
            <GameOrchestrator
                targetLevel={4}
                onExit={() => {}}
                node={sensoryNode}
            />,
        );

        expect(screen.getByTestId('bubble-game')).toBeDefined();
        expect(screen.queryByTestId('lesson-modal')).toBeNull();
    });
});
