'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

const STATUSES = ['new', 'contacted', 'demo', 'negotiation', 'won', 'lost'] as const

export async function updateSalesLeadAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const leadId = String(formData.get('leadId') ?? '')
  const status = String(formData.get('status') ?? '')
  const note = String(formData.get('note') ?? '').trim()
  const assignToMe = formData.get('assignToMe') === 'on'
  if (!leadId) return

  const updates: { status?: string; internal_note?: string; assigned_to?: string } = {}
  if (STATUSES.includes(status as (typeof STATUSES)[number])) updates.status = status
  if (note) updates.internal_note = note.slice(0, 2000)
  if (assignToMe) updates.assigned_to = user.id
  if (Object.keys(updates).length === 0) return

  const { error } = await supabase.from('sales_leads').update(updates).eq('id', leadId)
  if (error) {
    console.error('Failed to update sales lead', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'sales_lead_updated',
    targetType: 'sales_lead',
    targetId: leadId,
    metadata: { ...updates },
  })

  revalidatePath('/admin/sales')
}
