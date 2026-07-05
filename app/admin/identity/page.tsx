import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { resolveRiskFlagAction } from './actions'
import { getAdminIdentityOverview, getAdminRiskFlags } from '@/lib/data/admin-identity'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pågår',
  verified: 'Verifierad',
  failed: 'Misslyckad',
  expired: 'Utgången',
  cancelled: 'Avbruten',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#fef3c7] text-[#92400e]',
  verified: 'bg-[#dcfce7] text-[#166534]',
  failed: 'bg-[#fee2e2] text-[#b91c1c]',
  expired: 'bg-[#f3f4f6] text-[#6b7280]',
  cancelled: 'bg-[#f3f4f6] text-[#6b7280]',
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default async function AdminIdentityPage() {
  const [verifications, riskFlags] = await Promise.all([getAdminIdentityOverview(), getAdminRiskFlags()])

  const failed = verifications.filter((item) => item.status === 'failed')

  return (
    <AdminShell
      activePath="/admin/identity"
      title="Identitetsverifieringar"
      description="Granska verifieringsstatus och riskflaggor. Känsliga identitetsuppgifter (personnummer, födelsedatum) visas aldrig här."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Verifieringar totalt</div>
          <div className="mt-2 text-3xl font-semibold text-[#111827]">{verifications.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Misslyckade</div>
          <div className="mt-2 text-3xl font-semibold text-[#b91c1c]">{failed.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-[#6b7280]">Öppna riskflaggor</div>
          <div className="mt-2 text-3xl font-semibold text-[#b45309]">
            {riskFlags.filter((flag) => !flag.resolvedAt).length}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Riskflaggor</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Flaggor skapas automatiskt (t.ex. dubblettidentitet) eller manuellt. Åtgärder loggas i audit-loggen.
        </p>
        {riskFlags.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga riskflaggor.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-3 pr-4">Typ</th>
                  <th className="py-3 pr-4">Allvarlighet</th>
                  <th className="py-3 pr-4">Användare</th>
                  <th className="py-3 pr-4">Notering</th>
                  <th className="py-3 pr-4">Skapad</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {riskFlags.map((flag) => (
                  <tr key={flag.id} className="border-b border-[#f4f5fa]">
                    <td className="py-3 pr-4 font-semibold text-[#111827]">{flag.flagType}</td>
                    <td className="py-3 pr-4">{flag.severity}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{flag.userId.slice(0, 8)}…</td>
                    <td className="max-w-[280px] py-3 pr-4 text-[#6b7280]">{flag.note ?? '—'}</td>
                    <td className="py-3 pr-4">{formatDateTime(flag.createdAt)}</td>
                    <td className="py-3 pr-4">
                      {flag.resolvedAt ? (
                        <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">Åtgärdad</span>
                      ) : (
                        <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#92400e]">Öppen</span>
                      )}
                    </td>
                    <td className="py-3">
                      {!flag.resolvedAt ? (
                        <form action={resolveRiskFlagAction}>
                          <input type="hidden" name="flagId" value={flag.id} />
                          <Button type="submit" variant="ghost" className="h-9 border border-black/10 px-3 text-xs">
                            Markera åtgärdad
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Senaste verifieringar</h2>
        {verifications.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga verifieringar ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-3 pr-4">Användare</th>
                  <th className="py-3 pr-4">Leverantör</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">18+</th>
                  <th className="py-3 pr-4">Felorsak</th>
                  <th className="py-3 pr-4">Startad</th>
                  <th className="py-3">Verifierad</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((item) => (
                  <tr key={item.id} className="border-b border-[#f4f5fa]">
                    <td className="py-3 pr-4 font-mono text-xs">{item.userId.slice(0, 8)}…</td>
                    <td className="py-3 pr-4">{item.provider === 'mock' ? 'Mock (test)' : 'BankID'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[item.status] ?? ''}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{item.ageVerified === null ? '—' : item.ageVerified ? 'Ja' : 'Nej'}</td>
                    <td className="max-w-[220px] py-3 pr-4 text-[#6b7280]">{item.failureReason ?? '—'}</td>
                    <td className="py-3 pr-4">{formatDateTime(item.createdAt)}</td>
                    <td className="py-3">{formatDateTime(item.verifiedAt)}</td>
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
