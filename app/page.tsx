import { ArrowRight, BadgeCheck, Building2, CheckCircle2, Home, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { Suspense } from 'react'
import { HeroSearch } from '@/components/home/HeroSearch'
import { StatsStrip } from '@/components/home/StatsStrip'
import { AreaGrid } from '@/components/home/AreaGrid'
import { FeatureCards } from '@/components/home/FeatureCards'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { getPublishedListings } from '@/lib/data/listings'

export default async function HomePage() {
  const featuredListings = await getPublishedListings({}, { limit: 6 })

  return (
    <>
      <section className="relative overflow-hidden bg-[#070a1a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(91,61,245,0.42),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(14,165,164,0.30),transparent_24%),linear-gradient(135deg,#080b1c_0%,#111a3a_46%,#243b8f_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f7f7fb] to-transparent" />
        <div className="container-shell relative py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                <Sparkles size={15} />
                Svensk marknadsplats för förstahandsuthyrning
              </div>

              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white md:text-7xl">
                Vägen till ditt nästa hem — tydlig och rättvis.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 md:text-xl">
                Sök förstahandskontrakt med en kostnadsfri bostadskö och en återanvändbar profil. Bovaro samlar även
                bostäder till salu och lokaler — men hyresbostäder kommer alltid först.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  href="/rent"
                  className="border border-white/22 bg-white !text-[#111827] shadow-[0_20px_60px_rgba(255,255,255,0.18)] hover:bg-white/90"
                >
                  Hitta hyresbostad
                  <ArrowRight size={16} className="ml-2" />
                </Button>

                <Button
                  href="/bostadsko"
                  className="border border-white/22 bg-white/10 !text-white hover:bg-white/16"
                >
                  <ShieldCheck size={16} className="mr-2" />
                  Ställ dig i kön gratis
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-white/76">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#5eead4]" /> Kostnadsfri bostadskö</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#5eead4]" /> Tydliga krav per bostad</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#5eead4]" /> Verktyg för hyresvärdar</span>
              </div>

              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                <div className="group rounded-3xl border border-white/12 bg-white/[0.08] px-4 py-4 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.12]">
                  <Home size={20} className="mb-3 text-[#bfdbfe]" />
                  <div className="text-xl font-semibold text-white">Bostäder</div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    Hyra och köpa med tydlig data.
                  </p>
                </div>
                <div className="group rounded-3xl border border-white/12 bg-white/[0.08] px-4 py-4 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.12]">
                  <Building2 size={20} className="mb-3 text-[#99f6e4]" />
                  <div className="text-xl font-semibold text-white">Kommersiellt</div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    Lokaler, kontor, mark och mer.
                  </p>
                </div>
                <div className="group rounded-3xl border border-white/12 bg-white/[0.08] px-4 py-4 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.12]">
                  <TrendingUp size={20} className="mb-3 text-[#fed7aa]" />
                  <div className="text-xl font-semibold text-white">Leads</div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    Ansökningar och intressen samlat.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Suspense
                fallback={
                  <div className="h-[520px] rounded-[36px] border border-white/20 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]" />
                }
              >
                <HeroSearch />
              </Suspense>
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
          title="Ett urval av bostäder, lokaler och investeringsobjekt"
          description="Utforska publicerade objekt med tydligare fakta, smartare filter och snabb väg till ansökan eller intresseanmälan."
        />
        <div className="mt-8">
          <ListingGrid listings={featuredListings} />
        </div>
      </section>

      <FeatureCards />
      <AreaGrid />

      <section className="container-shell py-16">
        <div className="relative overflow-hidden rounded-[42px] bg-[linear-gradient(135deg,#101228,#1e2e72)] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] md:p-12">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#5eead4]/18 blur-3xl" />
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
              <BadgeCheck size={14} />
              För annonsörer
            </div>
            <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
              Publicera, strukturera och få bättre koll på ansökningar, intresseanmälningar och leads.
            </h2>
            <p className="mt-4 text-base leading-7 text-white/78">
              Bovaro ger annonsörer ett samlat arbetsflöde för bostäder, kommersiella lokaler, parkering, förråd, mark och fastighetsobjekt.
            </p>
            <div className="mt-6">
              <Button
                href="/dashboard/listings"
                className="border border-white/22 bg-white/10 text-white hover:bg-white/16"
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
