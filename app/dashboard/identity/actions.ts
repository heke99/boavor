'use server'

import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import { recordConsent } from '@/lib/consents/consents'
import {
  hashPersonalIdentityNumber,
  resolveIdentityProvider,
} from '@/lib/identity/provider'
import {
  getAgeFromBirthDate,
  getBirthDate,
  normalizePersonalIdentityNumber,
} from '@/lib/identity/personnummer'

export type IdentityActionResult =
  | { ok: true; verificationId?: string; status?: string }
  | { ok: false; error: string }

export async function startIdentityVerificationAction(formData: FormData): Promise<IdentityActionResult> {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/identity' })

  const resolution = await resolveIdentityProvider()
  if (resolution.kind !== 'provider') {
    return { ok: false, error: 'BankID-verifiering är inte konfigurerad i den här miljön.' }
  }
  const provider = resolution.provider

  const consentGiven = formData.get('identityConsent') === 'on'
  if (!consentGiven) {
    return { ok: false, error: 'Du måste godkänna behandlingen av ditt personnummer för att verifiera dig.' }
  }

  const allowed = await checkRateLimit(supabase, {
    scope: 'identity_verification_start',
    subject: user.id,
    limit: 10,
    windowSeconds: 60 * 60,
  })
  if (!allowed) {
    return { ok: false, error: 'För många verifieringsförsök. Vänta en stund och försök igen.' }
  }

  // Abort any lingering pending verification before starting a new one.
  const { data: pending } = await supabase
    .from('identity_verifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .limit(5)

  for (const row of pending ?? []) {
    await supabase.rpc('finalize_identity_verification', {
      p_verification_id: row.id,
      p_status: 'cancelled',
      p_failure_reason: 'superseded_by_new_attempt',
    })
  }

  const { data: existingVerified } = await supabase
    .from('identity_verifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'verified')
    .limit(1)
    .maybeSingle()

  if (existingVerified) {
    return { ok: false, error: 'Din identitet är redan verifierad.' }
  }

  let pinHash: string | null = null
  let birthDate: string | null = null

  if (provider.isMock) {
    // The mock provider verifies the number the user entered (development only).
    const rawPin = String(formData.get('personalIdentityNumber') ?? '')
    const normalized = normalizePersonalIdentityNumber(rawPin)
    if (!normalized) {
      return { ok: false, error: 'Ange ett giltigt personnummer (ÅÅÅÅMMDD-XXXX).' }
    }
    pinHash = hashPersonalIdentityNumber(normalized)
    birthDate = getBirthDate(normalized)
  }

  let session
  try {
    session = await provider.start({ userId: user.id })
  } catch (error) {
    console.error('Identity provider start failed', error)
    return { ok: false, error: 'Identitetstjänsten kunde inte nås. Försök igen senare.' }
  }

  const { data: created, error: insertError } = await supabase
    .from('identity_verifications')
    .insert({
      user_id: user.id,
      provider: provider.name,
      provider_session_id: session.sessionId,
      status: 'pending',
      personal_identity_number_hash: pinHash,
      birth_date: birthDate,
      metadata: { auto_start_token: session.autoStartToken ?? null },
    })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('Failed to create identity verification', insertError)
    return { ok: false, error: 'Verifieringen kunde inte startas. Försök igen.' }
  }

  await supabase.from('identity_verification_events').insert({
    verification_id: created.id,
    user_id: user.id,
    event_type: 'started',
    payload: { provider: provider.name },
  })

  await recordConsent(supabase, { userId: user.id, consentType: 'identity_verification', source: 'identity_start' })

  revalidatePath('/dashboard/identity')
  return { ok: true, verificationId: created.id, status: 'pending' }
}

export async function pollIdentityVerificationAction(verificationId: string): Promise<IdentityActionResult> {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/identity' })

  const { data: verification } = await supabase
    .from('identity_verifications')
    .select('id, status, provider, provider_session_id, created_at, birth_date, personal_identity_number_hash')
    .eq('id', verificationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!verification) return { ok: false, error: 'Verifieringen hittades inte.' }
  if (verification.status !== 'pending') {
    return { ok: true, verificationId, status: verification.status }
  }

  const resolution = await resolveIdentityProvider()
  if (resolution.kind !== 'provider' || resolution.provider.name !== verification.provider) {
    return { ok: false, error: 'Identitetstjänsten är inte tillgänglig just nu.' }
  }
  const provider = resolution.provider

  let result
  try {
    result = await provider.check(verification.provider_session_id ?? '', {
      startedAt: new Date(verification.created_at),
    })
  } catch (error) {
    console.error('Identity provider check failed', error)
    return { ok: false, error: 'Kunde inte hämta status från identitetstjänsten.' }
  }

  if (result.status === 'pending') {
    return { ok: true, verificationId, status: 'pending' }
  }

  if (result.status === 'failed') {
    await supabase.rpc('finalize_identity_verification', {
      p_verification_id: verificationId,
      p_status: 'failed',
      p_failure_reason: result.reason,
    })
    revalidatePath('/dashboard/identity')
    return { ok: true, verificationId, status: 'failed' }
  }

  // Complete: derive identity facts. BankID returns the personal number at
  // completion; the mock stored hash/birth date at start.
  let pinHash = verification.personal_identity_number_hash
  let birthDate = verification.birth_date

  if (result.personalIdentityNumber) {
    const normalized = normalizePersonalIdentityNumber(result.personalIdentityNumber)
    if (!normalized) {
      await supabase.rpc('finalize_identity_verification', {
        p_verification_id: verificationId,
        p_status: 'failed',
        p_failure_reason: 'invalid_personal_identity_number_from_provider',
      })
      revalidatePath('/dashboard/identity')
      return { ok: true, verificationId, status: 'failed' }
    }
    pinHash = hashPersonalIdentityNumber(normalized)
    birthDate = getBirthDate(normalized)
  }

  if (!birthDate || !pinHash) {
    await supabase.rpc('finalize_identity_verification', {
      p_verification_id: verificationId,
      p_status: 'failed',
      p_failure_reason: 'missing_identity_data',
    })
    revalidatePath('/dashboard/identity')
    return { ok: true, verificationId, status: 'failed' }
  }

  const age = getAgeFromBirthDate(birthDate)
  const { error: finalizeError } = await supabase.rpc('finalize_identity_verification', {
    p_verification_id: verificationId,
    p_status: 'verified',
    p_birth_date: birthDate,
    p_age_verified: age >= 18,
    p_pin_hash: pinHash,
    p_full_name: result.fullName ?? undefined,
    p_metadata: { provider: provider.name, mock: provider.isMock },
  })

  if (finalizeError) {
    console.error('Failed to finalize identity verification', finalizeError)
    return { ok: false, error: 'Verifieringen kunde inte slutföras. Försök igen.' }
  }

  revalidatePath('/dashboard/identity')
  revalidatePath('/dashboard')
  return { ok: true, verificationId, status: 'verified' }
}

export async function cancelIdentityVerificationAction(verificationId: string): Promise<IdentityActionResult> {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/identity' })

  const { data: verification } = await supabase
    .from('identity_verifications')
    .select('id, status, provider, provider_session_id')
    .eq('id', verificationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!verification) return { ok: false, error: 'Verifieringen hittades inte.' }
  if (verification.status !== 'pending') {
    return { ok: true, verificationId, status: verification.status }
  }

  const resolution = await resolveIdentityProvider()
  if (resolution.kind === 'provider' && resolution.provider.name === verification.provider) {
    try {
      await resolution.provider.cancel(verification.provider_session_id ?? '')
    } catch (error) {
      console.error('Identity provider cancel failed', error)
    }
  }

  await supabase.rpc('finalize_identity_verification', {
    p_verification_id: verificationId,
    p_status: 'cancelled',
    p_failure_reason: 'cancelled_by_user',
  })

  revalidatePath('/dashboard/identity')
  return { ok: true, verificationId, status: 'cancelled' }
}
