import { NextRequest, NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/cron/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * Awards queue points (1 point per day in the queue) to all active memberships.
 * Idempotent: points are computed as whole days since joined/reset, so running
 * the job multiple times per day never double-awards.
 *
 * Protected by CRON_SECRET. Requires the service role key.
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

  const startedAt = new Date().toISOString()
  const { data, error } = await supabase.rpc('award_queue_points_daily')

  if (error) {
    console.error('award-queue-points failed', error)
    return NextResponse.json({ ok: false, error: 'Poängtilldelningen misslyckades.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, startedAt, result: data })
}

export async function GET(request: NextRequest) {
  // Vercel cron uses GET by default.
  return POST(request)
}
