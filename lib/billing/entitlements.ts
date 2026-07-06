/**
 * Entitlement resolution (pure, tested).
 *
 * A subscription grants entitlements while it is 'active', and during a grace
 * period after payment failure ('past_due') so users are not cut off the
 * moment a card bounces. Cancelled/expired plans grant nothing.
 */

export const PAST_DUE_GRACE_DAYS = 7

export type SubscriptionRow = {
  planCode: string
  status: string
  currentPeriodEnd: string | null
  provider: string
}

export type PlanDefinition = {
  code: string
  maxActiveApplications: number | null
  features: string[]
}

export type Entitlements = {
  maxActiveApplications: number
  detailedMatchkoll: boolean
  prioritySupport: boolean
  activePlanCodes: string[]
}

export const FREE_ENTITLEMENTS: Entitlements = {
  maxActiveApplications: 5,
  detailedMatchkoll: false,
  prioritySupport: false,
  activePlanCodes: [],
}

/** True when the subscription currently grants its plan's entitlements. */
export function isSubscriptionEntitled(subscription: SubscriptionRow, now: Date = new Date()): boolean {
  if (subscription.status === 'active') return true

  if (subscription.status === 'past_due') {
    // Grace period: entitled until PAST_DUE_GRACE_DAYS after the period end.
    if (!subscription.currentPeriodEnd) return false
    const graceEnd = new Date(subscription.currentPeriodEnd).getTime() + PAST_DUE_GRACE_DAYS * 86_400_000
    return now.getTime() <= graceEnd
  }

  return false
}

export function resolveEntitlements(
  subscriptions: SubscriptionRow[],
  plans: PlanDefinition[],
  now: Date = new Date(),
): Entitlements {
  const planMap = new Map(plans.map((plan) => [plan.code, plan]))
  const entitled = subscriptions.filter((subscription) => isSubscriptionEntitled(subscription, now))

  let maxActiveApplications = FREE_ENTITLEMENTS.maxActiveApplications
  let detailedMatchkoll = false
  let prioritySupport = false
  const activePlanCodes: string[] = []

  for (const subscription of entitled) {
    const plan = planMap.get(subscription.planCode)
    if (!plan) continue
    activePlanCodes.push(plan.code)
    if (typeof plan.maxActiveApplications === 'number') {
      maxActiveApplications = Math.max(maxActiveApplications, plan.maxActiveApplications)
    }
    if (plan.code === 'bovaro_plus') {
      detailedMatchkoll = true
      prioritySupport = true
    }
  }

  return { maxActiveApplications, detailedMatchkoll, prioritySupport, activePlanCodes }
}

/** Maps a Stripe subscription status to the internal enum. */
export function mapStripeStatus(stripeStatus: string): 'active' | 'past_due' | 'cancelled' | 'paused' | 'pending' | 'expired' {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
      return 'cancelled'
    case 'paused':
      return 'paused'
    case 'incomplete':
    case 'incomplete_expired':
      return 'pending'
    default:
      return 'expired'
  }
}
