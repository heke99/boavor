'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'

export async function adjustQueuePointsAction(formData: FormData) {
  const { supabase } = await requireAdminUser()

  const userId = String(formData.get('userId') ?? '')
  const delta = Number(formData.get('delta') ?? 0)
  const note = String(formData.get('note') ?? '').trim()
  const joinedAt = String(formData.get('joinedAt') ?? '').trim()

  if (!userId || !Number.isFinite(delta) || !note) return

  const { error } = await supabase.rpc('admin_adjust_queue_points', {
    p_user_id: userId,
    p_delta: Math.trunc(delta),
    p_note: note,
    p_joined_at: joinedAt ? new Date(joinedAt).toISOString() : undefined,
  })

  if (error) {
    console.error('Failed to adjust queue points', error)
  }

  revalidatePath('/admin/queue')
}

export async function setQueueStatusAction(formData: FormData) {
  const { supabase } = await requireAdminUser()

  const userId = String(formData.get('userId') ?? '')
  const status = String(formData.get('status') ?? '')
  const note = String(formData.get('note') ?? '').trim() || null

  if (!userId || !['active', 'paused', 'cancelled', 'expired'].includes(status)) return

  const { error } = await supabase.rpc('admin_set_queue_status', {
    p_user_id: userId,
    p_status: status as 'active' | 'paused' | 'cancelled' | 'expired',
    p_note: note ?? '',
  })

  if (error) {
    console.error('Failed to set queue status', error)
  }

  revalidatePath('/admin/queue')
}
