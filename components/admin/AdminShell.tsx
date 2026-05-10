import Link from 'next/link'
import {
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Översikt', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Användare', icon: Users },
  { href: '/admin/companies', label: 'Företag', icon: Building2 },
  { href: '/admin/listings', label: 'Listings', icon: ClipboardList },
  { href: '/admin/applications', label: 'Ansökningar', icon: FileText },
  { href: '/admin/inquiries', label: 'Leads', icon: Inbox },
]

export function AdminShell({
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
        <aside className="h-fit rounded-[28px] border border-[#e8ebf3] bg-white p-4 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
          <div className="mb-4 rounded-[22px] bg-[linear-gradient(135deg,#111827,#5b3df5)] p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck size={16} /> Bovaro admin
            </div>
            <div className="mt-2 text-xl font-semibold">Systemkontroll</div>
            <div className="mt-2 text-sm leading-6 text-white/80">
              Användare, företag, objekt, ansökningar och leads.
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activePath === item.href || (item.href !== '/admin' && activePath.startsWith(`${item.href}/`))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    active
                      ? 'bg-[#eef2ff] text-[#243b8f]'
                      : 'text-[#6b7280] hover:bg-[#f7f8fc] hover:text-[#111827]',
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
            <div className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">
              Admin dashboard
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-[#111827]">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
