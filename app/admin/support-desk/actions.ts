'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminUser } from '@/lib/data/admin'
import { logAdminAudit } from '@/lib/auth/permissions'

const STATUSES = ['new', 'open', 'waiting_on_user', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const

export async function staffReplyAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const ticketId = String(formData.get('ticketId') ?? '')
  const macroId = String(formData.get('macroId') ?? '')
  let body = String(formData.get('body') ?? '').trim()

  if (!ticketId) return

  // Empty reply + selected macro = send the macro text.
  if (!body && macroId) {
    const { data: macro } = await supabase
      .from('support_macros')
      .select('body')
      .eq('id', macroId)
      .eq('is_active', true)
      .maybeSingle()
    body = macro?.body?.trim() ?? ''
  }
  if (!body) return

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, user_id, first_response_at')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket) return

  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    sender_user_id: user.id,
    is_staff: true,
    body,
  })
  if (error) {
    console.error('Failed to send staff reply', error)
    return
  }

  await supabase
    .from('support_tickets')
    .update({
      status: 'waiting_on_user',
      first_response_at: ticket.first_response_at ?? new Date().toISOString(),
      assigned_to: user.id,
    })
    .eq('id', ticketId)

  // In-platform notification for the user.
  await supabase.from('notifications').insert({
    user_id: ticket.user_id,
    title: 'Svar från supporten',
    body: 'Ditt supportärende har fått ett svar.',
  })

  revalidatePath(`/admin/support-desk/${ticketId}`)
  revalidatePath('/admin/support-desk')
}

export async function updateTicketAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const ticketId = String(formData.get('ticketId') ?? '')
  const status = String(formData.get('status') ?? '')
  const priority = String(formData.get('priority') ?? '')
  const assignToMe = formData.get('assignToMe') === 'on'
  if (!ticketId) return

  const updates: {
    status?: string
    resolved_at?: string
    priority?: string
    assigned_to?: string
  } = {}
  if (STATUSES.includes(status as (typeof STATUSES)[number])) {
    updates.status = status
    if (status === 'resolved') updates.resolved_at = new Date().toISOString()
  }
  if (PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) updates.priority = priority
  if (assignToMe) updates.assigned_to = user.id
  if (Object.keys(updates).length === 0) return

  const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId)
  if (error) {
    console.error('Failed to update ticket', error)
    return
  }

  await logAdminAudit(supabase, {
    adminUserId: user.id,
    action: 'support_ticket_updated',
    targetType: 'support_ticket',
    targetId: ticketId,
    metadata: { ...updates },
  })

  revalidatePath(`/admin/support-desk/${ticketId}`)
  revalidatePath('/admin/support-desk')
}

export async function createMacroAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser()

  const title = String(formData.get('title') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  if (!title || !body) return

  await supabase.from('support_macros').insert({ title, body, created_by: user.id })
  revalidatePath('/admin/support-desk')
}

export async function toggleMacroAction(formData: FormData) {
  const { supabase } = await requireAdminUser()
  const macroId = String(formData.get('macroId') ?? '')
  const nextActive = String(formData.get('nextActive') ?? 'false') === 'true'
  if (!macroId) return

  await supabase.from('support_macros').update({ is_active: nextActive }).eq('id', macroId)
  revalidatePath('/admin/support-desk')
}
