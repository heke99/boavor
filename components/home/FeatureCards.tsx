import { ShieldCheck, HeartHandshake, SearchCheck, BriefcaseBusiness } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'

const features = [
  {
    title: 'Profiler som återanvänds',
    description: 'Sökande fyller sin profil en gång och kan sedan ansöka snabbare på nästa objekt.',
    icon: HeartHandshake,
  },
  {
    title: 'Tydligare matchning',
    description: 'Bovaro är byggd för att visa krav, matchning och tydlig väg vidare i nästa steg.',
    icon: SearchCheck,
  },
  {
    title: 'Tryggare upplevelse',
    description: 'Verifikation, struktur och tydlig objektsdata ger mer förtroende för hela flödet.',
    icon: ShieldCheck,
  },
  {
    title: 'Bättre verktyg för annonsörer',
    description: 'Hyresvärdar och säljare får bättre struktur, översikt och snabbare inkommande leads.',
    icon: BriefcaseBusiness,
  },
]

export function FeatureCards() {
  return (
    <section className="container-shell py-16">
      <SectionHeading
        eyebrow="Varför Bovaro"
        title="Byggt för att kännas modernare än en vanlig bostadsportal"
        description="Bovaro kombinerar marknadsplats, profilåteranvändning och starkare struktur redan från grunden."
      />
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} className="p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary)]">
                <Icon size={22} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
