'use client'

import { useState } from 'react'
import { submitSalesLeadAction } from '@/app/hyresvardar/actions'

const inputClass =
  'w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-white/50'

/** Demo booking form for the dark CTA panel on /hyresvardar. */
export function DemoRequestForm() {
  const [form, setForm] = useState({ companyName: '', contactName: '', email: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('sending')
    const response = await submitSalesLeadAction({ ...form, source: 'demo_request' })
    if (response.ok) {
      setStatus('sent')
    } else {
      setErrorMessage(response.error)
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-3xl border border-white/20 bg-white/10 p-6">
        <div className="text-lg font-semibold">Tack för din förfrågan!</div>
        <p className="mt-2 text-sm leading-6 text-white/78">
          Vi återkommer inom en arbetsdag för att boka en demo som utgår från ert bestånd.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/20 bg-white/10 p-6">
      <div className="text-lg font-semibold">Boka en demo</div>
      <div className="mt-4 space-y-3">
        <input
          required
          placeholder="Företag"
          value={form.companyName}
          onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
          className={inputClass}
        />
        <input
          required
          placeholder="Namn"
          value={form.contactName}
          onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
          className={inputClass}
        />
        <input
          required
          type="email"
          placeholder="E-post"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className={inputClass}
        />
        <textarea
          rows={2}
          placeholder="Berätta kort om ert bestånd (valfritt)"
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          className={inputClass}
        />
      </div>
      {status === 'error' ? <p className="mt-3 text-sm font-semibold text-[#fecaca]">{errorMessage}</p> : null}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-4 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold !text-[#111827] transition hover:bg-white/90 disabled:opacity-60"
      >
        {status === 'sending' ? 'Skickar…' : 'Boka demo'}
      </button>
    </form>
  )
}
