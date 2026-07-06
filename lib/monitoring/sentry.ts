import { randomUUID } from 'crypto'
// Relative import so vitest (no path-alias config) can resolve it too.
import { maskPiiInText, sanitizeForLog } from '../log'

/**
 * Minimal Sentry reporter (no SDK) used by instrumentation.onRequestError.
 *
 * Events are delivered to Sentry's store endpoint derived from SENTRY_DSN.
 * Without a DSN nothing is sent — errors still reach the server logs. All
 * messages and context pass the privacy-safe log sanitizer first so no PII
 * leaves the platform.
 */

export type ParsedDsn = {
  publicKey: string
  host: string
  projectId: string
}

export function parseSentryDsn(dsn: string | undefined | null): ParsedDsn | null {
  if (!dsn) return null
  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\//, '')
    if (!url.username || !url.host || !projectId || !/^\d+$/.test(projectId)) return null
    return { publicKey: url.username, host: url.host, projectId }
  } catch {
    return null
  }
}

export type SentryEvent = {
  event_id: string
  timestamp: string
  platform: 'node'
  level: 'error'
  environment: string
  exception: { values: Array<{ type: string; value: string }> }
  tags: Record<string, string>
  extra: Record<string, unknown>
}

export function buildSentryEvent(
  error: unknown,
  context: { path?: string; method?: string; routerKind?: string; routeType?: string },
  environment: string,
): SentryEvent {
  const err = error instanceof Error ? error : new Error(String(error))
  return {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform: 'node',
    level: 'error',
    environment,
    exception: {
      values: [{ type: err.name || 'Error', value: maskPiiInText(err.message || 'Unknown error') }],
    },
    tags: {
      router_kind: context.routerKind ?? 'unknown',
      route_type: context.routeType ?? 'unknown',
    },
    extra: sanitizeForLog({ path: context.path, method: context.method }) as Record<string, unknown>,
  }
}

/** Fire-and-forget delivery; never throws into the request path. */
export async function captureServerException(
  error: unknown,
  context: { path?: string; method?: string; routerKind?: string; routeType?: string } = {},
): Promise<void> {
  const dsn = parseSentryDsn(process.env.SENTRY_DSN)
  if (!dsn) return

  const event = buildSentryEvent(error, context, process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development')

  try {
    await fetch(`https://${dsn.host}/api/${dsn.projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=bovaro/1.0, sentry_key=${dsn.publicKey}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    })
  } catch (deliveryError) {
    console.error('[sentry] delivery failed', deliveryError instanceof Error ? deliveryError.message : deliveryError)
  }
}
