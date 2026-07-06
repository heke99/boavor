import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { resolveExchangeReportAction } from './actions'

export const dynamic = 'force-dynamic'

const REASON_LABELS: Record<string, string> = {
  fake_ad: 'Falsk annons',
  inappropriate: 'Olämpligt innehåll',
  fraud: 'Misstänkt bedrägeri',
  other: 'Annat',
}

export default async function AdminBytaPage() {
  const { supabase } = await requireAdminUser()

  const [{ data: reports }, { data: profiles }, { data: matches }] = await Promise.all([
    supabase
      .from('exchange_reports')
      .select('id, profile_id, reporter_user_id, reason_type, detail, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('exchange_profiles')
      .select('id, user_id, status, current_city, current_rooms, current_rent, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('exchange_matches').select('id, status, created_at').order('created_at', { ascending: false }).limit(50),
  ])

  const openReports = (reports ?? []).filter((report) => report.status === 'new')

  return (
    <AdminShell
      activePath="/admin/byta"
      title="Bovaro Byta"
      description="Moderering av bytesannonser: anmälningar, annonser och matchningar."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna anmälningar</div>
          <div className="mt-2 text-3xl font-semibold text-[#b91c1c]">{openReports.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Bytesannonser</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{(profiles ?? []).length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Matchningar</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{(matches ?? []).length}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Anmälningar</h2>
        {(reports ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga anmälningar.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {(reports ?? []).map((report) => (
              <div key={report.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]">
                      {REASON_LABELS[report.reason_type] ?? report.reason_type}
                    </span>
                    <span className="ml-2 text-xs text-[#6b7280]">
                      Annons {report.profile_id.slice(0, 8)}… · {new Date(report.created_at).toLocaleString('sv-SE')}
                    </span>
                    {report.detail ? <p className="mt-2 text-sm text-[#374151]">{report.detail}</p> : null}
                  </div>
                  {report.status === 'new' ? (
                    <div className="flex gap-2">
                      <form action={resolveExchangeReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="decision" value="reviewed" />
                        <Button type="submit" variant="secondary" className="h-9 px-3 text-xs">Avfärda</Button>
                      </form>
                      <form action={resolveExchangeReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="decision" value="removed" />
                        <Button type="submit" variant="ghost" className="h-9 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                          Ta bort annonsen
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#6b7280]">
                      {report.status === 'removed' ? 'Annons borttagen' : 'Granskad'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Annonser (senaste 100)</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                <th className="py-2 pr-4">Annons</th>
                <th className="py-2 pr-4">Användare</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Skapad</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile) => (
                <tr key={profile.id} className="border-b border-[#f4f5fa]">
                  <td className="py-2 pr-4 font-semibold text-[#111827]">
                    {profile.current_rooms} rum, {profile.current_city} ({profile.current_rent} kr)
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{profile.user_id.slice(0, 8)}…</td>
                  <td className="py-2 pr-4">{profile.status}</td>
                  <td className="py-2">{new Date(profile.created_at).toLocaleDateString('sv-SE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  )
}
