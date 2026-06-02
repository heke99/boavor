import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/70 bg-[#0b1024] text-white">
      <div className="container-shell py-14">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-8">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr]">
            <div>
              <div className="text-xl font-semibold tracking-[-0.02em]">Bovaro</div>
              <p className="mt-3 max-w-sm text-sm leading-7 text-white/68">
                En modern fastighetsplattform för hyra, köp, lokaler och annonsörsflöden - byggd för bättre matchning och tryggare kontakt.
              </p>
              <div className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/76">
                Sverige · Bostäder · Kommersiellt
              </div>
            </div>
            <div>
              <div className="font-semibold">Utforska</div>
              <div className="mt-4 space-y-3 text-sm text-white/64">
                <Link href="/rent" className="block transition hover:text-white">
                  Hyra
                </Link>
                <Link href="/buy" className="block transition hover:text-white">
                  Till salu
                </Link>
                <Link href="/listings" className="block transition hover:text-white">
                  Alla objekt
                </Link>
              </div>
            </div>
            <div>
              <div className="font-semibold">Konto</div>
              <div className="mt-4 space-y-3 text-sm text-white/64">
                <Link href="/login" className="block transition hover:text-white">
                  Logga in
                </Link>
                <Link href="/register" className="block transition hover:text-white">
                  Skapa konto
                </Link>
                <Link href="/dashboard" className="block transition hover:text-white">
                  Dashboard
                </Link>
              </div>
            </div>
            <div>
              <div className="font-semibold">Kontakt</div>
              <div className="mt-4 space-y-3 text-sm text-white/64">
                <p>support@bovaro.se</p>
                <p>Stockholm · Sverige</p>
                <p>För hyresvärdar, köpare, säljare och företag.</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/44 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Bovaro. Alla rättigheter förbehållna.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="hover:text-white">Integritet</Link>
              <Link href="/terms" className="hover:text-white">Villkor</Link>
              <Link href="/cookies" className="hover:text-white">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
