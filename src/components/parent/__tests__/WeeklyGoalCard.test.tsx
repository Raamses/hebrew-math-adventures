import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeeklyGoalCard } from '../ParentDashboard';
import { PostcardHub } from '../PostcardHub';
import { SKILL_CONFIGS, getSkillLabel } from '../../../lib/skillFocus';
import { getWeekStartISO } from '../games/parentEconomyEngine';
import { ProfileProvider, useProfile } from '../../../context/ProfileContext';
import { QuestProvider, useQuest } from '../../../context/QuestContext';
import type { UserProfile } from '../../../types/user';

const currentWeekStart = getWeekStartISO();

const mockChildProfile: UserProfile = {
    id: 'test-child-pg3',
    name: 'ליבי',
    age: 7,
    avatarId: '🦁',
    mascotId: 'bear',
    themeId: 'default',
    createdAt: 1000,
    lastPlayedAt: 2000,
    streak: 3,
    unlockedBadges: [],
    settings: { musicVolume: 0.8, sfxVolume: 0.8, isMuted: false },
};

// Wrapper with both ProfileProvider and QuestProvider
const createAllProviders = () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <ProfileProvider>
            <QuestProvider>{children}</QuestProvider>
        </ProfileProvider>
    );
    return Wrapper;
};

const useBoth = () => ({
    profile: useProfile(),
    quest: useQuest(),
});

describe('WeeklyGoalCard (Card PG-3)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    /* ── 1. The picker lists exactly the SKILL_CONFIGS keys ─────────────── */
    describe('Skill Picker', () => {
        it('lists exactly the SKILL_CONFIGS keys as picker options with Hebrew labels', () => {
            render(<WeeklyGoalCard profile={mockChildProfile} />);

            const pickerSelect = screen.getByTestId('weekly-goal-skill-picker') as HTMLSelectElement;
            expect(pickerSelect).toBeInTheDocument();

            const options = Array.from(pickerSelect.querySelectorAll('option'));
            const optionValues = options.map((opt) => opt.value);
            const expectedKeys = Object.keys(SKILL_CONFIGS);

            // Exact match in keys and length
            expect(optionValues).toEqual(expectedKeys);
            expect(optionValues.length).toBe(10);
            expect(optionValues).toEqual([
                'addition',
                'addition_carry',
                'subtraction',
                'subtraction_borrow',
                'multiplication',
                'division',
                'series',
                'comparison',
                'word_problems',
                'algebraic',
            ]);

            // Each option displays the canonical Hebrew label from SKILL_CONFIGS
            for (const opt of options) {
                const configEntry = SKILL_CONFIGS[opt.value];
                expect(opt.textContent).toBe(configEntry.defaultLabelHe);
            }
        });
    });

    /* ── 2. Set/edit a goal (skillKey + target + weekStart persist) ──────── */
    describe('Set and Edit Goal', () => {
        it('sets a new weekly goal with selected skill, target, and current weekStart', async () => {
            const user = userEvent.setup();

            const { rerender } = render(<WeeklyGoalCard profile={mockChildProfile} />);

            // Select 'subtraction'
            const pickerSelect = screen.getByTestId('weekly-goal-skill-picker');
            await user.selectOptions(pickerSelect, 'subtraction');

            // Set target count to 5 using input
            const targetInput = screen.getByTestId('weekly-goal-target-input');
            await user.clear(targetInput);
            await user.type(targetInput, '5');

            // Click save
            const saveBtn = screen.getByTestId('weekly-goal-save-btn');
            await user.click(saveBtn);

            // Verify rendered active goal display
            const profileWithGoal: UserProfile = {
                ...mockChildProfile,
                weeklyGoal: {
                    skillKey: 'subtraction',
                    target: 5,
                    weekStart: currentWeekStart,
                },
            };

            rerender(<WeeklyGoalCard profile={profileWithGoal} />);

            expect(screen.getByTestId('weekly-goal-display')).toBeInTheDocument();
            expect(screen.getByTestId('weekly-goal-text')).toHaveTextContent('5 תרגילי חיסור');
            expect(screen.getByTestId('weekly-goal-edit-btn')).toBeInTheDocument();
        });

        it('edits an existing weekly goal and persists new values', async () => {
            const user = userEvent.setup();

            const profileWithGoal: UserProfile = {
                ...mockChildProfile,
                weeklyGoal: {
                    skillKey: 'subtraction',
                    target: 5,
                    weekStart: currentWeekStart,
                },
            };

            const { rerender } = render(<WeeklyGoalCard profile={profileWithGoal} />);

            expect(screen.getByTestId('weekly-goal-text')).toHaveTextContent('5 תרגילי חיסור');

            // Click edit
            const editBtn = screen.getByTestId('weekly-goal-edit-btn');
            await user.click(editBtn);

            // Form is now open
            expect(screen.getByTestId('weekly-goal-form')).toBeInTheDocument();

            // Change skill to 'multiplication'
            const pickerSelect = screen.getByTestId('weekly-goal-skill-picker');
            await user.selectOptions(pickerSelect, 'multiplication');

            // Change target to 10
            const targetInput = screen.getByTestId('weekly-goal-target-input');
            await user.clear(targetInput);
            await user.type(targetInput, '10');

            // Click save
            const saveBtn = screen.getByTestId('weekly-goal-save-btn');
            await user.click(saveBtn);

            // Re-render with updated profile
            const updatedProfile: UserProfile = {
                ...profileWithGoal,
                weeklyGoal: {
                    skillKey: 'multiplication',
                    target: 10,
                    weekStart: currentWeekStart,
                },
            };
            rerender(<WeeklyGoalCard profile={updatedProfile} />);

            expect(screen.getByTestId('weekly-goal-text')).toHaveTextContent('10 תרגילי כפל');
        });

        it('persists weeklyGoal updates through ProfileContext updateProfile and setWeeklyGoal', async () => {
            const { result } = renderHook(() => useBoth(), { wrapper: createAllProviders() });

            // Create profile
            await act(async () => {
                await result.current.profile.createProfile('תמר', 8, '👧', 'owl');
            });

            expect(result.current.profile.profile).toBeTruthy();

            // Set weekly goal via setWeeklyGoal
            act(() => {
                result.current.profile.setWeeklyGoal({
                    skillKey: 'division',
                    target: 8,
                    weekStart: currentWeekStart,
                });
            });

            expect(result.current.profile.profile?.weeklyGoal).toEqual({
                skillKey: 'division',
                target: 8,
                weekStart: currentWeekStart,
            });

            // Persists in localStorage
            const storedRaw = localStorage.getItem('hebrew-math-profiles');
            expect(storedRaw).toBeTruthy();
            const stored = JSON.parse(storedRaw!);
            expect(stored[0].weeklyGoal).toEqual({
                skillKey: 'division',
                target: 8,
                weekStart: currentWeekStart,
            });
        });
    });

    /* ── 3. Auto-clear on rollover (weekStart mismatch → goal is gone) ─── */
    describe('Auto-Clear on Rollover', () => {
        it('clears goal when weekStart mismatches current week in WeeklyGoalCard', () => {
            const expiredWeekStart = '2020-01-05'; // past week
            const profileWithExpiredGoal: UserProfile = {
                ...mockChildProfile,
                weeklyGoal: {
                    skillKey: 'subtraction',
                    target: 5,
                    weekStart: expiredWeekStart,
                },
            };

            render(<WeeklyGoalCard profile={profileWithExpiredGoal} />);

            // Expired goal does not show active display; shows form/empty state
            expect(screen.queryByTestId('weekly-goal-display')).not.toBeInTheDocument();
            expect(screen.getByTestId('weekly-goal-form')).toBeInTheDocument();
        });

        it('auto-clears expired weeklyGoal on profile update in ProfileContext', async () => {
            const { result } = renderHook(() => useBoth(), { wrapper: createAllProviders() });

            await act(async () => {
                await result.current.profile.createProfile('אורי', 7, '👦', 'lion');
            });

            const profileId = result.current.profile.profile!.id;

            // Attempt to update with expired weekStart
            act(() => {
                result.current.profile.updateProfile(profileId, {
                    weeklyGoal: {
                        skillKey: 'addition',
                        target: 10,
                        weekStart: '2023-01-01', // mismatched week
                    },
                });
            });

            // Auto-cleared to undefined
            expect(result.current.profile.profile?.weeklyGoal).toBeUndefined();
        });
    });

    /* ── 4. Kid quest renders in mascot voice with no admin language ──── */
    describe('Kid Quest In-Fiction Presentation', () => {
        it('renders quest from weeklyGoal in mascot voice without any admin language', async () => {
            const { result } = renderHook(() => useBoth(), { wrapper: createAllProviders() });

            // Create profile with bear mascot
            await act(async () => {
                await result.current.profile.createProfile('ליבי', 7, '🦁', 'bear');
            });

            // Set active weekly goal
            act(() => {
                result.current.profile.setWeeklyGoal({
                    skillKey: 'subtraction',
                    target: 5,
                    weekStart: currentWeekStart,
                });
            });

            const goalQuest = result.current.quest.weeklyGoalQuest;
            expect(goalQuest).toBeTruthy();
            expect(goalQuest!.id).toContain('weekly-goal');
            expect(goalQuest!.target).toBe(5);
            expect(goalQuest!.icon).toBe('🐻');

            // Title and description in mascot voice
            expect(goalQuest!.titleKey).toContain('הדב');
            expect(goalQuest!.descKey).toContain('5');
            expect(goalQuest!.descKey).toContain('חיסור');

            // Strictly NO admin or parental assignment language
            const forbiddenAdminTerms = [
                'parent',
                'הורה',
                'הורים',
                'אבא',
                'אמא',
                'assigned',
                'הוקצה',
                'הוטל',
                'מטלה',
                'admin',
                'אדמין',
            ];

            const fullQuestCopy = `${goalQuest!.titleKey} ${goalQuest!.descKey}`.toLowerCase();
            for (const term of forbiddenAdminTerms) {
                expect(fullQuestCopy).not.toContain(term.toLowerCase());
            }

            // Also appears in todayQuests collection where QuestContext already renders quests
            const foundInList = result.current.quest.todayQuests.find((q) => q.id === goalQuest!.id);
            expect(foundInList).toBeTruthy();
        });

        it('adapts mascot voice to owl mascot when owl is selected', async () => {
            const { result } = renderHook(() => useBoth(), { wrapper: createAllProviders() });

            await act(async () => {
                await result.current.profile.createProfile('יובל', 8, '🦉', 'owl');
            });

            act(() => {
                result.current.profile.setWeeklyGoal({
                    skillKey: 'division',
                    target: 7,
                    weekStart: currentWeekStart,
                });
            });

            const goalQuest = result.current.quest.weeklyGoalQuest;
            expect(goalQuest).toBeTruthy();
            expect(goalQuest!.icon).toBe('🦉');
            expect(goalQuest!.titleKey).toContain('הינשוף');
            expect(goalQuest!.descKey).toContain('חילוק');
            expect(goalQuest!.descKey).toContain('7');

            const fullQuestCopy = `${goalQuest!.titleKey} ${goalQuest!.descKey}`.toLowerCase();
            expect(fullQuestCopy).not.toContain('הורה');
            expect(fullQuestCopy).not.toContain('parent');
        });

        it('does not render kid quest if weeklyGoal is from an expired week', async () => {
            const { result } = renderHook(() => useBoth(), { wrapper: createAllProviders() });

            await act(async () => {
                await result.current.profile.createProfile('רועי', 7, '👦', 'ant');
            });

            const profileId = result.current.profile.profile!.id;

            // Update with an expired weekStart
            act(() => {
                result.current.profile.updateProfile(profileId, {
                    weeklyGoal: {
                        skillKey: 'subtraction',
                        target: 5,
                        weekStart: '2021-01-01',
                    },
                });
            });

            expect(result.current.quest.weeklyGoalQuest).toBeNull();
            const foundInList = result.current.quest.todayQuests.find((q) => q.id.startsWith('weekly-goal'));
            expect(foundInList).toBeUndefined();
        });
    });

    /* ── 5. PostcardHub Weekly Goal Chip ───────────────────────────────── */
    describe('PostcardHub Weekly Goal Chip', () => {
        it('renders active goal chip in PostcardHub with target and skill label', () => {
            const profileWithGoal: UserProfile = {
                ...mockChildProfile,
                weeklyGoal: {
                    skillKey: 'multiplication',
                    target: 12,
                    weekStart: currentWeekStart,
                },
            };

            render(<PostcardHub profile={profileWithGoal} />);

            const goalChip = screen.getByTestId('postcard-weekly-goal-chip');
            expect(goalChip).toBeInTheDocument();
            expect(goalChip).toHaveTextContent('יעד שבועי');
            expect(goalChip).toHaveTextContent('12 תרגילי כפל');
        });

        it('wires goal practice button in PostcardHub to onPracticeSkill with goal config', async () => {
            const user = userEvent.setup();
            const handlePractice = vi.fn();

            const profileWithGoal: UserProfile = {
                ...mockChildProfile,
                weeklyGoal: {
                    skillKey: 'subtraction',
                    target: 5,
                    weekStart: currentWeekStart,
                },
            };

            render(<PostcardHub profile={profileWithGoal} onPracticeSkill={handlePractice} />);

            const practiceBtn = screen.getByTestId('postcard-goal-practice-btn');
            expect(practiceBtn).toBeInTheDocument();

            await user.click(practiceBtn);
            expect(handlePractice).toHaveBeenCalledTimes(1);
            expect(handlePractice).toHaveBeenCalledWith({ type: 'sub_simple' });
        });

        it('shows set-goal action in PostcardHub when no goal is set', async () => {
            const user = userEvent.setup();
            const handleOpenDetails = vi.fn();

            render(<PostcardHub profile={mockChildProfile} onOpenDetails={handleOpenDetails} />);

            const setGoalBtn = screen.getByTestId('postcard-set-goal-btn');
            expect(setGoalBtn).toBeInTheDocument();

            await user.click(setGoalBtn);
            expect(handleOpenDetails).toHaveBeenCalledTimes(1);
        });
    });
});
