import type { Metadata } from 'next'
import Link from 'next/link'
import { BellPlus, MapPin } from 'lucide-react'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { Button } from '@/components/ui/Button'
import { getPublishedListings } from '@/lib/data/listings'
import { citySlugToDisplayName } from '@/lib/seo/city'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params
  const cityName = citySlugToDisplayName(city)
  return {
    title: `Lediga lägenheter i ${cityName} — Bovaro`,
    description: `Sök lediga hyreslägenheter i ${cityName}. Förstahandskontrakt med tydliga krav, kostnadsfri bostadskö och ansökan direkt på Bovaro.`,
    alternates: { canonical: `/lediga-lagenheter/${city}` },
  }
}

export default async function CityRentalsPage({ params }: Props) {
  const { city } = await params
  const cityName = citySlugToDisplayName(city)

  const listings = await getPublishedListings(
    { mode: 'rent', segment: 'residential', city: cityName },
    { limit: 60 },
  )

  return (
    <section className="container-shell py-12">
      <div className="rounded-[40px] border border-[#dbeafe] bg-[linear-gradient(135deg,#eff6ff,#ffffff_55%,#f0fdfa)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#243b8f] shadow-sm">
          <MapPin size={13} />
          Hyresbostäder
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#111827] md:text-6xl">
          Lediga lägenheter i {cityName}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)] md:text-lg">
          {listings.length > 0
            ? `Just nu finns ${listings.length} publicerad${listings.length === 1 ? '' : 'e'} hyresbostäder i ${cityName} på Bovaro.`
            : `Just nu finns inga publicerade hyresbostäder i ${cityName} på Bovaro — skapa en bevakning så meddelar vi dig när något dyker upp.`}
        </p>
      </div>

      {listings.length > 0 ? (
        <div className="mt-8">
          <ListingGrid listings={listings} />
        </div>
      ) : (
        <div className="mt-8 rounded-[32px] border border-dashed border-[#d7dbe7] bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
            <BellPlus size={22} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[#111827]">Bli först att veta</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#6b7280]">
            Spara en sökbevakning för {cityName} så får du en notis så fort en ny hyresbostad publiceras.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href={`/listings?mode=rent&city=${encodeURIComponent(cityName)}`}>Sök och spara bevakning</Button>
            <Button href="/rent" variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
              Se alla hyresbostäder
            </Button>
          </div>
        </div>
      )}

      <div className="mt-10 rounded-[28px] bg-[#f7f8fc] p-6 text-sm leading-7 text-[#6b7280]">
        <h2 className="text-base font-semibold text-[#111827]">Hyra lägenhet i {cityName} via Bovaro</h2>
        <p className="mt-2">
          Bovaro är en svensk marknadsplats för förstahandsuthyrning. Du ansöker med en verifierad profil och en
          kostnadsfri <Link href="/bostadsko" className="font-semibold text-[#5b3df5]">bostadskö</Link> där kötiden
          räknas från dagen du går med. Varje annons visar hyresvärdens krav så att du vet vad som gäller innan du
          ansöker.
        </p>
      </div>
    </section>
  )
}
