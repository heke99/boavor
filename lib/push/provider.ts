/**
 * Web Push adapter. Delivery requires VAPID keys; without them the provider
 * reports itself as not configured and nothing is sent (never fake success).
 *
 * Generate keys once with: npx web-push generate-vapid-keys
 */

export type PushPayload = {
  title: string
  body: string
  url?: string
}

export type PushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export type PushSendResult =
  | { status: 'sent' }
  | { status: 'gone' } // subscription expired — caller should disable the row
  | { status: 'failed'; error: string }
  | { status: 'not_configured' }

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
  )
}

export async function sendWebPush(subscription: PushSubscriptionRow, payload: PushPayload): Promise<PushSendResult> {
  if (!isPushConfigured()) return { status: 'not_configured' }

  const { default: webpush } = await import('web-push')
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    )
    return { status: 'sent' }
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) return { status: 'gone' }
    return { status: 'failed', error: error instanceof Error ? error.message : 'unknown' }
  }
}
