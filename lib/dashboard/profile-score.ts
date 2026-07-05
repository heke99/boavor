import type { DashboardProfileItem, RentalApplicationItem } from '@/lib/types'

export type ProfileScoreBreakdown = {
  score: number
  completed: number
  total: number
  missing: string[]
}

export function calculateProfileScore(profile: DashboardProfileItem): ProfileScoreBreakdown {
  const checks: Array<{ ok: boolean; label: string; weight: number }> = [
    { ok: Boolean(profile.firstName && profile.lastName), label: 'Namn', weight: 10 },
    { ok: Boolean(profile.identityVerifiedAt), label: 'Identitet verifierad', weight: 10 },
    { ok: Boolean(profile.phone), label: 'Telefonnummer', weight: 8 },
    { ok: Boolean(profile.city), label: 'Stad', weight: 6 },
    { ok: Boolean(profile.householdSize), label: 'Hushållsstorlek', weight: 8 },
    { ok: Boolean(profile.employmentStatus), label: 'Anställningsstatus', weight: 10 },
    { ok: Boolean(profile.employerName), label: 'Arbetsgivare', weight: 8 },
    { ok: Boolean(profile.monthlyIncome), label: 'Månadsinkomst', weight: 12 },
    { ok: Boolean(profile.desiredMoveIn), label: 'Önskat inflyttningsdatum', weight: 8 },
    { ok: profile.desiredLocations.length > 0, label: 'Önskade områden', weight: 8 },
    { ok: profile.documents.length > 0, label: 'Dokument', weight: 12 },
  ]

  const total = checks.reduce((sum, item) => sum + item.weight, 0)
  const completed = checks.filter((item) => item.ok).reduce((sum, item) => sum + item.weight, 0)
  const missing = checks.filter((item) => !item.ok).map((item) => item.label)

  return {
    score: Math.round((completed / total) * 100),
    completed,
    total,
    missing,
  }
}

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
