import { describe, it, expect } from 'vitest';
import { israelDay, shiftDay, utcDay, weekdayOf } from '../israelDate';
import { getDailyChallenge } from '../../data/dailyChallenges';
import { getDailyQuests } from '../../data/dailyQuests';
import { computeStreak, migrateUtcDayKeys, type DailyProgress } from '../../context/dailyProgressDays';

// Israel 2026: summer time (UTC+3) from Fri 27 Mar 02:00 to Sun 25 Oct 02:00; winter time is UTC+2.
const at = (iso: string) => new Date(iso);

describe('israelDay: the day rolls over at Israel midnight', () => {
    it('winter (UTC+2): 21:59 UTC is still today, 22:00 UTC is tomorrow', () => {
        expect(israelDay(at('2026-11-16T21:59:59Z'))).toBe('2026-11-16');
        expect(israelDay(at('2026-11-16T22:00:00Z'))).toBe('2026-11-17');
    });

    it('summer (UTC+3): 20:59 UTC is still today, 21:00 UTC is tomorrow', () => {
        expect(israelDay(at('2026-07-01T20:59:59Z'))).toBe('2026-07-01');
        expect(israelDay(at('2026-07-01T21:00:00Z'))).toBe('2026-07-02');
    });

    it('00:00 to 03:00 Israel time is the new Israel day while UTC is still on the old one', () => {
        // winter: 00:30 and 01:59 Israel = 22:30 and 23:59 UTC the day before
        for (const t of ['2026-11-16T22:30:00Z', '2026-11-16T23:59:00Z']) {
            expect(israelDay(at(t))).toBe('2026-11-17');
            expect(utcDay(at(t))).toBe('2026-11-16');
        }
        // summer: 00:00, 01:30 and 02:59 Israel = 21:00, 22:30 and 23:59 UTC the day before
        for (const t of ['2026-07-01T21:00:00Z', '2026-07-01T22:30:00Z', '2026-07-01T23:59:00Z']) {
            expect(israelDay(at(t))).toBe('2026-07-02');
            expect(utcDay(at(t))).toBe('2026-07-01');
        }
        // 03:00 Israel in summer is UTC midnight: both agree again
        expect(israelDay(at('2026-07-02T00:00:00Z'))).toBe(utcDay(at('2026-07-02T00:00:00Z')));
    });

    it('spring-forward edge (27 Mar 2026): midnight is still at 22:00 UTC the night before', () => {
        expect(israelDay(at('2026-03-26T21:59:59Z'))).toBe('2026-03-26');
        expect(israelDay(at('2026-03-26T22:00:00Z'))).toBe('2026-03-27');
        // after the clocks jump (02:00 -> 03:00 Israel), the next midnight is at 21:00 UTC
        expect(israelDay(at('2026-03-27T20:59:59Z'))).toBe('2026-03-27');
        expect(israelDay(at('2026-03-27T21:00:00Z'))).toBe('2026-03-28');
    });

    it('fall-back edge (25 Oct 2026): the day keeps 25 hours and ends at 22:00 UTC', () => {
        expect(israelDay(at('2026-10-24T20:59:59Z'))).toBe('2026-10-24');
        expect(israelDay(at('2026-10-24T21:00:00Z'))).toBe('2026-10-25');
        // 02:00 summer -> 01:00 winter happens at 23:00 UTC: still the 25th on both sides
        expect(israelDay(at('2026-10-24T22:59:59Z'))).toBe('2026-10-25');
        expect(israelDay(at('2026-10-24T23:00:00Z'))).toBe('2026-10-25');
        expect(israelDay(at('2026-10-25T21:59:59Z'))).toBe('2026-10-25');
        expect(israelDay(at('2026-10-25T22:00:00Z'))).toBe('2026-10-26');
    });

    it('shiftDay and weekdayOf are pure calendar arithmetic', () => {
        expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
        expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
        expect(shiftDay('2026-03-27', 1)).toBe('2026-03-28'); // across DST: still one day
        expect(weekdayOf('2026-11-15')).toBe(0); // Sunday
    });
});

describe('daily challenge and quests use the Israel day', () => {
    it('a new challenge and new quests at Israel midnight, not at UTC midnight', () => {
        const before = at('2026-11-16T21:59:00Z');
        const after = at('2026-11-16T22:01:00Z');
        expect(getDailyChallenge(before).date).toBe('2026-11-16');
        expect(getDailyChallenge(after).date).toBe('2026-11-17');
        expect(getDailyQuests(after)[0].id.startsWith('2026-11-17:')).toBe(true);
    });
});

describe('computeStreak on Israel days', () => {
    it('stays alive through yesterday and breaks after a missed day', () => {
        const now = at('2026-11-16T22:30:00Z'); // 00:30 Israel on the 17th
        expect(computeStreak(['2026-11-15', '2026-11-16'], now)).toBe(2);
        expect(computeStreak(['2026-11-15', '2026-11-16', '2026-11-17'], now)).toBe(3);
        expect(computeStreak(['2026-11-14', '2026-11-15'], now)).toBe(0);
    });

    it('counts consecutive days across both DST switches', () => {
        expect(computeStreak(['2026-03-26', '2026-03-27', '2026-03-28'], at('2026-03-28T10:00:00Z'))).toBe(3);
        expect(computeStreak(['2026-10-24', '2026-10-25', '2026-10-26'], at('2026-10-26T10:00:00Z'))).toBe(3);
    });
});

describe('migrateUtcDayKeys: progress saved under UTC days', () => {
    const legacy = (over: Partial<DailyProgress> = {}): DailyProgress => ({
        dailyStamps: ['2026-11-15', '2026-11-16'],
        totalCoinsEarned: 40,
        dailyChallengeCorrect: 12,
        dailyChallengeDate: '2026-11-16',
        questProgress: { '2026-11-16:0': 9, '2026-11-16:1': 2 },
        questClaimed: ['2026-11-16:2'],
        questDate: '2026-11-16',
        ...over,
    });

    it('in the 00:00-03:00 Israel window, what the old code showed as today stays today', () => {
        const now = at('2026-11-16T22:40:00Z'); // 00:40 Israel on the 17th, UTC still the 16th
        const m = migrateUtcDayKeys(legacy(), now);
        const today = israelDay(now);
        expect(today).toBe('2026-11-17');
        expect(m.dayKey).toBe('il');
        // not repeated: the challenge already done today stays done
        expect(m.dailyStamps).toContain(today);
        // not lost: the streak chain is unbroken and grows by today
        expect(computeStreak(m.dailyStamps, now)).toBe(3);
        expect(m.dailyChallengeDate).toBe(today);
        expect(m.dailyChallengeCorrect).toBe(12);
        expect(m.questDate).toBe(today);
        expect(m.questProgress).toEqual({ '2026-11-17:0': 9, '2026-11-17:1': 2 });
        expect(m.questClaimed).toEqual(['2026-11-17:2']); // a claimed quest can't be claimed twice
        expect(getDailyQuests(now).map(q => q.id)).toContain('2026-11-17:2');
    });

    it('in the summer window too (Israel 00:00-03:00 = 21:00-24:00 UTC)', () => {
        const now = at('2026-07-01T23:30:00Z'); // 02:30 Israel on 2 July
        const m = migrateUtcDayKeys(legacy({
            dailyStamps: ['2026-07-01'], dailyChallengeDate: '2026-07-01', questDate: '2026-07-01',
            questProgress: {}, questClaimed: [],
        }), now);
        expect(m.dailyStamps).toEqual(['2026-07-01', '2026-07-02']);
        expect(m.dailyChallengeDate).toBe('2026-07-02');
    });

    it('a kid who has not played yet today keeps nothing extra', () => {
        const now = at('2026-11-16T22:40:00Z');
        const m = migrateUtcDayKeys(legacy({ dailyStamps: ['2026-11-14', '2026-11-15'], dailyChallengeDate: '2026-11-15', questDate: '2026-11-15', questProgress: { '2026-11-15:0': 3 } }), now);
        expect(m.dailyStamps).toEqual(['2026-11-14', '2026-11-15']);
        expect(m.dailyChallengeDate).toBe('2026-11-15'); // an old day: the provider resets it
        expect(m.questProgress).toEqual({ '2026-11-15:0': 3 });
    });

    it('outside the window the UTC and Israel days agree, so nothing moves', () => {
        const now = at('2026-11-16T10:00:00Z'); // 12:00 Israel
        const m = migrateUtcDayKeys(legacy(), now);
        expect(m).toEqual({ ...legacy(), dayKey: 'il' });
        expect(computeStreak(m.dailyStamps, now)).toBe(2);
    });

    it('runs once: Israel-keyed progress is left alone', () => {
        const p = { ...legacy(), dayKey: 'il' as const };
        expect(migrateUtcDayKeys(p, at('2026-11-16T22:40:00Z'))).toBe(p);
    });
});
