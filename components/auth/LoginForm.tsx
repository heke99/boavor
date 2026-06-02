'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getSafeNextPath } from '@/lib/url'

type LoginStatus = 'idle' | 'loading' | 'error'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = getSafeNextPath(searchParams.get('next'))
  const [status, setStatus] = useState<LoginStatus>('idle')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setStatus('loading')

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const password = String(formData.get('password') ?? '')

    if (!email || !password) {
      setStatus('error')
      setMessage('Ange både e-post och lösenord.')
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setStatus('error')
      setMessage('Supabase är inte konfigurerat. Kontrollera miljövariablerna.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus('error')
      setMessage('Inloggningen misslyckades. Kontrollera e-post och lösenord.')
      return
    }

    router.replace(next)
    router.refresh()
  }

  return (
    <div className="rounded-[36px] border border-[#e8ebf3] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
          <LockKeyhole size={24} />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-[#111827]">Logga in</h1>
        <p className="mt-3 text-sm leading-6 text-[#5b6475]">
          Logga in för att hantera profil, ansökningar, objekt, leads eller adminytan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#111827]">E-post</label>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="din@email.se"
            className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 text-[15px] text-[#111827] placeholder:text-[#7a8396]"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-[#111827]">Lösenord</label>
            <Link href="/reset-password" className="text-xs font-semibold text-[#5b3df5] hover:underline">
              Glömt lösenord?
            </Link>
          </div>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-14 rounded-2xl border border-[#d7dbe7] bg-white px-4 pr-12 text-[15px] text-[#111827] placeholder:text-[#7a8396]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]"
              aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
            {message}
          </div>
        ) : null}

        <Button className="h-14 w-full rounded-2xl text-[15px] font-semibold" disabled={status === 'loading'}>
          <Mail size={17} className="mr-2" />
          {status === 'loading' ? 'Loggar in...' : 'Logga in'}
        </Button>
      </form>

      <div className="mt-6 rounded-3xl bg-[#f7f8fc] p-5 text-center">
        <div className="text-sm font-semibold text-[#111827]">Har du inget konto?</div>
        <p className="mt-1 text-sm leading-6 text-[#6b7280]">
          Skapa konto som privatperson eller företag och kom igång med Bovaro.
        </p>
        <Link
          href="/register"
          className="mt-4 inline-flex rounded-2xl border border-[#d7dbe7] bg-white px-5 py-3 text-sm font-semibold !text-[#111827] hover:bg-[#f3f4f6]"
        >
          Registrera dig
        </Link>
      </div>
    </div>
  )
}
