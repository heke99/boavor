'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase is not configured.')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You need to be signed in.')
  return { supabase, user }
}

export async function saveProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const desiredLocationsRaw = String(formData.get('desiredLocations') ?? '')
  const desiredLocations = desiredLocationsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  await supabase.from('profiles').upsert({
    id: user.id,
    first_name: String(formData.get('firstName') ?? '').trim(),
    last_name: String(formData.get('lastName') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    household_size: Number(formData.get('householdSize') ?? 1) || null,
    has_pets: formData.get('hasPets') === 'on',
    employment_status: String(formData.get('employmentStatus') ?? '').trim(),
    employer_name: String(formData.get('employerName') ?? '').trim(),
    monthly_income: Number(formData.get('monthlyIncome') ?? 0) || null,
    desired_move_in: String(formData.get('desiredMoveIn') ?? '').trim() || null,
    desired_locations: desiredLocations,
  })

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

  await supabase.from('queue_memberships').upsert({
    user_id: user.id,
    membership_status: 'active',
    joined_queue_at: now,
    current_points: 0,
    months_in_queue: 0,
    last_point_awarded_at: now,
    next_billing_at: nextBillingAt,
  }, { onConflict: 'user_id' })

  await supabase.from('user_subscriptions').upsert({
    user_id: user.id,
    plan_code: 'queue_monthly',
    provider: 'manual',
    provider_subscription_id: `manual-${user.id}`,
    status: 'active',
    current_period_start: now,
    current_period_end: nextBillingAt,
  }, { onConflict: 'user_id,plan_code' })

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

  await supabase.from('queue_memberships').update({ membership_status: 'active', next_billing_at: nextBillingAt }).eq('user_id', user.id)
  await supabase.from('user_subscriptions').update({ status: 'active', current_period_end: nextBillingAt }).eq('user_id', user.id).eq('plan_code', 'queue_monthly')

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
