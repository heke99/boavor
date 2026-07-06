import { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron/run'
import { MAX_ATTEMPTS, nextAttemptAt, signWebhookPayload } from '@/lib/webhooks/signing'

export const dynamic = 'force-dynamic'

const DELIVERY_TIMEOUT_MS = 10_000
const BATCH_SIZE = 25

/**
 * Delivers due outbound webhooks with HMAC signatures. Failures back off
 * (1m/5m/30m/2h/12h) and dead-letter after the final attempt. Endpoints
 * accumulate failure_count for the ops dashboard.
 */
export async function POST(request: NextRequest) {
  return runCronJob(request, 'webhook-deliveries', async (supabase) => {
    const now = new Date()

    const { data: due, error } = await supabase
      .from('webhook_deliveries')
      .select('id, endpoint_id, event_type, payload, attempts, webhook_endpoints(id, url, secret, is_active)')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', now.toISOString())
      .order('next_attempt_at')
      .limit(BATCH_SIZE)

    if (error) throw new Error(error.message)

    let delivered = 0
    let failed = 0
    let dead = 0

    for (const delivery of due ?? []) {
      const endpoint = delivery.webhook_endpoints
      if (!endpoint || !endpoint.is_active) {
        await supabase
          .from('webhook_deliveries')
          .update({ status: 'dead', last_error: 'Endpoint inaktiverad.' })
          .eq('id', delivery.id)
        dead += 1
        continue
      }

      const body = JSON.stringify({
        id: delivery.id,
        type: delivery.event_type,
        created_at: now.toISOString(),
        data: delivery.payload,
      })
      const signature = signWebhookPayload(endpoint.secret, body, Math.floor(now.getTime() / 1000))

      let responseStatus: number | null = null
      let errorMessage: string | null = null
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Bovaro-Signature': signature,
            'Bovaro-Event': delivery.event_type,
          },
          body,
          signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        })
        responseStatus = response.status
        if (!response.ok) errorMessage = `HTTP ${response.status}`
      } catch (fetchError) {
        errorMessage = fetchError instanceof Error ? fetchError.message : 'network error'
      }

      if (!errorMessage) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'delivered',
            attempts: delivery.attempts + 1,
            response_status: responseStatus,
            delivered_at: now.toISOString(),
            last_error: null,
          })
          .eq('id', delivery.id)
        await supabase
          .from('webhook_endpoints')
          .update({ last_success_at: now.toISOString(), failure_count: 0 })
          .eq('id', endpoint.id)
        delivered += 1
        continue
      }

      const attempts = delivery.attempts + 1
      const retryAt = nextAttemptAt(attempts, now)
      await supabase
        .from('webhook_deliveries')
        .update({
          status: retryAt ? 'failed' : 'dead',
          attempts,
          response_status: responseStatus,
          last_error: errorMessage.slice(0, 300),
          next_attempt_at: (retryAt ?? now).toISOString(),
        })
        .eq('id', delivery.id)

      const { data: endpointRow } = await supabase
        .from('webhook_endpoints')
        .select('failure_count')
        .eq('id', endpoint.id)
        .maybeSingle()
      await supabase
        .from('webhook_endpoints')
        .update({ last_failure_at: now.toISOString(), failure_count: (endpointRow?.failure_count ?? 0) + 1 })
        .eq('id', endpoint.id)

      if (retryAt) failed += 1
      else dead += 1
    }

    return { due: (due ?? []).length, delivered, failed, dead, maxAttempts: MAX_ATTEMPTS }
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
