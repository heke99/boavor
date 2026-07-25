import type { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import type { Json } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

type ClaimedEvent = {
  id: string
  company_id: string | null
  event_type: string
  payload: Json
}

function parseClaimed(value: Json[] | null): ClaimedEvent[] {
  if (!Array.isArray(value)) return []
  return value.filter((row): row is ClaimedEvent => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false
    return typeof row.id === 'string' && typeof row.event_type === 'string' && 'payload' in row
  })
}

export async function POST(request: NextRequest) {
  return runCronJob(request, 'outbox-dispatch', async (supabase) => {
    const workerId = `vercel-${crypto.randomUUID()}`
    const { data, error } = await supabase.rpc('claim_outbox_events', {
      p_worker_id: workerId,
      p_limit: 50,
    })
    if (error) throw new Error(error.message)

    const events = parseClaimed(data)
    let delivered = 0
    let failed = 0
    for (const event of events) {
      try {
        await supabase.rpc('enqueue_webhook_event', {
          p_event_type: event.event_type,
          p_company_id: event.company_id,
          p_owner_user_id: null,
          p_payload: event.payload,
        })
        const { error: completionError } = await supabase.rpc('complete_outbox_event', {
          p_event_id: event.id,
          p_succeeded: true,
          p_error: null,
        })
        if (completionError) throw new Error(completionError.message)
        delivered += 1
      } catch (dispatchError) {
        const message = dispatchError instanceof Error ? dispatchError.message : 'unknown dispatch failure'
        await supabase.rpc('complete_outbox_event', {
          p_event_id: event.id,
          p_succeeded: false,
          p_error: message,
        })
        failed += 1
      }
    }
    return { claimed: events.length, delivered, failed }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}

