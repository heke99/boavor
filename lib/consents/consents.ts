import type { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

/**
 * Consent registry. Every consent has a type and a version; bumping a version
 * requires users to re-accept where the flow demands it.
 */
export const CONSENT_TYPES = {
  terms: { version: '2026-05-09', label: 'Allmänna villkor' },
  privacy: { version: '2026-05-09', label: 'Integritetspolicy' },
  identity_verification: {
    version: '2026-07-05',
    label: 'Behandling av personnummer vid identitetsverifiering',
  },
  application_data_sharing: {
    version: '2026-07-05',
    label: 'Delning av ansökningsuppgifter med hyresvärd',
  },
  document_sharing: {
    version: '2026-07-05',
    label: 'Delning av dokument med hyresvärd',
  },
} as const

export type ConsentType = keyof typeof CONSENT_TYPES

export async function recordConsent(
  supabase: SupabaseServerClient,
  params: { userId: string; consentType: ConsentType; source: string },
) {
  const definition = CONSENT_TYPES[params.consentType]
  const { error } = await supabase.from('user_consents').upsert(
    {
      user_id: params.userId,
      consent_type: params.consentType,
      consent_version: definition.version,
      granted: true,
      granted_at: new Date().toISOString(),
      metadata: { source: params.source },
    },
    { onConflict: 'user_id,consent_type,consent_version' },
  )

  if (error) {
    console.error('Failed to record consent', params.consentType, error)
    return false
  }
  return true
}

export async function hasConsent(
  supabase: SupabaseServerClient,
  params: { userId: string; consentType: ConsentType },
) {
  const definition = CONSENT_TYPES[params.consentType]
  const { data } = await supabase
    .from('user_consents')
    .select('id')
    .eq('user_id', params.userId)
    .eq('consent_type', params.consentType)
    .eq('consent_version', definition.version)
    .eq('granted', true)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}
