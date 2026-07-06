import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { updateSalesLeadAction } from './actions'

export const dynamic = 'force-dynamic'

const STATUS_COLUMNS = [
  { value: 'new', label: 'Nya' },
  { value: 'contacted', label: 'Kontaktade' },
  { value: 'demo', label: 'Demo bokad' },
  { value: 'negotiation', label: 'Förhandling' },
  { value: 'won', label: 'Vunna' },
  { value: 'lost', label: 'Förlorade' },
] as const

const sourceLabels: Record<string, string> = {
  roi_calculator: 'ROI-kalkylen',
  demo_request: 'Demobokning',
  contact_form: 'Kontaktformulär',
}

export default async function AdminSalesPage() {
  const { supabase } = await requireAdminUser()

  const { data: leads } = await supabase
    .from('sales_leads')
    .select('id, company_name, contact_name, email, phone, city, units_count, message, source, roi_snapshot, status, internal_note, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const byStatus = new Map<string, NonNullable<typeof leads>>()
  for (const column of STATUS_COLUMNS) byStatus.set(column.value, [])
  for (const lead of leads ?? []) {
    byStatus.get(lead.status)?.push(lead)
  }

  return (
    <AdminShell
      activePath="/admin/sales"
      title="Säljtavla"
      description="Leads från hyresvärdsfunneln (ROI-kalkyl, demobokningar, kontakt). Helt separerad från sökandedata."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna leads</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {(leads ?? []).filter((lead) => !['won', 'lost'].includes(lead.status)).length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Vunna</div>
          <div className="mt-2 text-3xl font-semibold text-[#047857]">{byStatus.get('won')?.length ?? 0}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Potentiella lägenheter</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {(leads ?? [])
              .filter((lead) => !['won', 'lost'].includes(lead.status))
              .reduce((sum, lead) => sum + (lead.units_count ?? 0), 0)}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {STATUS_COLUMNS.map((column) => {
          const columnLeads = byStatus.get(column.value) ?? []
          return (
            <Card key={column.value} className="p-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#6b7280]">{column.label}</h2>
                <span className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-semibold text-[#4b5563]">
                  {columnLeads.length}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {columnLeads.length === 0 ? (
                  <p className="px-1 py-3 text-xs text-[#9ca3af]">Inga leads.</p>
                ) : (
                  columnLeads.map((lead) => (
                    <div key={lead.id} className="rounded-2xl border border-[#e8ebf3] p-3">
                      <div className="font-semibold text-[#111827]">{lead.company_name}</div>
                      <div className="mt-1 text-xs text-[#6b7280]">
                        {lead.contact_name} · {lead.email}
                        {lead.units_count ? ` · ${lead.units_count} lgh` : ''}
                      </div>
                      <div className="mt-1 text-xs text-[#6b7280]">
                        {sourceLabels[lead.source] ?? lead.source} · {new Date(lead.created_at).toLocaleDateString('sv-SE')}
                      </div>
                      {lead.message ? <p className="mt-2 text-xs leading-5 text-[#374151]">{lead.message.slice(0, 160)}</p> : null}
                      {lead.internal_note ? (
                        <p className="mt-2 rounded-xl bg-[#fffbeb] p-2 text-xs leading-5 text-[#78350f]">{lead.internal_note}</p>
                      ) : null}
                      <form action={updateSalesLeadAction} className="mt-3 space-y-2">
                        <input type="hidden" name="leadId" value={lead.id} />
                        <div className="flex gap-2">
                          <select
                            name="status"
                            defaultValue={lead.status}
                            className="w-full rounded-xl border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs text-[#111827]"
                          >
                            {STATUS_COLUMNS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" variant="ghost" className="h-8 shrink-0 px-3 text-xs">
                            Spara
                          </Button>
                        </div>
                        <input
                          name="note"
                          placeholder="Intern notering…"
                          className="w-full rounded-xl border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs text-[#111827]"
                        />
                      </form>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </AdminShell>
  )
}
