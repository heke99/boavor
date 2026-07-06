'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

const STATUSES = ['new', 'in_review', 'completed', 'rejected'] as const

export async function updatePrivacyRequestStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const requestId = String(formData.get('requestId') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!requestId || !STATUSES.includes(status as (typeof STATUSES)[number])) return

  const { data: existing } = await supabase
    .from('privacy_requests')
    .select('id, user_id, request_type, status')
    .eq('id', requestId)
    .maybeSingle()
  if (!existing || existing.status === status) return

  const closing = status === 'completed' || status === 'rejected'
  const { error } = await supabase
    .from('privacy_requests')
    .update({
      status,
      handled_by: closing ? user.id : existing.status === 'new' ? user.id : undefined,
      handled_at: closing ? new Date().toISOString() : null,
    })
    .eq('id', requestId)

  if (error) {
    console.error('Failed to update privacy request', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'privacy_request_status_updated',
    targetType: 'privacy_request',
    targetId: requestId,
    metadata: { previous_status: existing.status, status, request_type: existing.request_type },
  })

  revalidatePath('/admin/privacy')
  revalidatePath('/admin/system')
}
