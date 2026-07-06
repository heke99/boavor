'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Stores/refreshes the browser's push subscription for the signed-in user. */
export async function savePushSubscriptionAction(input: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false as const }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const }

  if (!input.endpoint?.startsWith('https://') || !input.keys?.p256dh || !input.keys?.auth) {
    return { ok: false as const }
  }

  const headerList = await headers()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      user_agent: headerList.get('user-agent')?.slice(0, 250) ?? null,
      disabled_at: null,
    },
    { onConflict: 'endpoint' },
  )

  if (error) {
    console.error('Failed to save push subscription', error)
    return { ok: false as const }
  }

  revalidatePath('/dashboard/settings')
  return { ok: true as const }
}

export async function removePushSubscriptionAction(endpoint: string) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { ok: false as const }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const }

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  revalidatePath('/dashboard/settings')
  return { ok: true as const }
}
