'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { API_SCOPES, generateApiKey, type ApiScope } from '@/lib/api/keys'

const WEBHOOK_EVENTS = ['application.created'] as const

export async function createApiKeyAction(formData: FormData) {
  const { supabase, user, primaryCompanyId } = await requireLandlordAccess()

  const name = String(formData.get('name') ?? '').trim()
  const scopes = formData
    .getAll('scopes')
    .map(String)
    .filter((scope): scope is ApiScope => (API_SCOPES as readonly string[]).includes(scope))

  if (!name) redirect('/landlord/settings/api?error=name_required')
  if (scopes.length === 0) redirect('/landlord/settings/api?error=scopes_required')

  const key = generateApiKey()
  const { error } = await supabase.from('api_keys').insert({
    company_id: primaryCompanyId,
    owner_user_id: primaryCompanyId ? null : user.id,
    name,
    key_prefix: key.prefix,
    key_hash: key.hash,
    scopes,
    created_by: user.id,
  })

  if (error) {
    console.error('Failed to create API key', error)
    redirect('/landlord/settings/api?error=failed')
  }

  revalidatePath('/landlord/settings/api')
  // The plaintext secret is shown exactly once via the redirect target.
  redirect(`/landlord/settings/api?created=${encodeURIComponent(key.secret)}`)
}

export async function revokeApiKeyAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const keyId = String(formData.get('keyId') ?? '')
  if (!keyId) return

  await supabase
    .from('api_keys')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', keyId)

  revalidatePath('/landlord/settings/api')
}

export async function createWebhookEndpointAction(formData: FormData) {
  const { supabase, user, primaryCompanyId } = await requireLandlordAccess()

  const url = String(formData.get('url') ?? '').trim()
  const events = formData
    .getAll('events')
    .map(String)
    .filter((event) => (WEBHOOK_EVENTS as readonly string[]).includes(event))

  if (!url.startsWith('https://')) redirect('/landlord/settings/api?error=url_invalid')
  if (events.length === 0) redirect('/landlord/settings/api?error=events_required')

  const secret = `whsec_${randomBytes(24).toString('hex')}`
  const { error } = await supabase.from('webhook_endpoints').insert({
    company_id: primaryCompanyId,
    owner_user_id: primaryCompanyId ? null : user.id,
    url,
    secret,
    events,
    created_by: user.id,
  })

  if (error) {
    console.error('Failed to create webhook endpoint', error)
    redirect('/landlord/settings/api?error=failed')
  }

  revalidatePath('/landlord/settings/api')
  redirect(`/landlord/settings/api?secret=${encodeURIComponent(secret)}`)
}

export async function toggleWebhookEndpointAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const endpointId = String(formData.get('endpointId') ?? '')
  const nextActive = String(formData.get('nextActive') ?? 'false') === 'true'
  if (!endpointId) return

  await supabase.from('webhook_endpoints').update({ is_active: nextActive }).eq('id', endpointId)
  revalidatePath('/landlord/settings/api')
}

export async function deleteWebhookEndpointAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const endpointId = String(formData.get('endpointId') ?? '')
  if (!endpointId) return

  await supabase.from('webhook_endpoints').delete().eq('id', endpointId)
  revalidatePath('/landlord/settings/api')
}
