import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv, hasSupabaseEnv } from '@/lib/supabase/env'
import type { Database } from '@/lib/supabase/database.types'

export function createSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) return null
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient<Database>(url, anonKey)
}
