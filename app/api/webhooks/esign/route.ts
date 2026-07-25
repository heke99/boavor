import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * E-sign provider webhook. A contract is only marked signed when the provider
 * confirms completion here (or all signers complete the labeled mock flow).
 *
 * Payload: { provider_ref: string, event: 'completed' | 'declined',
 *            signed_pdf_url?: string }
 * Signature: HMAC-SHA256 of `<timestamp>.<raw body>` with
 * ESIGN_WEBHOOK_SECRET in the `x-esign-signature` header (hex), plus the
 * Unix timestamp (seconds) in `x-esign-timestamp`. Events older than five
 * minutes are rejected to block replay attacks.
 */
const MAX_WEBHOOK_AGE_SECONDS = 5 * 60

export async function POST(request: NextRequest) {
  const secret = process.env.ESIGN_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'ESIGN_WEBHOOK_SECRET är inte konfigurerad.' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-esign-signature') ?? ''
  const timestampHeader = request.headers.get('x-esign-timestamp') ?? ''

  const timestamp = Number(timestampHeader)
  if (!timestampHeader || !Number.isFinite(timestamp)) {
    return NextResponse.json({ ok: false, error: 'x-esign-timestamp krävs.' }, { status: 400 })
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_WEBHOOK_AGE_SECONDS) {
    return NextResponse.json({ ok: false, error: 'Händelsen är för gammal (replay-skydd).' }, { status: 401 })
  }

  const expected = createHmac('sha256', secret).update(`${timestampHeader}.${rawBody}`).digest('hex')

  const signatureBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return NextResponse.json({ ok: false, error: 'Ogiltig signatur.' }, { status: 401 })
  }

  let payload: { provider_ref?: string; event?: string; signed_pdf_url?: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false, error: 'Ogiltig JSON.' }, { status: 400 })
  }

  if (!payload.provider_ref || !payload.event) {
    return NextResponse.json({ ok: false, error: 'provider_ref och event krävs.' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY är inte konfigurerad.' }, { status: 503 })
  }

  if (!['completed', 'declined'].includes(payload.event)) {
    return NextResponse.json({ ok: false, error: 'Okänd händelse.' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('process_signing_callback', {
    p_provider_reference: payload.provider_ref,
    p_event: payload.event,
    p_signed_pdf_url: payload.signed_pdf_url ?? null,
  })
  if (error) {
    console.error('Signing callback processing failed', { message: error.message })
    const status = error.message.includes('not found') ? 404 : 500
    return NextResponse.json({ ok: false, error: 'Signeringshändelsen kunde inte behandlas.' }, { status })
  }
  return NextResponse.json({ ok: true, result: data })
}
