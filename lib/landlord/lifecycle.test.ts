import { describe, expect, it } from 'vitest'
import { parseLifecycleBundle } from './lifecycle'

describe('landlord lifecycle bundle', () => {
  it('normalizes malformed values without leaking untrusted data', () => {
    expect(parseLifecycleBundle({ tenancies: 2, outstanding_ore: 'bad' })).toMatchObject({
      tenancies: 2,
      outstanding_ore: 0,
      maintenance: 0,
    })
  })
})

