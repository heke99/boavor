import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

/**
 * Shared rule fields for the policy create/edit forms. Server actions build
 * versioned policy_rules from these fields.
 */
export function PolicyRuleFormFields({ idPrefix }: { idPrefix: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Minsta månadsinkomst (kr)</label>
        <Input name="minIncome" type="number" min={0} placeholder="T.ex. 25000" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Inkomst som multipel av hyran</label>
        <Input name="incomeMultiplier" type="number" min={0} step="0.5" placeholder="T.ex. 3" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Max hushållsstorlek</label>
        <Input name="maxHouseholdSize" type="number" min={0} placeholder="T.ex. 4" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Min hushållsstorlek</label>
        <Input name="minHouseholdSize" type="number" min={0} placeholder="Lämna tomt för inget krav" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Husdjur</label>
        <Select name="petsAllowed" defaultValue="true">
          <option value="true">Tillåtna</option>
          <option value="false">Ej tillåtna</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Rökning</label>
        <Select name="smokingAllowed" defaultValue="false">
          <option value="false">Ej tillåten</option>
          <option value="true">Tillåten</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Borgensman</label>
        <Select name="guarantorAllowed" defaultValue="true">
          <option value="true">Accepteras</option>
          <option value="false">Accepteras ej</option>
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-[#6b7280]">Egen fråga till sökande (valfritt)</label>
        <Input name="customQuestion" placeholder="T.ex. Beskriv ditt nuvarande boende" />
      </div>

      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-xs font-semibold text-[#6b7280]">Accepterade sysselsättningsformer (tomt = alla)</legend>
        <div className="flex flex-wrap gap-3">
          {[
            ['employed', 'Anställd'],
            ['self_employed', 'Egenföretagare'],
            ['student', 'Student'],
            ['retired', 'Pensionär'],
          ].map(([value, label]) => (
            <label key={`${idPrefix}-emp-${value}`} className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
              <input type="checkbox" name="employmentTypes" value={value} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="md:col-span-2">
        <legend className="mb-2 text-xs font-semibold text-[#6b7280]">Dokumentkrav</legend>
        <div className="flex flex-wrap gap-3">
          {[
            ['income_proof', 'Inkomstintyg'],
            ['employment_certificate', 'Anställningsintyg'],
            ['student_certificate', 'Studieintyg'],
            ['reference', 'Referens'],
          ].map(([value, label]) => (
            <label key={`${idPrefix}-doc-${value}`} className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
              <input type="checkbox" name="requiredDocuments" value={value} />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
            <input type="checkbox" name="registerExtractRequired" />
            Registerutdrag krävs
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3 md:col-span-2">
        <label className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
          <input type="checkbox" name="noActiveDebt" />
          Inga aktiva skulder (kontrolleras via extern part)
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
          <input type="checkbox" name="studentOnly" />
          Endast studenter
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
          <input type="checkbox" name="seniorOnly" />
          Endast seniorer, min ålder:
          <Input name="seniorMinAge" type="number" min={50} defaultValue={55} className="h-8 w-20 rounded-xl px-2 py-1" />
        </label>
      </div>
    </div>
  )
}
