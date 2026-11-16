import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ProfileProvider, useProfile } from '../ProfileContext';
import { QuestProvider, useQuest } from '../QuestContext';
import { computeStreak, migrateUtcDayKeys, type DailyProgress } from '../dailyProgressDays';
import { getDailyChallenge } from '../../data/dailyChallenges';
import { getDailyQuests } from '../../data/dailyQuests';
import { israelDay, shiftDay } from '../../lib/israelDate';

const at = (iso: string) => new Date(iso);
const noon = (day: string) => at(`${day}T12:00:00Z`);

/** Progress the old code saved on UTC day `u`: challenge done, every quest slot advanced, slot 2 claimed. */
const legacy = (u: string, over: Partial<DailyProgress> = {}): DailyProgress => {
    const q = getDailyQuests(noon(u));
    return {
        dailyStamps: [shiftDay(u, -1), u],
        totalCoinsEarned: 40,
        dailyChallengeCorrect: 12,
        dailyChallengeDate: u,
        questProgress: { [q[0].id]: q[0].target, [q[1].id]: 1 },
        questClaimed: [q[2].id],
        questDate: u,
        ...over,
    };
};

describe('migrateUtcDayKeys in the 00:00-03:00 Israel window', () => {
    const now = at('2026-11-16T22:40:00Z'); // 00:40 Israel on the 17th, UTC still the 16th

    it('the challenge done on the old day counts as done today, and the streak is unbroken', () => {
        const m = migrateUtcDayKeys(legacy('2026-11-16'), now);
        expect(m.dayKey).toBe('il');
        expect(m.dailyStamps).toContain('2026-11-17');
        expect(computeStreak(m.dailyStamps, now)).toBe(3);
        expect(m.totalCoinsEarned).toBe(40); // no coins for the carried stamp
    });

    it('quest progress and claims never land on a different quest (F1.1)', () => {
        const before = getDailyQuests(noon('2026-11-16'));
        const today = getDailyQuests(now);
        const m = migrateUtcDayKeys(legacy('2026-11-16'), now);
        for (const [slot, q] of today.entries()) {
            const same = before[slot].metric === q.metric && before[slot].target === q.target;
            if (!same) {
                expect(m.questProgress?.[q.id] ?? 0).toBe(0);
                expect(m.questClaimed).not.toContain(q.id);
            }
        }
        // with these two days no slot has the same quest, so nothing is claimable or blocked for free
        expect(today.every((q, s) => q.metric !== before[s].metric || q.target !== before[s].target)).toBe(true);
        expect(m.questProgress).toEqual({});
        expect(m.questClaimed).toEqual([]);
    });

    it('over a whole year, a carried quest slot is always the same quest', () => {
        let u = '2026-01-01';
        for (let i = 0; i < 366; i++, u = shiftDay(u, 1)) {
            const w = at(`${u}T22:30:00Z`); // inside the window: Israel is on the next day
            const il = israelDay(w);
            const m = migrateUtcDayKeys(legacy(u), w);
            const before = getDailyQuests(noon(u));
            for (const [id, n] of Object.entries(m.questProgress ?? {})) {
                expect(id.startsWith(`${il}:`)).toBe(true);
                const slot = Number(id.split(':')[1]);
                const q = getDailyQuests(w)[slot];
                expect([q.metric, q.target]).toEqual([before[slot].metric, before[slot].target]);
                expect(n).toBeLessThanOrEqual(q.target);
            }
        }
    });

    it('the challenge count is dropped when the new day has a different challenge (F1.3)', () => {
        const m = migrateUtcDayKeys(legacy('2026-11-16'), now);
        expect(getDailyChallenge(now).target).not.toBe(getDailyChallenge(noon('2026-11-16')).target);
        expect(m.dailyChallengeDate).toBe('2026-11-16'); // an old day: the provider resets the count to 0
    });

    it('the challenge count carries when the challenge really is the same (31 Dec -> 1 Jan)', () => {
        const w = at('2026-12-31T22:30:00Z');
        const a = getDailyChallenge(noon('2026-12-31'));
        const b = getDailyChallenge(w);
        expect([b.mode, b.problemType, b.target]).toEqual([a.mode, a.problemType, a.target]);
        const m = migrateUtcDayKeys(legacy('2026-12-31'), w);
        expect(m.dailyChallengeDate).toBe('2027-01-01');
        expect(m.dailyChallengeCorrect).toBe(12);
    });

    it('a kid who has not played since an older day gets nothing extra', () => {
        const m = migrateUtcDayKeys(legacy('2026-11-15'), now);
        expect(m.dailyStamps).toEqual(['2026-11-14', '2026-11-15']);
        expect(m.dailyChallengeDate).toBe('2026-11-15');
        expect(m.questDate).toBe('2026-11-15');
    });
});

describe('migrateUtcDayKeys outside the window, and only once', () => {
    it('nothing moves when the UTC and Israel days agree', () => {
        const p = legacy('2026-11-16');
        expect(migrateUtcDayKeys(p, at('2026-11-16T10:00:00Z'))).toEqual({ ...p, dayKey: 'il' });
    });

    it('Israel-keyed progress is left alone', () => {
        const p = { ...legacy('2026-11-16'), dayKey: 'il' as const };
        expect(migrateUtcDayKeys(p, at('2026-11-16T22:40:00Z'))).toBe(p);
    });

    it('computeStreak counts a repeated stamp once', () => {
        expect(computeStreak(['2026-11-15', '2026-11-16', '2026-11-16'], at('2026-11-16T10:00:00Z'))).toBe(2);
    });
});

describe('QuestProvider loads legacy progress through the migration', () => {
    const PID = 'legacy-kid';
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(at('2026-11-16T22:40:00Z'));
        localStorage.setItem('hebrew-math-profiles', JSON.stringify([{
            id: PID, name: 'Legacy', age: 7, avatarId: '👧', mascotId: 'owl', themeId: 'default', streak: 0,
            createdAt: 0, lastPlayedAt: 0, settings: { musicVolume: 1, sfxVolume: 1, isMuted: true, soundGarden: false },
            coins: 0, gems: 0,
        }]));
        localStorage.setItem('hebrew-math-daily-progress', JSON.stringify({
            [PID]: { ...legacy('2026-11-16'), dailyStamps: ['2026-11-15', '2026-11-16', 'garbage'] },
        }));
    });
    afterEach(() => vi.useRealTimers());

    it('shows today as done, keeps the streak, drops a malformed stamp and persists the marker', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ProfileProvider><QuestProvider>{children}</QuestProvider></ProfileProvider>
        );
        const { result } = renderHook(() => ({ quest: useQuest(), profile: useProfile() }), { wrapper });
        act(() => result.current.profile.switchProfile(PID));

        expect(result.current.quest.todayChallenge.date).toBe('2026-11-17');
        expect(result.current.quest.hasCompletedToday).toBe(true);
        expect(result.current.quest.dailyStreak).toBe(3);
        expect(result.current.quest.dailyChallengeCorrect).toBe(0); // different challenge: not carried
        const saved = JSON.parse(localStorage.getItem('hebrew-math-daily-progress') as string)[PID];
        expect(saved.dayKey).toBe('il');
        expect(saved.dailyStamps).not.toContain('garbage');
    });
});
