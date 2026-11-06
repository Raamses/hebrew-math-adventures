// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import React, { StrictMode } from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
    ParentEconomyProvider,
    recentSessionIds,
} from '../../../../context/ParentEconomyContext';
import { useParentEconomy } from '../../../../hooks/useParentEconomy';
import { getTodayISO } from '../parentEconomyEngine';
import { STORAGE_KEYS } from '../../../../lib/worldConfig';
import type { GameResult, ParentEconomyState } from '../../../../types/parent';
import { ParentBlitz } from '../ParentBlitz';
import { ParentGamesHub, ParentGamesEconomyToast } from '../../ParentGamesHub';
import { BLITZ_DURATION_MS, BLITZ_TICK_MS } from '../blitzEngine';
import enJson from '../../../../i18n/locales/en.json';
import heJson from '../../../../i18n/locales/he.json';

describe('parentGamesEconomyWiring — State Core', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        recentSessionIds.clear();
    });

    afterEach(() => {
        localStorage.clear();
        recentSessionIds.clear();
    });

    // ================================================================
    //  T1: One Shared Instance
    // ================================================================
    describe('T1: One shared instance across consumers under ParentEconomyProvider', () => {
        const ConsumerA: React.FC = () => {
            const { state, recordGameResult } = useParentEconomy();
            return (
                <div>
                    <div data-testid="a-coins">{state.coins}</div>
                    <div data-testid="a-games">{state.totalGamesPlayed}</div>
                    <button
                        data-testid="a-record-btn"
                        onClick={() =>
                            recordGameResult({
                                gameId: 'parent-blitz',
                                score: 100, // blitz: 10 coins
                                won: true,
                            })
                        }
                    >
                        Play A
                    </button>
                </div>
            );
        };

        const ConsumerB: React.FC = () => {
            const { state, recordGameResult } = useParentEconomy();
            return (
                <div>
                    <div data-testid="b-coins">{state.coins}</div>
                    <div data-testid="b-games">{state.totalGamesPlayed}</div>
                    <button
                        data-testid="b-record-btn"
                        onClick={() =>
                            recordGameResult({
                                gameId: 'equation-of-the-day',
                                score: 0,
                                won: true, // eod win: 20 coins
                            })
                        }
                    >
                        Play B
                    </button>
                </div>
            );
        };

        it('recordGameResult via ONE consumer updates BOTH displays (coins and totalGamesPlayed)', () => {
            render(
                <ParentEconomyProvider>
                    <ConsumerA />
                    <ConsumerB />
                </ParentEconomyProvider>,
            );

            // Initial state in both consumers
            expect(screen.getByTestId('a-coins').textContent).toBe('0');
            expect(screen.getByTestId('b-coins').textContent).toBe('0');
            expect(screen.getByTestId('a-games').textContent).toBe('0');
            expect(screen.getByTestId('b-games').textContent).toBe('0');

            // Consumer A plays Blitz
            fireEvent.click(screen.getByTestId('a-record-btn'));

            // Both consumers reflect the update (single shared instance, not two useState copies)
            expect(screen.getByTestId('a-coins').textContent).toBe('10');
            expect(screen.getByTestId('b-coins').textContent).toBe('10');
            expect(screen.getByTestId('a-games').textContent).toBe('1');
            expect(screen.getByTestId('b-games').textContent).toBe('1');

            // Consumer B plays Equation of the Day
            fireEvent.click(screen.getByTestId('b-record-btn'));

            // Both consumers update again
            expect(screen.getByTestId('a-coins').textContent).toBe('30'); // 10 + 20
            expect(screen.getByTestId('b-coins').textContent).toBe('30');
            expect(screen.getByTestId('a-games').textContent).toBe('2');
            expect(screen.getByTestId('b-games').textContent).toBe('2');
        });
    });

    // ================================================================
    //  T2: Idempotent re-apply on remount / double-mount
    // ================================================================
    describe('T2: Idempotent re-apply on remount (sessionId guard)', () => {
        it('apply a GameResult with sessionId "s1" twice -> coins and games counted ONCE', () => {
            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            const gameResult: GameResult = {
                gameId: 'parent-blitz',
                score: 100, // 10 coins
                won: true,
                sessionId: 's1',
            };

            // First application
            let outcome1;
            act(() => {
                outcome1 = result.current.recordGameResult(gameResult);
            });

            expect(result.current.state.coins).toBe(10);
            expect(result.current.state.totalGamesPlayed).toBe(1);
            expect(outcome1!.coinsEarned.coins).toBe(10);

            // Second application with the same sessionId (StrictMode / remount simulation)
            let outcome2;
            act(() => {
                outcome2 = result.current.recordGameResult(gameResult);
            });

            // Coins and games remain counted exactly ONCE
            expect(result.current.state.coins).toBe(10);
            expect(result.current.state.totalGamesPlayed).toBe(1);
            expect(outcome2!.coinsEarned.coins).toBe(10);

            // A new game with a different sessionId is applied normally
            act(() => {
                result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 50, // 5 coins
                    won: true,
                    sessionId: 's2',
                });
            });

            expect(result.current.state.coins).toBe(15);
            expect(result.current.state.totalGamesPlayed).toBe(2);
        });

        it('two DIFFERENT sessionIds fired inside ONE act() -> both return non-null outcomes with correct coinsEarned and coins total', () => {
            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            let outcome1: any;
            let outcome2: any;

            act(() => {
                outcome1 = result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 100, // 10 coins
                    won: true,
                    sessionId: 'session-act-1',
                });
                outcome2 = result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 200, // 20 coins
                    won: true,
                    sessionId: 'session-act-2',
                });
            });

            expect(outcome1).not.toBeNull();
            expect(outcome2).not.toBeNull();
            expect(outcome1.coinsEarned.coins).toBe(10);
            expect(outcome2.coinsEarned.coins).toBe(20);
            expect(result.current.state.coins).toBe(30);
            expect(result.current.state.totalGamesPlayed).toBe(2);
        });

        it('remount idempotency: render provider, recordGameResult sessionId s1, unmount, render FRESH provider, re-apply s1 -> coins counted ONCE; then s3 counts normally', () => {
            const hook1 = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            let outcome1: any;
            act(() => {
                outcome1 = hook1.result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 100, // 10 coins
                    won: true,
                    sessionId: 's1',
                });
            });

            expect(hook1.result.current.state.coins).toBe(10);
            expect(outcome1).not.toBeNull();
            expect(outcome1.coinsEarned.coins).toBe(10);

            // Unmount the first provider
            hook1.unmount();

            // Render a FRESH ParentEconomyProvider
            const hook2 = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            // Re-apply 's1' -> cached outcome returned, coins counted ONCE (remains 10)
            let outcomeReplayed: any;
            act(() => {
                outcomeReplayed = hook2.result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 100,
                    won: true,
                    sessionId: 's1',
                });
            });

            expect(outcomeReplayed).not.toBeNull();
            expect(outcomeReplayed.coinsEarned.coins).toBe(10);
            expect(hook2.result.current.state.coins).toBe(10);
            expect(hook2.result.current.state.totalGamesPlayed).toBe(1);

            // SessionId 's3' counts normally (+5 coins -> 15 total)
            let outcome3: any;
            act(() => {
                outcome3 = hook2.result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 50, // 5 coins
                    won: true,
                    sessionId: 's3',
                });
            });

            expect(outcome3).not.toBeNull();
            expect(outcome3.coinsEarned.coins).toBe(5);
            expect(hook2.result.current.state.coins).toBe(15);
            expect(hook2.result.current.state.totalGamesPlayed).toBe(2);
        });

        it('handles StrictMode double-execution idempotently', () => {
            let mountCallCount = 0;
            const StrictProbe: React.FC = () => {
                const { state, recordGameResult } = useParentEconomy();
                React.useEffect(() => {
                    mountCallCount++;
                    recordGameResult({
                        gameId: 'parent-blitz',
                        score: 100,
                        won: true,
                        sessionId: 'strict-session-1',
                    });
                }, [recordGameResult]);

                return <div data-testid="strict-coins">{state.coins}</div>;
            };

            render(
                <StrictMode>
                    <ParentEconomyProvider>
                        <StrictProbe />
                    </ParentEconomyProvider>
                </StrictMode>,
            );

            // In React 19 StrictMode in development/test, useEffect mounts, cleans up, and remounts (exact count === 2)
            expect(mountCallCount).toBe(2);
            expect(screen.getByTestId('strict-coins').textContent).toBe('10');
        });
    });

    // ================================================================
    //  T3: Schema Version + Migration
    // ================================================================
    describe('T3: Schema version migration from unversioned legacy state', () => {
        it('seeds localStorage with unversioned legacy state -> loads + migrates fields and schemaVersion === 1', () => {
            const legacyPersistedState = {
                coins: 77,
                totalCoinsEarned: 250,
                totalGamesPlayed: 14,
                streak: 4,
                bestStreak: 6,
                lastPlayedDate: '2026-11-01',
                unlockedBadges: ['first-game'],
                giftHistory: [
                    {
                        id: 'gift-legacy-1',
                        childProfileId: 'child-abc',
                        childName: 'Tali',
                        amount: 10,
                        date: '2026-11-01',
                    },
                ],
                totalGiftedCoins: 10,
                gameHighScores: { 'parent-blitz': 85 },
                gameWinCounts: { 'parent-blitz': 3 },
                streakFreezeHistory: ['2026-10-25'],
                // NOTE: schemaVersion is intentionally missing (v0 legacy)
            };

            localStorage.setItem(STORAGE_KEYS.PARENT_ECONOMY, JSON.stringify(legacyPersistedState));

            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            // Preserves existing fields
            expect(result.current.state.coins).toBe(77);
            expect(result.current.state.totalCoinsEarned).toBe(250);
            expect(result.current.state.totalGamesPlayed).toBe(14);
            expect(result.current.state.streak).toBe(4);
            expect(result.current.state.bestStreak).toBe(6);
            expect(result.current.state.lastPlayedDate).toBe('2026-11-01');
            expect(result.current.state.unlockedBadges).toEqual(['first-game']);
            expect(result.current.state.giftHistory).toHaveLength(1);
            expect(result.current.state.giftHistory[0].childName).toBe('Tali');
            expect(result.current.state.totalGiftedCoins).toBe(10);
            expect(result.current.state.gameHighScores['parent-blitz']).toBe(85);
            expect(result.current.state.gameWinCounts['parent-blitz']).toBe(3);
            expect(result.current.state.streakFreezeHistory).toEqual(['2026-10-25']);

            // Tags schemaVersion === 1
            expect(result.current.state.schemaVersion).toBe(1);

            // Persisted write includes schemaVersion: 1
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARENT_ECONOMY)!);
            expect(stored.schemaVersion).toBe(1);
            expect(stored.coins).toBe(77);
        });

        it('preserves unknown/future schema version without corruption', () => {
            const futureState = {
                schemaVersion: 99,
                coins: 500,
                futureField: 'special_value',
            };

            localStorage.setItem(STORAGE_KEYS.PARENT_ECONOMY, JSON.stringify(futureState));

            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            expect(result.current.state.schemaVersion).toBe(99);
            expect(result.current.state.coins).toBe(500);
            expect((result.current.state as Record<string, unknown>).futureField).toBe('special_value');
        });

        it('coerces non-numeric/corrupted fields to defaults during migration', () => {
            const corruptedState = {
                coins: 'not-a-number',
                totalCoinsEarned: null,
                totalGamesPlayed: undefined,
                streak: NaN,
                bestStreak: Infinity,
                totalGiftedCoins: {},
            };

            localStorage.setItem(STORAGE_KEYS.PARENT_ECONOMY, JSON.stringify(corruptedState));

            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            expect(result.current.state.coins).toBe(0);
            expect(result.current.state.totalCoinsEarned).toBe(0);
            expect(result.current.state.totalGamesPlayed).toBe(0);
            expect(result.current.state.streak).toBe(0);
            expect(result.current.state.bestStreak).toBe(0);
            expect(result.current.state.totalGiftedCoins).toBe(0);
            expect(result.current.state.schemaVersion).toBe(1);
        });
    });

    // ================================================================
    //  Provider Actions: giftToChild & useStreakFreeze
    // ================================================================
    describe('Provider action coverage: giftToChild and useStreakFreeze', () => {
        it('giftToChild under ParentEconomyProvider: success returns transaction and deducts coins; over-cap invalid call returns null and leaves coins untouched', () => {
            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            // Earn 60 coins
            act(() => {
                result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 600, // 60 coins
                    won: true,
                });
            });
            expect(result.current.state.coins).toBe(60);

            // Valid gift: 20 coins to child-1 (daily cap per child is 50)
            let tx: any;
            act(() => {
                tx = result.current.giftToChild('child-1', 'Child One', 20);
            });

            expect(tx).not.toBeNull();
            expect(tx.amount).toBe(20);
            expect(tx.childProfileId).toBe('child-1');
            expect(tx.childName).toBe('Child One');
            expect(result.current.state.coins).toBe(40);
            expect(result.current.state.totalGiftedCoins).toBe(20);
            expect(result.current.state.giftHistory).toHaveLength(1);
            expect(result.current.state.giftHistory[0].id).toBe(tx.id);

            // Over-cap invalid gift: trying to gift 40 more to child-1 (20 + 40 = 60 > 50 max daily per child)
            let invalidTx: any;
            act(() => {
                invalidTx = result.current.giftToChild('child-1', 'Child One', 40);
            });

            expect(invalidTx).toBeNull();
            // Coins and giftHistory untouched
            expect(result.current.state.coins).toBe(40);
            expect(result.current.state.totalGiftedCoins).toBe(20);
            expect(result.current.state.giftHistory).toHaveLength(1);

            // Insufficient coins invalid gift: trying to gift 100 coins when only 40 available
            let insufficientTx: any;
            act(() => {
                insufficientTx = result.current.giftToChild('child-2', 'Child Two', 100);
            });

            expect(insufficientTx).toBeNull();
            expect(result.current.state.coins).toBe(40);
            expect(result.current.state.giftHistory).toHaveLength(1);
        });

        it('useStreakFreeze under provider: true-path state change and false-path when unable to freeze', () => {
            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            // Initially 0 coins -> useStreakFreeze returns false
            let falseNoCoins: boolean;
            act(() => {
                falseNoCoins = result.current.useStreakFreeze();
            });
            expect(falseNoCoins!).toBe(false);
            expect(result.current.state.coins).toBe(0);

            // Earn 15 coins (enough for exactly 1 freeze: cost 10)
            act(() => {
                result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 150, // 15 coins
                    won: true,
                });
            });
            expect(result.current.state.coins).toBe(15);

            // First freeze succeeds (true path)
            let success: boolean;
            act(() => {
                success = result.current.useStreakFreeze();
            });
            expect(success!).toBe(true);
            expect(result.current.state.coins).toBe(5);
            expect(result.current.state.streakFreezeHistory).toHaveLength(1);

            // Second freeze fails (insufficient coins after first freeze: 5 < 10)
            let falseSecond: boolean;
            act(() => {
                falseSecond = result.current.useStreakFreeze();
            });
            expect(falseSecond!).toBe(false);
            expect(result.current.state.coins).toBe(5);
            expect(result.current.state.streakFreezeHistory).toHaveLength(1);
        });

        it('useStreakFreeze under provider: handles monthly limit when max freezes reached', () => {
            const today = getTodayISO();
            const monthPrefix = today.slice(0, 7);
            const seededState = {
                coins: 100,
                streakFreezeHistory: [
                    `${monthPrefix}-01`,
                    `${monthPrefix}-02`,
                    `${monthPrefix}-03`,
                ],
            };
            localStorage.setItem(STORAGE_KEYS.PARENT_ECONOMY, JSON.stringify(seededState));

            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            expect(result.current.state.coins).toBe(100);
            expect(result.current.state.streakFreezeHistory).toHaveLength(3);

            let res: boolean;
            act(() => {
                res = result.current.useStreakFreeze();
            });

            expect(res!).toBe(false);
            expect(result.current.state.coins).toBe(100);
            expect(result.current.state.streakFreezeHistory).toHaveLength(3);
        });
    });

    // ================================================================
    //  Multi-Tab Sync & Legacy Fallback
    // ================================================================
    describe('Storage event & legacy fallback', () => {
        it('syncs state across tabs via storage event', () => {
            const { result } = renderHook(() => useParentEconomy(), {
                wrapper: ParentEconomyProvider,
            });

            expect(result.current.state.coins).toBe(0);

            const externalState: ParentEconomyState = {
                schemaVersion: 1,
                coins: 99,
                totalCoinsEarned: 99,
                totalGamesPlayed: 5,
                streak: 2,
                bestStreak: 2,
                lastPlayedDate: '2026-11-02',
                unlockedBadges: [],
                giftHistory: [],
                totalGiftedCoins: 0,
                gameHighScores: {},
                gameWinCounts: {},
                streakFreezeHistory: [],
            };

            act(() => {
                window.dispatchEvent(
                    new StorageEvent('storage', {
                        key: STORAGE_KEYS.PARENT_ECONOMY,
                        newValue: JSON.stringify(externalState),
                    }),
                );
            });

            expect(result.current.state.coins).toBe(99);
            expect(result.current.state.totalGamesPlayed).toBe(5);
        });

        it('falls back to legacy local instance when rendered without provider', () => {
            const { result } = renderHook(() => useParentEconomy());

            expect(result.current.state.coins).toBe(0);

            act(() => {
                result.current.recordGameResult({
                    gameId: 'parent-blitz',
                    score: 60, // 6 coins
                    won: true,
                });
            });

            expect(result.current.state.coins).toBe(6);
            expect(result.current.state.totalGamesPlayed).toBe(1);
        });
    });

    // ================================================================
    //  W1A-b game wiring
    // ================================================================
    describe('W1A-b game wiring', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            localStorage.clear();
            recentSessionIds.clear();
        });

        afterEach(() => {
            localStorage.clear();
            recentSessionIds.clear();
            vi.useRealTimers();
        });

        it('T1: ParentBlitz under ParentEconomyProvider records session on finish via fake timers', () => {
            vi.useFakeTimers();
            try {
                const onExit = vi.fn();
                render(
                    <ParentEconomyProvider>
                        <ParentBlitz onExit={onExit} />
                    </ParentEconomyProvider>,
                );

                const startBtn = screen.getByTestId('parent-blitz-start');
                act(() => {
                    fireEvent.click(startBtn);
                });

                act(() => {
                    vi.advanceTimersByTime(BLITZ_DURATION_MS + BLITZ_TICK_MS * 2);
                });

                const raw = localStorage.getItem(STORAGE_KEYS.PARENT_ECONOMY);
                expect(raw).not.toBeNull();
                const stored: ParentEconomyState = JSON.parse(raw!);
                expect(stored.totalGamesPlayed).toBe(1);
                expect(stored.coins).toBeGreaterThanOrEqual(1);
            } finally {
                vi.useRealTimers();
            }
        });

        it('T2: same render replays (Start again after finish) -> totalGamesPlayed === 2, coins accumulate', () => {
            vi.useFakeTimers();
            try {
                const onExit = vi.fn();
                render(
                    <ParentEconomyProvider>
                        <ParentBlitz onExit={onExit} />
                    </ParentEconomyProvider>,
                );

                // Session 1
                act(() => {
                    fireEvent.click(screen.getByTestId('parent-blitz-start'));
                });
                act(() => {
                    vi.advanceTimersByTime(BLITZ_DURATION_MS + BLITZ_TICK_MS * 2);
                });

                let stored: ParentEconomyState = JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.PARENT_ECONOMY)!,
                );
                expect(stored.totalGamesPlayed).toBe(1);
                const firstCoins = stored.coins;
                expect(firstCoins).toBeGreaterThanOrEqual(1);

                // Session 2: replay
                const replayBtn = screen.getByTestId('parent-blitz-replay');
                act(() => {
                    fireEvent.click(replayBtn);
                });
                act(() => {
                    vi.advanceTimersByTime(BLITZ_DURATION_MS + BLITZ_TICK_MS * 2);
                });

                stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.PARENT_ECONOMY)!);
                expect(stored.totalGamesPlayed).toBe(2);
                expect(stored.coins).toBeGreaterThanOrEqual(firstCoins + 1);
            } finally {
                vi.useRealTimers();
            }
        });

        it('T3: legacy WITHOUT provider still works: bare ParentBlitz finishes, records via fallback, no toast', () => {
            vi.useFakeTimers();
            try {
                const onExit = vi.fn();
                render(<ParentBlitz onExit={onExit} />);

                act(() => {
                    fireEvent.click(screen.getByTestId('parent-blitz-start'));
                });
                act(() => {
                    vi.advanceTimersByTime(BLITZ_DURATION_MS + BLITZ_TICK_MS * 2);
                });

                const raw = localStorage.getItem(STORAGE_KEYS.PARENT_ECONOMY);
                expect(raw).not.toBeNull();
                const stored: ParentEconomyState = JSON.parse(raw!);
                expect(stored.totalGamesPlayed).toBe(1);
                expect(stored.coins).toBeGreaterThanOrEqual(1);

                expect(screen.queryByTestId('parent-games-coin-toast')).not.toBeInTheDocument();
            } finally {
                vi.useRealTimers();
            }
        });

        it('T4: toast: appears with earned amount, disappears after ~2.5s, handles 0 coins, and locale keys exist', () => {
            // Direct JSON import check
            expect(enJson.parent.games.coinToast.earned).toBeTruthy();
            expect(enJson.parent.games.coinToast.earned).not.toContain('{{coins}}');
            expect(enJson.parent.games.coinToast.zero).toBeTruthy();
            expect(heJson.parent.games.coinToast.earned).toBeTruthy();
            expect(heJson.parent.games.coinToast.earned).not.toContain('{{coins}}');
            expect(heJson.parent.games.coinToast.zero).toBeTruthy();

            vi.useFakeTimers();
            try {
                // Provider-mounted blitz flow under ParentGamesHub
                const { unmount } = render(<ParentGamesHub />);

                fireEvent.click(screen.getByTestId('game-card-parent-blitz'));
                fireEvent.click(screen.getByTestId('parent-blitz-start'));

                act(() => {
                    vi.advanceTimersByTime(BLITZ_DURATION_MS + BLITZ_TICK_MS * 2);
                });

                // Toast appears with earned amount
                const toast = screen.getByTestId('parent-games-coin-toast');
                expect(toast).toBeInTheDocument();
                const amountEl = screen.getByTestId('parent-games-coin-toast-amount');
                expect(amountEl.textContent).toMatch(/^\+\d+$/);

                // Auto-clear after ~2.5s of fake timers
                act(() => {
                    vi.advanceTimersByTime(2500);
                });
                expect(screen.queryByTestId('parent-games-coin-toast')).not.toBeInTheDocument();

                unmount();

                // Direct toast test with 0 coins
                const onClear = vi.fn();
                render(
                    <ParentEconomyProvider>
                        <ParentGamesEconomyToast toast={{ coins: 0, session: 999 }} onClear={onClear} />
                    </ParentEconomyProvider>,
                );

                expect(screen.getByTestId('parent-games-coin-toast')).toBeInTheDocument();
                expect(screen.getByTestId('parent-games-coin-toast-zero')).toBeInTheDocument();
                expect(screen.queryByTestId('parent-games-coin-toast-amount')).not.toBeInTheDocument();
            } finally {
                vi.useRealTimers();
            }
        });
    });
});
