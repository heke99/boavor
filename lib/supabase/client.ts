import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv, hasSupabaseEnv } from '@/lib/supabase/env'

export function createSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) return null
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
