import Link from 'next/link'
import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { slaState, type TicketPriority } from '@/lib/support/sla'
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '@/lib/support/labels'
import { createMacroAction, toggleMacroAction } from './actions'

export const dynamic = 'force-dynamic'

const slaBadges: Record<string, { label: string; className: string }> = {
  met: { label: 'SLA uppfyllt', className: 'bg-[#ecfdf5] text-[#047857]' },
  on_track: { label: 'Inom SLA', className: 'bg-[#eef2ff] text-[#243b8f]' },
  at_risk: { label: 'SLA-risk', className: 'bg-[#fff7ed] text-[#9a5b00]' },
  breached: { label: 'SLA brutet', className: 'bg-[#fee2e2] text-[#b91c1c]' },
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminSupportDeskPage() {
  const { supabase } = await requireAdminUser()

  const [{ data: tickets }, { data: macros }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, user_id, subject, category, priority, status, sla_due_at, first_response_at, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('support_macros').select('id, title, body, is_active, created_at').order('created_at', { ascending: false }),
  ])

  // Captured once per request so the render stays idempotent.
  const renderedAt = new Date()
  const openTickets = (tickets ?? []).filter((ticket) => !['resolved', 'closed'].includes(ticket.status))
  const closedTickets = (tickets ?? []).filter((ticket) => ['resolved', 'closed'].includes(ticket.status))

  const withSla = (ticket: (typeof openTickets)[number]) =>
    slaState({
      priority: ticket.priority as TicketPriority,
      createdAt: new Date(ticket.created_at),
      firstResponseAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
      now: renderedAt,
    })

  return (
    <AdminShell
      activePath="/admin/support-desk"
      title="Ärenden (support desk)"
      description="Supportärenden med SLA-uppföljning, snabbsvar (makron) och statusflöde."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna ärenden</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{openTickets.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">SLA-risk eller brutet</div>
          <div className="mt-2 text-3xl font-semibold text-[#b91c1c]">
            {openTickets.filter((ticket) => ['at_risk', 'breached'].includes(withSla(ticket))).length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Avslutade (senaste 200)</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{closedTickets.length}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Öppna ärenden</h2>
        {openTickets.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga öppna ärenden.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {openTickets.map((ticket) => {
              const sla = slaBadges[withSla(ticket)]
              return (
                <Link
                  key={ticket.id}
                  href={`/admin/support-desk/${ticket.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] p-4 transition hover:bg-[#f7f8fc]"
                >
                  <div>
                    <div className="font-semibold text-[#111827]">{ticket.subject}</div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category} · prioritet{' '}
                      {TICKET_PRIORITY_LABELS[ticket.priority] ?? ticket.priority} ·{' '}
                      {new Date(ticket.created_at).toLocaleString('sv-SE')}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sla.className}`}>{sla.label}</span>
                    <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#4b5563]">
                      {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Makron (snabbsvar)</h2>
        <form action={createMacroAction} className="mt-5 grid gap-4 md:grid-cols-[240px_1fr_auto]">
          <input name="title" required maxLength={80} className={inputClass} placeholder="Titel, t.ex. Välkomstsvar" />
          <input name="body" required maxLength={2000} className={inputClass} placeholder="Svarstext…" />
          <Button type="submit" variant="secondary">Skapa makro</Button>
        </form>
        {!macros?.length ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga makron ännu.</p>
        ) : (
          <div className="mt-5 space-y-2">
            {macros.map((macro) => (
              <div key={macro.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] p-3">
                <div>
                  <span className="font-semibold text-[#111827]">{macro.title}</span>
                  <p className="mt-1 max-w-2xl text-xs text-[#6b7280]">{macro.body.slice(0, 140)}{macro.body.length > 140 ? '…' : ''}</p>
                </div>
                <form action={toggleMacroAction}>
                  <input type="hidden" name="macroId" value={macro.id} />
                  <input type="hidden" name="nextActive" value={macro.is_active ? 'false' : 'true'} />
                  <Button type="submit" variant="ghost" className="h-8 px-3 text-xs">
                    {macro.is_active ? 'Inaktivera' : 'Aktivera'}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>

      {closedTickets.length > 0 ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-[#111827]">Avslutade ärenden</h2>
          <div className="mt-5 space-y-2">
            {closedTickets.slice(0, 30).map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/support-desk/${ticket.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] p-3 text-sm transition hover:bg-[#f7f8fc]"
              >
                <span className="font-semibold text-[#111827]">{ticket.subject}</span>
                <span className="text-xs text-[#6b7280]">{new Date(ticket.updated_at).toLocaleDateString('sv-SE')}</span>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}
    </AdminShell>
  )
}
