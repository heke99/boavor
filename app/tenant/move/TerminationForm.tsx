'use client'

import { useActionState } from 'react'
import { requestTermination } from './actions'

export function TerminationForm({ tenancyId }: { tenancyId: string }) {
  const [state, action, pending] = useActionState(requestTermination, {})
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="tenancyId" value={tenancyId} />
      <label className="grid gap-2 text-sm font-semibold">Önskat slutdatum<input required type="date" name="requestedEndDate" className="rounded-xl border border-[#d7dbe7] px-4 py-3" /></label>
      <label className="grid gap-2 text-sm font-semibold">Anledning (valfritt)<textarea name="reason" rows={3} className="rounded-xl border border-[#d7dbe7] px-4 py-3" /></label>
      <p className="text-sm leading-6 text-[#6b7280]">Hyresvärden fastställer contractual slutdatum enligt avtalets uppsägningstid. Bostaden publiceras inte automatiskt.</p>
      {state.error ? <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm font-semibold text-emerald-700">{state.success}</p> : null}
      <button disabled={pending} className="rounded-xl bg-[#111827] px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? 'Registrerar…' : 'Registrera uppsägning'}</button>
    </form>
  )
}

