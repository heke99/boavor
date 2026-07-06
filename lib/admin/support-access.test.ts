import { describe, expect, it } from 'vitest'
import { clampGrantHours, isGrantActive, isValidReason } from './support-access'

const now = new Date('2026-07-06T12:00:00Z')

describe('isGrantActive', () => {
  it('is active before expiry and without revocation', () => {
    expect(isGrantActive({ expiresAt: '2026-07-06T13:00:00Z', revokedAt: null }, now)).toBe(true)
  })

  it('is inactive after expiry', () => {
    expect(isGrantActive({ expiresAt: '2026-07-06T11:59:59Z', revokedAt: null }, now)).toBe(false)
  })

  it('is inactive when revoked, even before expiry', () => {
    expect(isGrantActive({ expiresAt: '2026-07-06T13:00:00Z', revokedAt: '2026-07-06T11:00:00Z' }, now)).toBe(false)
  })
})

describe('isValidReason', () => {
  it('requires at least 10 non-whitespace-padded characters', () => {
    expect(isValidReason('för kort')).toBe(false)
    expect(isValidReason('   trimmas bort   ')).toBe(true)
    expect(isValidReason('Supportärende #123: användaren ser inte svar')).toBe(true)
  })
})

describe('clampGrantHours', () => {
  it('defaults invalid input to 1 hour', () => {
    expect(clampGrantHours(Number.NaN)).toBe(1)
    expect(clampGrantHours(0)).toBe(1)
    expect(clampGrantHours(-5)).toBe(1)
  })

  it('clamps to the max and floors fractions', () => {
    expect(clampGrantHours(99, 4)).toBe(4)
    expect(clampGrantHours(2.9, 4)).toBe(2)
    expect(clampGrantHours(3, 4)).toBe(3)
  })
})
