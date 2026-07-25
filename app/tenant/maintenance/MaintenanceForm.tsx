'use client'

import { useActionState } from 'react'
import { createMaintenanceCase } from './actions'

export function MaintenanceForm({ tenancyId }: { tenancyId: string }) {
  const [state, action, pending] = useActionState(createMaintenanceCase, {})
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="tenancyId" value={tenancyId} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">Kategori<input required name="category" className="rounded-xl border border-[#d7dbe7] px-4 py-3" placeholder="Exempel: Vatten och avlopp" /></label>
        <label className="grid gap-2 text-sm font-semibold">Prioritet<select name="urgency" className="rounded-xl border border-[#d7dbe7] px-4 py-3"><option value="normal">Normal</option><option value="high">Hög</option><option value="urgent">Brådskande</option><option value="emergency">Akut</option></select></label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">Rubrik<input required minLength={3} name="title" className="rounded-xl border border-[#d7dbe7] px-4 py-3" /></label>
      <label className="grid gap-2 text-sm font-semibold">Beskrivning<textarea required minLength={10} name="description" rows={5} className="rounded-xl border border-[#d7dbe7] px-4 py-3" /></label>
      <label className="grid gap-2 text-sm font-semibold">Tillträdesinstruktioner<textarea name="accessInstructions" rows={2} className="rounded-xl border border-[#d7dbe7] px-4 py-3" /></label>
      {state.error ? <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p> : null}
      {state.success ? <p role="status" className="text-sm font-semibold text-emerald-700">{state.success}</p> : null}
      <button disabled={pending} className="rounded-xl bg-[#047857] px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? 'Registrerar…' : 'Skicka felanmälan'}</button>
    </form>
  )
}

