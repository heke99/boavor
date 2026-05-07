import Link from 'next/link'
import { LayoutDashboard, UserCircle2, Heart, SearchCheck, Building2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Översikt', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Min profil', icon: UserCircle2 },
  { href: '/dashboard/applications', label: 'Ansökningar', icon: FileText },
  { href: '/dashboard/favorites', label: 'Favoriter', icon: Heart },
  { href: '/dashboard/saved-searches', label: 'Sparade sökningar', icon: SearchCheck },
  { href: '/dashboard/listings', label: 'Mina objekt', icon: Building2 },
]

export function DashboardShell({
  children,
  activePath,
  title,
  description,
}: {
  children: React.ReactNode
  activePath: string
  title: string
  description?: string
}) {
  return (
    <section className="container-shell py-10">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[28px] border border-black/8 bg-white p-4 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
          <div className="mb-4 rounded-[22px] bg-[linear-gradient(135deg,var(--primary),#7c67ff)] p-5 text-white">
            <div className="text-sm text-white/80">Bovaro workspace</div>
            <div className="mt-2 text-xl font-semibold">Redo för nästa steg</div>
            <div className="mt-2 text-sm text-white/80">Här samlar du profil, ansökningar, favoriter, sparade sökningar och objekt.</div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activePath === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                    active ? 'bg-[var(--secondary-soft)] text-[var(--secondary)]' : 'text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            {description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
