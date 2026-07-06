'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'
import { clampGrantHours, isValidReason, MAX_GRANT_HOURS } from '@/lib/admin/support-access'

export async function createSupportGrantAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const threadId = String(formData.get('threadId') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()
  const requestedHours = Number(formData.get('hours') ?? 1)

  if (!threadId) redirect('/admin/support?error=thread_required')
  if (!isValidReason(reason)) redirect('/admin/support?error=reason_required')

  // Cap from platform settings (super admin managed), fallback to the code max.
  const { data: setting } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'support_access_max_hours')
    .maybeSingle()
  const maxHours = Number((setting?.value as { hours?: number } | null)?.hours ?? MAX_GRANT_HOURS)
  const hours = clampGrantHours(requestedHours, Number.isFinite(maxHours) ? maxHours : MAX_GRANT_HOURS)

  const { data: grant, error } = await supabase
    .from('support_access_grants')
    .insert({
      admin_user_id: user.id,
      thread_id: threadId,
      reason,
      expires_at: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .maybeSingle()

  if (error || !grant) {
    console.error('Failed to create support grant', error)
    redirect('/admin/support?error=failed')
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'support_access_granted',
    targetType: 'message_thread',
    targetId: threadId,
    metadata: { reason, hours, grant_id: grant.id },
  })

  revalidatePath('/admin/support')
  redirect(`/admin/support/${threadId}`)
}

export async function revokeSupportGrantAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const grantId = String(formData.get('grantId') ?? '')
  if (!grantId) return

  const { data: grant } = await supabase
    .from('support_access_grants')
    .select('id, thread_id, revoked_at')
    .eq('id', grantId)
    .maybeSingle()
  if (!grant || grant.revoked_at) return

  const { error } = await supabase
    .from('support_access_grants')
    .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq('id', grantId)

  if (error) {
    console.error('Failed to revoke support grant', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'support_access_revoked',
    targetType: 'message_thread',
    targetId: grant.thread_id,
    metadata: { grant_id: grantId },
  })

  revalidatePath('/admin/support')
}
