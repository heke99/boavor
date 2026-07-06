import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { extractBearerKey, hashApiKey, hasScope, type ApiScope } from '@/lib/api/keys'
import { checkRateLimit } from '@/lib/rate-limit'

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>

export type ApiKeyContext = {
  supabase: ServiceClient
  keyId: string
  companyId: string | null
  ownerUserId: string | null
  scopes: string[]
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/**
 * Authenticates a public API request: bearer key → hash lookup → active
 * check → per-key rate limit (300 requests/hour). Every outcome is written
 * to api_request_logs by logApiRequest().
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredScope: ApiScope | null,
): Promise<ApiKeyContext | NextResponse> {
  const supabase = createSupabaseServiceClient()
  if (!supabase) {
    return apiError(503, 'not_configured', 'API:t är inte konfigurerat i den här miljön.')
  }

  const secret = extractBearerKey(request.headers.get('authorization'))
  if (!secret) {
    return apiError(401, 'missing_key', 'Ange en giltig API-nyckel: Authorization: Bearer bov_live_…')
  }

  const { data: key } = await supabase
    .from('api_keys')
    .select('id, company_id, owner_user_id, scopes, is_active, revoked_at')
    .eq('key_hash', hashApiKey(secret))
    .maybeSingle()

  if (!key || !key.is_active || key.revoked_at) {
    return apiError(401, 'invalid_key', 'API-nyckeln är ogiltig eller återkallad.')
  }

  const withinLimit = await checkRateLimit(supabase, {
    scope: 'public_api',
    subject: key.id,
    limit: 300,
    windowSeconds: 60 * 60,
  })
  if (!withinLimit) {
    const response = apiError(429, 'rate_limited', 'För många anrop. Max 300 anrop per timme och nyckel.')
    await logApiRequest(supabase, key.id, request, 429)
    return response
  }

  if (requiredScope && !hasScope(key.scopes ?? [], requiredScope)) {
    const response = apiError(403, 'missing_scope', `Nyckeln saknar behörigheten "${requiredScope}".`)
    await logApiRequest(supabase, key.id, request, 403)
    return response
  }

  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

  return {
    supabase,
    keyId: key.id,
    companyId: key.company_id,
    ownerUserId: key.owner_user_id,
    scopes: key.scopes ?? [],
  }
}

export async function logApiRequest(
  supabase: ServiceClient,
  apiKeyId: string,
  request: NextRequest,
  statusCode: number,
) {
  await supabase.from('api_request_logs').insert({
    api_key_id: apiKeyId,
    method: request.method,
    path: request.nextUrl.pathname,
    status_code: statusCode,
  })
}
