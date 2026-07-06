'use server'

import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth/permissions'
import type { Json } from '@/lib/supabase/database.types'
import type { PolicyRuleType } from '@/lib/policy/engine'

type RuleDraft = { rule_type: PolicyRuleType; config: Record<string, unknown> }

/** Builds the rule set from the policy form. Only filled-in rules are created. */
function buildRulesFromForm(formData: FormData): RuleDraft[] {
  const rules: RuleDraft[] = []

  const minIncome = Number(formData.get('minIncome') ?? 0)
  if (minIncome > 0) rules.push({ rule_type: 'min_income', config: { amount: minIncome } })

  const multiplier = Number(formData.get('incomeMultiplier') ?? 0)
  if (multiplier > 0) rules.push({ rule_type: 'income_multiplier', config: { multiplier } })

  const employmentTypes = formData.getAll('employmentTypes').map(String).filter(Boolean)
  if (employmentTypes.length > 0) {
    rules.push({ rule_type: 'accepted_employment_types', config: { types: employmentTypes } })
  }

  if (formData.get('noActiveDebt') === 'on') rules.push({ rule_type: 'no_active_debt', config: {} })

  const maxHousehold = Number(formData.get('maxHouseholdSize') ?? 0)
  if (maxHousehold > 0) rules.push({ rule_type: 'max_household_size', config: { size: maxHousehold } })

  const minHousehold = Number(formData.get('minHouseholdSize') ?? 0)
  if (minHousehold > 1) rules.push({ rule_type: 'min_household_size', config: { size: minHousehold } })

  rules.push({ rule_type: 'pets_allowed', config: { allowed: formData.get('petsAllowed') === 'true' } })
  rules.push({ rule_type: 'smoking_allowed', config: { allowed: formData.get('smokingAllowed') === 'true' } })

  if (formData.get('studentOnly') === 'on') rules.push({ rule_type: 'student_only', config: {} })

  if (formData.get('seniorOnly') === 'on') {
    const minAge = Number(formData.get('seniorMinAge') ?? 55) || 55
    rules.push({ rule_type: 'senior_only', config: { min_age: minAge } })
  }

  rules.push({ rule_type: 'guarantor_allowed', config: { allowed: formData.get('guarantorAllowed') !== 'false' } })

  if (formData.get('registerExtractRequired') === 'on') {
    rules.push({ rule_type: 'register_extract_required', config: {} })
  }

  const requiredDocuments = formData.getAll('requiredDocuments').map(String).filter(Boolean)
  if (requiredDocuments.length > 0) {
    rules.push({ rule_type: 'required_documents', config: { types: requiredDocuments } })
  }

  const customQuestion = String(formData.get('customQuestion') ?? '').trim()
  if (customQuestion) rules.push({ rule_type: 'custom_question', config: { question: customQuestion } })

  return rules
}

export async function createPolicyAction(formData: FormData) {
  const { supabase, user, profile } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/policies' })

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const ownerType = String(formData.get('ownerType') ?? 'personal')
  const companyId = ownerType.startsWith('company:') ? ownerType.slice('company:'.length) : null
  if (companyId && !profile.companyIds.includes(companyId)) return

  const { data: policy, error } = await supabase
    .from('landlord_policies')
    .insert({
      owner_user_id: companyId ? null : user.id,
      company_id: companyId,
      name,
      description: String(formData.get('description') ?? '').trim() || null,
      current_version: 1,
      is_default: formData.get('isDefault') === 'on',
    })
    .select('id')
    .single()

  if (error || !policy) {
    console.error('Failed to create policy', error)
    return
  }

  const rules = buildRulesFromForm(formData)
  if (rules.length > 0) {
    await supabase.from('policy_rules').insert(
      rules.map((rule) => ({
        policy_id: policy.id,
        version: 1,
        rule_type: rule.rule_type,
        config: rule.config as Json,
      })),
    )
  }

  revalidatePath('/dashboard/policies')
}

/**
 * Updating rules creates a NEW version and bumps current_version. Old
 * versions are never mutated, so historical evaluations stay auditable.
 */
export async function updatePolicyRulesAction(formData: FormData) {
  const { supabase } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/policies' })

  const policyId = String(formData.get('policyId') ?? '')
  if (!policyId) return

  // RLS ensures only owners can read/update the policy.
  const { data: policy } = await supabase
    .from('landlord_policies')
    .select('id, current_version')
    .eq('id', policyId)
    .maybeSingle()

  if (!policy) return

  const nextVersion = policy.current_version + 1
  const rules = buildRulesFromForm(formData)

  const { error: rulesError } = await supabase.from('policy_rules').insert(
    rules.map((rule) => ({
      policy_id: policy.id,
      version: nextVersion,
      rule_type: rule.rule_type,
      config: rule.config as Json,
    })),
  )

  if (rulesError) {
    console.error('Failed to insert policy rules', rulesError)
    return
  }

  await supabase.from('landlord_policies').update({ current_version: nextVersion }).eq('id', policy.id)

  revalidatePath('/dashboard/policies')
}

export async function deletePolicyAction(formData: FormData) {
  const { supabase } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/policies' })
  const policyId = String(formData.get('policyId') ?? '')
  if (!policyId) return

  // Block deletion while listings still use the policy.
  const { data: assignments } = await supabase
    .from('listing_policy_assignments')
    .select('listing_id')
    .eq('policy_id', policyId)
    .limit(1)

  if ((assignments ?? []).length > 0) return

  await supabase.from('landlord_policies').delete().eq('id', policyId)
  revalidatePath('/dashboard/policies')
}
