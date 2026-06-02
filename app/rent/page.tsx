import type { Metadata } from 'next'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { getPublishedListings } from '@/lib/data/listings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hyra bostad, lokal, kontor och parkering',
  description:
    'Hitta hyresbostäder, lägenheter, hus, lokaler, kontor, parkeringar, förråd och mark att hyra på Bovaro.',
  alternates: { canonical: '/rent' },
}

export default async function RentPage() {
  const listings = await getPublishedListings({ mode: 'rent' })

  return (
    <section className="container-shell py-12">
      <h1 className="text-4xl font-semibold">Hyra</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Hyresobjekt för bostäder, lokaler, kontor, parkeringar, förråd och mark.
      </p>
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
