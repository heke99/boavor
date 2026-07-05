import type { RentalApplicationStatus } from '@/lib/types'

/**
 * Active application limit engine.
 *
 * A rental application occupies a slot while it is in an active status.
 * Closed statuses release the slot. Limits come from the user's subscription
 * plans (subscription_plans.max_active_applications); the free default is 5.
 */

export const DEFAULT_ACTIVE_APPLICATION_LIMIT = 5

/** Statuses that occupy an active application slot. */
export const ACTIVE_APPLICATION_STATUSES: RentalApplicationStatus[] = [
  'submitted',
  'reviewing',
  'shortlisted',
  'offered',
]

/** Legacy/live enum values that also count as active. */
const ACTIVE_STATUS_SET = new Set<string>([
  ...ACTIVE_APPLICATION_STATUSES,
  'received',
  'qualified',
  'reserve',
  'viewing',
  'screening',
  'viewing_invited',
  'viewing_booked',
  'offer_accepted',
  'contract_pending',
])

export function isActiveApplicationStatus(status: string): boolean {
  return ACTIVE_STATUS_SET.has(status)
}

export type PlanEntitlement = {
  status: string
  maxActiveApplications: number | null
}

/**
 * Resolves the user's active-application limit from their subscription plans.
 * The highest limit among active/pending-free plans wins; missing data falls
 * back to the free default.
 */
export function resolveApplicationLimit(plans: PlanEntitlement[]): number {
  const activeLimits = plans
    .filter((plan) => plan.status === 'active' && typeof plan.maxActiveApplications === 'number')
    .map((plan) => plan.maxActiveApplications as number)

  if (activeLimits.length === 0) return DEFAULT_ACTIVE_APPLICATION_LIMIT
  return Math.max(DEFAULT_ACTIVE_APPLICATION_LIMIT, ...activeLimits)
}

export type ApplicationLimitCheck = {
  limit: number
  activeCount: number
  canApply: boolean
  remaining: number
}

export function checkApplicationLimit(activeCount: number, limit: number): ApplicationLimitCheck {
  return {
    limit,
    activeCount,
    canApply: activeCount < limit,
    remaining: Math.max(0, limit - activeCount),
  }
}
