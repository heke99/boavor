import type { AppRole } from '@/lib/types'

export type EntryProfile = {
  role: AppRole | null
  accountType: string | null
  onboardingCompleted: boolean
}

const LANDLORD_ROLES: AppRole[] = ['landlord', 'broker', 'company_admin']

export function isLandlordEntry(profile: Pick<EntryProfile, 'role' | 'accountType'>) {
  if (profile.accountType === 'company') return true
  return Boolean(profile.role && LANDLORD_ROLES.includes(profile.role))
}

/**
 * Resolves where a user should land after signing in.
 *
 * This is a UX convenience only — every destination is protected server-side
 * by layouts, server actions and RLS regardless of what this returns.
 */
export function getPostLoginPath(profile: EntryProfile, explicitNext?: string | null): string {
  // An explicit, validated `next` path always wins (e.g. deep link to apply).
  if (explicitNext && explicitNext !== '/dashboard') return explicitNext

  if (profile.role === 'admin' || profile.role === 'super_admin') return '/admin'

  if (isLandlordEntry(profile)) {
    return profile.onboardingCompleted ? '/landlord' : '/landlord/onboarding'
  }

  return profile.onboardingCompleted ? '/dashboard' : '/dashboard/profile?onboarding=1'
}
