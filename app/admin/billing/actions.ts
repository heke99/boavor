'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { requireSuperAdminAccess, logAdminAudit } from '@/lib/auth/permissions'

/** Grants complimentary plan access to a user (audited). */
export async function grantComplimentaryAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const userId = String(formData.get('userId') ?? '').trim()
  const planCode = String(formData.get('planCode') ?? '').trim()
  const months = Math.max(1, Math.min(24, Number(formData.get('months') ?? 3) || 3))
  if (!userId || !planCode) return

  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + months)

  const { error } = await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      plan_code: planCode,
      provider: 'complimentary',
      provider_subscription_id: null,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: true,
    },
    { onConflict: 'user_id,plan_code' },
  )

  if (error) {
    console.error('Failed to grant complimentary access', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'billing_complimentary_granted',
    targetType: 'user_subscription',
    targetId: userId,
    metadata: { plan_code: planCode, months },
  })

  revalidatePath('/admin/billing')
}

/** Revokes a user's plan access (audited). */
export async function revokeSubscriptionAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const subscriptionId = String(formData.get('subscriptionId') ?? '')
  if (!subscriptionId) return

  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_code, provider')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!subscription) return

  // Stripe-managed subscriptions must be cancelled in Stripe (via the portal
  // or dashboard) so billing stops; here we only revoke entitlements.
  await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled', cancel_at_period_end: true })
    .eq('id', subscriptionId)

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'billing_subscription_revoked',
    targetType: 'user_subscription',
    targetId: subscription.user_id,
    metadata: { plan_code: subscription.plan_code, provider: subscription.provider },
  })

  revalidatePath('/admin/billing')
}

/** Super admin: plan pricing/visibility management. */
export async function updatePlanAction(formData: FormData) {
  const { supabase, user } = await requireSuperAdminAccess()

  const planCode = String(formData.get('planCode') ?? '')
  if (!planCode) return

  const amount = Number(formData.get('amountSek') ?? 0)
  const trialDays = Number(formData.get('trialDays') ?? 0)

  const { error } = await supabase
    .from('subscription_plans')
    .update({
      is_active: formData.get('isActive') === 'on',
      is_public: formData.get('isPublic') === 'on',
      stripe_price_id: String(formData.get('stripePriceId') ?? '').trim() || null,
      amount_sek: Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0,
      trial_days: trialDays > 0 ? Math.round(trialDays) : null,
    })
    .eq('code', planCode)

  if (error) {
    console.error('Failed to update plan', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'billing_plan_updated',
    targetType: 'subscription_plan',
    targetId: null,
    metadata: { plan_code: planCode },
  })

  revalidatePath('/admin/billing')
}
