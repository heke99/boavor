'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ResetPasswordForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Ange en giltig e-postadress.')
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus('error')
      setMessage('Supabase är inte konfigurerat. Kontrollera miljövariablerna.')
      return
    }

    const next = encodeURIComponent('/dashboard/settings?passwordReset=1')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
    })

    if (error) {
      setStatus('error')
      setMessage('Det gick inte att skicka återställningslänken. Försök igen.')
      return
    }

    setStatus('success')
    setMessage('Om e-postadressen finns i Bovaro skickas en säker återställningslänk inom kort.')
  }

  return (
    <div className="rounded-[36px] border border-[#e8ebf3] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
          <MailCheck size={24} />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-[#111827]">Återställ lösenord</h1>
        <p className="mt-3 text-sm leading-6 text-[#5b6475]">
          Ange e-postadressen för ditt konto så skickar vi en säker länk via Supabase Auth.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#111827]">E-post</label>
          <Input name="email" type="email" autoComplete="email" placeholder="din@email.se" className="h-14" />
        </div>

        {message ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              status === 'success' ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#fef2f2] text-[#b91c1c]'
            }`}
          >
            {message}
          </div>
        ) : null}

        <Button className="h-14 w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Skickar...' : 'Skicka återställningslänk'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6b7280]">
        Kom du på lösenordet?{' '}
        <Link href="/login" className="font-semibold text-[#5b3df5] hover:underline">
          Logga in
        </Link>
      </p>
    </div>
  )
}
