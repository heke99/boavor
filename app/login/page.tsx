import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safeNextPath(value: string | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const nextPath = safeNextPath(params?.next)
  const supabase = await createSupabaseServerClient()

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect(nextPath)
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#f6f7fb] py-14 md:py-20">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#5b3df5]/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#0ea5a4]/10 blur-3xl" />
      <div className="container-shell relative">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="hidden lg:block">
            <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#5b3df5] shadow-sm">
              Välkommen tillbaka
            </div>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-[#111827]">
              Fortsätt där ditt bostadsflöde slutade.
            </h1>
            <p className="mt-5 max-w-md text-base leading-8 text-[#5b6475]">
              Logga in för att hantera profil, dokument, ansökningar, sparade sökningar och annonsörsleads.
            </p>
          </div>
          <div className="mx-auto w-full max-w-md">
          <Suspense
            fallback={
              <div className="h-[560px] rounded-[36px] border border-[#e8ebf3] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]" />
            }
          >
            <LoginForm />
          </Suspense>
          </div>
        </div>
      </div>
    </section>
  )
}
