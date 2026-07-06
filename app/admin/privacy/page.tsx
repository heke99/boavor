import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { updatePrivacyRequestStatusAction } from './actions'

export const dynamic = 'force-dynamic'

const typeLabels: Record<string, string> = {
  export: 'Registerutdrag (export)',
  rectification: 'Rättelse',
  erasure: 'Radering',
  restriction: 'Begränsning',
}

const statusLabels: Record<string, string> = {
  new: 'Ny',
  in_review: 'Under handläggning',
  completed: 'Slutförd',
  rejected: 'Avslagen',
}

const statusStyles: Record<string, string> = {
  new: 'bg-[#fee2e2] text-[#b91c1c]',
  in_review: 'bg-[#fff7ed] text-[#9a5b00]',
  completed: 'bg-[#ecfdf5] text-[#047857]',
  rejected: 'bg-[#f3f4f6] text-[#6b7280]',
}

function formatDateTime(value: string | null) {
  if (!value) return '–'
  return new Date(value).toLocaleString('sv-SE')
}

export default async function AdminPrivacyPage() {
  const { supabase } = await requireAdminUser()

  const { data: requests } = await supabase
    .from('privacy_requests')
    .select('id, user_id, request_type, status, message, handled_by, handled_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const open = (requests ?? []).filter((request) => request.status === 'new' || request.status === 'in_review')
  const closed = (requests ?? []).filter((request) => request.status === 'completed' || request.status === 'rejected')

  return (
    <AdminShell
      activePath="/admin/privacy"
      title="GDPR-ärenden"
      description="Handlägg dataskyddsförfrågningar: registerutdrag, rättelse, radering och begränsning. Alla statusändringar granskningsloggas."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna ärenden</div>
          <div className="mt-2 text-3xl font-semibold text-[#b91c1c]">{open.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Raderingsärenden öppna</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {open.filter((request) => request.request_type === 'erasure').length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Avslutade (senaste 200)</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{closed.length}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Öppna ärenden</h2>
        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
          Export och radering kräver manuell hantering (datauttag respektive kontoborttagning via Supabase) innan
          ärendet markeras som slutfört.
        </p>
        {open.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga öppna GDPR-ärenden.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {open.map((request) => (
              <div key={request.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[request.status]}`}>
                        {statusLabels[request.status] ?? request.status}
                      </span>
                      <span className="font-semibold text-[#111827]">{typeLabels[request.request_type] ?? request.request_type}</span>
                      <span className="text-xs text-[#6b7280]">
                        Användare {request.user_id.slice(0, 8)}… · {formatDateTime(request.created_at)}
                      </span>
                    </div>
                    {request.message ? <p className="mt-2 max-w-3xl text-sm text-[#374151]">{request.message}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {request.status === 'new' ? (
                      <form action={updatePrivacyRequestStatusAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value="in_review" />
                        <Button type="submit" variant="ghost" className="h-9 px-3 text-xs">Börja handlägga</Button>
                      </form>
                    ) : null}
                    <form action={updatePrivacyRequestStatusAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="status" value="completed" />
                      <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">Markera slutförd</Button>
                    </form>
                    <form action={updatePrivacyRequestStatusAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button type="submit" variant="ghost" className="h-9 px-3 text-xs !text-[#b91c1c]">Avslå</Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Avslutade ärenden</h2>
        {closed.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga avslutade ärenden ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                <tr>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Användare</th>
                  <th className="px-4 py-3">Inkom</th>
                  <th className="px-4 py-3">Avslutad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ebf3]">
                {closed.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3 font-semibold text-[#111827]">{typeLabels[request.request_type] ?? request.request_type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[request.status]}`}>
                        {statusLabels[request.status] ?? request.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{request.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDateTime(request.created_at)}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDateTime(request.handled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminShell>
  )
}
