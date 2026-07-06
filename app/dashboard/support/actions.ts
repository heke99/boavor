'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth/permissions'
import { checkRateLimit } from '@/lib/rate-limit'
import { slaDueAt, type TicketPriority } from '@/lib/support/sla'

const CATEGORIES = ['account', 'application', 'listing', 'billing', 'gdpr', 'technical', 'other'] as const

/** Category → default priority; users never set priority themselves. */
const CATEGORY_PRIORITY: Record<string, TicketPriority> = {
  gdpr: 'high',
  billing: 'high',
  technical: 'normal',
  account: 'normal',
  application: 'normal',
  listing: 'normal',
  other: 'low',
}

export async function createSupportTicketAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/support' })

  const subject = String(formData.get('subject') ?? '').trim()
  const body = String(formData.get('body') ?? '').trim()
  const category = String(formData.get('category') ?? 'other')

  if (!subject || !body) redirect('/dashboard/support?error=fields_required')
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) redirect('/dashboard/support?error=fields_required')

  const allowed = await checkRateLimit(supabase, {
    scope: 'support_ticket',
    subject: user.id,
    limit: 5,
    windowSeconds: 60 * 60,
  })
  if (!allowed) redirect('/dashboard/support?error=rate_limited')

  const priority = CATEGORY_PRIORITY[category] ?? 'normal'
  const now = new Date()

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: user.id,
      subject,
      category,
      priority,
      sla_due_at: slaDueAt(priority, now).toISOString(),
    })
    .select('id')
    .single()

  if (error || !ticket) {
    console.error('Failed to create support ticket', error)
    redirect('/dashboard/support?error=failed')
  }

  await supabase.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    sender_user_id: user.id,
    is_staff: false,
    body,
  })

  revalidatePath('/dashboard/support')
  redirect(`/dashboard/support/${ticket.id}?created=1`)
}

export async function replyToTicketAction(formData: FormData) {
  const { supabase, user } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/support' })

  const ticketId = String(formData.get('ticketId') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!ticketId || !body) return

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, status, user_id')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket || ticket.user_id !== user.id || ticket.status === 'closed') return

  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    sender_user_id: user.id,
    is_staff: false,
    body,
  })
  if (error) {
    console.error('Failed to reply to ticket', error)
    return
  }

  // A user reply reopens tickets waiting on them.
  if (ticket.status === 'waiting_on_user' || ticket.status === 'resolved') {
    await supabase.from('support_tickets').update({ status: 'open' }).eq('id', ticketId)
  }

  revalidatePath(`/dashboard/support/${ticketId}`)
}
