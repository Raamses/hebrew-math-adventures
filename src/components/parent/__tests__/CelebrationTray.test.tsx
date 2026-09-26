import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';
import {
    CelebrationTray,
    KidCelebrationDelivery,
    detectNewMilestone,
    getSeenMilestones,
    recordMilestoneSeen,
    getPendingKidCelebrations,
    clearKidCelebrations,
    CELEBRATION_DAILY_CAP,
    SEEN_MILESTONES_STORAGE_KEY,
    KID_MAILBOX_STORAGE_KEY,
    CHEERS_HISTORY_STORAGE_KEY,
    type CelebrationMilestone,
} from '../CelebrationTray';
import { validateGift, createInitialState, getTodayISO } from '../games/parentEconomyEngine';
import type { UserProfile } from '../../../types/user';
import type { ParentEconomyState } from '../../../types/parent';

const mockChild: UserProfile = {
    id: 'child-pg4-test',
    name: 'מאיה',
    age: 7,
    avatarId: '🦁',
    mascotId: 'lion',
    themeId: 'default',
    createdAt: 1000,
    lastPlayedAt: 2000,
    streak: 5,
    unlockedBadges: ['first_steps'],
    settings: { musicVolume: 0.8, sfxVolume: 0.8, isMuted: false },
};

const mockChildNoMilestones: UserProfile = {
    id: 'child-clean',
    name: 'תומר',
    age: 6,
    avatarId: '🦉',
    mascotId: 'owl',
    themeId: 'default',
    createdAt: 1000,
    lastPlayedAt: 2000,
    streak: 1, // < 3
    unlockedBadges: [],
    settings: { musicVolume: 0.8, sfxVolume: 0.8, isMuted: false },
};

describe('CelebrationTray (Card PG-4)', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    /* ── 1. Contextual Trigger on a New Milestone ───────────────────── */
    describe('Contextual Trigger', () => {
        it('triggers contextually on a new badge milestone that fired since last visit', () => {
            // First visit for mockChild: 'first_steps' has not been seen
            render(<CelebrationTray profile={mockChild} />);

            expect(screen.getByTestId('celebration-tray')).toBeInTheDocument();
            // Displays specific win: icon + milestone text
            const iconEl = screen.getByTestId('celebration-badge-icon');
            expect(iconEl).toHaveTextContent('🌟');

            const textEl = screen.getByTestId('celebration-milestone-text');
            expect(textEl).toHaveTextContent('מאיה');
            expect(textEl).toHaveTextContent('צעדים ראשונים');
        });

        it('triggers contextually on a new streak milestone (streak >= 3)', () => {
            const streakChild: UserProfile = {
                ...mockChildNoMilestones,
                id: 'child-streak',
                streak: 4,
            };

            render(<CelebrationTray profile={streakChild} />);

            expect(screen.getByTestId('celebration-tray')).toBeInTheDocument();
            expect(screen.getByTestId('celebration-badge-icon')).toHaveTextContent('🔥');
            expect(screen.getByTestId('celebration-milestone-text')).toHaveTextContent('4 ימים');
        });

        it('renders with an explicitly provided milestone prop', () => {
            const customMilestone: CelebrationMilestone = {
                id: 'custom-win',
                badgeIcon: '🏆',
                milestoneText: 'מאיה אלופת התרגול השבועי!',
                childId: mockChild.id,
                childName: mockChild.name,
            };

            render(<CelebrationTray profile={mockChild} milestone={customMilestone} />);

            expect(screen.getByTestId('celebration-tray')).toBeInTheDocument();
            expect(screen.getByTestId('celebration-badge-icon')).toHaveTextContent('🏆');
            expect(screen.getByTestId('celebration-milestone-text')).toHaveTextContent('מאיה אלופת התרגול השבועי!');
        });

        it('does NOT render when nothing new fired since last visit', () => {
            // Mark 'first_steps' and 'streak-5' as seen
            recordMilestoneSeen(mockChild.id, 'first_steps');
            recordMilestoneSeen(mockChild.id, 'streak-5');

            render(<CelebrationTray profile={mockChild} />);

            expect(screen.queryByTestId('celebration-tray')).not.toBeInTheDocument();
        });

        it('does NOT render for child with no badges and low streak', () => {
            render(<CelebrationTray profile={mockChildNoMilestones} />);
            expect(screen.queryByTestId('celebration-tray')).not.toBeInTheDocument();
        });

        it('does NOT render when profile is null or undefined', () => {
            render(<CelebrationTray profile={null} />);
            expect(screen.queryByTestId('celebration-tray')).not.toBeInTheDocument();
        });

        it('detectNewMilestone pure helper correctly returns milestone or null', () => {
            expect(detectNewMilestone(null)).toBeNull();
            expect(detectNewMilestone(mockChildNoMilestones)).toBeNull();

            const detected = detectNewMilestone(mockChild, []);
            expect(detected).not.toBeNull();
            expect(detected?.id).toBe('first_steps');

            // When already seen, returns streak if applicable or null
            const detectedAfterBadgeSeen = detectNewMilestone(mockChild, ['first_steps']);
            expect(detectedAfterBadgeSeen?.id).toBe('streak-5');

            const detectedAllSeen = detectNewMilestone(mockChild, ['first_steps', 'streak-5']);
            expect(detectedAllSeen).toBeNull();
        });

        it('dismiss button marks milestone as seen and calls onDismiss', async () => {
            const user = userEvent.setup();
            const handleDismiss = vi.fn();

            render(<CelebrationTray profile={mockChild} onDismiss={handleDismiss} />);

            const dismissBtn = screen.getByTestId('celebration-dismiss-btn');
            await user.click(dismissBtn);

            expect(handleDismiss).toHaveBeenCalledTimes(1);
            expect(getSeenMilestones(mockChild.id)).toContain('first_steps');
        });
    });

    /* ── 2. Economy Wiring Surfacing ────────────────────────────────── */
    describe('Economy Wiring Surfacing', () => {
        it('surfaces prompt to play a quick round and send today coins to child', () => {
            const customState: ParentEconomyState = {
                ...createInitialState(),
                coins: 15,
            };

            render(<CelebrationTray profile={mockChild} economyState={customState} />);

            const promptEl = screen.getByTestId('celebration-economy-prompt');
            expect(promptEl).toHaveTextContent('שחקו סיבוב קצר, ואז שלחו את המטבעות של היום למאיה');
            expect(promptEl).toHaveTextContent('15');
        });

        it('calls onPlayGames when the quick-play shortcut is clicked', async () => {
            const user = userEvent.setup();
            const handlePlay = vi.fn();

            render(<CelebrationTray profile={mockChild} onPlayGames={handlePlay} />);

            const playBtn = screen.getByTestId('celebration-play-games-btn');
            await user.click(playBtn);

            expect(handlePlay).toHaveBeenCalledTimes(1);
        });
    });

    /* ── 3. One-Tap Actions, Validation Reuse & Daily Caps ───────────── */
    describe('One-Tap Actions and Gift Validation', () => {
        it('skips child picker: actions are one-tap and contextual to the milestone child', () => {
            render(<CelebrationTray profile={mockChild} />);

            expect(screen.getByTestId('celebration-send-coins-btn')).toBeInTheDocument();
            expect(screen.getByTestId('celebration-send-cheer-btn')).toBeInTheDocument();
            // ZERO child select dropdowns inside CelebrationTray
            expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        });

        it('reuses validateGift: disables send coins when parent coins are insufficient (0 coins)', () => {
            const emptyEconomy: ParentEconomyState = {
                ...createInitialState(),
                coins: 0,
            };

            render(<CelebrationTray profile={mockChild} economyState={emptyEconomy} />);

            const sendCoinsBtn = screen.getByTestId('celebration-send-coins-btn');
            expect(sendCoinsBtn).toBeDisabled();

            const notice = screen.getByTestId('celebration-limit-notice');
            expect(notice).toHaveTextContent('שחקו סיבוב קצר במשחקי הורים כדי לצבור מטבעות');
        });

        it('reusable validateGift helper returns insufficient_coins for 0 balance', () => {
            const emptyEconomy: ParentEconomyState = {
                ...createInitialState(),
                coins: 0,
            };
            expect(validateGift(emptyEconomy, mockChild.id, 5, getTodayISO(), CELEBRATION_DAILY_CAP)).toBe('insufficient_coins');
        });

        it('enforces the 25 coins/day per child cap via validateGift', () => {
            const today = getTodayISO();
            const cappedEconomy: ParentEconomyState = {
                ...createInitialState(),
                coins: 50,
                giftHistory: [
                    { id: 'g1', childProfileId: mockChild.id, childName: mockChild.name, amount: 25, date: today },
                ],
            };

            // Validation with CELEBRATION_DAILY_CAP (25) rejects any further coins today
            const err = validateGift(cappedEconomy, mockChild.id, 1, today, CELEBRATION_DAILY_CAP);
            expect(err).toBe('child_daily_limit_exceeded');

            render(<CelebrationTray profile={mockChild} economyState={cappedEconomy} />);

            const sendCoinsBtn = screen.getByTestId('celebration-send-coins-btn');
            expect(sendCoinsBtn).toBeDisabled();

            const notice = screen.getByTestId('celebration-limit-notice');
            expect(notice).toHaveTextContent('הגעת למכסה היומית של 25 מטבעות');
        });

        it('successfully executes one-tap send coins when valid and under daily cap', async () => {
            const user = userEvent.setup();
            const handleSendGift = vi.fn();

            const fundedEconomy: ParentEconomyState = {
                ...createInitialState(),
                coins: 20,
            };

            render(
                <CelebrationTray
                    profile={mockChild}
                    economyState={fundedEconomy}
                    onSendGift={handleSendGift}
                />
            );

            const sendCoinsBtn = screen.getByTestId('celebration-send-coins-btn');
            expect(sendCoinsBtn).not.toBeDisabled();

            await user.click(sendCoinsBtn);

            expect(handleSendGift).toHaveBeenCalledTimes(1);
            expect(handleSendGift).toHaveBeenCalledWith(5);

            // Shows inline success feedback
            const statusMsg = screen.getByTestId('celebration-status-message');
            expect(statusMsg).toHaveTextContent('נשלחו 5 מטבעות למאיה! 🎁');

            // Queued kid celebration in mailbox
            const pending = getPendingKidCelebrations(mockChild.id);
            expect(pending.length).toBeGreaterThanOrEqual(1);
            expect(pending[0].type).toBe('gift');
            expect(pending[0].amount).toBe(5);

            // Automatically records milestone as seen
            expect(getSeenMilestones(mockChild.id)).toContain('first_steps');
        });

        it('successfully executes one-tap cheer even with 0 coins and enforces daily cap', async () => {
            const user = userEvent.setup();
            const handleSendCheer = vi.fn();

            const emptyEconomy: ParentEconomyState = {
                ...createInitialState(),
                coins: 0,
            };

            render(
                <CelebrationTray
                    profile={mockChild}
                    economyState={emptyEconomy}
                    onSendCheer={handleSendCheer}
                />
            );

            const sendCheerBtn = screen.getByTestId('celebration-send-cheer-btn');
            // Cheer requires no coins
            expect(sendCheerBtn).not.toBeDisabled();

            await user.click(sendCheerBtn);

            expect(handleSendCheer).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('celebration-status-message')).toHaveTextContent('נשלחו מחיאות כפיים למאיה! 👏');

            // Queued kid celebration in mailbox
            const pending = getPendingKidCelebrations(mockChild.id);
            expect(pending.some(p => p.type === 'cheer')).toBe(true);
        });

        it('enforces maximum 25 cheers per day', () => {
            const today = getTodayISO();
            localStorage.setItem(`${CHEERS_HISTORY_STORAGE_KEY}_${mockChild.id}`, JSON.stringify({ date: today, count: 25 }));

            render(<CelebrationTray profile={mockChild} />);

            const sendCheerBtn = screen.getByTestId('celebration-send-cheer-btn');
            expect(sendCheerBtn).toBeDisabled();
        });
    });

    /* ── 4. Kid-Side Delivery (Mascot moment, NO parent mechanics) ───── */
    describe('Kid-Side Delivery & Zero Parent-Source Leakage', () => {
        beforeEach(() => {
            clearKidCelebrations(mockChild.id);
        });

        it('renders gift celebration to the kid with exact mascot copy: קיבלת מתנה מאמא/אבא! 🎁', async () => {
            const user = userEvent.setup();

            // 1. Parent sends gift
            const fundedEconomy: ParentEconomyState = { ...createInitialState(), coins: 20 };
            render(<CelebrationTray profile={mockChild} economyState={fundedEconomy} />);
            await user.click(screen.getByTestId('celebration-send-coins-btn'));

            // 2. Kid view renders KidCelebrationDelivery
            const handleDelivered = vi.fn();
            render(<KidCelebrationDelivery childId={mockChild.id} onDelivered={handleDelivered} />);

            const kidToast = screen.getByTestId('kid-celebration-moment');
            expect(kidToast).toBeInTheDocument();
            expect(kidToast).toHaveTextContent('קיבלת מתנה מאמא/אבא! 🎁');
        });

        it('renders cheer celebration to the kid with exact mascot copy: קיבלת מחיאות כפיים מאמא/אבא! 👏', async () => {
            const user = userEvent.setup();

            // 1. Parent sends cheer
            render(<CelebrationTray profile={mockChild} />);
            await user.click(screen.getByTestId('celebration-send-cheer-btn'));

            // 2. Kid view renders KidCelebrationDelivery
            render(<KidCelebrationDelivery childId={mockChild.id} />);

            const kidToast = screen.getByTestId('kid-celebration-moment');
            expect(kidToast).toBeInTheDocument();
            expect(kidToast).toHaveTextContent('קיבלת מחיאות כפיים מאמא/אבא! 👏');
        });

        it('guarantees ZERO parent-source leakage in the kid delivery view', async () => {
            const user = userEvent.setup();

            // Send gift
            const fundedEconomy: ParentEconomyState = { ...createInitialState(), coins: 20 };
            render(<CelebrationTray profile={mockChild} economyState={fundedEconomy} />);
            await user.click(screen.getByTestId('celebration-send-coins-btn'));

            // Render kid moment
            const { container } = render(<KidCelebrationDelivery childId={mockChild.id} />);
            const fullKidText = container.textContent?.toLowerCase() || '';

            // Strict forbidden adult economy / parent admin terms
            const forbiddenLeakageTerms = [
                'יתרה',
                'balance',
                'מגבלה',
                'daily limit',
                'cap',
                'מכסה',
                'economy',
                'קופה',
                'ארנק',
                'wallet',
                'העברה',
                'transfer',
                'דשבורד',
                'dashboard',
                'admin',
                'ניהול',
                'validate',
            ];

            for (const term of forbiddenLeakageTerms) {
                expect(fullKidText).not.toContain(term.toLowerCase());
            }
        });
    });

    /* ── 5. Zero Competitive Ranking Board References Remain ─────────── */
    describe('Ranking Board Removal Verification', () => {
        it('verifies that zero files in src/ contain references to the cut board', () => {
            const srcDir = path.resolve(__dirname, '../../../');
            const targetPattern = new RegExp(['lead', 'erbo', 'ard'].join(''), 'i');

            function searchForbiddenTermInDir(dir: string): string[] {
                const matches: string[] = [];
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        matches.push(...searchForbiddenTermInDir(fullPath));
                    } else if (entry.isFile()) {
                        // Check all source code / json / ts / tsx files
                        if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            if (targetPattern.test(content)) {
                                matches.push(fullPath);
                            }
                        }
                    }
                }
                return matches;
            }

            const foundMatches = searchForbiddenTermInDir(srcDir);
            expect(foundMatches).toEqual([]);
        });
    });
});
