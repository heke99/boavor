import { Card } from '@/components/ui/Card'
import { TenantShell } from '@/components/tenant/TenantShell'
import { requireTenantPortal } from '@/lib/tenant/portal'
import { TerminationForm } from './TerminationForm'

export default async function TenantMovePage() {
  const { bundle } = await requireTenantPortal()
  const active = bundle.tenancies.find((item) => item.status === 'active')
  return (
    <TenantShell activePath="/tenant/move" title="Inflyttning & utflyttning" description="Flyttflöden är kopplade till ditt signerade avtal och din canonical boenderelation.">
      <Card className="p-6"><h2 className="text-xl font-semibold">Uppsägning</h2>{bundle.terminations.length > 0 ? <div className="mt-4 space-y-3">{bundle.terminations.map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f8fc] p-4"><div className="font-semibold">{item.number}</div><div className="mt-1 text-sm text-[#6b7280]">Status: {item.status} · önskat slutdatum {item.requested_end_date}</div></div>)}</div> : active ? <div className="mt-5"><TerminationForm tenancyId={active.id} /></div> : <p className="mt-3 text-sm text-[#6b7280]">Inget aktivt avtal kan sägas upp.</p>}</Card>
    </TenantShell>
  )
}
