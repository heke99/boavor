import Link from 'next/link'
import { Bell, Building2, Home, LayoutDashboard, Search, ShieldCheck, Sparkles, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isModuleEnabled } from '@/lib/product/modules'
import type { AppRole } from '@/lib/types'

type HeaderSession = {
  email: string | null
  role: AppRole | null
  unreadNotifications: number
}

async function getHeaderSession(): Promise<HeaderSession | null> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  ])

  return {
    email: user.email ?? null,
    role: (profile?.role as AppRole | null) ?? null,
    unreadNotifications: unreadCount ?? 0,
  }
}

function isAdminRole(role: AppRole | null) {
  return role === 'admin' || role === 'super_admin'
}

export async function Header() {
  const session = await getHeaderSession()
  const isLoggedIn = Boolean(session)
  const canAccessAdmin = isAdminRole(session?.role ?? null)
  const showSale = isModuleEnabled('saleMarketplace')

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/82 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-2xl">
      <div className="container-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5b3df5,#0ea5a4)] text-white shadow-[0_16px_36px_rgba(91,61,245,0.32)]">
            <Home size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
              Bovaro
              <Sparkles size={13} className="text-[#5b3df5]" />
            </div>
            <div className="text-xs text-[var(--muted)]">Hyresbostäder i första hand</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-black/5 bg-white/70 p-1 text-sm font-semibold text-[var(--muted)] shadow-sm md:flex">
          <Link href="/rent" className="rounded-full px-4 py-2 transition hover:bg-[#f4f2ff] hover:text-[#4c31d8]">
            Hyra
          </Link>
          <Link href="/bostadsko" className="rounded-full px-4 py-2 transition hover:bg-[#f4f2ff] hover:text-[#4c31d8]">
            Bostadskö
          </Link>
          <Link href="/hyresvardar" className="rounded-full px-4 py-2 transition hover:bg-[#f4f2ff] hover:text-[#4c31d8]">
            Hyresvärdar
          </Link>
          {showSale ? (
            <Link href="/buy" className="rounded-full px-4 py-2 transition hover:bg-[#f4f2ff] hover:text-[#4c31d8]">
              Till salu
            </Link>
          ) : null}
          {isLoggedIn ? (
            <Link href="/dashboard" className="rounded-full px-4 py-2 transition hover:bg-[#f4f2ff] hover:text-[#4c31d8]">
              Dashboard
            </Link>
          ) : null}
          {canAccessAdmin ? (
            <Link href="/admin" className="rounded-full px-4 py-2 transition hover:bg-[#f4f2ff] hover:text-[#4c31d8]">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/listings" variant="ghost" className="hidden border-black/8 bg-white/80 md:inline-flex">
            <Search size={16} className="mr-2" />
            Utforska
          </Button>

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/90 text-[#6b7280] transition hover:text-[#111827]"
                aria-label="Notiser"
              >
                <Bell size={18} />
                {(session?.unreadNotifications ?? 0) > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5b3df5] px-1 text-[10px] font-bold text-white">
                    {session!.unreadNotifications > 9 ? '9+' : session!.unreadNotifications}
                  </span>
                ) : null}
              </Link>
              {canAccessAdmin ? (
                <Button href="/admin" variant="light" className="hidden border border-black/10 lg:inline-flex">
                  <ShieldCheck size={16} className="mr-2" />
                  Admin
                </Button>
              ) : null}
              <Button href="/dashboard" variant="light" className="border border-black/10 bg-white/90">
                <LayoutDashboard size={16} className="mr-2" />
                Dashboard
              </Button>
              <LogoutButton className="hidden md:inline-flex" />
            </>
          ) : (
            <>
              <Button href="/login" variant="light" className="border border-black/10 bg-white/90">
                <UserCircle2 size={16} className="mr-2" />
                Logga in
              </Button>
              <Button href="/register" className="shadow-[0_18px_45px_rgba(91,61,245,0.28)]">
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
