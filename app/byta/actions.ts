'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth/permissions'
import { requireVerifiedAdult } from '@/lib/data/identity'
import { checkRateLimit } from '@/lib/rate-limit'
import { trackEvent } from '@/lib/analytics/track'

export async function saveExchangeProfileAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/byta/skapa' })

  // Only verified users can create exchange ads (also enforced by RLS/RPC).
  const identity = await requireVerifiedAdult(user.id)
  if (!identity.verified) {
    redirect('/dashboard/identity?reason=byta')
  }

  const currentCity = String(formData.get('currentCity') ?? '').trim()
  const currentRooms = Number(formData.get('currentRooms') ?? 0)
  const currentRent = Number(formData.get('currentRent') ?? 0)
  if (!currentCity || currentRooms <= 0 || currentRent <= 0) {
    redirect('/byta/skapa?error=validation')
  }

  const wantedCities = String(formData.get('wantedCities') ?? '')
    .split(',')
    .map((city) => city.trim())
    .filter(Boolean)
  const wantedAreas = String(formData.get('wantedAreas') ?? '')
    .split(',')
    .map((area) => area.trim())
    .filter(Boolean)

  const { error } = await supabase.from('exchange_profiles').upsert(
    {
      user_id: user.id,
      status: String(formData.get('status') ?? 'active') === 'paused' ? 'paused' : 'active',
      current_city: currentCity,
      current_area: String(formData.get('currentArea') ?? '').trim() || null,
      current_street: String(formData.get('currentStreet') ?? '').trim() || null,
      current_rooms: currentRooms,
      current_area_sqm: Number(formData.get('currentAreaSqm') ?? 0) || null,
      current_rent: currentRent,
      current_landlord_name: String(formData.get('currentLandlordName') ?? '').trim() || null,
      current_contract_type: ['first_hand', 'student', 'senior'].includes(String(formData.get('currentContractType')))
        ? String(formData.get('currentContractType'))
        : 'first_hand',
      current_floor: String(formData.get('currentFloor') ?? '').trim() || null,
      current_has_elevator: formData.get('currentHasElevator') === 'on',
      current_has_balcony: formData.get('currentHasBalcony') === 'on',
      current_has_accessibility: formData.get('currentHasAccessibility') === 'on',
      description: String(formData.get('description') ?? '').trim() || null,
      wanted_cities: wantedCities,
      wanted_areas: wantedAreas,
      wanted_min_rooms: Number(formData.get('wantedMinRooms') ?? 0) || null,
      wanted_max_rent: Number(formData.get('wantedMaxRent') ?? 0) || null,
      wanted_min_area_sqm: Number(formData.get('wantedMinAreaSqm') ?? 0) || null,
      wanted_needs_accessibility: formData.get('wantedNeedsAccessibility') === 'on',
      show_name_before_match: formData.get('showNameBeforeMatch') === 'on',
      show_exact_address: formData.get('showExactAddress') === 'on',
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    console.error('Failed to save exchange profile', error)
    redirect('/byta/skapa?error=failed')
  }

  revalidatePath('/byta')
  revalidatePath('/dashboard/byten')
  redirect('/dashboard/byten?saved=1')
}

export async function removeExchangeProfileAction() {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login' })

  await supabase.from('exchange_profiles').update({ status: 'removed' }).eq('user_id', user.id)

  revalidatePath('/dashboard/byten')
  revalidatePath('/byta')
}

export async function registerExchangeInterestAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/byten' })

  const profileId = String(formData.get('profileId') ?? '')
  const interested = String(formData.get('interested') ?? 'true') === 'true'
  const backTo = String(formData.get('backTo') ?? '/dashboard/byten')
  const safeBackTo = backTo.startsWith('/') && !backTo.startsWith('//') ? backTo : '/dashboard/byten'
  if (!profileId) return

  const allowed = await checkRateLimit(supabase, {
    scope: 'exchange_interest',
    subject: user.id,
    limit: 30,
    windowSeconds: 60 * 60,
  })
  if (!allowed) redirect(`${safeBackTo}?byta=rate_limited`)

  const { data, error } = await supabase.rpc('register_exchange_interest', {
    p_to_profile_id: profileId,
    p_interested: interested,
  })

  if (error) {
    console.error('Failed to register exchange interest', error)
    redirect(`${safeBackTo}?byta=failed`)
  }

  const result = data as { mutual?: boolean } | null

  if (interested) {
    await trackEvent('exchange_interest', { metadata: { mutual: result?.mutual ?? false } })
  }

  revalidatePath('/dashboard/byten')
  redirect(result?.mutual ? `/dashboard/byten?byta=match` : `${safeBackTo}?byta=registered`)
}

export async function updateExchangeMatchStatusAction(formData: FormData) {
  const { supabase } = await getAuthContext({ loginRedirect: '/login' })

  const matchId = String(formData.get('matchId') ?? '')
  const status = String(formData.get('status') ?? '')
  if (
    !matchId ||
    !['documents_shared', 'landlord_review', 'approved', 'rejected', 'completed'].includes(status)
  ) {
    return
  }

  // RLS restricts updates to the two match parties.
  const { error } = await supabase.from('exchange_matches').update({ status }).eq('id', matchId)
  if (error) console.error('Failed to update exchange match', error)

  revalidatePath('/dashboard/byten')
}

export async function reportExchangeProfileAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login' })

  const profileId = String(formData.get('profileId') ?? '')
  const reasonType = String(formData.get('reasonType') ?? 'other')
  const detail = String(formData.get('detail') ?? '').trim() || null
  if (!profileId || !['fake_ad', 'inappropriate', 'fraud', 'other'].includes(reasonType)) return

  // Abuse guard: mass-reporting is itself an abuse vector.
  const allowed = await checkRateLimit(supabase, {
    scope: 'exchange_report',
    subject: user.id,
    limit: 5,
    windowSeconds: 60 * 60,
  })
  if (!allowed) redirect(`/byta/${profileId}?reported=rate_limited`)

  const { error } = await supabase.from('exchange_reports').insert({
    profile_id: profileId,
    reporter_user_id: user.id,
    reason_type: reasonType,
    detail,
  })

  if (error) {
    console.error('Failed to report exchange profile', error)
    return
  }

  redirect(`/byta/${profileId}?reported=1`)
}
