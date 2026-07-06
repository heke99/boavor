'use client'

import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { ASSUMPTIONS, calculateRoi, type RoiInput } from '@/lib/sales/roi'
import { submitSalesLeadAction } from '@/app/hyresvardar/actions'

const inputClass =
  'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition focus:border-[#5b3df5]'

function formatSek(value: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value)
}

/** Interactive ROI estimate + lead capture for the landlord sales funnel. */
export function RoiCalculator() {
  const [roiInput, setRoiInput] = useState<RoiInput>({
    units: 100,
    averageRent: 9000,
    turnoverRate: 0.15,
    adminHoursPerLetting: 6,
    hourlyCost: 450,
  })
  const [lead, setLead] = useState({ companyName: '', contactName: '', email: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const result = useMemo(() => calculateRoi(roiInput), [roiInput])

  const updateNumber = (field: keyof RoiInput) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setRoiInput((current) => ({ ...current, [field]: Number(event.target.value) || 0 }))
  }

  async function submitLead(event: React.FormEvent) {
    event.preventDefault()
    setStatus('sending')
    const response = await submitSalesLeadAction({
      ...lead,
      unitsCount: roiInput.units,
      source: 'roi_calculator',
      roiInput,
    })
    if (response.ok) {
      setStatus('sent')
    } else {
      setErrorMessage(response.error)
      setStatus('error')
    }
  }

  return (
    <div className="rounded-[36px] border border-[#e5e7eb] bg-white p-6 shadow-[0_22px_70px_rgba(15,23,42,0.07)] md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#111827]">Räkna på er besparing</h3>
          <p className="text-sm text-[#6b7280]">Uppskattning baserad på kortare vakans och mindre administration.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Antal lägenheter</span>
          <input type="number" min={0} value={roiInput.units} onChange={updateNumber('units')} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Snitthyra (kr/mån)</span>
          <input type="number" min={0} value={roiInput.averageRent} onChange={updateNumber('averageRent')} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Omflyttning per år (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={Math.round(roiInput.turnoverRate * 100)}
            onChange={(event) => setRoiInput((current) => ({ ...current, turnoverRate: (Number(event.target.value) || 0) / 100 }))}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-[#111827]">Admin-timmar per uthyrning</span>
          <input type="number" min={0} value={roiInput.adminHoursPerLetting} onChange={updateNumber('adminHoursPerLetting')} className={inputClass} />
        </label>
      </div>

      <div className="mt-6 grid gap-3 rounded-3xl bg-[#f7f8fc] p-5 md:grid-cols-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Uthyrningar/år</div>
          <div className="mt-1 text-2xl font-semibold text-[#111827]">{result.lettingsPerYear}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Kortare vakans</div>
          <div className="mt-1 text-2xl font-semibold text-[#111827]">{formatSek(result.vacancySavings)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Mindre admin</div>
          <div className="mt-1 text-2xl font-semibold text-[#111827]">{formatSek(result.adminSavings)}</div>
        </div>
        <div className="md:col-span-3">
          <div className="text-sm font-semibold text-[#111827]">
            Uppskattad besparing: <span className="text-[#5b3df5]">{formatSek(result.totalYearlySavings)} per år</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#6b7280]">
            Antaganden: {ASSUMPTIONS.vacancyDaysSaved} dagar kortare vakans per uthyrning och{' '}
            {Math.round(ASSUMPTIONS.adminTimeSavedShare * 100)} % mindre administrationstid (intern kostnad{' '}
            {formatSek(roiInput.hourlyCost)}/timme). Kalkylen är en uppskattning, inte ett löfte.
          </p>
        </div>
      </div>

      {status === 'sent' ? (
        <div className="mt-6 rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-sm font-semibold text-[#047857]">
          Tack! Vi hör av oss inom kort med en genomgång anpassad för ert bestånd.
        </div>
      ) : (
        <form onSubmit={submitLead} className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            required
            placeholder="Företag"
            value={lead.companyName}
            onChange={(event) => setLead((current) => ({ ...current, companyName: event.target.value }))}
            className={inputClass}
          />
          <input
            required
            placeholder="Namn"
            value={lead.contactName}
            onChange={(event) => setLead((current) => ({ ...current, contactName: event.target.value }))}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="E-post"
            value={lead.email}
            onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-2xl bg-[#5b3df5] px-5 py-3 text-sm font-semibold !text-white transition hover:bg-[#4c31d8] disabled:opacity-60"
          >
            {status === 'sending' ? 'Skickar…' : 'Få kalkylen'}
          </button>
          {status === 'error' ? (
            <p className="text-sm font-semibold text-[#b91c1c] md:col-span-4">{errorMessage}</p>
          ) : null}
        </form>
      )}
    </div>
  )
}
