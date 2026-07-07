import { createHash } from 'crypto'
import type { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

type RateLimitParams = {
  scope: string
  subject: string
  ip?: string | null
  limit: number
  windowSeconds: number
}

function getRateLimitSecret() {
  const secret = process.env.RATE_LIMIT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    // A well-known pepper in production would make the stored hashes
    // (emails/IPs) trivially reversible offline. Fail closed instead.
    return null
  }
  return 'bovaro-development-rate-limit'
}

function hashValue(secret: string, value: string) {
  return createHash('sha256').update(`${secret}:${value}`).digest('hex')
}

export async function checkRateLimit(supabase: SupabaseServerClient, params: RateLimitParams) {
  const secret = getRateLimitSecret()
  if (!secret) {
    console.error('RATE_LIMIT_SECRET must be set in production; denying rate-limited action.')
    return false
  }

  const subjectHash = hashValue(secret, params.subject.toLowerCase())
  const ipHash = params.ip ? hashValue(secret, params.ip) : null

  const { data, error } = await supabase.rpc('check_rate_limit', {
    input_scope: params.scope,
    input_subject_hash: subjectHash,
    // The SQL function accepts null; the generated arg type is non-nullable.
    input_ip_hash: ipHash as string,
    input_limit: params.limit,
    input_window_seconds: params.windowSeconds,
  })

  if (error) {
    console.error('Rate limit check failed', error)
    return true
  }

  return data === true
}
