import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { getAreaHighlights } from '@/lib/data/market'

export async function AreaGrid() {
  const areaHighlights = await getAreaHighlights()

  if (!areaHighlights.length) return null

  return (
    <section className="container-shell py-16">
      <SectionHeading
        eyebrow="Marknadsöversikt"
        title="Städer med hög aktivitet"
        description="Byggd för användare som vill hitta rätt område snabbare och för annonsörer som vill nå rätt målgrupp."
      />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {areaHighlights.map((area) => (
          <Card key={area.name} className="p-6">
            <div className="text-sm font-semibold text-[var(--primary)]">{area.count}</div>
            <div className="mt-3 text-2xl font-semibold">{area.name}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{area.description}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
