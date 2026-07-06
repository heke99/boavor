import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { requireAdminUser } from '@/lib/data/admin'
import { createRiskFlagAction, resolveRiskFlagAction } from './actions'

export const dynamic = 'force-dynamic'

const severityStyles: Record<string, string> = {
  low: 'bg-[#f3f4f6] text-[#4b5563]',
  medium: 'bg-[#fff7ed] text-[#9a5b00]',
  high: 'bg-[#fee2e2] text-[#b91c1c]',
  critical: 'bg-[#7f1d1d] text-white',
}

const severityLabels: Record<string, string> = {
  low: 'Låg',
  medium: 'Medel',
  high: 'Hög',
  critical: 'Kritisk',
}

const flagTypeLabels: Record<string, string> = {
  duplicate_identity: 'Dubblettidentitet',
  multiple_exchange_reports: 'Flera anmälningar (Byta)',
  manual: 'Manuell flagga',
}

function formatDateTime(value: string | null) {
  if (!value) return '–'
  return new Date(value).toLocaleString('sv-SE')
}

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

export default async function AdminRiskPage() {
  const { supabase } = await requireAdminUser()

  const { data: flags } = await supabase
    .from('user_risk_flags')
    .select('id, user_id, flag_type, severity, note, metadata, created_by, resolved_at, resolved_by, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const openFlags = (flags ?? []).filter((flag) => !flag.resolved_at)
  const resolvedFlags = (flags ?? []).filter((flag) => flag.resolved_at)

  return (
    <AdminShell
      activePath="/admin/risk"
      title="Riskflaggor"
      description="Interna riskflaggor på användare — automatiska regler (dubblettidentitet, upprepade anmälningar) och manuella flaggor. Användare ser aldrig sina flaggor."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna flaggor</div>
          <div className="mt-2 text-3xl font-semibold text-[#b91c1c]">{openFlags.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Hög/kritisk</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">
            {openFlags.filter((flag) => flag.severity === 'high' || flag.severity === 'critical').length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Åtgärdade (senaste 200)</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{resolvedFlags.length}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Skapa manuell flagga</h2>
        <form action={createRiskFlagAction} className="mt-5 grid gap-4 md:grid-cols-[1fr_200px_160px]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Användar-ID (uuid) *</span>
            <input name="userId" required className={inputClass} placeholder="00000000-0000-0000-0000-000000000000" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Typ *</span>
            <input name="flagType" required maxLength={60} className={inputClass} placeholder="T.ex. suspected_fraud" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Allvarlighet</span>
            <select name="severity" className={inputClass} defaultValue="medium">
              <option value="low">Låg</option>
              <option value="medium">Medel</option>
              <option value="high">Hög</option>
              <option value="critical">Kritisk</option>
            </select>
          </label>
          <label className="block md:col-span-3">
            <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Notering</span>
            <input name="note" maxLength={300} className={inputClass} placeholder="Intern motivering (loggas)" />
          </label>
          <div className="md:col-span-3">
            <Button type="submit">Skapa flagga</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Öppna flaggor</h2>
        {openFlags.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga öppna riskflaggor.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {openFlags.map((flag) => (
              <div key={flag.id} className="rounded-2xl border border-[#e8ebf3] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[flag.severity] ?? severityStyles.medium}`}>
                        {severityLabels[flag.severity] ?? flag.severity}
                      </span>
                      <span className="font-semibold text-[#111827]">{flagTypeLabels[flag.flag_type] ?? flag.flag_type}</span>
                      <span className="text-xs text-[#6b7280]">
                        Användare {flag.user_id.slice(0, 8)}… · {formatDateTime(flag.created_at)}
                      </span>
                    </div>
                    {flag.note ? <p className="mt-2 max-w-3xl text-sm text-[#374151]">{flag.note}</p> : null}
                  </div>
                  <form action={resolveRiskFlagAction}>
                    <input type="hidden" name="flagId" value={flag.id} />
                    <Button type="submit" variant="ghost" className="h-9 px-3 text-xs">Markera åtgärdad</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Åtgärdade flaggor</h2>
        {resolvedFlags.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b7280]">Inga åtgärdade flaggor ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e8ebf3]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f7f8fc] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                <tr>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Allvarlighet</th>
                  <th className="px-4 py-3">Användare</th>
                  <th className="px-4 py-3">Skapad</th>
                  <th className="px-4 py-3">Åtgärdad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ebf3]">
                {resolvedFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-4 py-3 font-semibold text-[#111827]">{flagTypeLabels[flag.flag_type] ?? flag.flag_type}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{severityLabels[flag.severity] ?? flag.severity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{flag.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDateTime(flag.created_at)}</td>
                    <td className="px-4 py-3 text-[#6b7280]">{formatDateTime(flag.resolved_at)}</td>
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
