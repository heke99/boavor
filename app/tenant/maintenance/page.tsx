import { Card } from '@/components/ui/Card'
import { TenantShell } from '@/components/tenant/TenantShell'
import { requireTenantPortal } from '@/lib/tenant/portal'
import { MaintenanceForm } from './MaintenanceForm'

export default async function TenantMaintenancePage() {
  const { bundle } = await requireTenantPortal()
  const active = bundle.tenancies.find((item) => ['upcoming','active','notice_given','moving_out'].includes(item.status))
  return (
    <TenantShell activePath="/tenant/maintenance" title="Felanmälan" description="Skapa ett spårbart underhållsärende som hyresvärden kan triagera och tilldela.">
      {active ? <Card className="p-6"><h2 className="mb-5 text-xl font-semibold">Ny felanmälan</h2><MaintenanceForm tenancyId={active.id} /></Card> : null}
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Mina ärenden</h2>
        <div className="mt-4 space-y-3">{bundle.maintenance.map((item) => <div key={item.id} className="rounded-2xl border border-[#e8ebf3] p-4"><div className="flex justify-between gap-3"><span className="font-semibold">{item.number} · {item.title}</span><span className="text-sm">{item.status}</span></div><div className="mt-1 text-sm text-[#6b7280]">{item.urgency} · {new Date(item.created_at).toLocaleDateString('sv-SE')}</div></div>)}{bundle.maintenance.length === 0 ? <p className="text-sm text-[#6b7280]">Inga ärenden ännu.</p> : null}</div>
      </Card>
    </TenantShell>
  )
}

