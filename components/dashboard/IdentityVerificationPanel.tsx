'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Fingerprint, Loader2, ShieldAlert, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  cancelIdentityVerificationAction,
  pollIdentityVerificationAction,
  startIdentityVerificationAction,
} from '@/app/dashboard/identity/actions'
import type { IdentityState } from '@/lib/data/identity'

const POLL_INTERVAL_MS = 2000

type PanelPhase = 'idle' | 'starting' | 'polling' | 'done'

export function IdentityVerificationPanel({ identity }: { identity: IdentityState }) {
  const router = useRouter()
  const [phase, setPhase] = useState<PanelPhase>('idle')
  const [error, setError] = useState('')
  const [statusText, setStatusText] = useState('')
  const [verificationId, setVerificationId] = useState<string | null>(null)

  useEffect(() => {
    if (phase !== 'polling' || !verificationId) return

    let cancelled = false

    const timer = setInterval(async () => {
      const result = await pollIdentityVerificationAction(verificationId)
      if (cancelled) return

      if (!result.ok) {
        setError(result.error)
        setPhase('idle')
        return
      }

      if (result.status === 'pending') {
        setStatusText('Väntar på identifiering…')
        return
      }

      setPhase('done')
      if (result.status === 'verified') {
        setStatusText('Din identitet är verifierad.')
      } else if (result.status === 'failed') {
        setError('Verifieringen misslyckades. Försök igen eller kontakta supporten om felet kvarstår.')
      } else {
        setStatusText('Verifieringen avbröts.')
      }
      router.refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [phase, verificationId, router])

  async function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatusText('')
    setPhase('starting')

    const formData = new FormData(event.currentTarget)
    const result = await startIdentityVerificationAction(formData)

    if (!result.ok) {
      setError(result.error)
      setPhase('idle')
      return
    }

    setVerificationId(result.verificationId ?? null)
    setPhase('polling')
    setStatusText('Verifiering startad…')
  }

  async function handleCancel() {
    setPhase('idle')
    setStatusText('')
    if (verificationId) {
      await cancelIdentityVerificationAction(verificationId)
    }
    router.refresh()
  }

  if (identity.isVerified) {
    return (
      <div className="rounded-[28px] border border-[#bbf7d0] bg-[#f0fdf4] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#15803d]">
            <BadgeCheck size={22} />
          </div>
          <div>
            <div className="text-lg font-semibold text-[#14532d]">Identitet verifierad</div>
            <p className="text-sm text-[#166534]">
              {identity.latest?.verifiedAt
                ? `Verifierad ${new Date(identity.latest.verifiedAt).toLocaleDateString('sv-SE')}`
                : 'Verifierad'}
              {identity.latest?.provider === 'mock' ? ' · Mock-BankID (testmiljö)' : ' · BankID'}
            </p>
          </div>
        </div>
        {identity.latest?.ageVerified === false ? (
          <div className="mt-4 rounded-2xl bg-[#fef3c7] p-4 text-sm font-medium text-[#92400e]">
            Du är under 18 år. Du kan använda Bovaro, men du kan inte skicka bostadsansökningar förrän du fyllt 18.
          </div>
        ) : null}
      </div>
    )
  }

  if (!identity.providerAvailable) {
    return (
      <div className="rounded-[28px] border border-[#fde68a] bg-[#fffbeb] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fef3c7] text-[#b45309]">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="text-lg font-semibold text-[#92400e]">BankID-verifiering är inte konfigurerad</div>
            <p className="text-sm text-[#a16207]">
              Identitetsverifiering är inte tillgänglig i den här miljön ännu. Kontakta supporten om du behöver hjälp.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const busy = phase === 'starting' || phase === 'polling'

  return (
    <div className="rounded-[28px] border border-[#e8ebf3] bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
          <Fingerprint size={22} />
        </div>
        <div>
          <div className="text-lg font-semibold text-[#111827]">Verifiera din identitet</div>
          <p className="text-sm text-[#6b7280]">
            Verifieringen krävs för att kunna skicka bostadsansökningar.
          </p>
        </div>
      </div>

      {identity.providerIsMock ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#c7d2fe] bg-[#eef2ff] p-4 text-sm font-medium text-[#3730a3]">
          Testläge: {identity.providerLabel}. Detta är en simulerad verifiering och gäller inte som riktig
          BankID-identifiering.
        </div>
      ) : null}

      {identity.latest?.status === 'failed' && phase === 'idle' ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#fef2f2] p-4 text-sm font-medium text-[#b91c1c]">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          Din senaste verifiering misslyckades. Du kan försöka igen nedan.
        </div>
      ) : null}

      {busy ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f7f8fc] p-4 text-sm font-semibold text-[#111827]">
            <Loader2 size={18} className="animate-spin text-[#5b3df5]" />
            {statusText || 'Verifiering pågår…'}
          </div>
          <Button type="button" variant="ghost" onClick={handleCancel} className="border border-black/10">
            Avbryt verifiering
          </Button>
        </div>
      ) : phase === 'done' && statusText ? (
        <div className="mt-6 rounded-2xl bg-[#f0fdf4] p-4 text-sm font-semibold text-[#166534]">{statusText}</div>
      ) : (
        <form onSubmit={handleStart} className="mt-6 space-y-4">
          {identity.providerIsMock ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#111827]">Personnummer (testläge)</label>
              <Input
                name="personalIdentityNumber"
                placeholder="ÅÅÅÅMMDD-XXXX"
                autoComplete="off"
                className="h-12 rounded-2xl border border-[#d7dbe7] bg-white px-4"
              />
              <p className="mt-2 text-xs text-[#6b7280]">
                Numret används för att räkna ut födelsedatum och lagras endast som en krypterad kontrollsumma.
              </p>
            </div>
          ) : null}

          <label className="flex gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm leading-6 text-[#374151]">
            <input name="identityConsent" type="checkbox" className="mt-1 h-4 w-4 accent-[#5b3df5]" />
            <span>
              Jag samtycker till att Bovaro behandlar mitt personnummer för identitetsverifiering. Numret sparas aldrig
              i klartext.
            </span>
          </label>

          {error ? (
            <div className="rounded-2xl bg-[#fef2f2] p-4 text-sm font-medium text-[#b91c1c]">{error}</div>
          ) : null}

          <Button type="submit" disabled={busy} className="h-12 rounded-2xl">
            <Fingerprint size={17} className="mr-2" />
            Starta verifiering med {identity.providerLabel}
          </Button>
        </form>
      )}
    </div>
  )
}
