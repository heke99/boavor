'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { trackEvent } from '@/lib/analytics/track'
import type { PropertyType, SavedSearchMode } from '@/lib/types'

async function requireUser() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase is not configured.')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('You need to be signed in.')
  return { supabase, user }
}

export async function addFavoriteAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const listingId = String(formData.get('listingId') ?? '')
  if (!listingId) return

  await supabase.from('favorites').upsert({ user_id: user.id, listing_id: listingId }, { onConflict: 'user_id,listing_id' })

  revalidatePath('/dashboard/favorites')
  revalidatePath('/listings')
  revalidatePath('/rent')
  revalidatePath('/buy')
}

export async function removeFavoriteAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const favoriteId = String(formData.get('favoriteId') ?? '')
  if (!favoriteId) return

  await supabase.from('favorites').delete().eq('id', favoriteId).eq('user_id', user.id)
  revalidatePath('/dashboard/favorites')
}

export async function saveSearchAction(formData: FormData) {
  const { supabase, user } = await requireUser()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  await supabase.from('saved_searches').insert({
    user_id: user.id,
    title,
    mode: String(formData.get('mode') ?? 'all') as SavedSearchMode,
    city: String(formData.get('city') ?? '').trim() || null,
    property_type: (String(formData.get('propertyType') ?? '').trim() || null) as PropertyType | null,
    min_rooms: Number(formData.get('minRooms') ?? 0) || null,
    max_price: Number(formData.get('maxPrice') ?? 0) || null,
    notifications_enabled: formData.get('notificationsEnabled') === 'on',
  })

  await trackEvent('saved_search_created')

  revalidatePath('/dashboard/saved-searches')
}

export async function deleteSavedSearchAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('saved_searches').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/dashboard/saved-searches')
}

export async function toggleSavedSearchNotificationsAction(formData: FormData) {
  const { supabase, user } = await requireUser()
  const id = String(formData.get('id') ?? '')
  const nextValue = String(formData.get('nextValue') ?? 'false') === 'true'
  if (!id) return

  await supabase
    .from('saved_searches')
    .update({ notifications_enabled: nextValue })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/dashboard/saved-searches')
}
