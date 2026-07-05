import type { Metadata } from 'next'
import { ArrowRight, BellRing, FileSearch, Layers, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { isModuleEnabled } from '@/lib/product/modules'

export const metadata: Metadata = {
  title: 'Bovaro Plus — Bovaro',
  description:
    'Bovaro Plus är en kommande premiumtjänst för bostadssökande med fler aktiva ansökningar och djupare insikter i dina chanser.',
}

const plannedBenefits = [
  {
    icon: Layers,
    title: 'Fler aktiva ansökningar',
    description: 'Sök fler bostäder parallellt med en högre gräns för aktiva ansökningar.',
  },
  {
    icon: FileSearch,
    title: 'Detaljerad Matchkoll',
    description: 'Se i detalj hur din profil matchar hyresvärdens krav innan du ansöker.',
  },
  {
    icon: BellRing,
    title: 'Snabbare bevakningar',
    description: 'Prioriterade sökbevakningar så att du är bland de första som ser nya bostäder.',
  },
]

export default function PlusPage() {
  const plusEnabled = isModuleEnabled('bovaroPlus')

  return (
    <>
      <section className="relative overflow-hidden bg-[#070a1a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(91,61,245,0.42),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(14,165,164,0.30),transparent_24%),linear-gradient(135deg,#080b1c_0%,#111a3a_46%,#243b8f_100%)]" />
        <div className="container-shell relative py-20 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-xl">
              <Sparkles size={15} />
              Bovaro Plus
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white md:text-6xl">
              Mer kraft i ditt bostadssökande.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-lg">
              Bovaro Plus blir en frivillig premiumtjänst för dig som söker aktivt. Grundtjänsten — kön, profilen och
              ansökningarna — är och förblir kostnadsfri.
            </p>
            {!plusEnabled ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-amber-200/40 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-100">
                Bovaro Plus är under uppbyggnad och går ännu inte att teckna.
              </div>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register" className="border border-white/22 bg-white !text-[#111827] hover:bg-white/90">
                Skapa kostnadsfritt konto
                <ArrowRight size={16} className="ml-2" />
              </Button>
              <Button href="/bostadsko" className="border border-white/22 bg-white/10 !text-white hover:bg-white/16">
                Läs om bostadskön
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <SectionHeading
          eyebrow="Planerade förmåner"
          title="Det här bygger vi in i Bovaro Plus"
          description="Innehållet kan justeras innan lansering. Vi lovar inget som inte finns — det som listas här är under aktiv utveckling."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plannedBenefits.map((benefit) => (
            <div key={benefit.title} className="rounded-[28px] border border-[#e8ebf3] bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
                <benefit.icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold text-[#111827]">{benefit.title}</div>
              <p className="mt-2 text-sm leading-6 text-[#5b6475]">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell pb-20">
        <div className="rounded-[36px] border border-[#e8ebf3] bg-[#f7f8fc] p-8 md:p-10">
          <h2 className="text-2xl font-semibold text-[#111827]">Det som alltid är gratis</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-7 text-[#5b6475] md:grid-cols-2">
            <li>• Bostadskön och din kötid</li>
            <li>• Sökprofil, dokument och medsökande</li>
            <li>• Att söka lediga bostäder</li>
            <li>• Sökbevakningar och notiser</li>
          </ul>
        </div>
      </section>
    </>
  )
}
