import { getDashboardProfile } from '@/lib/data/profile'
import { getIdentityState } from '@/lib/data/identity'
import { calculateReadiness, type ReadinessResult } from '@/lib/profile/readiness'
import type { DashboardProfileItem } from '@/lib/types'

export type ReadinessSummary = {
  profile: DashboardProfileItem
  readiness: ReadinessResult
}

/** Builds the readiness result for the signed-in user. */
export async function getReadinessForCurrentUser(): Promise<ReadinessSummary | null> {
  const [{ isSignedIn, profile }, identity] = await Promise.all([getDashboardProfile(), getIdentityState()])
  if (!isSignedIn || !profile) return null

  const readiness = calculateReadiness({
    identityVerified: identity.isVerified,
    isAdult: identity.isAdult,
    firstName: profile.firstName || null,
    lastName: profile.lastName || null,
    phone: profile.phone || null,
    city: profile.city || null,
    monthlyIncome: profile.monthlyIncome,
    employmentStatus: profile.employmentStatus || null,
    householdSize: profile.householdSize,
    desiredMoveIn: profile.desiredMoveIn,
    desiredLocations: profile.desiredLocations,
    personalLetter: profile.personalLetter ?? null,
    currentHousingSituation: profile.currentHousingSituation ?? null,
    documents: profile.documents.map((document) => ({
      documentType: document.documentType,
      status: document.documentStatus ?? 'active',
      expiresAt: document.documentExpiresAt ?? null,
    })),
    queueActive: profile.queueMembership?.status === 'active',
  })

  return { profile, readiness }
}
