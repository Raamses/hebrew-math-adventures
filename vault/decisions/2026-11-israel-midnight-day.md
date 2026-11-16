---
type: decision
status: accepted
date: 2026-11-16
project: hebrew-math-adventures
decision: "The app's day is the Israel day: daily keys roll over at Asia/Jerusalem midnight, not UTC midnight"
related: [domain/daily-quests, decisions/2026-08-equation-streak-loss-breaks]
tags: [daily-challenge, quests, streak, time-zone, decision]
---

# ADR: The day rolls over at Israel midnight

**Date:** 2026-11-16 · **Status:** Accepted (decided by Ram 2026-11-16) · **PR:** #293

## Context
Every "today" key was the UTC date (`new Date().toISOString().slice(0, 10)`). For kids in Israel the daily challenge, the quests and the streak therefore rolled over at 02:00 in winter and 03:00 in summer, not at midnight. This surfaced in the nightly e2e on 2026-11-16: the run started at 00:05 Israel time, the test expected the Israel date, and the app wrote the UTC date (fixed in the test by #291, which made it expect UTC).

## Decision
1. **The app's day is the Israel calendar day** (`Asia/Jerusalem`, DST-aware), whatever the device's time zone. One helper, `src/lib/israelDate.ts`:
   - `israelDay()` uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Jerusalem'`. **Never a fixed +2/+3 offset.**
   - `shiftDay()` and `weekdayOf()` do pure calendar arithmetic on `YYYY-MM-DD` strings. No 24-hour steps, which break across DST.
2. **Covered:**
   - Daily challenge and daily quests.
   - Daily stamps, the streak and the 7-day stamp album.
   - Pet feeding and session-record dates.
   - The parent games' daily keys and the parent streak.
   - The daily gift limit.
   - The parent heatmap, 7-day strip and weekly chart. These were also one day off before: they built local midnights and printed them in UTC.
3. **Not covered:** `getWeekStartISO`, the weekly-goal key. Changing its value would clear every active weekly goal at deploy, and it is not a "today" key.
4. **Switching saved progress** (`migrateUtcDayKeys`, `src/context/dailyProgressDays.ts`): it runs once per profile and marks it `dayKey: 'il'`. The rule: nothing done today is lost or done twice, and nothing is paid for work the kid did not do.
   - From 02:00/03:00 to midnight Israel time, the UTC and Israel days agree, so nothing moves.
   - From 00:00 to 02:00/03:00 Israel time, the old code's "today" was the previous day's content. The daily seed changes every day, so the challenge and each quest slot usually mean something else on the Israel day.
     - The completed stamp moves to the Israel day: today's challenge counts as done and the streak is unbroken. No coins are paid, and the UTC stamp stays.
     - The challenge's correct-answer count moves only if the Israel day's challenge is the same (mode, problem type and target). Otherwise the provider resets it.
     - Quest progress and claims move slot by slot, only where the Israel day's quest has the same metric and target. The rest is dropped.
   - Malformed stamps are dropped on load, and a repeated stamp counts once in the streak.
5. **Not migrated, on purpose:** these stores are left as they are, and in that window each can be off by one day, once.
   - `pet.lastFedDate`: a pet fed late in the evening can be fed again after Israel midnight.
   - The parent streak's `lastPlayedDate`: at most one extra streak day.
   - The Equation and Sudoku stored `date`: an in-progress puzzle is discarded once.
   Each costs at most one small extra or one lost puzzle, once per device, so a migration for each was not worth it.

## Consequences
- The challenge, quests and streak roll over at Israel midnight for every kid, in both DST seasons.
- **Accepted trade-off:** saved data has no time of day. A kid who played late in the evening and first opens the new build between Israel midnight and 02:00/03:00 sees that evening's challenge as done until the next Israel midnight. Nothing is lost or paid twice.
- The parent heatmap's 5-week window now ends with the week that contains today. It used to start from today-34, which ended the grid before today on every day but Saturday.
- **Rule for new code:** any "today" key comes from `israelDay()`. `toISOString().slice(0, 10)` is only for fixed instants that are not a day key.
- **Tests:** `src/lib/__tests__/israelDate.test.ts` pins both DST edges (27 Mar and 25 Oct 2026), and the 00:00–03:00 Israel window in both seasons. `src/context/__tests__/dailyProgressDays.test.tsx` checks the migration against the real quests and challenges, including a year-long sweep and a load through `QuestProvider`. `src/components/parent/__tests__/israelDayAlignment.test.tsx` checks that the heatmap and weekly chart show the Israel today. The e2e specs build their dates with Asia/Jerusalem.
