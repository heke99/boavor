import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * Publishes listings whose scheduled_publish_at has passed. Companies must be
 * verified for company listings to go live (same rule as manual publishing).
 */
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

  const { data: due, error } = await supabase
    .from('listings')
    .select('id, status, company_id')
    .lte('scheduled_publish_at', now)
    .not('scheduled_publish_at', 'is', null)
    .in('status', ['draft', 'paused'])
    .limit(100)

  if (error) {
    console.error('publish-scheduled-listings query failed', error)
    return NextResponse.json({ ok: false, error: 'Datainläsning misslyckades.' }, { status: 500 })
  }

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

  return NextResponse.json({ ok: true, published, skipped })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
