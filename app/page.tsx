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
      <section className="hero-gradient soft-grid overflow-hidden">
        <div className="container-shell relative py-18 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white/88">
                <Sparkles size={15} />
                Bovaro för hyra och till salu
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
                Byggt för att hitta rätt bostad snabbare och se bättre ut än gamla bostadsportaler.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/76 md:text-lg">
                Bovaro kombinerar bättre listings, snabbare profilåteranvändning och modern upplevelse för både sökande, hyresvärdar och säljare.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/listings" variant="light">
                  Se alla objekt
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button href="/register" variant="secondary">
                  <ShieldCheck size={16} className="mr-2" />
                  Skapa konto
                </Button>
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
            <p className="mt-4 text-base leading-7 text-white/75">
              Bovaro är byggt för att kunna växa till ett riktigt arbetsverktyg för hyresvärdar och säljare, inte bara en annonsyta.
            </p>
            <div className="mt-6">
              <Button href="/dashboard/listings" variant="light">
                Gå till annonsörsflöde
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
