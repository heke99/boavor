import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv, hasSupabaseEnv } from '@/lib/supabase/env'

export async function createSupabaseServerClient() {
  if (!hasSupabaseEnv()) return null

  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {},
      remove() {},
    },
  })
}
