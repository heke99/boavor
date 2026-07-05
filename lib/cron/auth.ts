import type { NextRequest } from 'next/server'

/**
 * Cron endpoint authorization.
 *
 * Accepts `Authorization: Bearer <CRON_SECRET>` (Vercel cron convention) or
 * the `x-cron-secret` header. Returns a structured result so routes can
 * respond honestly when the secret is not configured.
 */
export function authorizeCronRequest(request: NextRequest):
  | { ok: true }
  | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, status: 503, error: 'CRON_SECRET är inte konfigurerad i den här miljön.' }
  }

  const authHeader = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (bearer === secret || headerSecret === secret) {
    return { ok: true }
  }

  return { ok: false, status: 401, error: 'Ogiltig cron-autentisering.' }
}
