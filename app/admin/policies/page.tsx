import { AdminShell } from '@/components/admin/AdminShell'
import { Card } from '@/components/ui/Card'
import { requireAdminUser } from '@/lib/data/admin'

export const dynamic = 'force-dynamic'

const RESULT_LABELS: Record<string, string> = {
  eligible: 'Uppfyller krav',
  likely_eligible: 'Uppfyller troligen',
  missing_info: 'Uppgifter saknas',
  not_eligible: 'Uppfyller ej',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default async function AdminPoliciesPage() {
  const { supabase } = await requireAdminUser()

  const [{ data: policies }, { data: evaluations }] = await Promise.all([
    supabase
      .from('landlord_policies')
      .select('id, name, current_version, is_default, company_id, owner_user_id, created_at, policy_rules(id, version, rule_type)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('policy_evaluations')
      .select('id, listing_id, user_id, context, result, policy_id, policy_version, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <AdminShell
      activePath="/admin/policies"
      title="Policyer och Matchkoll"
      description="Inspektera hyresvärdarnas uthyrningspolicyer och de senaste Matchkoll-utvärderingarna."
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Policyer ({(policies ?? []).length})</h2>
        {(policies ?? []).length === 0 ? (
          <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga policyer skapade ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-3 pr-4">Namn</th>
                  <th className="py-3 pr-4">Ägare</th>
                  <th className="py-3 pr-4">Version</th>
                  <th className="py-3 pr-4">Regler (aktuell version)</th>
                  <th className="py-3">Skapad</th>
                </tr>
              </thead>
              <tbody>
                {(policies ?? []).map((policy) => {
                  const currentRules = (policy.policy_rules ?? []).filter((rule) => rule.version === policy.current_version)
                  return (
                    <tr key={policy.id} className="border-b border-[#f4f5fa]">
                      <td className="py-3 pr-4 font-semibold text-[#111827]">{policy.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {policy.company_id ? `Företag ${policy.company_id.slice(0, 8)}…` : `Användare ${(policy.owner_user_id ?? '').slice(0, 8)}…`}
                      </td>
                      <td className="py-3 pr-4">{policy.current_version}</td>
                      <td className="py-3 pr-4">{currentRules.length} st</td>
                      <td className="py-3">{formatDateTime(policy.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Senaste Matchkoll-körningar</h2>
        {(evaluations ?? []).length === 0 ? (
          <p className="mt-5 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">Inga utvärderingar ännu.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-[#eef0f6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  <th className="py-3 pr-4">Resultat</th>
                  <th className="py-3 pr-4">Kontext</th>
                  <th className="py-3 pr-4">Användare</th>
                  <th className="py-3 pr-4">Policy</th>
                  <th className="py-3">Tidpunkt</th>
                </tr>
              </thead>
              <tbody>
                {(evaluations ?? []).map((evaluation) => (
                  <tr key={evaluation.id} className="border-b border-[#f4f5fa]">
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          evaluation.result === 'eligible'
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : evaluation.result === 'likely_eligible'
                              ? 'bg-[#dbeafe] text-[#1d4ed8]'
                              : evaluation.result === 'missing_info'
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-[#fee2e2] text-[#b91c1c]'
                        }`}
                      >
                        {RESULT_LABELS[evaluation.result] ?? evaluation.result}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{evaluation.context === 'application' ? 'Ansökan' : 'Förhandskoll'}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{evaluation.user_id.slice(0, 8)}…</td>
                    <td className="py-3 pr-4">
                      {evaluation.policy_id ? `v${evaluation.policy_version}` : 'Annonskrav'}
                    </td>
                    <td className="py-3">{formatDateTime(evaluation.created_at)}</td>
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
