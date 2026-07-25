import Link from 'next/link'
import { Building2, ClipboardCheck, FileText, Home, LifeBuoy, LogOut, Wrench } from 'lucide-react'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/tenant', label: 'Översikt', icon: Home },
  { href: '/tenant/invoices', label: 'Hyresavier', icon: FileText },
  { href: '/tenant/maintenance', label: 'Felanmälan', icon: Wrench },
  { href: '/tenant/move', label: 'Inflyttning & utflyttning', icon: ClipboardCheck },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
]

export function TenantShell({
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
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_60px_rgba(13,17,32,0.08)]">
          <div className="mb-4 rounded-[26px] bg-[linear-gradient(135deg,#0f172a,#0f766e)] p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-white/80"><Building2 size={16} /> Bovaro boende</div>
            <div className="mt-2 text-xl font-semibold">Min bostad</div>
            <p className="mt-2 text-sm leading-6 text-white/80">Avtal, hyra, service och flytt i ett sammanhållet flöde.</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activePath === item.href || (item.href !== '/tenant' && activePath.startsWith(`${item.href}/`))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    active ? 'bg-[#ecfdf5] text-[#047857]' : 'text-[#6b7280] hover:bg-[#f7f8fc] hover:text-[#111827]',
                  )}
                >
                  <Icon size={18} />{item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-4 space-y-2 border-t border-[#eef0f6] pt-4">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold text-[#6b7280]">
              <LogOut size={17} /> Till sökandeportalen
            </Link>
            <LogoutButton className="w-full" />
          </div>
        </aside>
        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.06)]">
            <div className="inline-flex rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#047857]">Hyresgäst</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#111827] md:text-4xl">{title}</h1>
            {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280] md:text-base">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

