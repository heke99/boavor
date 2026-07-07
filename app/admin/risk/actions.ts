'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

export async function createRiskFlagAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const userId = String(formData.get('userId') ?? '').trim()
  const flagType = String(formData.get('flagType') ?? '').trim()
  const severity = String(formData.get('severity') ?? 'medium')
  const note = String(formData.get('note') ?? '').trim() || null

  if (!userId || !flagType || !SEVERITIES.includes(severity as (typeof SEVERITIES)[number])) return

  const { data, error } = await supabase
    .from('user_risk_flags')
    .insert({ user_id: userId, flag_type: flagType, severity, note, created_by: user.id })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Failed to create risk flag', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'risk_flag_created',
    targetType: 'user_risk_flag',
    targetId: data?.id ?? null,
    metadata: { flagged_user_id: userId, flag_type: flagType, severity },
  })

  revalidatePath('/admin/risk')
  revalidatePath('/admin/identity')
}

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
    metadata: { flagged_user_id: flag.user_id, flag_type: flag.flag_type },
  })

  revalidatePath('/admin/risk')
  revalidatePath('/admin/identity')
}
