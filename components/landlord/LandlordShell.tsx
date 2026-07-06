import Link from 'next/link'
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/LogoutButton'

const navItems = [
  { href: '/landlord', label: 'Översikt', icon: LayoutDashboard },
  { href: '/landlord/properties', label: 'Fastigheter', icon: Building2 },
  { href: '/landlord/listings', label: 'Annonser', icon: ClipboardList },
  { href: '/landlord/applications', label: 'Ansökningar', icon: FileText },
  { href: '/landlord/messages', label: 'Meddelanden', icon: MessageSquare },
  { href: '/landlord/viewings', label: 'Visningar', icon: CalendarClock },
  { href: '/landlord/analytics', label: 'Analys', icon: BarChart3 },
  { href: '/landlord/import', label: 'Importcenter', icon: Upload },
  { href: '/landlord/billing', label: 'Fakturering', icon: Wallet },
  { href: '/landlord/settings', label: 'Inställningar', icon: Settings },
]

export function LandlordShell({
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
        <aside className="h-fit rounded-[32px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_60px_rgba(13,17,32,0.08)] ring-1 ring-black/[0.02] backdrop-blur-xl">
          <div className="mb-4 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.24),transparent_32%),linear-gradient(135deg,#0f172a,#1d4ed8)] p-5 text-white shadow-[0_18px_45px_rgba(29,78,216,0.22)]">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck size={16} />
              Bovaro för hyresvärdar
            </div>
            <div className="mt-2 text-xl font-semibold tracking-[-0.02em]">Arbetsyta</div>
            <div className="mt-2 text-sm leading-6 text-white/80">
              Fastigheter, annonser, ansökningar och team i ett samlat flöde.
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activePath === item.href || (item.href !== '/landlord' && activePath.startsWith(`${item.href}/`))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    active
                      ? 'bg-[#eff6ff] text-[#1d4ed8] shadow-sm'
                      : 'text-[#6b7280] hover:bg-[#f7f8fc] hover:text-[#111827]',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-4 space-y-2 border-t border-[#eef0f6] pt-4">
            <Link href="/dashboard" className="block rounded-2xl px-4 py-2 text-sm font-semibold text-[#6b7280] hover:bg-[#f7f8fc]">
              Till sökande-vyn
            </Link>
            <LogoutButton className="w-full" />
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="inline-flex rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
              Hyresvärd
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#111827] md:text-4xl">{title}</h1>
            {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280] md:text-base md:leading-7">{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
