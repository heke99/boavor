import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { HeroSearch } from '@/components/home/HeroSearch'
import { StatsStrip } from '@/components/home/StatsStrip'
import { AreaGrid } from '@/components/home/AreaGrid'
import { FeatureCards } from '@/components/home/FeatureCards'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { mockListings } from '@/lib/mock-data'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <>
      <section
        className="overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #0f172a 0%, #18244a 45%, #243b8f 100%)',
        }}
      >
        <div className="container-shell relative py-20 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                <Sparkles size={15} />
                Bovaro för hyra och till salu
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-white md:text-6xl">
                Hitta rätt bostad snabbare med en tydligare och snyggare marknadsplats.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/88 md:text-lg">
                Bovaro samlar hyresobjekt och bostäder till salu i ett modernt flöde där sökningen känns enklare,
                objekten känns starkare och både sökande och hyresvärdar får bättre kontroll.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  href="/listings"
                  className="bg-white text-[#111827] hover:bg-[#f3f4f6]"
                >
                  Se alla objekt
                  <ArrowRight size={16} className="ml-2" />
                </Button>

                <Button
                  href="/register"
                  className="border border-white/22 bg-white/10 text-white hover:bg-white/16"
                >
                  <ShieldCheck size={16} className="mr-2" />
                  Skapa konto
                </Button>
              </div>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <div className="text-2xl font-semibold text-white">Hyra</div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    Ansök snabbare med sparad profil, dokument och köpoäng.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <div className="text-2xl font-semibold text-white">Köp</div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    Sök bostäder till salu med bättre överblick och renare filtrering.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm">
                  <div className="text-2xl font-semibold text-white">För värdar</div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    Publicera, hantera och följ upp objekt och ansökningar i samma flöde.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <HeroSearch />
            </div>
          </div>

          <div className="mt-10">
            <StatsStrip />
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <SectionHeading
          eyebrow="Utvalda objekt"
          title="Objekt som visar hur Bovaro ska kännas"
          description="Tydligare kort, bättre struktur, premiumkänsla och snabbare väg vidare till objektet."
        />
        <div className="mt-8">
          <ListingGrid listings={mockListings.slice(0, 6)} />
        </div>
      </section>

      <FeatureCards />
      <AreaGrid />

      <section className="container-shell py-16">
        <div className="rounded-[36px] bg-[linear-gradient(135deg,#101228,#1e2e72)] p-8 text-white md:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
              För annonsörer
            </div>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
              Publicera, strukturera och få bättre koll på inkommande ansökningar och leads.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/78">
              Bovaro är byggt för att kunna växa till ett riktigt arbetsverktyg för hyresvärdar och säljare, inte bara en annonsyta.
            </p>
            <div className="mt-6">
              <Button
                href="/dashboard/listings"
                className="bg-white !text-[#111827] hover:bg-[#f3f4f6]"
              >
                Gå till annonsörsflöde
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}