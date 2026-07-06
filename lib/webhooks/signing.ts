import { createHmac } from 'crypto'

/**
 * Outbound webhook signing (Stripe-style): the signature header contains a
 * timestamp and an HMAC-SHA256 over `${timestamp}.${body}` with the
 * endpoint's secret. Receivers verify and reject stale timestamps.
 *
 *   Bovaro-Signature: t=1700000000,v1=<hex hmac>
 */

export function signWebhookPayload(secret: string, body: string, timestampSeconds: number): string {
  const signature = createHmac('sha256', secret).update(`${timestampSeconds}.${body}`).digest('hex')
  return `t=${timestampSeconds},v1=${signature}`
}

/** Retry backoff schedule (minutes) per attempt; after the last, dead-letter. */
export const RETRY_BACKOFF_MINUTES = [1, 5, 30, 120, 720]
export const MAX_ATTEMPTS = RETRY_BACKOFF_MINUTES.length

export function nextAttemptAt(attempts: number, now: Date): Date | null {
  if (attempts >= MAX_ATTEMPTS) return null
  const minutes = RETRY_BACKOFF_MINUTES[attempts]
  return new Date(now.getTime() + minutes * 60_000)
}
