import { describe, expect, it } from 'vitest'
import { calculateRoi } from './roi'

describe('calculateRoi', () => {
  it('computes savings for a typical portfolio', () => {
    const result = calculateRoi({
      units: 200,
      averageRent: 9000,
      turnoverRate: 0.15,
      adminHoursPerLetting: 6,
      hourlyCost: 450,
    })
    expect(result.lettingsPerYear).toBe(30)
    // 30 lettings × 7 days × 300 kr/day = 63 000
    expect(result.vacancySavings).toBe(63000)
    // 30 × 6h × 50% × 450 = 40 500
    expect(result.adminSavings).toBe(40500)
    expect(result.totalYearlySavings).toBe(103500)
  })

  it('returns zeroes for an empty portfolio', () => {
    const result = calculateRoi({ units: 0, averageRent: 9000, turnoverRate: 0.2, adminHoursPerLetting: 5, hourlyCost: 400 })
    expect(result.totalYearlySavings).toBe(0)
  })

  it('clamps absurd input instead of exploding', () => {
    const result = calculateRoi({
      units: -5,
      averageRent: 9_999_999,
      turnoverRate: 9,
      adminHoursPerLetting: 10_000,
      hourlyCost: 1_000_000,
    })
    expect(result.lettingsPerYear).toBe(0)
    expect(Number.isFinite(result.totalYearlySavings)).toBe(true)
  })
})
