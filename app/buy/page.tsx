import { ListingGrid } from '@/components/listings/ListingGrid'
import { getPublishedListings } from '@/lib/data/listings'

export const dynamic = 'force-dynamic'

export default async function BuyPage() {
  const listings = await getPublishedListings({ mode: 'sale' })

  return (
    <section className="container-shell py-12">
      <h1 className="text-4xl font-semibold">Till salu</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Bostäder till salu med starkare objektsidor, premiumkänsla och direktkopplad datamodell.
      </p>
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
