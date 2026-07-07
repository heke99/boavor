'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'
import type { Json } from '@/lib/supabase/database.types'

export async function retryWebhookDeliveryAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const deliveryId = String(formData.get('deliveryId') ?? '')
  if (!deliveryId) return

  const { error } = await supabase
    .from('webhook_deliveries')
    .update({ status: 'pending', next_attempt_at: new Date().toISOString(), last_error: null })
    .eq('id', deliveryId)
    .eq('status', 'dead')

  if (error) {
    console.error('Failed to requeue webhook delivery', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'webhook_delivery_requeued',
    targetType: 'webhook_delivery',
    targetId: deliveryId,
  })

  revalidatePath('/admin/ops')
}

export async function resolveIntegrationFailureAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()
  const failureId = String(formData.get('failureId') ?? '')
  if (!failureId) return

  const { error } = await supabase
    .from('integration_failures')
    .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', failureId)

  if (error) {
    console.error('Failed to resolve integration failure', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'integration_failure_resolved',
    targetType: 'integration_failure',
    targetId: failureId,
  })

  revalidatePath('/admin/ops')
}

export async function createIncidentAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const title = String(formData.get('title') ?? '').trim()
  const severity = String(formData.get('severity') ?? 'minor')
  const description = String(formData.get('description') ?? '').trim() || null
  if (!title || !['minor', 'major', 'critical'].includes(severity)) return

  const { data } = await supabase
    .from('incident_reports')
    .insert({ title, severity, description, created_by: user.id })
    .select('id')
    .maybeSingle()

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'incident_created',
    targetType: 'incident',
    targetId: data?.id ?? null,
    metadata: { title, severity },
  })

  revalidatePath('/admin/ops')
}

export async function updateIncidentStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const incidentId = String(formData.get('incidentId') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!incidentId || !['open', 'monitoring', 'resolved'].includes(status)) return

  await supabase
    .from('incident_reports')
    .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', incidentId)

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'incident_status_updated',
    targetType: 'incident',
    targetId: incidentId,
    metadata: { status },
  })

  revalidatePath('/admin/ops')
}

export async function setMaintenanceModeAction(formData: FormData) {
  const { supabase, user, role } = await requireAdminUser()
  if (role !== 'super_admin') redirect('/admin/ops?error=super_admin_required')

  const enabled = String(formData.get('enabled') ?? 'false') === 'true'
  const message = String(formData.get('message') ?? '').trim()

  const value: Json = { enabled, message }
  const { error } = await supabase
    .from('platform_settings')
    .update({ value, updated_by: user.id })
    .eq('key', 'maintenance_mode')

  if (error) {
    console.error('Failed to toggle maintenance mode', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: enabled ? 'maintenance_mode_enabled' : 'maintenance_mode_disabled',
    targetType: 'platform_setting',
    targetId: 'maintenance_mode',
    metadata: { message },
  })

  revalidatePath('/admin/ops')
  revalidatePath('/')
}
