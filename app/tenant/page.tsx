import { CalendarDays, FileText, Wallet, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TenantShell } from '@/components/tenant/TenantShell'
import { formatMoney, requireTenantPortal } from '@/lib/tenant/portal'

export default async function TenantOverviewPage() {
  const { bundle } = await requireTenantPortal()
  const active = bundle.tenancies.find((item) => ['upcoming', 'active', 'notice_given', 'moving_out'].includes(item.status))
  const outstanding = bundle.invoices.reduce((sum, invoice) => sum + invoice.outstanding_ore, 0)
  const openCases = bundle.maintenance.filter((item) => !['closed', 'cancelled'].includes(item.status)).length

  return (
    <TenantShell activePath="/tenant" title="Min bostad" description="Din canonical boenderelation, ekonomi och service samlad på ett ställe.">
      <div className="grid gap-5 md:grid-cols-4">
        <Card className="p-6"><CalendarDays className="text-[#047857]" size={20} /><div className="mt-3 text-sm text-[#6b7280]">Avtalsstart</div><div className="mt-1 text-xl font-semibold">{active?.starts_on ?? '—'}</div></Card>
        <Card className="p-6"><Wallet className="text-[#047857]" size={20} /><div className="mt-3 text-sm text-[#6b7280]">Att betala</div><div className="mt-1 text-xl font-semibold">{formatMoney(outstanding)}</div></Card>
        <Card className="p-6"><Wrench className="text-[#047857]" size={20} /><div className="mt-3 text-sm text-[#6b7280]">Öppna felanmälningar</div><div className="mt-1 text-xl font-semibold">{openCases}</div></Card>
        <Card className="p-6"><FileText className="text-[#047857]" size={20} /><div className="mt-3 text-sm text-[#6b7280]">Hyresgästnummer</div><div className="mt-1 text-xl font-semibold">{active?.number ?? '—'}</div></Card>
      </div>
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Snabbåtgärder</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button href="/tenant/invoices">Se hyresavier</Button>
          <Button href="/tenant/maintenance" variant="secondary">Skapa felanmälan</Button>
          <Button href="/tenant/move" variant="secondary">Hantera flytt</Button>
        </div>
      </Card>
    </TenantShell>
  )
}

