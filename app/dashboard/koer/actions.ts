'use server'

import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth/permissions'

function safeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export async function addExternalQueueAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/koer' })

  const providerId = String(formData.get('providerId') ?? '').trim() || null
  const customName = String(formData.get('customName') ?? '').trim() || null
  if (!providerId && !customName) return

  const { data: membership, error } = await supabase
    .from('external_queue_memberships')
    .insert({
      user_id: user.id,
      provider_id: providerId,
      custom_provider_name: providerId ? null : customName,
      city: String(formData.get('city') ?? '').trim() || null,
      login_url: safeUrl(String(formData.get('loginUrl') ?? '')),
      joined_date: String(formData.get('joinedDate') ?? '').trim() || null,
      current_points: Number(formData.get('currentPoints') ?? 0) || null,
      current_days: Number(formData.get('currentDays') ?? 0) || null,
      renewal_date: String(formData.get('renewalDate') ?? '').trim() || null,
      last_updated_date: new Date().toISOString().slice(0, 10),
      note: String(formData.get('note') ?? '').trim() || null,
    })
    .select('id, renewal_date')
    .single()

  if (error || !membership) {
    console.error('Failed to add external queue', error)
    return
  }

  await supabase.from('external_queue_events').insert({
    membership_id: membership.id,
    user_id: user.id,
    event_type: 'membership_added',
  })

  // Auto-create a renewal reminder two weeks before the renewal date.
  if (membership.renewal_date) {
    const remindAt = new Date(membership.renewal_date)
    remindAt.setDate(remindAt.getDate() - 14)
    await supabase.from('external_queue_reminders').insert({
      membership_id: membership.id,
      user_id: user.id,
      reminder_type: 'renewal',
      remind_at: remindAt.toISOString().slice(0, 10),
    })
  }

  revalidatePath('/dashboard/koer')
}

export async function updateExternalQueueAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/koer' })

  const membershipId = String(formData.get('membershipId') ?? '')
  if (!membershipId) return

  const points = Number(formData.get('currentPoints') ?? 0) || null
  const days = Number(formData.get('currentDays') ?? 0) || null
  const renewalDate = String(formData.get('renewalDate') ?? '').trim() || null

  const { error } = await supabase
    .from('external_queue_memberships')
    .update({
      current_points: points,
      current_days: days,
      renewal_date: renewalDate,
      last_updated_date: new Date().toISOString().slice(0, 10),
      note: String(formData.get('note') ?? '').trim() || null,
    })
    .eq('id', membershipId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to update external queue', error)
    return
  }

  await supabase.from('external_queue_events').insert({
    membership_id: membershipId,
    user_id: user.id,
    event_type: 'membership_updated',
    payload: { points, days },
  })

  // Refresh the renewal reminder when the date changes.
  if (renewalDate) {
    const remindAt = new Date(renewalDate)
    remindAt.setDate(remindAt.getDate() - 14)
    await supabase
      .from('external_queue_reminders')
      .delete()
      .eq('membership_id', membershipId)
      .eq('reminder_type', 'renewal')
      .is('sent_at', null)
    await supabase.from('external_queue_reminders').insert({
      membership_id: membershipId,
      user_id: user.id,
      reminder_type: 'renewal',
      remind_at: remindAt.toISOString().slice(0, 10),
    })
  }

  revalidatePath('/dashboard/koer')
}

export async function removeExternalQueueAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/koer' })
  const membershipId = String(formData.get('membershipId') ?? '')
  if (!membershipId) return

  await supabase.from('external_queue_memberships').delete().eq('id', membershipId).eq('user_id', user.id)
  revalidatePath('/dashboard/koer')
}
