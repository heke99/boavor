import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getEmailProvider } from '@/lib/email/provider'
import { listingMatchesSavedSearch } from '@/lib/alerts/matching'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

// Listings published within this window are considered "new".
const MATCH_WINDOW_HOURS = 48

/**
 * Matches recently published listings against saved searches with
 * notifications enabled. Deduplicated via saved_search_matches (unique per
 * search + listing), so re-runs never notify twice.
 */
export async function POST(request: NextRequest) {
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad.' },
      { status: 503 },
    )
  }

  const since = new Date(Date.now() - MATCH_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const [{ data: searches, error: searchError }, { data: listings, error: listingError }] = await Promise.all([
    supabase
      .from('saved_searches')
      .select('id, user_id, title, mode, city, property_type, min_rooms, max_price')
      .eq('notifications_enabled', true),
    supabase
      .from('listings')
      .select('id, slug, title, city, area_name, listing_type, property_type, rooms, price, published_at')
      .eq('status', 'published')
      .gte('published_at', since),
  ])

  if (searchError || listingError) {
    console.error('saved-search-matching query failed', searchError ?? listingError)
    return NextResponse.json({ ok: false, error: 'Datainläsning misslyckades.' }, { status: 500 })
  }

  const emailProvider = await getEmailProvider()
  const siteUrl = getSiteUrl()

  let matchesCreated = 0
  let emailsSent = 0
  let failures = 0

  for (const search of searches ?? []) {
    const matching = (listings ?? []).filter((listing) =>
      listingMatchesSavedSearch(
        {
          mode: search.mode,
          city: search.city,
          propertyType: search.property_type,
          minRooms: search.min_rooms === null ? null : Number(search.min_rooms),
          maxPrice: search.max_price,
        },
        {
          listingType: listing.listing_type,
          city: listing.city,
          areaName: listing.area_name,
          propertyType: listing.property_type,
          rooms: listing.rooms === null ? null : Number(listing.rooms),
          price: listing.price,
        },
      ),
    )

    if (matching.length === 0) continue

    // Insert with duplicate suppression; only newly created matches notify.
    const { data: inserted, error: insertError } = await supabase
      .from('saved_search_matches')
      .upsert(
        matching.map((listing) => ({
          saved_search_id: search.id,
          user_id: search.user_id,
          listing_id: listing.id,
        })),
        { onConflict: 'saved_search_id,listing_id', ignoreDuplicates: true },
      )
      .select('id, listing_id')

    if (insertError) {
      console.error('saved-search-matching insert failed', insertError)
      failures += 1
      continue
    }

    const newMatches = inserted ?? []
    if (newMatches.length === 0) continue
    matchesCreated += newMatches.length

    const newListings = matching.filter((listing) => newMatches.some((match) => match.listing_id === listing.id))

    // In-app notification.
    await supabase.from('notifications').insert({
      user_id: search.user_id,
      title: `${newListings.length} ny${newListings.length === 1 ? '' : 'a'} träff${newListings.length === 1 ? '' : 'ar'} för "${search.title}"`,
      body: newListings
        .slice(0, 3)
        .map((listing) => `${listing.title} – ${listing.city}`)
        .join(' · '),
    })

    // Email (or dev console log).
    const { data: userInfo } = await supabase.auth.admin.getUserById(search.user_id)
    const email = userInfo?.user?.email

    let runStatus: 'sent' | 'skipped' | 'failed' = 'skipped'
    let errorMessage: string | null = null

    if (email) {
      const listingLines = newListings
        .slice(0, 5)
        .map((listing) => `• ${listing.title} – ${listing.city}: ${siteUrl}/listing/${listing.slug}`)
        .join('\n')

      const result = await emailProvider.send({
        to: email,
        subject: `Nya bostäder matchar din bevakning "${search.title}"`,
        text: `Hej!\n\nDin sökbevakning "${search.title}" har ${newListings.length} ny${newListings.length === 1 ? '' : 'a'} träff${newListings.length === 1 ? '' : 'ar'}:\n\n${listingLines}\n\nHantera dina bevakningar: ${siteUrl}/dashboard/saved-searches\n\nHälsningar,\nBovaro`,
      })

      if (result.ok && result.delivered) {
        runStatus = 'sent'
        emailsSent += 1
        await supabase
          .from('saved_search_matches')
          .update({ notified_at: new Date().toISOString() })
          .in('id', newMatches.map((match) => match.id))
      } else if (result.ok) {
        runStatus = 'skipped'
        errorMessage = 'E-post ej konfigurerad (dev-läge).'
      } else {
        runStatus = 'failed'
        errorMessage = result.error
        failures += 1
      }
    }

    await supabase.from('saved_search_notification_runs').insert({
      saved_search_id: search.id,
      user_id: search.user_id,
      matched_listing_ids: newListings.map((listing) => listing.id),
      status: runStatus,
      error_message: errorMessage,
      sent_at: runStatus === 'sent' ? new Date().toISOString() : null,
    })
  }

  return NextResponse.json({
    ok: true,
    searches: searches?.length ?? 0,
    newListings: listings?.length ?? 0,
    matchesCreated,
    emailsSent,
    failures,
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
