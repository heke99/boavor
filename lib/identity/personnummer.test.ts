import { describe, expect, it } from 'vitest'
import {
  getAgeFromBirthDate,
  getBirthDate,
  isValidPersonalIdentityNumber,
  normalizePersonalIdentityNumber,
} from './personnummer'

// 811218-9876 is the official Skatteverket test personnummer.
const VALID_TEN = '811218-9876'
const VALID_TWELVE = '198112189876'
const NOW = new Date('2026-07-05T12:00:00Z')

describe('normalizePersonalIdentityNumber', () => {
  it('normalizes a 10-digit number with century inference', () => {
    expect(normalizePersonalIdentityNumber(VALID_TEN, NOW)).toBe(VALID_TWELVE)
  })

  it('accepts a 12-digit number directly', () => {
    expect(normalizePersonalIdentityNumber(VALID_TWELVE, NOW)).toBe(VALID_TWELVE)
  })

  it('accepts formatting variations', () => {
    expect(normalizePersonalIdentityNumber('19811218-9876', NOW)).toBe(VALID_TWELVE)
    expect(normalizePersonalIdentityNumber('811218 9876', NOW)).toBe(VALID_TWELVE)
  })

  it('rejects invalid checksums', () => {
    expect(normalizePersonalIdentityNumber('811218-9877', NOW)).toBeNull()
  })

  it('rejects invalid dates', () => {
    expect(normalizePersonalIdentityNumber('811318-9876', NOW)).toBeNull()
    expect(normalizePersonalIdentityNumber('811232-9876', NOW)).toBeNull()
  })

  it('rejects wrong lengths', () => {
    expect(normalizePersonalIdentityNumber('81121-9876', NOW)).toBeNull()
    expect(normalizePersonalIdentityNumber('', NOW)).toBeNull()
  })
})

describe('isValidPersonalIdentityNumber', () => {
  it('validates', () => {
    expect(isValidPersonalIdentityNumber(VALID_TEN, NOW)).toBe(true)
    expect(isValidPersonalIdentityNumber('nonsense', NOW)).toBe(false)
  })
})

describe('getBirthDate', () => {
  it('derives the birth date', () => {
    expect(getBirthDate(VALID_TWELVE)).toBe('1981-12-18')
  })

  it('handles coordination numbers (day + 60)', () => {
    expect(getBirthDate('198112789876')).toBe('1981-12-18')
  })

  it('rejects malformed input', () => {
    expect(getBirthDate('811218')).toBeNull()
  })
})

describe('getAgeFromBirthDate', () => {
  it('computes age after birthday', () => {
    expect(getAgeFromBirthDate('1981-12-18', new Date('2026-12-18T12:00:00Z'))).toBe(45)
  })

  it('computes age before birthday', () => {
    expect(getAgeFromBirthDate('1981-12-18', new Date('2026-07-05T12:00:00Z'))).toBe(44)
  })

  it('flags minors correctly', () => {
    expect(getAgeFromBirthDate('2010-01-01', NOW)).toBeLessThan(18)
  })
})
