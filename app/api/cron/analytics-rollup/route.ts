import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import {
  buildCounterMetricRows,
  buildEventMetricRows,
  previousUtcDay,
  utcDayRange,
  type EventTypeCount,
} from '@/lib/analytics/rollup'

export const dynamic = 'force-dynamic'

/**
 * Nightly analytics rollup: aggregates yesterday's (UTC) analytics_events and
 * platform counters into analytics_daily. Idempotent — the table's primary
 * key (day, metric, dimension) makes re-runs an upsert. An explicit day can
 * be re-rolled with ?day=YYYY-MM-DD.
 */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'analytics-rollup', async (supabase) => {
    const requestedDay = request.nextUrl.searchParams.get('day')
    const day = requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) ? requestedDay : previousUtcDay(new Date())
    const { start, end } = utcDayRange(day)

    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('event_type')
      .gte('created_at', start)
      .lt('created_at', end)
    if (eventsError) throw new Error(`Kunde inte läsa analytics_events: ${eventsError.message}`)

    const countsByType = new Map<string, number>()
    for (const event of events ?? []) {
      countsByType.set(event.event_type, (countsByType.get(event.event_type) ?? 0) + 1)
    }
    const eventCounts: EventTypeCount[] = [...countsByType.entries()].map(([event_type, count]) => ({
      event_type,
      events: count,
    }))

    const countInWindow = async (table: 'profiles' | 'rental_applications' | 'listing_inquiries' | 'listings') => {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start)
        .lt('created_at', end)
      if (error) throw new Error(`Kunde inte räkna ${table}: ${error.message}`)
      return count ?? 0
    }

    const [newUsers, applicationsCreated, inquiriesCreated, listingsCreated] = await Promise.all([
      countInWindow('profiles'),
      countInWindow('rental_applications'),
      countInWindow('listing_inquiries'),
      countInWindow('listings'),
    ])

    const rows = [
      ...buildEventMetricRows(day, eventCounts),
      ...buildCounterMetricRows(day, {
        new_users: newUsers,
        applications_created: applicationsCreated,
        inquiries_created: inquiriesCreated,
        listings_created: listingsCreated,
      }),
    ]

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from('analytics_daily')
        .upsert(rows, { onConflict: 'day,metric,dimension' })
      if (upsertError) throw new Error(`Kunde inte skriva analytics_daily: ${upsertError.message}`)
    }

    return { day, metrics: rows.length, events: (events ?? []).length }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
