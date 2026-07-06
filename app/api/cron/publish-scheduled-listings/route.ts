import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'

export const dynamic = 'force-dynamic'

/**
 * Publishes listings whose scheduled_publish_at has passed. Companies must be
 * verified for company listings to go live (same rule as manual publishing).
 */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'publish-scheduled-listings', async (supabase) => {
    const now = new Date().toISOString()

    const { data: due, error } = await supabase
      .from('listings')
      .select('id, status, company_id')
      .lte('scheduled_publish_at', now)
      .not('scheduled_publish_at', 'is', null)
      .in('status', ['draft', 'paused'])
      .limit(100)

    if (error) throw new Error(error.message)

    let published = 0
    let skipped = 0

    for (const listing of due ?? []) {
      if (listing.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('verification_status')
          .eq('id', listing.company_id)
          .maybeSingle()
        if (company?.verification_status !== 'verified') {
          skipped += 1
          continue
        }
      }

      await supabase
        .from('listings')
        .update({ status: 'published', published_at: now, scheduled_publish_at: null })
        .eq('id', listing.id)

      await supabase.from('listing_publications').insert({
        listing_id: listing.id,
        action: 'published',
        actor_user_id: null,
        note: 'Schemalagd publicering (automatisk)',
      })

      published += 1
    }

    return { published, skipped }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
