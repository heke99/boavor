import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/billing/stripe'
import { mapStripeStatus } from '@/lib/billing/entitlements'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * Stripe webhook: verifies the signature, guarantees idempotency via
 * billing_events (unique stripe_event_id) and syncs subscription state into
 * user_subscriptions / company_subscriptions. Entitlements always derive from
 * those tables server-side — never from client state.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabase = createSupabaseServiceClient()

  if (!stripe || !webhookSecret || !supabase) {
    return NextResponse.json({ error: 'Stripe är inte konfigurerad.' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('Stripe signature verification failed', error)
    return NextResponse.json({ error: 'Ogiltig signatur.' }, { status: 400 })
  }

  // Idempotency: only the first insert for an event id proceeds.
  const { data: inserted, error: insertError } = await supabase
    .from('billing_events')
    .upsert(
      { stripe_event_id: event.id, event_type: event.type, payload: { livemode: event.livemode } },
      { onConflict: 'stripe_event_id', ignoreDuplicates: true },
    )
    .select('id')

  if (insertError) {
    console.error('Failed to record billing event', insertError)
    return NextResponse.json({ error: 'Kunde inte registrera händelsen.' }, { status: 500 })
  }

  if (!inserted || inserted.length === 0) {
    // Already processed.
    return NextResponse.json({ ok: true, duplicate: true })
  }

  let processingError: string | null = null

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(supabase, event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === 'string'
            ? invoice.parent.subscription_details.subscription
            : null
        if (subscriptionId) {
          await supabase
            .from('user_subscriptions')
            .update({ status: 'past_due' })
            .eq('provider_subscription_id', subscriptionId)
          await supabase
            .from('company_subscriptions')
            .update({ status: 'past_due' })
            .eq('provider_subscription_id', subscriptionId)
        }
        break
      }
      default:
        // Recorded but not acted upon.
        break
    }
  } catch (error) {
    processingError = error instanceof Error ? error.message : 'unknown error'
    console.error('Stripe webhook processing failed', error)
  }

  await supabase
    .from('billing_events')
    .update({ processed_at: new Date().toISOString(), error: processingError })
    .eq('stripe_event_id', event.id)

  if (processingError) {
    return NextResponse.json({ error: processingError }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>

async function syncSubscription(supabase: ServiceClient, subscription: Stripe.Subscription) {
  const metadata = subscription.metadata ?? {}
  const userId = metadata.user_id || null
  const companyId = metadata.company_id || null
  let planCode = metadata.plan_code || null

  // Fallback: resolve the plan from the price id.
  if (!planCode) {
    const priceId = subscription.items.data[0]?.price?.id
    if (priceId) {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('code')
        .eq('stripe_price_id', priceId)
        .maybeSingle()
      planCode = plan?.code ?? null
    }
  }

  if (!planCode) {
    throw new Error(`Kan inte matcha prenumeration ${subscription.id} till en plan.`)
  }

  const firstItem = subscription.items.data[0]
  const status = mapStripeStatus(subscription.status)
  const payload = {
    plan_code: planCode,
    provider: 'stripe',
    provider_subscription_id: subscription.id,
    status,
    current_period_start: firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000).toISOString()
      : null,
    current_period_end: firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }

  if (companyId) {
    const { error } = await supabase
      .from('company_subscriptions')
      .upsert({ ...payload, company_id: companyId }, { onConflict: 'company_id,plan_code' })
    if (error) throw error
    return
  }

  if (userId) {
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id,plan_code' })
    if (error) throw error
    return
  }

  throw new Error(`Prenumeration ${subscription.id} saknar user/company-metadata.`)
}
