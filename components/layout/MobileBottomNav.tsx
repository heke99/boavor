'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeftRight, Clock3, Home, Search, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Hem', icon: Home, exact: true },
  { href: '/listings', label: 'Sök', icon: Search },
  { href: '/bostadsko', label: 'Kön', icon: Clock3 },
  { href: '/byta', label: 'Byta', icon: ArrowLeftRight },
  { href: '/dashboard', label: 'Konto', icon: UserCircle2 },
]

/** Fixed bottom navigation for small screens (hidden on md and up). */
export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Mobilnavigering"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition',
                active ? 'text-[#5b3df5]' : 'text-[#6b7280] hover:text-[#111827]',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
