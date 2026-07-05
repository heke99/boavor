import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveIdentityProvider } from '@/lib/identity/provider'

export type IdentityVerificationStatus = 'pending' | 'verified' | 'failed' | 'expired' | 'cancelled'

export type IdentityState = {
  isSignedIn: boolean
  providerAvailable: boolean
  providerLabel: string | null
  providerIsMock: boolean
  /** Latest verification attempt, if any. */
  latest: {
    id: string
    provider: string
    status: IdentityVerificationStatus
    createdAt: string
    verifiedAt: string | null
    ageVerified: boolean | null
    fullNameFromProvider: string | null
    failureReason: string | null
  } | null
  isVerified: boolean
  isAdult: boolean
}

const EMPTY_STATE: IdentityState = {
  isSignedIn: false,
  providerAvailable: false,
  providerLabel: null,
  providerIsMock: false,
  latest: null,
  isVerified: false,
  isAdult: false,
}

export async function getIdentityState(): Promise<IdentityState> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return EMPTY_STATE

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return EMPTY_STATE

  const [resolution, { data: verifications }] = await Promise.all([
    resolveIdentityProvider(),
    supabase
      .from('identity_verifications')
      .select('id, provider, status, created_at, verified_at, age_verified, full_name_from_provider, failure_reason')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const latestRow = verifications?.[0] ?? null
  const verifiedRow =
    latestRow?.status === 'verified'
      ? latestRow
      : (
          await supabase
            .from('identity_verifications')
            .select('id, provider, status, created_at, verified_at, age_verified, full_name_from_provider, failure_reason')
            .eq('user_id', user.id)
            .eq('status', 'verified')
            .limit(1)
            .maybeSingle()
        ).data

  const effective = verifiedRow ?? latestRow

  return {
    isSignedIn: true,
    providerAvailable: resolution.kind === 'provider',
    providerLabel: resolution.kind === 'provider' ? resolution.provider.label : null,
    providerIsMock: resolution.kind === 'provider' ? resolution.provider.isMock : false,
    latest: effective
      ? {
          id: effective.id,
          provider: effective.provider,
          status: effective.status as IdentityVerificationStatus,
          createdAt: effective.created_at,
          verifiedAt: effective.verified_at,
          ageVerified: effective.age_verified,
          fullNameFromProvider: effective.full_name_from_provider,
          failureReason: effective.failure_reason,
        }
      : null,
    isVerified: Boolean(verifiedRow),
    isAdult: Boolean(verifiedRow?.age_verified),
  }
}

/** Cheap server-side gate used by the apply flow. */
export async function requireVerifiedAdult(userId: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { verified: false, adult: false }

  const { data } = await supabase
    .from('identity_verifications')
    .select('id, age_verified')
    .eq('user_id', userId)
    .eq('status', 'verified')
    .limit(1)
    .maybeSingle()

  return { verified: Boolean(data), adult: Boolean(data?.age_verified) }
}
