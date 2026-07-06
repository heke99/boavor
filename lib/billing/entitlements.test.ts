import { describe, expect, it } from 'vitest'
import {
  FREE_ENTITLEMENTS,
  isSubscriptionEntitled,
  mapStripeStatus,
  resolveEntitlements,
  type PlanDefinition,
  type SubscriptionRow,
} from './entitlements'

const NOW = new Date('2026-07-05T12:00:00Z')

const PLANS: PlanDefinition[] = [
  { code: 'queue_monthly', maxActiveApplications: 5, features: [] },
  { code: 'bovaro_plus', maxActiveApplications: 10, features: [] },
  { code: 'landlord_professional', maxActiveApplications: null, features: [] },
]

function sub(overrides: Partial<SubscriptionRow>): SubscriptionRow {
  return { planCode: 'bovaro_plus', status: 'active', currentPeriodEnd: null, provider: 'stripe', ...overrides }
}

describe('isSubscriptionEntitled', () => {
  it('entitles active subscriptions', () => {
    expect(isSubscriptionEntitled(sub({ status: 'active' }), NOW)).toBe(true)
  })

  it('entitles past_due within the grace period', () => {
    expect(
      isSubscriptionEntitled(sub({ status: 'past_due', currentPeriodEnd: '2026-07-01T00:00:00Z' }), NOW),
    ).toBe(true)
  })

  it('cuts off past_due after the grace period', () => {
    expect(
      isSubscriptionEntitled(sub({ status: 'past_due', currentPeriodEnd: '2026-06-01T00:00:00Z' }), NOW),
    ).toBe(false)
  })

  it('never entitles cancelled or expired', () => {
    expect(isSubscriptionEntitled(sub({ status: 'cancelled' }), NOW)).toBe(false)
    expect(isSubscriptionEntitled(sub({ status: 'expired' }), NOW)).toBe(false)
    expect(isSubscriptionEntitled(sub({ status: 'pending' }), NOW)).toBe(false)
  })
})

describe('resolveEntitlements', () => {
  it('returns free defaults without subscriptions', () => {
    const result = resolveEntitlements([], PLANS, NOW)
    expect(result.maxActiveApplications).toBe(FREE_ENTITLEMENTS.maxActiveApplications)
    expect(result.detailedMatchkoll).toBe(false)
  })

  it('grants Plus entitlements when active', () => {
    const result = resolveEntitlements([sub({ status: 'active' })], PLANS, NOW)
    expect(result.maxActiveApplications).toBe(10)
    expect(result.detailedMatchkoll).toBe(true)
    expect(result.prioritySupport).toBe(true)
  })

  it('downgrades to free after cancellation', () => {
    const result = resolveEntitlements([sub({ status: 'cancelled' })], PLANS, NOW)
    expect(result.maxActiveApplications).toBe(5)
    expect(result.detailedMatchkoll).toBe(false)
  })

  it('keeps entitlements during the past_due grace period', () => {
    const result = resolveEntitlements(
      [sub({ status: 'past_due', currentPeriodEnd: '2026-07-03T00:00:00Z' })],
      PLANS,
      NOW,
    )
    expect(result.maxActiveApplications).toBe(10)
  })
})

describe('mapStripeStatus', () => {
  it('maps Stripe statuses to internal statuses', () => {
    expect(mapStripeStatus('active')).toBe('active')
    expect(mapStripeStatus('trialing')).toBe('active')
    expect(mapStripeStatus('past_due')).toBe('past_due')
    expect(mapStripeStatus('unpaid')).toBe('past_due')
    expect(mapStripeStatus('canceled')).toBe('cancelled')
    expect(mapStripeStatus('incomplete')).toBe('pending')
    expect(mapStripeStatus('weird_future_status')).toBe('expired')
  })
})
