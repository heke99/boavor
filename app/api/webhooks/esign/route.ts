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

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, status')
    .eq('provider_ref', payload.provider_ref)
    .maybeSingle()

  if (!contract) {
    return NextResponse.json({ ok: false, error: 'Okänt kontrakt.' }, { status: 404 })
  }

  if (payload.event === 'completed') {
    // Mark all signers signed (the provider has confirmed completion), store
    // the signed PDF reference and finalize atomically.
    await supabase
      .from('contract_signers')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('contract_id', contract.id)
      .eq('status', 'pending')

    if (payload.signed_pdf_url) {
      await supabase.from('contracts').update({ signed_pdf_url: payload.signed_pdf_url }).eq('id', contract.id)
    }

    const { error } = await supabase.rpc('finalize_signed_contract', { p_contract_id: contract.id })
    if (error) {
      console.error('Contract finalization failed', error)
      return NextResponse.json({ ok: false, error: 'Finalisering misslyckades.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, contractId: contract.id, finalized: true })
  }

  if (payload.event === 'declined') {
    await supabase.from('contracts').update({ status: 'cancelled' }).eq('id', contract.id)
    await supabase.from('contract_events').insert({
      contract_id: contract.id,
      actor_user_id: null,
      event_type: 'signing_declined',
    })
    return NextResponse.json({ ok: true, contractId: contract.id, cancelled: true })
  }

  return NextResponse.json({ ok: false, error: 'Okänd händelse.' }, { status: 400 })
}
