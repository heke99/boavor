import type { Instrumentation } from 'next'

/**
 * Server-side error reporting hook (Next.js instrumentation). Errors from
 * server components, route handlers and server actions are forwarded to
 * Sentry when SENTRY_DSN is configured; otherwise they only hit the logs.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { captureServerException } = await import('@/lib/monitoring/sentry')
  await captureServerException(error, {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
  })
}
