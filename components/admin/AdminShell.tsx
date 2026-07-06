import Link from 'next/link'
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Fingerprint,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/LogoutButton'

const navItems = [
  { href: '/admin', label: 'Översikt', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Användare', icon: Users },
  { href: '/admin/identity', label: 'Identitet', icon: Fingerprint },
  { href: '/admin/documents', label: 'Dokument', icon: FileText },
  { href: '/admin/queue', label: 'Bostadskö', icon: Clock3 },
  { href: '/admin/policies', label: 'Policyer', icon: ClipboardList },
  { href: '/admin/companies', label: 'Företag', icon: Building2 },
  { href: '/admin/listings', label: 'Objekt', icon: ClipboardList },
  { href: '/admin/applications', label: 'Ansökningar', icon: FileText },
  { href: '/admin/inquiries', label: 'Leads', icon: Inbox },
  { href: '/admin/byta', label: 'Byten', icon: ArrowLeftRight },
  { href: '/admin/billing', label: 'Fakturering', icon: Wallet },
  { href: '/admin/analytics', label: 'Analys', icon: BarChart3 },
  { href: '/admin/campaigns', label: 'Kampanjer', icon: Megaphone },
  { href: '/admin/support-desk', label: 'Ärenden', icon: Inbox },
  { href: '/admin/help-articles', label: 'Hjälpcenter', icon: FileText },
  { href: '/admin/support', label: 'Supportläge', icon: Eye },
  { href: '/admin/risk', label: 'Riskflaggor', icon: ShieldAlert },
  { href: '/admin/privacy', label: 'GDPR', icon: FileText },
  { href: '/admin/settings', label: 'Inställningar', icon: Settings },
  { href: '/admin/system', label: 'System', icon: Activity },
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
        <aside className="h-fit rounded-[32px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_60px_rgba(13,17,32,0.08)] ring-1 ring-black/[0.02] backdrop-blur-xl">
          <div className="mb-4 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_top_right,rgba(255,182,72,0.26),transparent_34%),linear-gradient(135deg,#111827,#5b3df5)] p-5 text-white shadow-[0_18px_45px_rgba(91,61,245,0.22)]">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck size={16} /> Bovaro admin
            </div>
            <div className="mt-2 text-xl font-semibold tracking-[-0.02em]">Systemkontroll</div>
            <div className="mt-2 text-sm leading-6 text-white/80">
              Hantera användare, företag, objekt, ansökningar och leads.
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
                      ? 'bg-[#eef2ff] text-[#243b8f] shadow-sm'
                      : 'text-[#6b7280] hover:bg-[#f7f8fc] hover:text-[#111827]',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-4 border-t border-[#eef0f6] pt-4">
            <LogoutButton className="w-full" />
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#243b8f]">
              Admin
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
