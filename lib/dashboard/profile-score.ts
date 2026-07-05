import type { RentalApplicationItem } from '@/lib/types'

// Profile completeness now lives in lib/profile/readiness.ts (calculateReadiness).

export function calculateApplicationScore(application: RentalApplicationItem) {
  let score = 0
  if (application.applicant.fullName) score += 12
  if (application.applicant.email) score += 8
  if (application.applicant.phone) score += 8
  if (application.applicant.monthlyIncome) score += 18
  if (application.applicant.householdSize) score += 8
  if (application.documents.length > 0) score += 16
  if (application.coverLetter) score += 10
  score += Math.min(20, application.queuePointsSnapshot)

  return Math.min(100, score)
}
