import { describe, expect, it } from 'vitest'
import { formatMoney, parseTenantPortalBundle } from './portal'

describe('tenant portal bundle', () => {
  it('returns safe empty arrays for invalid payloads', () => {
    expect(parseTenantPortalBundle(null)).toEqual({
      tenancies: [],
      invoices: [],
      maintenance: [],
      terminations: [],
    })
  })

  it('keeps canonical money in integer öre until formatting', () => {
    expect(formatMoney(12_345)).toContain('123,45')
  })
})

