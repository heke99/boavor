'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

export async function resolveExchangeReportAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const reportId = String(formData.get('reportId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (!reportId || !['reviewed', 'removed'].includes(decision)) return

  const { data: report } = await supabase
    .from('exchange_reports')
    .select('id, profile_id, reason_type')
    .eq('id', reportId)
    .maybeSingle()

  if (!report) return

  await supabase.from('exchange_reports').update({ status: decision }).eq('id', reportId)

  if (decision === 'removed') {
    await supabase.from('exchange_profiles').update({ status: 'removed' }).eq('id', report.profile_id)
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: decision === 'removed' ? 'exchange_profile_removed' : 'exchange_report_reviewed',
    targetType: 'exchange_profile',
    targetId: report.profile_id,
    metadata: { report_id: reportId, reason_type: report.reason_type },
  })

  revalidatePath('/admin/byta')
}
