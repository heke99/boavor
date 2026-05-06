import Link from 'next/link'
import { Home, Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
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
          <Link href="/dashboard" className="hover:text-[var(--foreground)]">
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button href="/listings" variant="ghost" className="hidden md:inline-flex">
            <Search size={16} className="mr-2" />
            Utforska
          </Button>
          <Button href="/login" variant="light" className="border border-black/10">
            Logga in
          </Button>
          <Button href="/register">
            <Building2 size={16} className="mr-2" />
            Kom igång
          </Button>
        </div>
      </div>
    </header>
  )
}
