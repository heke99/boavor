import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getDashboardProfile } from '@/lib/data/profile'
import { getScreeningProvider, UNVERIFIED_SCREENING } from '@/lib/screening/provider'
import {
  evaluatePolicy,
  rulesFromRentalRequirements,
  type ApplicantFacts,
  type PolicyEvaluation,
  type PolicyRule,
  type PolicyRuleType,
} from '@/lib/policy/engine'
import { getAgeFromBirthDate } from '@/lib/identity/personnummer'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

export type MatchkollRun = {
  evaluation: PolicyEvaluation
  policyId: string | null
  policyVersion: number | null
  ruleCount: number
}

/**
 * Loads the effective policy rules for a listing: an explicitly assigned
 * landlord policy (current version) or rules derived from the legacy
 * rental_requirements row.
 */
export async function getEffectiveListingRules(
  supabase: SupabaseServerClient,
  listingId: string,
): Promise<{ rules: PolicyRule[]; policyId: string | null; policyVersion: number | null }> {
  const { data: assignment } = await supabase
    .from('listing_policy_assignments')
    .select('policy_id, landlord_policies(id, current_version)')
    .eq('listing_id', listingId)
    .maybeSingle()

  const policy = assignment?.landlord_policies as { id: string; current_version: number } | null

  if (policy) {
    const { data: rules } = await supabase
      .from('policy_rules')
      .select('id, rule_type, config')
      .eq('policy_id', policy.id)
      .eq('version', policy.current_version)

    return {
      rules: (rules ?? []).map((rule) => ({
        id: rule.id,
        ruleType: rule.rule_type as PolicyRuleType,
        config: (rule.config ?? {}) as Record<string, unknown>,
      })),
      policyId: policy.id,
      policyVersion: policy.current_version,
    }
  }

  const { data: requirements } = await supabase
    .from('rental_requirements')
    .select('min_income, pets_allowed, smoking_allowed, references_required, employment_required')
    .eq('listing_id', listingId)
    .maybeSingle()

  if (!requirements) {
    return { rules: [], policyId: null, policyVersion: null }
  }

  return {
    rules: rulesFromRentalRequirements({
      minIncome: requirements.min_income,
      petsAllowed: requirements.pets_allowed,
      smokingAllowed: requirements.smoking_allowed,
      referencesRequired: requirements.references_required,
      employmentRequired: requirements.employment_required,
    }),
    policyId: null,
    policyVersion: null,
  }
}

/** Builds the applicant facts for the signed-in user. */
export async function buildApplicantFacts(supabase: SupabaseServerClient, userId: string): Promise<ApplicantFacts | null> {
  const profileResult = await getDashboardProfile()
  if (!profileResult.isSignedIn || !profileResult.profile) return null
  const profile = profileResult.profile

  const [{ data: identity }, { data: guarantors }] = await Promise.all([
    supabase
      .from('identity_verifications')
      .select('birth_date, personal_identity_number_hash')
      .eq('user_id', userId)
      .eq('status', 'verified')
      .limit(1)
      .maybeSingle(),
    supabase.from('guarantors').select('id').eq('user_id', userId).limit(1),
  ])

  // Screening: only when a provider is configured; otherwise unverifiable.
  let screening = UNVERIFIED_SCREENING
  const screeningProvider = getScreeningProvider()
  if (screeningProvider && identity?.personal_identity_number_hash) {
    try {
      screening = await screeningProvider.checkDebt(identity.personal_identity_number_hash)
    } catch (error) {
      console.error('Screening check failed', error)
      screening = UNVERIFIED_SCREENING
    }
  }

  const usableDocumentTypes = profile.documents
    .filter((document) => ['active', 'pending_review'].includes(document.documentStatus ?? 'active'))
    .map((document) => document.documentType)

  return {
    monthlyIncome: profile.monthlyIncome,
    employmentType: profile.employmentStatus || null,
    householdSize: profile.householdSize,
    hasPets: profile.hasPets,
    smoking: profile.smoking ?? false,
    isStudent: profile.employmentStatus === 'student' || profile.studyStatus === 'full_time' || profile.studyStatus === 'part_time',
    age: identity?.birth_date ? getAgeFromBirthDate(identity.birth_date) : null,
    hasGuarantor: (guarantors ?? []).length > 0 || Boolean(profile.guarantorAvailable),
    documentTypes: usableDocumentTypes,
    screening: { hasActiveDebt: screening.hasActiveDebt },
  }
}

/**
 * Runs Matchkoll for the signed-in user against a listing and stores the
 * evaluation snapshot. Returns null when the user has no complete profile.
 */
export async function runMatchkoll(
  supabase: SupabaseServerClient,
  params: { userId: string; listingId: string; rentAmount: number; context: 'precheck' | 'application' },
): Promise<MatchkollRun | null> {
  const [facts, { rules, policyId, policyVersion }] = await Promise.all([
    buildApplicantFacts(supabase, params.userId),
    getEffectiveListingRules(supabase, params.listingId),
  ])

  if (!facts) return null

  const evaluation = evaluatePolicy(rules, facts, params.rentAmount)

  const { error } = await supabase.from('policy_evaluations').insert({
    listing_id: params.listingId,
    user_id: params.userId,
    policy_id: policyId,
    policy_version: policyVersion,
    context: params.context,
    result: evaluation.result,
    outcomes: JSON.parse(JSON.stringify(evaluation.outcomes)),
  })

  if (error) {
    console.error('Failed to store policy evaluation', error)
  }

  return { evaluation, policyId, policyVersion, ruleCount: rules.length }
}

export type StoredEvaluation = {
  id: string
  result: string
  outcomes: Array<{ ruleType: string; status: string; explanation: string }>
  createdAt: string
}

/** Latest Matchkoll precheck for a user on a listing. */
export async function getLatestPrecheck(
  supabase: SupabaseServerClient,
  userId: string,
  listingId: string,
): Promise<StoredEvaluation | null> {
  const { data } = await supabase
    .from('policy_evaluations')
    .select('id, result, outcomes, created_at')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .eq('context', 'precheck')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    result: data.result,
    outcomes: (data.outcomes ?? []) as StoredEvaluation['outcomes'],
    createdAt: data.created_at,
  }
}

/** True when the user has an active Bovaro Plus entitlement (server-side). */
export async function hasPlusEntitlement(supabase: SupabaseServerClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('status, plan_code')
    .eq('user_id', userId)
    .eq('plan_code', 'bovaro_plus')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}
