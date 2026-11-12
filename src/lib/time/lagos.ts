/**
 * Business-day boundaries in Lagos time. The server runs in UTC, so "today"
 * computed with setHours(0) would start at 1am in Lagos and count late-night
 * orders on the wrong day. Uses Intl (no hard-coded offset).
 */
export const SHOP_TIME_ZONE = 'Africa/Lagos'

/** The shop's wall-clock date and weekday for an instant. */
function wallClock(now: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
    // Offset of the zone from UTC at this instant, in ms
    offsetMs:
      Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)) -
      Math.floor(now.getTime() / 1000) * 1000,
  }
}

/** The instant that local midnight of (year, month, day) happens in the zone. */
function midnight(year: number, month: number, day: number, offsetMs: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - offsetMs)
}

/** Start of today, this week (Monday) and this month, as instants, in the shop's time zone. */
export function periodStarts(now: Date = new Date(), timeZone: string = SHOP_TIME_ZONE) {
  const w = wallClock(now, timeZone)
  const daysSinceMonday = (w.weekday + 6) % 7
  return {
    today: midnight(w.year, w.month, w.day, w.offsetMs),
    week: midnight(w.year, w.month, w.day - daysSinceMonday, w.offsetMs),
    month: midnight(w.year, w.month, 1, w.offsetMs),
  }
}
