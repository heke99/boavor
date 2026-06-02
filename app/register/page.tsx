import Link from 'next/link'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <section className="relative overflow-hidden bg-[#f6f7fb] py-14 md:py-20">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#5b3df5]/10 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#0ea5a4]/10 blur-3xl" />
      <div className="container-shell relative">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold text-[#5b3df5] shadow-sm backdrop-blur">
              <Sparkles size={15} /> Skapa konto
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-[#111827] md:text-6xl">
              Ett tryggare konto för bostäder, lokaler och affärer.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#5b6475] md:text-lg">
              Bygg en profil som går att återanvända i ansökningar, intresseanmälningar och annonsörsflöden. Företag kan verifieras för högre förtroende.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#111827]">Tryggare uppgifter</h2>
                    <p className="mt-1 text-sm leading-6 text-[#5b6475]">
                      Personnummer används för identifiering och ansökningsflöden, inte som publik information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-[#111827]">Villkor direkt från start</h2>
                <p className="mt-1 text-sm leading-6 text-[#5b6475]">
                  Registreringen länkar till allmänna villkor, integritetspolicy, cookiepolicy och annonsörsvillkor.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                  <Link href="/terms" className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[#111827] hover:bg-[#e5e7eb]">
                    Villkor
                  </Link>
                  <Link href="/privacy" className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[#111827] hover:bg-[#e5e7eb]">
                    Integritet
                  </Link>
                  <Link href="/advertiser-terms" className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[#111827] hover:bg-[#e5e7eb]">
                    Annonsör
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <RegisterForm />
        </div>
      </div>
    </section>
  )
}
