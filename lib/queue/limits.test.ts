import { describe, expect, it } from 'vitest'
import {
  checkApplicationLimit,
  DEFAULT_ACTIVE_APPLICATION_LIMIT,
  isActiveApplicationStatus,
  resolveApplicationLimit,
} from './limits'
import { resolveHouseholdQueuePoints } from './household'

describe('isActiveApplicationStatus', () => {
  it('counts active workflow statuses', () => {
    for (const status of ['submitted', 'reviewing', 'shortlisted', 'offered', 'viewing', 'qualified']) {
      expect(isActiveApplicationStatus(status)).toBe(true)
    }
  })

  it('releases slots for closed statuses', () => {
    for (const status of ['rejected', 'withdrawn', 'signed', 'expired', 'rented_to_other', 'draft']) {
      expect(isActiveApplicationStatus(status)).toBe(false)
    }
  })
})

describe('resolveApplicationLimit', () => {
  it('falls back to the free default', () => {
    expect(resolveApplicationLimit([])).toBe(DEFAULT_ACTIVE_APPLICATION_LIMIT)
    expect(resolveApplicationLimit([{ status: 'active', maxActiveApplications: null }])).toBe(
      DEFAULT_ACTIVE_APPLICATION_LIMIT,
    )
  })

  it('uses the highest active plan limit', () => {
    expect(
      resolveApplicationLimit([
        { status: 'active', maxActiveApplications: 5 },
        { status: 'active', maxActiveApplications: 10 },
      ]),
    ).toBe(10)
  })

  it('ignores inactive plans', () => {
    expect(resolveApplicationLimit([{ status: 'cancelled', maxActiveApplications: 10 }])).toBe(
      DEFAULT_ACTIVE_APPLICATION_LIMIT,
    )
  })

  it('never resolves below the free default', () => {
    expect(resolveApplicationLimit([{ status: 'active', maxActiveApplications: 2 }])).toBe(
      DEFAULT_ACTIVE_APPLICATION_LIMIT,
    )
  })
})

describe('checkApplicationLimit', () => {
  it('allows applying below the limit', () => {
    const result = checkApplicationLimit(3, 5)
    expect(result.canApply).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('blocks applying at the limit', () => {
    const result = checkApplicationLimit(5, 5)
    expect(result.canApply).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe('resolveHouseholdQueuePoints', () => {
  it('uses max by default rule', () => {
    expect(resolveHouseholdQueuePoints('max', 100, [250, 50])).toBe(250)
  })

  it('averages when configured', () => {
    expect(resolveHouseholdQueuePoints('average', 100, [200])).toBe(150)
  })

  it('uses primary only when configured', () => {
    expect(resolveHouseholdQueuePoints('primary_only', 100, [900])).toBe(100)
  })

  it('handles no co-applicants', () => {
    expect(resolveHouseholdQueuePoints('max', 42, [])).toBe(42)
  })
})
