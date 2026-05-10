import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
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
