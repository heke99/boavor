import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { canTransition } from '@/lib/applications/status-machine'

export const dynamic = 'force-dynamic'

/** Expires offers past their deadline and moves applications to 'expired'. */
export async function POST(request: NextRequest) {
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad.' }, { status: 503 })
  }

  const now = new Date().toISOString()

  const { data: dueOffers, error } = await supabase
    .from('rental_offers')
    .select('id, application_id')
    .eq('status', 'sent')
    .lte('expires_at', now)
    .not('expires_at', 'is', null)
    .limit(100)

  if (error) {
    console.error('expire-offers query failed', error)
    return NextResponse.json({ ok: false, error: 'Datainläsning misslyckades.' }, { status: 500 })
  }

  let expired = 0

  for (const offer of dueOffers ?? []) {
    await supabase
      .from('rental_offers')
      .update({ status: 'expired', responded_at: now })
      .eq('id', offer.id)

    await supabase.from('rental_offer_events').insert({
      offer_id: offer.id,
      actor_user_id: null,
      event_type: 'offer_expired',
    })

    const { data: application } = await supabase
      .from('rental_applications')
      .select('id, status')
      .eq('id', offer.application_id)
      .maybeSingle()

    if (application && canTransition(application.status, 'expired', 'system')) {
      await supabase
        .from('rental_applications')
        .update({ status: 'expired', status_updated_at: now })
        .eq('id', application.id)

      await supabase.from('rental_application_status_history').insert({
        application_id: application.id,
        actor_user_id: null,
        from_status: application.status,
        to_status: 'expired',
        note: 'Erbjudandet gick ut utan svar',
      })
    }

    expired += 1
  }

  return NextResponse.json({ ok: true, expired })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
