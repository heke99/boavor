'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AccountType, AppRole, CompanyType, LegalForm, PreferredListingIntent } from '@/lib/types'

const COMPANY_ROLES: AppRole[] = ['landlord', 'broker', 'company_admin']

async function requireUser() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase is not configured.')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You need to be signed in.')
  return { supabase, user }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function saveProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const desiredLocationsRaw = String(formData.get('desiredLocations') ?? '')
  const desiredLocations = desiredLocationsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const role = String(formData.get('role') ?? 'seeker') as AppRole

  await supabase.from('profiles').upsert({
    id: user.id,
    first_name: String(formData.get('firstName') ?? '').trim(),
    last_name: String(formData.get('lastName') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    role,
    account_type: String(formData.get('accountType') ?? 'private') as AccountType,
    personal_identity_number: String(formData.get('personalIdentityNumber') ?? '').trim() || null,
    preferred_listing_intent: String(formData.get('preferredListingIntent') ?? 'both') as PreferredListingIntent,
    marketing_consent: formData.get('marketingConsent') === 'on',
    household_size: Number(formData.get('householdSize') ?? 1) || null,
    has_pets: formData.get('hasPets') === 'on',
    employment_status: String(formData.get('employmentStatus') ?? '').trim(),
    employer_name: String(formData.get('employerName') ?? '').trim(),
    monthly_income: Number(formData.get('monthlyIncome') ?? 0) || null,
    desired_move_in: String(formData.get('desiredMoveIn') ?? '').trim() || null,
    desired_locations: desiredLocations,
  })

  if (COMPANY_ROLES.includes(role)) {
    const companyName = String(formData.get('companyName') ?? '').trim()
    if (companyName) {
      const companyType = String(formData.get('companyType') ?? 'landlord_company') as CompanyType
      const legalForm = String(formData.get('legalForm') ?? 'ab') as LegalForm
      const companyCity = String(formData.get('companyCity') ?? '').trim()
      const orgNumber = String(formData.get('orgNumber') ?? '').trim() || null
      const phone = String(formData.get('companyPhone') ?? '').trim() || null
      const email = String(formData.get('companyEmail') ?? '').trim() || null
      const slugBase = slugify(companyName) || `company-${user.id.slice(0, 8)}`
      const slug = `${slugBase}-${user.id.slice(0, 6)}`

      let companyId: string | null = null
      const { data: existingMembership } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (existingMembership?.company_id) {
        companyId = existingMembership.company_id
        await supabase
          .from('companies')
          .update({
            name: companyName,
            slug,
            company_type: companyType,
            legal_form: legalForm,
            city: companyCity || null,
            org_number: orgNumber,
            phone,
            email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyId)
      } else {
        const { data: createdCompany } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            slug,
            company_type: companyType,
            legal_form: legalForm,
            city: companyCity || null,
            org_number: orgNumber,
            phone,
            email,
          })
          .select('id')
          .single()

        companyId = createdCompany?.id ?? null
      }

      if (companyId) {
        await supabase.from('company_members').upsert(
          {
            company_id: companyId,
            user_id: user.id,
            role: role === 'broker' ? 'broker' : 'company_admin',
          },
          { onConflict: 'company_id,user_id' },
        )
      }
    }
  }

  revalidatePath('/dashboard/profile')
}

export async function addCoApplicantAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const fullName = String(formData.get('fullName') ?? '').trim()
  if (!fullName) return

  await supabase.from('co_applicants').insert({
    user_id: user.id,
    full_name: fullName,
    email: String(formData.get('email') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    relationship: String(formData.get('relationship') ?? '').trim() || null,
  })

  revalidatePath('/dashboard/profile')
}

export async function removeCoApplicantAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('co_applicants').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/profile')
}

export async function addProfileDocumentAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const fileName = String(formData.get('fileName') ?? '').trim()
  const fileUrl = String(formData.get('fileUrl') ?? '').trim()
  if (!fileName || !fileUrl) return

  await supabase.from('profile_documents').insert({
    user_id: user.id,
    file_name: fileName,
    file_url: fileUrl,
    document_type: String(formData.get('documentType') ?? 'general').trim() || 'general',
    document_status: 'active',
    document_expires_at: String(formData.get('documentExpiresAt') ?? '').trim() || null,
    is_default_for_applications: formData.get('isDefaultForApplications') === 'on',
  })

  revalidatePath('/dashboard/profile')
}

export async function removeProfileDocumentAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('profile_documents').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/profile')
}

export async function startQueueMembershipAction() {
  const { supabase, user } = await requireUser()

  const now = new Date().toISOString()
  const nextBillingAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('queue_memberships').upsert(
    {
      user_id: user.id,
      membership_status: 'active',
      joined_queue_at: now,
      current_points: 0,
      months_in_queue: 0,
      last_point_awarded_at: now,
      next_billing_at: nextBillingAt,
    },
    { onConflict: 'user_id' },
  )

  await supabase.from('user_subscriptions').upsert(
    {
      user_id: user.id,
      plan_code: 'queue_monthly',
      provider: 'manual',
      provider_subscription_id: `manual-${user.id}`,
      status: 'active',
      current_period_start: now,
      current_period_end: nextBillingAt,
    },
    { onConflict: 'user_id,plan_code' },
  )

  const { data: membership } = await supabase.from('queue_memberships').select('id').eq('user_id', user.id).maybeSingle()
  if (membership?.id) {
    await supabase.from('queue_point_ledger').insert({
      user_id: user.id,
      membership_id: membership.id,
      event_type: 'enrolled',
      points_delta: 0,
      balance_after: 0,
      note: 'Kömedlemskap startat.',
    })
  }

  revalidatePath('/dashboard/profile')
}

export async function pauseQueueMembershipAction() {
  const { supabase, user } = await requireUser()

  await supabase.from('queue_memberships').update({ membership_status: 'paused' }).eq('user_id', user.id)
  await supabase.from('user_subscriptions').update({ status: 'paused' }).eq('user_id', user.id).eq('plan_code', 'queue_monthly')

  const { data: membership } = await supabase.from('queue_memberships').select('id, current_points').eq('user_id', user.id).maybeSingle()
  if (membership?.id) {
    await supabase.from('queue_point_ledger').insert({
      user_id: user.id,
      membership_id: membership.id,
      event_type: 'paused',
      points_delta: 0,
      balance_after: membership.current_points ?? 0,
      note: 'Kömedlemskap pausat.',
    })
  }

  revalidatePath('/dashboard/profile')
}

export async function resumeQueueMembershipAction() {
  const { supabase, user } = await requireUser()
  const nextBillingAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('queue_memberships')
    .update({ membership_status: 'active', next_billing_at: nextBillingAt })
    .eq('user_id', user.id)

  await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: nextBillingAt,
    })
    .eq('user_id', user.id)
    .eq('plan_code', 'queue_monthly')

  const { data: membership } = await supabase.from('queue_memberships').select('id, current_points').eq('user_id', user.id).maybeSingle()
  if (membership?.id) {
    await supabase.from('queue_point_ledger').insert({
      user_id: user.id,
      membership_id: membership.id,
      event_type: 'resumed',
      points_delta: 0,
      balance_after: membership.current_points ?? 0,
      note: 'Kömedlemskap återaktiverat.',
    })
  }

  revalidatePath('/dashboard/profile')
}

export async function updateNotificationSettingsAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  await supabase
    .from('profiles')
    .update({
      marketing_consent: formData.get('marketingConsent') === 'on',
      preferred_listing_intent: String(formData.get('preferredListingIntent') ?? 'both'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  revalidatePath('/dashboard/settings')
}

export async function updatePasswordAction(formData: FormData) {
  const { supabase } = await requireUser()
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (!password || password.length < 8) throw new Error('Lösenordet måste vara minst 8 tecken.')
  if (password !== confirmPassword) throw new Error('Lösenorden matchar inte.')

  await supabase.auth.updateUser({ password })
  revalidatePath('/dashboard/settings')
}

export async function createPrivacyRequestAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const requestType = String(formData.get('requestType') ?? 'export')
  const allowedTypes = ['export', 'rectification', 'erasure', 'restriction']
  if (!allowedTypes.includes(requestType)) return

  const { error } = await supabase.from('privacy_requests').insert({
    user_id: user.id,
    request_type: requestType,
    message: String(formData.get('message') ?? '').trim() || null,
  })

  if (error) {
    console.error('Failed to create privacy request', error)
    return
  }

  revalidatePath('/dashboard/settings')
}
