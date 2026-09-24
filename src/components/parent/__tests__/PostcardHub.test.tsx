import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostcardHub, deriveNarrativeSentence } from '../PostcardHub';
import type { UserProfile } from '../../../types/user';

vi.mock('../../../context/ProfileContext', () => ({
    useProfile: () => ({
        profile: null,
        allProfiles: [],
        switchProfile: vi.fn(),
    }),
}));

describe('PostcardHub', () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const mockProfile: UserProfile = {
        id: 'test-child-1',
        name: 'רן',
        age: 7,
        avatarId: '🦁',
        mascotId: 'bear',
        themeId: 'default',
        createdAt: 1000,
        lastPlayedAt: 2000,
        streak: 4,
        unlockedBadges: ['badge1', 'badge2', 'badge3'],
        dailyStamps: [todayStr],
        sessionHistory: [
            {
                date: todayStr,
                durationSec: 720, // 12 minutes
                correct: 10,
                attempts: 10,
                skillFocus: 'addition',
                gameMode: 'practice',
            },
        ],
        capabilities: {
            skills: {
                addition: {
                    attempts: 10,
                    correct: 10,
                    consecutiveCorrect: 10,
                    avgSpeedMs: 2000,
                    lastPracticed: Date.now(),
                },
                subtraction: {
                    attempts: 10,
                    correct: 4,
                    consecutiveCorrect: 1,
                    avgSpeedMs: 4000,
                    lastPracticed: Date.now(),
                },
            },
        },
        settings: {
            musicVolume: 0.8,
            sfxVolume: 0.8,
            isMuted: false,
        },
    };

    /* ── 1. Narrative Derivation ─────────────────────────────────── */
    describe('deriveNarrativeSentence', () => {
        it('returns prompt to select profile when profile is null or undefined', () => {
            expect(deriveNarrativeSentence(null)).toBe('בחרו פרופיל כדי לראות את הגלויה השבועית');
            expect(deriveNarrativeSentence(undefined)).toBe('בחרו פרופיל כדי לראות את הגלויה השבועית');
        });

        it('derives sentence with minutes and strongest skill per spec', () => {
            // "רן תרגל 12 דקות השבוע, הכי חזק בחיבור"
            const sentence = deriveNarrativeSentence(mockProfile);
            expect(sentence).toBe('רן תרגל 12 דקות השבוע, הכי חזק בחיבור');
        });

        it('derives sentence with streak when minutes > 0 but no strongest skill', () => {
            const profileWithoutSkills: UserProfile = {
                ...mockProfile,
                capabilities: { skills: {} },
                sessionHistory: [
                    {
                        date: todayStr,
                        durationSec: 900, // 15 mins
                        correct: 0,
                        attempts: 0,
                        skillFocus: 'general',
                        gameMode: 'practice',
                    },
                ],
            };
            const sentence = deriveNarrativeSentence(profileWithoutSkills);
            expect(sentence).toBe('רן תרגל 15 דקות השבוע, עם רצף של 4 ימים');
        });

        it('derives sentence with strongest skill and streak when no session history minutes', () => {
            const profileNoHistory: UserProfile = {
                ...mockProfile,
                sessionHistory: [],
            };
            const sentence = deriveNarrativeSentence(profileNoHistory);
            expect(sentence).toBe('רן הכי חזק בחיבור, עם רצף של 4 ימים');
        });

        it('derives sentence with streak only when no minutes and no skills', () => {
            const profileStreakOnly: UserProfile = {
                ...mockProfile,
                sessionHistory: [],
                capabilities: { skills: {} },
                streak: 5,
            };
            const sentence = deriveNarrativeSentence(profileStreakOnly);
            expect(sentence).toBe('רן ברצף של 5 ימים של תרגול מתמטיקה');
        });

        it('derives welcoming sentence for brand new child', () => {
            const newChild: UserProfile = {
                ...mockProfile,
                sessionHistory: [],
                capabilities: { skills: {} },
                streak: 0,
            };
            const sentence = deriveNarrativeSentence(newChild);
            expect(sentence).toBe('רן מוכן למסע למידה חדש השבוע');
        });
    });

    /* ── 2. Component Rendering & Sub-elements ───────────────────── */
    describe('PostcardHub Component', () => {
        it('renders empty state when no profile is active', () => {
            render(<PostcardHub profile={null} />);
            expect(screen.getByTestId('postcard-hub')).toBeInTheDocument();
            expect(screen.getByText('לא נבחר פרופיל')).toBeInTheDocument();
        });

        it('renders the mascot narrative hero card with child voice', () => {
            render(<PostcardHub profile={mockProfile} />);

            expect(screen.getByTestId('postcard-hero')).toBeInTheDocument();
            const narrativeEl = screen.getByTestId('postcard-narrative');
            expect(narrativeEl).toHaveTextContent('רן תרגל 12 דקות השבוע, הכי חזק בחיבור');
        });

        it('renders ONE action chip wired to weakest skill and invokes practiceThis logic', async () => {
            const user = userEvent.setup();
            const handlePractice = vi.fn();

            render(<PostcardHub profile={mockProfile} onPracticeSkill={handlePractice} />);

            const actionChip = screen.getByTestId('postcard-action-chip');
            expect(actionChip).toBeInTheDocument();
            // Subtraction is weakest skill (40% accuracy)
            expect(actionChip).toHaveTextContent('חיסור');
            expect(actionChip).toHaveTextContent('40% דיוק');

            const practiceBtn = screen.getByTestId('postcard-practice-btn');
            expect(practiceBtn).toBeInTheDocument();

            await user.click(practiceBtn);
            expect(handlePractice).toHaveBeenCalledTimes(1);
            expect(handlePractice).toHaveBeenCalledWith({ type: 'sub_simple' });
        });

        it('uses shared skillFocus helper fallback to default practice when profile has no skill data', () => {
            const profileNoSkills: UserProfile = {
                ...mockProfile,
                capabilities: { skills: {} },
            };
            render(<PostcardHub profile={profileNoSkills} onPracticeSkill={vi.fn()} />);

            const actionChip = screen.getByTestId('postcard-action-chip');
            expect(actionChip).toHaveTextContent('חיבור');
        });

        it('renders the compact 3-stat strip with streak, badges, and accuracy', () => {
            render(<PostcardHub profile={mockProfile} />);

            expect(screen.getByTestId('postcard-stat-strip')).toBeInTheDocument();

            // Streak: 4
            const streakCard = screen.getByTestId('postcard-stat-streak');
            expect(streakCard).toHaveTextContent('4');

            // Badges: 3
            const badgesCard = screen.getByTestId('postcard-stat-badges');
            expect(badgesCard).toHaveTextContent('3');

            // Accuracy: 14 correct / 20 attempts = 70%
            const accuracyCard = screen.getByTestId('postcard-stat-accuracy');
            expect(accuracyCard).toHaveTextContent('70%');
        });

        it('renders the compact 7-day heatmap strip with activity check and presence motto', () => {
            render(<PostcardHub profile={mockProfile} />);

            const heatmap = screen.getByTestId('postcard-heatmap-strip');
            expect(heatmap).toBeInTheDocument();
            expect(heatmap).toHaveTextContent('נוכחות השבוע');
            expect(heatmap).toHaveTextContent('ימי מנוחה הם חלק מהלמידה 🌿');

            // Check that today's element has activity checkmark
            const todayElement = screen.getByTestId(`heatmap-day-${todayStr}`);
            expect(todayElement).toHaveTextContent('✓');
        });

        it('wires "פרטים נוספים" drill-down link to onOpenDetails', async () => {
            const user = userEvent.setup();
            const handleOpenDetails = vi.fn();

            render(<PostcardHub profile={mockProfile} onOpenDetails={handleOpenDetails} />);

            const detailsLink = screen.getByTestId('postcard-details-link');
            expect(detailsLink).toBeInTheDocument();
            expect(detailsLink).toHaveTextContent('פרטים נוספים');

            await user.click(detailsLink);
            expect(handleOpenDetails).toHaveBeenCalledTimes(1);
        });
    });
});
