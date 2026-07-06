import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import { canTransition } from '@/lib/applications/status-machine'

export const dynamic = 'force-dynamic'

/** Expires offers past their deadline and moves applications to 'expired'. */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'expire-offers', async (supabase) => {
    const now = new Date().toISOString()

    const { data: dueOffers, error } = await supabase
      .from('rental_offers')
      .select('id, application_id')
      .eq('status', 'sent')
      .lte('expires_at', now)
      .not('expires_at', 'is', null)
      .limit(100)

    if (error) throw new Error(error.message)

    let expired = 0

    for (const offer of dueOffers ?? []) {
      await supabase.from('rental_offers').update({ status: 'expired', responded_at: now }).eq('id', offer.id)

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

    return { expired }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
