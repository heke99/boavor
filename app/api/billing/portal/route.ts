import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'
import { getSiteUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'

/** Opens the Stripe billing portal for the signed-in user or their company. */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const supabase = await createSupabaseServerClient()

  if (!stripe || !supabase) {
    return NextResponse.json({ error: 'Betalning är inte konfigurerad i den här miljön.' }, { status: 503 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/dashboard/billing', getSiteUrl()), 303)
  }

  const formData = await request.formData()
  const companyId = String(formData.get('companyId') ?? '').trim() || null
  const returnTo = String(formData.get('returnTo') ?? '/dashboard/billing')
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard/billing'

  // RLS: user reads own mapping or their company's.
  let customerQuery = supabase.from('billing_customers').select('stripe_customer_id')
  customerQuery = companyId ? customerQuery.eq('company_id', companyId) : customerQuery.eq('user_id', user.id)
  const { data: customer } = await customerQuery.maybeSingle()

  if (!customer?.stripe_customer_id) {
    return NextResponse.redirect(new URL(`${safeReturnTo}?billing=no_customer`, getSiteUrl()), 303)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: `${getSiteUrl()}${safeReturnTo}`,
  })

  return NextResponse.redirect(session.url, 303)
}
