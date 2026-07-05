'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

export async function resolveRiskFlagAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const flagId = String(formData.get('flagId') ?? '')
  if (!flagId) return

  const { data: flag } = await supabase
    .from('user_risk_flags')
    .select('id, user_id, flag_type, resolved_at')
    .eq('id', flagId)
    .maybeSingle()

  if (!flag || flag.resolved_at) return

  const { error } = await supabase
    .from('user_risk_flags')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', flagId)

  if (error) {
    console.error('Failed to resolve risk flag', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'risk_flag_resolved',
    targetType: 'user_risk_flag',
    targetId: flagId,
    metadata: { flag_type: flag.flag_type, flagged_user_id: flag.user_id },
  })

  revalidatePath('/admin/identity')
}
