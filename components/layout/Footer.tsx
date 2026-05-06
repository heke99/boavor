import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-black/5 bg-white">
      <div className="container-shell grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold">Bovaro</div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            En modern fastighetsplattform för hyra och köp, byggd för snabbare matchning och bättre upplevelse.
          </p>
        </div>
        <div>
          <div className="font-semibold">Utforska</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            <Link href="/rent" className="block">
              Hyra
            </Link>
            <Link href="/buy" className="block">
              Till salu
            </Link>
            <Link href="/listings" className="block">
              Alla objekt
            </Link>
          </div>
        </div>
        <div>
          <div className="font-semibold">Konto</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            <Link href="/login" className="block">
              Logga in
            </Link>
            <Link href="/register" className="block">
              Skapa konto
            </Link>
            <Link href="/dashboard" className="block">
              Dashboard
            </Link>
          </div>
        </div>
        <div>
          <div className="font-semibold">Kontakt</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            <p>support@bovaro.se</p>
            <p>Stockholm · Sverige</p>
            <p>För hyresvärdar, köpare och säljare.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
