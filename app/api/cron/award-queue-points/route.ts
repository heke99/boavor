import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'

export const dynamic = 'force-dynamic'

/**
 * Awards queue points (1 point per day in the queue) to all active
 * memberships. Idempotent: points derive from whole days since joined/reset.
 */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'award-queue-points', async (supabase) => {
    const { data, error } = await supabase.rpc('award_queue_points_daily')
    if (error) throw new Error(`Poängtilldelningen misslyckades: ${error.message}`)
    return { result: data }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
