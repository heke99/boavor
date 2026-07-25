import { Card } from '@/components/ui/Card'
import { TenantShell } from '@/components/tenant/TenantShell'
import { formatMoney, requireTenantPortal } from '@/lib/tenant/portal'

const LABELS: Record<string, string> = {
  draft: 'Utkast',
  issued: 'Utfärdad',
  partially_paid: 'Delbetald',
  paid: 'Betald',
  overdue: 'Förfallen',
  credited: 'Krediterad',
  cancelled: 'Makulerad',
}

export default async function TenantInvoicesPage() {
  const { bundle } = await requireTenantPortal()
  return (
    <TenantShell activePath="/tenant/invoices" title="Hyresavier" description="Hyresvärdens reskontra visas separat från Bovaros abonnemangsfakturering.">
      <Card className="overflow-hidden">
        <div className="divide-y divide-[#eef0f6]">
          {bundle.invoices.map((invoice) => (
            <div key={invoice.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div><div className="font-semibold">{invoice.number}</div><div className="text-sm text-[#6b7280]">Förfaller {invoice.due_date}</div></div>
              <div className="text-sm font-semibold">{LABELS[invoice.status] ?? invoice.status}</div>
              <div className="text-sm">Betalt {formatMoney(invoice.paid_ore)}</div>
              <div className="font-semibold">{formatMoney(invoice.outstanding_ore)}</div>
            </div>
          ))}
          {bundle.invoices.length === 0 ? <p className="p-6 text-sm text-[#6b7280]">Inga hyresavier har publicerats ännu.</p> : null}
        </div>
      </Card>
    </TenantShell>
  )
}

