import { ShieldCheck, HeartHandshake, SearchCheck, BriefcaseBusiness } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'

const features = [
  {
    title: 'En profil, flera möjligheter',
    description: 'Spara uppgifter, dokument och preferenser en gång och använd dem i nästa ansökan eller kontakt.',
    icon: HeartHandshake,
  },
  {
    title: 'Smartare matchning',
    description: 'Filtren anpassas efter bostad, lokal, kontor, parkering, mark eller investeringsfastighet.',
    icon: SearchCheck,
  },
  {
    title: 'Tryggare flöden',
    description: 'Verifiering, tydliga krav och kontrollerade dokumentflöden skapar mer förtroende från start.',
    icon: ShieldCheck,
  },
  {
    title: 'Annonsörsverktyg',
    description: 'Samla annonser, ansökningar, intresseanmälningar och leads i ett modernt arbetsflöde.',
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
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} className="group relative overflow-hidden p-6 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(15,23,42,0.12)]">
              <div className="pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full bg-[#5b3df5]/10 blur-2xl transition group-hover:bg-[#0ea5a4]/12" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef2ff,#dff8f4)] text-[#243b8f] shadow-sm">
                <Icon size={22} />
              </div>
              <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#9aa3b5]">0{index + 1}</div>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
