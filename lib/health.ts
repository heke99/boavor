import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { LISTING_IMAGES_BUCKET, MESSAGE_ATTACHMENTS_BUCKET, PROFILE_DOCUMENTS_BUCKET } from '@/lib/storage'

export type HealthCheck = {
  ok: boolean
  latencyMs?: number
  error?: string
}

function versionInfo() {
  return {
    service: 'bovaro',
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'local',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    checkedAt: new Date().toISOString(),
  }
}

async function timed<T>(check: () => Promise<T>) {
  const startedAt = Date.now()
  try {
    await check()
    return { ok: true, latencyMs: Date.now() - startedAt } satisfies HealthCheck
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown error',
    } satisfies HealthCheck
  }
}

export function getLivenessPayload() {
  return {
    ok: true,
    ...versionInfo(),
    checks: {
      app: { ok: true },
    },
  }
}

export async function getReadinessPayload() {
  const supabaseEnv = hasSupabaseEnv()
  const checks: Record<string, HealthCheck> = {
    supabaseEnv: { ok: supabaseEnv },
  }

  if (!supabaseEnv) {
    return {
      ok: false,
      ...versionInfo(),
      checks,
    }
  }

  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    checks.supabaseClient = { ok: false, error: 'Supabase client could not be created' }
    return {
      ok: false,
      ...versionInfo(),
      checks,
    }
  }

  checks.database = await timed(async () => {
    const { error } = await supabase.from('listings').select('id', { count: 'exact', head: true }).limit(1)
    if (error) throw new Error(error.message)
  })

  checks.listingImagesBucket = await timed(async () => {
    const { data, error } = await supabase.rpc('storage_bucket_exists', { bucket_name: LISTING_IMAGES_BUCKET })
    if (error) throw new Error(error.message)
    if (data !== true) throw new Error('Bucket saknas')
  })

  checks.profileDocumentsBucket = await timed(async () => {
    const { data, error } = await supabase.rpc('storage_bucket_exists', { bucket_name: PROFILE_DOCUMENTS_BUCKET })
    if (error) throw new Error(error.message)
    if (data !== true) throw new Error('Bucket saknas')
  })

  checks.messageAttachmentsBucket = await timed(async () => {
    const { data, error } = await supabase.rpc('storage_bucket_exists', { bucket_name: MESSAGE_ATTACHMENTS_BUCKET })
    if (error) throw new Error(error.message)
    if (data !== true) throw new Error('Bucket saknas')
  })

  return {
    ok: Object.values(checks).every((check) => check.ok),
    ...versionInfo(),
    checks,
  }
}
