import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSafeNextPath } from '@/lib/url'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const nextPath = getSafeNextPath(params?.next)
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
    <section className="bg-[#f6f7fb] py-14 md:py-20">
      <div className="container-shell">
        <div className="mx-auto max-w-md">
          <Suspense
            fallback={
              <div className="h-[560px] rounded-[36px] border border-[#e8ebf3] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
