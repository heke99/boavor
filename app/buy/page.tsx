import { ListingGrid } from '@/components/listings/ListingGrid'
import { mockListings } from '@/lib/mock-data'

export default function BuyPage() {
  const listings = mockListings.filter((item) => item.listingType === 'sale')

  return (
    <section className="container-shell py-12">
      <h1 className="text-4xl font-semibold">Till salu</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Bostäder till salu med starkare objektsidor, premiumkänsla och bättre start för nästa byggsteg.
      </p>
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
