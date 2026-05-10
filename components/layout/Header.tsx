import Link from 'next/link'
import { Building2, Home, LayoutDashboard, Search, ShieldCheck, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AppRole } from '@/lib/types'

type HeaderSession = {
  email: string | null
  role: AppRole | null
}

async function getHeaderSession(): Promise<HeaderSession | null> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return {
    email: user.email ?? null,
    role: (profile?.role as AppRole | null) ?? null,
  }
}

function isAdminRole(role: AppRole | null) {
  return role === 'admin' || role === 'super_admin'
}

export async function Header() {
  const session = await getHeaderSession()
  const isLoggedIn = Boolean(session)
  const canAccessAdmin = isAdminRole(session?.role ?? null)

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
      <div className="container-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_12px_30px_rgba(91,61,245,0.3)]">
            <Home size={20} />
          </div>
          <div>
            <div className="text-lg font-semibold">Bovaro</div>
            <div className="text-xs text-[var(--muted)]">Hyra och köpa smartare</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[var(--muted)] md:flex">
          <Link href="/rent" className="hover:text-[var(--foreground)]">
            Hyra
          </Link>
          <Link href="/buy" className="hover:text-[var(--foreground)]">
            Till salu
          </Link>
          <Link href="/listings" className="hover:text-[var(--foreground)]">
            Alla objekt
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="hover:text-[var(--foreground)]">
              Dashboard
            </Link>
          ) : null}
          {canAccessAdmin ? (
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/listings" variant="ghost" className="hidden md:inline-flex">
            <Search size={16} className="mr-2" />
            Utforska
          </Button>

          {isLoggedIn ? (
            <>
              {canAccessAdmin ? (
                <Button href="/admin" variant="light" className="hidden border border-black/10 lg:inline-flex">
                  <ShieldCheck size={16} className="mr-2" />
                  Admin
                </Button>
              ) : null}
              <Button href="/dashboard" variant="light" className="border border-black/10">
                <LayoutDashboard size={16} className="mr-2" />
                Dashboard
              </Button>
              <LogoutButton className="hidden md:inline-flex" />
            </>
          ) : (
            <>
              <Button href="/login" variant="light" className="border border-black/10">
                <UserCircle2 size={16} className="mr-2" />
                Logga in
              </Button>
              <Button href="/register">
                <Building2 size={16} className="mr-2" />
                Kom igång
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
