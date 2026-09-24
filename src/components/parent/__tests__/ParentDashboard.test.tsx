import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParentDashboard, resetParentSandbox } from '../ParentDashboard';
import type { UserProfile } from '../../../types/user';

const mockProfile1: UserProfile = {
    id: 'child-1',
    name: 'איתי',
    age: 6,
    avatarId: '🦉',
    mascotId: 'owl',
    themeId: 'default',
    createdAt: 1000,
    lastPlayedAt: 2000,
    streak: 3,
    unlockedBadges: [],
    settings: { musicVolume: 0.8, sfxVolume: 0.8, isMuted: false },
};

const mockProfile2: UserProfile = {
    id: 'child-2',
    name: 'מאיה',
    age: 8,
    avatarId: '🦁',
    mascotId: 'lion',
    themeId: 'candy',
    createdAt: 1000,
    lastPlayedAt: 2500,
    streak: 7,
    unlockedBadges: ['b1'],
    settings: { musicVolume: 0.8, sfxVolume: 0.8, isMuted: false },
};

let currentProfile = mockProfile1;
const mockSwitchProfile = vi.fn((id: string) => {
    if (id === mockProfile2.id) {
        currentProfile = mockProfile2;
    } else {
        currentProfile = mockProfile1;
    }
});

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: currentProfile,
        allProfiles: [mockProfile1, mockProfile2],
        switchProfile: mockSwitchProfile,
    }),
}));

// Mock subcomponents so the shell itself is tested cleanly
vi.mock('../PostcardHub', () => ({
    PostcardHub: ({ profile, onOpenDetails }: any) => (
        <div data-testid="postcard-hub">
            <span data-testid="postcard-child-name">{profile?.name}</span>
            <button onClick={onOpenDetails} data-testid="postcard-details-link">
                פרטים נוספים
            </button>
        </div>
    ),
}));

vi.mock('../SkillBreakdown', () => ({
    SkillBreakdown: () => <div data-testid="skill-breakdown-mock">פירוט מיומנויות</div>,
}));

vi.mock('../ParentGamesHub', () => ({
    ParentGamesHub: () => <div data-testid="parent-games-hub-mock">משחקי הורים</div>,
}));

vi.mock('../ProfileManager', () => ({
    ProfileManager: () => <div data-testid="profile-manager-mock">ניהול פרופילים</div>,
}));

describe('ParentDashboard Shell', () => {
    beforeEach(() => {
        currentProfile = mockProfile1;
        mockSwitchProfile.mockClear();
        sessionStorage.clear();
        localStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
        localStorage.clear();
    });

    /* ── 1. Default Landing & 4 RTL Tabs ─────────────────────────── */
    describe('tabs and RTL navigation', () => {
        it('renders Postcard as the default landing view', () => {
            render(<ParentDashboard onExit={vi.fn()} />);

            expect(screen.getByTestId('postcard-hub')).toBeInTheDocument();
            expect(screen.getByTestId('postcard-child-name')).toHaveTextContent('איתי');

            const postcardTab = screen.getByTestId('tab-postcard');
            expect(postcardTab).toHaveAttribute('aria-selected', 'true');
        });

        it('renders all 4 tabs in RTL order: גלויה, מטרות, משחקים, הגדרות', () => {
            render(<ParentDashboard onExit={vi.fn()} />);

            const tabPostcard = screen.getByTestId('tab-postcard');
            const tabGoals = screen.getByTestId('tab-goals');
            const tabGames = screen.getByTestId('tab-games');
            const tabSettings = screen.getByTestId('tab-settings');

            expect(tabPostcard).toBeInTheDocument();
            expect(tabPostcard).toHaveTextContent('גלויה');
            expect(tabPostcard).toHaveTextContent('💌');

            expect(tabGoals).toBeInTheDocument();
            expect(tabGoals).toHaveTextContent('מטרות');
            expect(tabGoals).toHaveTextContent('🎯');

            expect(tabGames).toBeInTheDocument();
            expect(tabGames).toHaveTextContent('משחקים');
            expect(tabGames).toHaveTextContent('🎮');

            expect(tabSettings).toBeInTheDocument();
            expect(tabSettings).toHaveTextContent('הגדרות');
            expect(tabSettings).toHaveTextContent('⚙️');
        });

        it('switches views when clicking each tab', async () => {
            const user = userEvent.setup();
            render(<ParentDashboard onExit={vi.fn()} />);

            // Switch to Goals (מטרות)
            await user.click(screen.getByTestId('tab-goals'));
            expect(screen.getByTestId('skill-breakdown-mock')).toBeInTheDocument();
            expect(screen.queryByTestId('postcard-hub')).not.toBeInTheDocument();

            // Switch to Games (משחקים)
            await user.click(screen.getByTestId('tab-games'));
            expect(screen.getByTestId('parent-games-hub-mock')).toBeInTheDocument();

            // Switch to Settings (הגדרות)
            await user.click(screen.getByTestId('tab-settings'));
            expect(screen.getByTestId('profile-manager-mock')).toBeInTheDocument();

            // Switch back to Postcard (גלויה)
            await user.click(screen.getByTestId('tab-postcard'));
            expect(screen.getByTestId('postcard-hub')).toBeInTheDocument();
        });

        it('transitions from Postcard to Goals when "פרטים נוספים" is clicked', async () => {
            const user = userEvent.setup();
            render(<ParentDashboard onExit={vi.fn()} />);

            await user.click(screen.getByTestId('postcard-details-link'));
            expect(screen.getByTestId('skill-breakdown-mock')).toBeInTheDocument();
        });
    });

    /* ── 2. Top Bar & Child Switcher ─────────────────────────────── */
    describe('top bar and child switcher', () => {
        it('renders the child switcher dropdown and lists all profiles', () => {
            render(<ParentDashboard onExit={vi.fn()} />);

            const switcher = screen.getByTestId('parent-child-switcher') as HTMLSelectElement;
            expect(switcher).toBeInTheDocument();
            expect(switcher.children).toHaveLength(2);
            expect(switcher.children[0]).toHaveTextContent('איתי');
            expect(switcher.children[1]).toHaveTextContent('מאיה');
        });

        it('calls switchProfile when a different child is selected', async () => {
            const user = userEvent.setup();
            render(<ParentDashboard onExit={vi.fn()} />);

            const switcher = screen.getByTestId('parent-child-switcher');
            await user.selectOptions(switcher, 'child-2');

            expect(mockSwitchProfile).toHaveBeenCalledWith('child-2');
        });

        it('renders the "חזרה למשחק" exit button with at least 44px tap zone', () => {
            render(<ParentDashboard onExit={vi.fn()} />);

            const exitBtn = screen.getByTestId('parent-exit-button');
            expect(exitBtn).toBeInTheDocument();
            expect(exitBtn).toHaveTextContent('חזרה למשחק');
            expect(exitBtn.className).toContain('min-h-[44px]');
            expect(exitBtn.className).toContain('min-w-[44px]');
        });
    });

    /* ── 3. Strict Sandbox on Exit ───────────────────────────────── */
    describe('strict sandbox on exit', () => {
        it('clears parent gate and authentication tokens upon resetParentSandbox', () => {
            sessionStorage.setItem('parent_gate_token', 'secret_token_123');
            sessionStorage.setItem('parent_authenticated', 'true');
            sessionStorage.setItem('parent_session', 'session_abc');
            sessionStorage.setItem('parent_gate_passed', 'true');
            localStorage.setItem('parent_temp_state', 'temp_data');

            resetParentSandbox();

            expect(sessionStorage.getItem('parent_gate_token')).toBeNull();
            expect(sessionStorage.getItem('parent_authenticated')).toBeNull();
            expect(sessionStorage.getItem('parent_session')).toBeNull();
            expect(sessionStorage.getItem('parent_gate_passed')).toBeNull();
            expect(localStorage.getItem('parent_temp_state')).toBeNull();
        });

        it('executes sandbox reset and calls onExit when exit button is clicked', async () => {
            const user = userEvent.setup();
            const handleExit = vi.fn();

            // Set up a token in sessionStorage
            sessionStorage.setItem('parent_gate_token', 'active_gate_token');

            render(<ParentDashboard onExit={handleExit} />);

            // First navigate to a non-postcard tab
            await user.click(screen.getByTestId('tab-settings'));
            expect(screen.getByTestId('profile-manager-mock')).toBeInTheDocument();

            // Click exit button
            const exitBtn = screen.getByTestId('parent-exit-button');
            await user.click(exitBtn);

            // Verified: onExit called
            expect(handleExit).toHaveBeenCalledTimes(1);

            // Verified: tokens cleared from storage
            expect(sessionStorage.getItem('parent_gate_token')).toBeNull();
        });

        it('ensures kid storage keys remain unaffected and unpolluted', async () => {
            const user = userEvent.setup();
            const handleExit = vi.fn();

            // Kid's legitimate storage data
            localStorage.setItem('hebrew_game_saga_progress_v1', JSON.stringify({ currentLevel: 5 }));
            localStorage.setItem('hebrew-math-daily-progress', JSON.stringify({ streak: 3 }));

            render(<ParentDashboard onExit={handleExit} />);
            await user.click(screen.getByTestId('parent-exit-button'));

            // Verify kid storage is preserved and uncorrupted
            expect(localStorage.getItem('hebrew_game_saga_progress_v1')).toBe(
                JSON.stringify({ currentLevel: 5 })
            );
            expect(localStorage.getItem('hebrew-math-daily-progress')).toBe(
                JSON.stringify({ streak: 3 })
            );
        });
    });
});
