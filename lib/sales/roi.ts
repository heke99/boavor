/**
 * ROI-kalkyl för hyresvärdar (pure, tested).
 *
 * Conservative model: Bovaro shortens vacancy by a fixed number of days per
 * re-letting (structured queue + prepared applicant profiles) and cuts the
 * manual administration hours per letting. Both assumptions are surfaced in
 * the UI — this is an estimate, not a promise.
 */

export const ASSUMPTIONS = {
  /** Days of vacancy avoided per re-letting. */
  vacancyDaysSaved: 7,
  /** Share of manual admin time saved per letting. */
  adminTimeSavedShare: 0.5,
} as const

export type RoiInput = {
  /** Number of rental units in the portfolio. */
  units: number
  /** Average monthly rent (SEK). */
  averageRent: number
  /** Share of units re-let per year (0–1), e.g. 0.15 for 15%. */
  turnoverRate: number
  /** Manual admin hours per letting today. */
  adminHoursPerLetting: number
  /** Internal cost per staff hour (SEK). */
  hourlyCost: number
}

export type RoiResult = {
  lettingsPerYear: number
  vacancySavings: number
  adminSavings: number
  totalYearlySavings: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function calculateRoi(input: RoiInput): RoiResult {
  const units = clamp(Math.floor(input.units) || 0, 0, 100_000)
  const averageRent = clamp(input.averageRent || 0, 0, 100_000)
  const turnoverRate = clamp(input.turnoverRate || 0, 0, 1)
  const adminHours = clamp(input.adminHoursPerLetting || 0, 0, 200)
  const hourlyCost = clamp(input.hourlyCost || 0, 0, 5_000)

  const lettingsPerYear = Math.round(units * turnoverRate)
  const dailyRent = averageRent / 30
  const vacancySavings = Math.round(lettingsPerYear * ASSUMPTIONS.vacancyDaysSaved * dailyRent)
  const adminSavings = Math.round(lettingsPerYear * adminHours * ASSUMPTIONS.adminTimeSavedShare * hourlyCost)

  return {
    lettingsPerYear,
    vacancySavings,
    adminSavings,
    totalYearlySavings: vacancySavings + adminSavings,
  }
}
