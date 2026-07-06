import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/lib/support/labels'
import { staffReplyAction, updateTicketAction } from '../actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ ticketId: string }> }

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminTicketPage({ params }: Props) {
  const { ticketId } = await params
  const { supabase } = await requireAdminUser()

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, user_id, subject, category, priority, status, sla_due_at, first_response_at, assigned_to, created_at')
    .eq('id', ticketId)
    .maybeSingle()

  if (!ticket) notFound()

  const [{ data: messages }, { data: macros }] = await Promise.all([
    supabase
      .from('support_ticket_messages')
      .select('id, is_staff, body, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at'),
    supabase.from('support_macros').select('id, title').eq('is_active', true).order('title'),
  ])

  return (
    <AdminShell
      activePath="/admin/support-desk"
      title={ticket.subject}
      description={`${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category} · prioritet ${TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority} · SLA ${ticket.sla_due_at ? new Date(ticket.sla_due_at).toLocaleString('sv-SE') : '–'}`}
    >
      <Link href="/admin/support-desk" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b3df5]">
        <ArrowLeft size={15} />
        Alla ärenden
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-6">
          <div className="space-y-4">
            {(messages ?? []).map((message) => (
              <div
                key={message.id}
                className={
                  message.is_staff
                    ? 'rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4'
                    : 'rounded-2xl border border-[#e8ebf3] p-4'
                }
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[#6b7280]">
                  <span className="font-semibold text-[#111827]">{message.is_staff ? 'Support' : 'Användaren'}</span>
                  <span>{new Date(message.created_at).toLocaleString('sv-SE')}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#374151]">{message.body}</p>
              </div>
            ))}
          </div>

          <form action={staffReplyAction} className="mt-6 space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea
              name="body"
              rows={4}
              maxLength={4000}
              className={inputClass}
              placeholder="Skriv ett svar — eller lämna tomt och välj ett makro nedan."
            />
            <div className="flex flex-wrap items-center gap-3">
              <select name="macroId" className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827]" defaultValue="">
                <option value="">Inget makro</option>
                {(macros ?? []).map((macro) => (
                  <option key={macro.id} value={macro.id}>
                    {macro.title}
                  </option>
                ))}
              </select>
              <Button type="submit">Skicka svar</Button>
            </div>
          </form>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Hantering</h2>
          <form action={updateTicketAction} className="mt-4 space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Status</span>
              <select name="status" defaultValue={ticket.status} className={inputClass}>
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Prioritet</span>
              <select name="priority" defaultValue={ticket.priority} className={inputClass}>
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <input type="checkbox" name="assignToMe" className="h-4 w-4 rounded border-[#d1d5db]" />
              Tilldela mig
            </label>
            <Button type="submit" variant="secondary" className="w-full">Uppdatera</Button>
          </form>
          <div className="mt-4 border-t border-[#eef0f6] pt-4 text-xs leading-6 text-[#6b7280]">
            <div>Användare: {ticket.user_id.slice(0, 8)}…</div>
            <div>Skapat: {new Date(ticket.created_at).toLocaleString('sv-SE')}</div>
            <div>Första svar: {ticket.first_response_at ? new Date(ticket.first_response_at).toLocaleString('sv-SE') : 'inte ännu'}</div>
          </div>
        </Card>
      </div>
    </AdminShell>
  )
}
