/**
 * Household queue point rules for applications with linked co-applicants.
 *
 * Configurable per platform/landlord/portal. Default: the highest points in
 * the household count.
 */

export type HouseholdQueueRule = 'max' | 'average' | 'primary_only'

export const DEFAULT_HOUSEHOLD_QUEUE_RULE: HouseholdQueueRule = 'max'

export function resolveHouseholdQueuePoints(
  rule: HouseholdQueueRule,
  primaryPoints: number,
  coApplicantPoints: number[],
): number {
  if (rule === 'primary_only' || coApplicantPoints.length === 0) {
    return primaryPoints
  }

  const all = [primaryPoints, ...coApplicantPoints]

  if (rule === 'average') {
    return Math.round(all.reduce((sum, points) => sum + points, 0) / all.length)
  }

  return Math.max(...all)
}
