import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/billing/stripe'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

/**
 * Starts a Stripe Checkout session for a subscription plan.
 * Form fields: planCode, optional companyId (landlord plans), returnTo.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const serviceClient = createSupabaseServiceClient()
  const supabase = await createSupabaseServerClient()

  if (!stripe || !serviceClient || !supabase) {
    return NextResponse.json({ error: 'Betalning är inte konfigurerad i den här miljön.' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.redirect(new URL('/login?next=/dashboard/billing', getSiteUrl()), 303)
  }

  const formData = await request.formData()
  const planCode = String(formData.get('planCode') ?? '')
  const companyId = String(formData.get('companyId') ?? '').trim() || null
  const returnTo = String(formData.get('returnTo') ?? '/dashboard/billing')
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard/billing'

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('code, name, stripe_price_id, is_active, plan_audience')
    .eq('code', planCode)
    .maybeSingle()

  if (!plan?.is_active || !plan.stripe_price_id) {
    return NextResponse.redirect(new URL(`${safeReturnTo}?billing=plan_unavailable`, getSiteUrl()), 303)
  }

  // Landlord plans must be bought for a company the user manages.
  if (companyId) {
    const { data: membership } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) {
      return NextResponse.redirect(new URL(`${safeReturnTo}?billing=forbidden`, getSiteUrl()), 303)
    }
  }
  if (plan.plan_audience === 'landlord' && !companyId) {
    return NextResponse.redirect(new URL(`${safeReturnTo}?billing=company_required`, getSiteUrl()), 303)
  }

  // Get or create the Stripe customer (mapping stored via service role).
  let customerQuery = serviceClient.from('billing_customers').select('stripe_customer_id')
  customerQuery = companyId ? customerQuery.eq('company_id', companyId) : customerQuery.eq('user_id', user.id)
  const { data: existingCustomer } = await customerQuery.maybeSingle()

  let stripeCustomerId = existingCustomer?.stripe_customer_id ?? null
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id, company_id: companyId ?? '' },
    })
    stripeCustomerId = customer.id
    await serviceClient.from('billing_customers').insert({
      user_id: companyId ? null : user.id,
      company_id: companyId,
      stripe_customer_id: stripeCustomerId,
    })
  }

  const siteUrl = getSiteUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${siteUrl}${safeReturnTo}?billing=success`,
    cancel_url: `${siteUrl}${safeReturnTo}?billing=cancelled`,
    metadata: { user_id: user.id, company_id: companyId ?? '', plan_code: plan.code },
    subscription_data: {
      metadata: { user_id: user.id, company_id: companyId ?? '', plan_code: plan.code },
    },
  })

  if (!session.url) {
    return NextResponse.redirect(new URL(`${safeReturnTo}?billing=failed`, siteUrl), 303)
  }

  return NextResponse.redirect(session.url, 303)
}
