import Link from 'next/link'
import {
  Building2,
  FileText,
  Heart,
  Inbox,
  LayoutDashboard,
  SearchCheck,
  Settings,
  ShieldCheck,
  UserCircle2,
  WalletCards,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Översikt', icon: LayoutDashboard },
  { href: '/dashboard/profile', label: 'Min profil', icon: UserCircle2 },
  { href: '/dashboard/documents', label: 'Dokument', icon: WalletCards },
  { href: '/dashboard/applications', label: 'Ansökningar', icon: FileText },
  { href: '/dashboard/favorites', label: 'Favoriter', icon: Heart },
  { href: '/dashboard/saved-searches', label: 'Sparade sökningar', icon: SearchCheck },
  { href: '/dashboard/listings', label: 'Mina objekt', icon: Building2 },
  { href: '/dashboard/inquiries', label: 'Leads', icon: Inbox },
  { href: '/dashboard/settings', label: 'Inställningar', icon: Settings },
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
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[28px] border border-[#e8ebf3] bg-white p-4 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
          <div className="mb-4 rounded-[22px] bg-[linear-gradient(135deg,#111827,#243b8f)] p-5 text-white">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck size={16} />
              Bovaro workspace
            </div>
            <div className="mt-2 text-xl font-semibold">Dashboard</div>
            <div className="mt-2 text-sm leading-6 text-white/80">
              Profil, ansökningar, dokument, objekt och leads i ett arbetsflöde.
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activePath === item.href || activePath.startsWith(`${item.href}/`)
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
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[#111827]">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
