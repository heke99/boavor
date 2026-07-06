import type { LandlordContext } from '@/lib/data/landlord'

const DAY_MS = 24 * 60 * 60 * 1000

export type ListingInsightRow = {
  listingId: string
  title: string
  city: string
  status: string
  views: number
  applications: number
  inquiries: number
  /** Applications per 100 views; null when there are no views yet. */
  conversionPercent: number | null
}

export type LandlordInsights = {
  windowDays: number
  rows: ListingInsightRow[]
  totals: { views: number; applications: number; inquiries: number }
}

/**
 * Per-listing engagement for the landlord workspace. Views come from
 * analytics_events via an invoker-rights RPC, so RLS guarantees the caller
 * only counts events on listings they manage. Only aggregates leave the
 * database — never individual viewer identities.
 */
export async function getLandlordListingInsights(context: LandlordContext, windowDays = 30): Promise<LandlordInsights> {
  const { supabase, user, companyIds } = context
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString()

  const listingFilter = companyIds.length
    ? `created_by.eq.${user.id},company_id.in.(${companyIds.join(',')})`
    : `created_by.eq.${user.id}`

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, status')
    .or(listingFilter)
    .order('created_at', { ascending: false })

  const listingIds = (listings ?? []).map((listing) => listing.id)
  if (listingIds.length === 0) {
    return { windowDays, rows: [], totals: { views: 0, applications: 0, inquiries: 0 } }
  }

  const [viewsResult, applicationsResult, inquiriesResult] = await Promise.all([
    supabase.rpc('get_listing_view_counts', { p_listing_ids: listingIds, p_since: since }),
    supabase
      .from('rental_applications')
      .select('listing_id')
      .in('listing_id', listingIds)
      .gte('created_at', since),
    supabase
      .from('listing_inquiries')
      .select('listing_id')
      .in('listing_id', listingIds)
      .gte('created_at', since),
  ])

  const viewsByListing = new Map<string, number>()
  for (const row of viewsResult.data ?? []) {
    viewsByListing.set(row.listing_id, row.views)
  }

  const applicationsByListing = new Map<string, number>()
  for (const row of applicationsResult.data ?? []) {
    if (row.listing_id) applicationsByListing.set(row.listing_id, (applicationsByListing.get(row.listing_id) ?? 0) + 1)
  }

  const inquiriesByListing = new Map<string, number>()
  for (const row of inquiriesResult.data ?? []) {
    if (row.listing_id) inquiriesByListing.set(row.listing_id, (inquiriesByListing.get(row.listing_id) ?? 0) + 1)
  }

  const rows: ListingInsightRow[] = (listings ?? []).map((listing) => {
    const views = viewsByListing.get(listing.id) ?? 0
    const applications = applicationsByListing.get(listing.id) ?? 0
    const inquiries = inquiriesByListing.get(listing.id) ?? 0
    return {
      listingId: listing.id,
      title: listing.title,
      city: listing.city,
      status: listing.status,
      views,
      applications,
      inquiries,
      conversionPercent: views > 0 ? Math.round((applications / views) * 1000) / 10 : null,
    }
  })

  rows.sort((a, b) => b.views - a.views)

  return {
    windowDays,
    rows,
    totals: {
      views: rows.reduce((sum, row) => sum + row.views, 0),
      applications: rows.reduce((sum, row) => sum + row.applications, 0),
      inquiries: rows.reduce((sum, row) => sum + row.inquiries, 0),
    },
  }
}

export type AdminDailyMetric = {
  day: string
  metric: string
  dimension: string
  value: number
}

export type AdminAnalyticsOverview = {
  windowDays: number
  daily: AdminDailyMetric[]
  /** Live (not yet rolled up) event counts for the last 7 days. */
  recentEventCounts: Array<{ eventType: string; events: number }>
}

type AdminClient = LandlordContext['supabase']

export async function getAdminAnalyticsOverview(supabase: AdminClient, windowDays = 30): Promise<AdminAnalyticsOverview> {
  const sinceDay = new Date(Date.now() - windowDays * DAY_MS).toISOString().slice(0, 10)
  const liveSince = new Date(Date.now() - 7 * DAY_MS).toISOString()

  const [dailyResult, liveResult] = await Promise.all([
    supabase
      .from('analytics_daily')
      .select('day, metric, dimension, value')
      .gte('day', sinceDay)
      .order('day', { ascending: true }),
    supabase.rpc('get_event_type_counts', { p_since: liveSince }),
  ])

  return {
    windowDays,
    daily: (dailyResult.data ?? []).map((row) => ({
      day: row.day,
      metric: row.metric,
      dimension: row.dimension,
      value: Number(row.value),
    })),
    recentEventCounts: (liveResult.data ?? [])
      .map((row) => ({ eventType: row.event_type, events: row.events }))
      .sort((a, b) => b.events - a.events),
  }
}
