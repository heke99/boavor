import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PolicyRuleFormFields } from '@/components/dashboard/PolicyRuleFormFields'
import { getAuthContext } from '@/lib/auth/permissions'
import { getDashboardProfile } from '@/lib/data/profile'
import { createPolicyAction, deletePolicyAction, updatePolicyRulesAction } from './actions'

export const dynamic = 'force-dynamic'

const RULE_TYPE_LABELS: Record<string, string> = {
  min_income: 'Minsta inkomst',
  income_multiplier: 'Inkomst × hyra',
  accepted_employment_types: 'Sysselsättning',
  no_active_debt: 'Inga skulder',
  max_household_size: 'Max hushåll',
  min_household_size: 'Min hushåll',
  pets_allowed: 'Husdjur',
  smoking_allowed: 'Rökning',
  student_only: 'Endast studenter',
  senior_only: 'Endast seniorer',
  guarantor_allowed: 'Borgensman',
  register_extract_required: 'Registerutdrag',
  required_documents: 'Dokumentkrav',
  custom_question: 'Egen fråga',
}

export default async function PoliciesPage() {
  const { supabase } = await getAuthContext({ loginRedirect: '/login?next=/dashboard/policies' })
  const { profile } = await getDashboardProfile()

  const { data: policies } = await supabase
    .from('landlord_policies')
    .select('id, name, description, current_version, is_default, company_id, owner_user_id, created_at, policy_rules(id, version, rule_type, config)')
    .order('created_at', { ascending: false })

  const companies = profile?.companies ?? []

  return (
    <DashboardShell
      activePath="/dashboard/policies"
      title="Uthyrningspolicyer"
      description="Definiera era krav en gång och återanvänd dem på flera annonser. Matchkoll utvärderar sökande mot policyn automatiskt. Ändringar skapar en ny version — tidigare bedömningar påverkas aldrig."
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Skapa ny policy</h2>
        <form action={createPolicyAction} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Input name="name" placeholder="Policynamn, t.ex. Standardkrav" required />
            <Input name="description" placeholder="Intern beskrivning (valfritt)" />
            <Select name="ownerType" defaultValue="personal">
              <option value="personal">Personlig policy</option>
              {companies.map((company) => (
                <option key={company.companyId} value={`company:${company.companyId}`}>
                  {company.name}
                </option>
              ))}
            </Select>
          </div>
          <PolicyRuleFormFields idPrefix="create" />
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isDefault" />
              Använd som standardpolicy
            </label>
            <Button type="submit">Skapa policy</Button>
          </div>
        </form>
      </Card>

      {(policies ?? []).length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga policyer ännu</h2>
          <p className="mt-3 text-sm text-[#6b7280]">
            Utan policy använder Matchkoll annonsens hyreskrav (inkomst, husdjur, rökning, referenser).
          </p>
        </Card>
      ) : (
        (policies ?? []).map((policy) => {
          const currentRules = (policy.policy_rules ?? []).filter((rule) => rule.version === policy.current_version)
          return (
            <Card key={policy.id} className="p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#111827]">
                    {policy.name}
                    <span className="ml-2 rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">
                      Version {policy.current_version}
                    </span>
                    {policy.is_default ? (
                      <span className="ml-2 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]">Standard</span>
                    ) : null}
                  </h2>
                  {policy.description ? <p className="mt-1 text-sm text-[#6b7280]">{policy.description}</p> : null}
                </div>
                <form action={deletePolicyAction}>
                  <input type="hidden" name="policyId" value={policy.id} />
                  <Button type="submit" variant="ghost" className="h-9 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                    Ta bort (om oanvänd)
                  </Button>
                </form>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {currentRules.length === 0 ? (
                  <span className="text-sm text-[#6b7280]">Inga regler i aktuell version.</span>
                ) : (
                  currentRules.map((rule) => (
                    <span key={rule.id} className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#374151]">
                      {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
                    </span>
                  ))
                )}
              </div>

              <details className="mt-5 rounded-2xl border border-[#e8ebf3] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#5b3df5]">
                  Uppdatera regler (skapar version {policy.current_version + 1})
                </summary>
                <form action={updatePolicyRulesAction} className="mt-4 space-y-5">
                  <input type="hidden" name="policyId" value={policy.id} />
                  <PolicyRuleFormFields idPrefix={policy.id} />
                  <div className="flex justify-end">
                    <Button type="submit">Spara som ny version</Button>
                  </div>
                </form>
              </details>
            </Card>
          )
        })
      )}
    </DashboardShell>
  )
}
