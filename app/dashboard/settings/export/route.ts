import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Self-service GDPR data export: returns the signed-in user's own data as
 * JSON. Every query runs through the user's session client, so RLS
 * guarantees only their own rows are included.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'Tjänsten är inte konfigurerad.' }, { status: 503 })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Du behöver vara inloggad.' }, { status: 401 })

  const [
    profile,
    consents,
    legalAcceptances,
    queueMembership,
    queueLedger,
    applications,
    inquiries,
    favorites,
    savedSearches,
    exchangeProfile,
    externalMemberships,
    privacyRequests,
    notifications,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_consents').select('consent_type, consent_version, granted, granted_at, revoked_at').eq('user_id', user.id),
    supabase.from('legal_acceptances').select('document_type, document_version, accepted_at').eq('user_id', user.id),
    supabase
      .from('queue_memberships')
      .select('membership_status, current_points, joined_queue_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('queue_point_ledger')
      .select('event_type, points_delta, balance_after, note, created_at')
      .eq('user_id', user.id)
      .order('created_at'),
    supabase
      .from('rental_applications')
      .select('listing_title, listing_city, status, created_at, cover_letter, move_in_date')
      .eq('user_id', user.id),
    supabase
      .from('listing_inquiries')
      .select('listing_title, inquiry_type, status, created_at, message')
      .eq('user_id', user.id),
    supabase.from('favorites').select('listing_id, created_at').eq('user_id', user.id),
    supabase
      .from('saved_searches')
      .select('title, mode, city, property_type, min_rooms, max_price, notifications_enabled, created_at')
      .eq('user_id', user.id),
    supabase.from('exchange_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('external_queue_memberships')
      .select('provider_id, custom_provider_name, city, joined_date, current_points, current_days, renewal_date, created_at')
      .eq('user_id', user.id),
    supabase.from('privacy_requests').select('request_type, status, message, created_at, handled_at').eq('user_id', user.id),
    supabase.from('notifications').select('title, body, created_at, read_at').eq('user_id', user.id).order('created_at'),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    format_version: 1,
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data ?? null,
    consents: consents.data ?? [],
    legal_acceptances: legalAcceptances.data ?? [],
    queue: { membership: queueMembership.data ?? null, ledger: queueLedger.data ?? [] },
    rental_applications: applications.data ?? [],
    listing_inquiries: inquiries.data ?? [],
    favorites: favorites.data ?? [],
    saved_searches: savedSearches.data ?? [],
    exchange_profile: exchangeProfile.data ?? null,
    external_queue_memberships: externalMemberships.data ?? [],
    privacy_requests: privacyRequests.data ?? [],
    notifications: notifications.data ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="bovaro-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
