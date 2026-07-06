import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getAuthContext } from '@/lib/auth/permissions'
import { TICKET_STATUS_LABELS } from '@/lib/support/labels'
import { createSupportTicketAction } from './actions'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const errorMessages: Record<string, string> = {
  fields_required: 'Fyll i både ämne och beskrivning.',
  rate_limited: 'Du har skapat för många ärenden på kort tid. Försök igen senare.',
  failed: 'Ärendet kunde inte skapas. Försök igen.',
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function DashboardSupportPage({ searchParams }: Props) {
  const params = await searchParams
  const errorKey = typeof params.error === 'string' ? params.error : null
  const { supabase } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/support' })

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  return (
    <DashboardShell
      activePath="/dashboard/support"
      title="Support"
      description="Skapa supportärenden och följ svaren. Kolla gärna hjälpcentret först — många frågor har redan svar."
    >
      {errorKey && errorMessages[errorKey] ? (
        <Card className="border border-[#fecaca] bg-[#fef2f2] p-5 text-sm font-semibold text-[#b91c1c]">
          {errorMessages[errorKey]}
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[#111827]">Nytt ärende</h2>
          <Link href="/support" className="text-sm font-semibold text-[#5b3df5] underline underline-offset-4">
            Till hjälpcentret →
          </Link>
        </div>
        <form action={createSupportTicketAction} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Ämne *</span>
              <input name="subject" required maxLength={140} className={inputClass} placeholder="Kort beskrivning av problemet" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Kategori</span>
              <select name="category" className={inputClass} defaultValue="other">
                <option value="account">Konto och inloggning</option>
                <option value="application">Ansökningar</option>
                <option value="listing">Annonser</option>
                <option value="billing">Betalning</option>
                <option value="gdpr">Personuppgifter (GDPR)</option>
                <option value="technical">Tekniskt fel</option>
                <option value="other">Övrigt</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Beskrivning *</span>
            <textarea name="body" required rows={4} maxLength={4000} className={inputClass} placeholder="Beskriv vad som hänt och vad du förväntade dig." />
          </label>
          <div>
            <Button type="submit">Skicka ärende</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Mina ärenden</h2>
        {!tickets?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Du har inga supportärenden.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/support/${ticket.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#e8ebf3] p-4 transition hover:bg-[#f7f8fc]"
              >
                <div>
                  <div className="font-semibold text-[#111827]">{ticket.subject}</div>
                  <div className="mt-1 text-sm text-[#6b7280]">
                    Uppdaterat {new Date(ticket.updated_at).toLocaleString('sv-SE')}
                  </div>
                </div>
                <span
                  className={
                    ticket.status === 'waiting_on_user'
                      ? 'rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a5b00]'
                      : ticket.status === 'resolved' || ticket.status === 'closed'
                        ? 'rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]'
                        : 'rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]'
                  }
                >
                  {ticket.status === 'waiting_on_user' ? 'Väntar på dig' : TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  )
}
