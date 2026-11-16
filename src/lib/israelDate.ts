/**
 * The app's calendar day is the Israel day (Asia/Jerusalem, DST-aware), whatever the device's own time zone.
 * Every "today" key (daily challenge, quests, stamps and streaks, pet feeding, session dates) must use
 * israelDay(), so that the day rolls over at Israel midnight for every kid. Never use a fixed +2/+3 offset.
 *
 * Until 2026-11-16 these keys were the UTC date (toISOString().slice(0, 10)), which rolled over at 02:00 or
 * 03:00 Israel time. migrateUtcDayKeys() in QuestContext carries saved progress across that switch.
 */

const ISRAEL_DAY = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** The Israel calendar date (YYYY-MM-DD) at the given instant, default now. */
export function israelDay(at: Date | number = Date.now()): string {
    const parts = ISRAEL_DAY.formatToParts(at);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The UTC calendar date (YYYY-MM-DD) at the given instant: the legacy day key, used only for migration. */
export function utcDay(at: Date | number = Date.now()): string {
    return new Date(at).toISOString().slice(0, 10);
}

/** Calendar arithmetic on a YYYY-MM-DD string: shiftDay('2026-03-01', -1) is '2026-02-28'. No time zone involved. */
export function shiftDay(day: string, days: number): string {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Day of the week of a YYYY-MM-DD string, 0 = Sunday. */
export function weekdayOf(day: string): number {
    return new Date(`${day}T00:00:00Z`).getUTCDay();
}
