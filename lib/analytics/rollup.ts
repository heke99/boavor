/**
 * Pure helpers for the nightly analytics rollup. The cron endpoint feeds
 * grouped event counts through these functions and upserts the result into
 * analytics_daily (primary key day × metric × dimension, so re-runs are
 * idempotent).
 */

export type DailyMetricRow = {
  day: string
  metric: string
  dimension: string
  value: number
}

export type EventTypeCount = {
  event_type: string
  events: number
}

/** ISO date (YYYY-MM-DD) for the UTC day before the given instant. */
export function previousUtcDay(now: Date): string {
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
  return previous.toISOString().slice(0, 10)
}

/** Half-open UTC interval [start, end) covering one ISO day. */
export function utcDayRange(day: string): { start: string; end: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Invalid day: ${day}`)
  }
  const start = new Date(`${day}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime())) {
    throw new Error(`Invalid day: ${day}`)
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** One analytics_daily row per event type, e.g. metric "events.listing_view". */
export function buildEventMetricRows(day: string, counts: EventTypeCount[]): DailyMetricRow[] {
  return counts
    .filter((count) => count.events > 0)
    .map((count) => ({
      day,
      metric: `events.${count.event_type}`,
      dimension: 'all',
      value: count.events,
    }))
}

/** Plain platform counters (new users, applications, …) as metric rows. */
export function buildCounterMetricRows(day: string, counters: Record<string, number>): DailyMetricRow[] {
  return Object.entries(counters)
    .filter(([, value]) => Number.isFinite(value))
    .map(([metric, value]) => ({ day, metric, dimension: 'all', value }))
}
