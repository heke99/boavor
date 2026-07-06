import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthContext } from '@/lib/auth/permissions'
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '@/lib/support/labels'
import { replyToTicketAction } from '../actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ ticketId: string }> }

export default async function TicketDetailPage({ params }: Props) {
  const { ticketId } = await params
  const { supabase } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/support' })

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, created_at')
    .eq('id', ticketId)
    .maybeSingle()

  if (!ticket) notFound()

  const { data: messages } = await supabase
    .from('support_ticket_messages')
    .select('id, is_staff, body, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at')

  const isOpen = ticket.status !== 'closed'

  return (
    <DashboardShell
      activePath="/dashboard/support"
      title={ticket.subject}
      description={`${TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category} · ${ticket.status === 'waiting_on_user' ? 'Väntar på dig' : TICKET_STATUS_LABELS[ticket.status] ?? ticket.status} · skapat ${new Date(ticket.created_at).toLocaleString('sv-SE')}`}
    >
      <Link href="/dashboard/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b3df5]">
        <ArrowLeft size={15} />
        Alla ärenden
      </Link>

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
                <span className="font-semibold text-[#111827]">{message.is_staff ? 'Bovaro support' : 'Du'}</span>
                <span>{new Date(message.created_at).toLocaleString('sv-SE')}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#374151]">{message.body}</p>
            </div>
          ))}
        </div>

        {isOpen ? (
          <form action={replyToTicketAction} className="mt-6 space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea
              name="body"
              required
              rows={4}
              maxLength={4000}
              className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]"
              placeholder="Skriv ditt svar…"
            />
            <Button type="submit">Svara</Button>
          </form>
        ) : (
          <p className="mt-6 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">
            Ärendet är stängt. Skapa ett nytt ärende om du behöver mer hjälp.
          </p>
        )}
      </Card>
    </DashboardShell>
  )
}
