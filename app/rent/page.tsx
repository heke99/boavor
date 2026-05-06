import { ListingGrid } from '@/components/listings/ListingGrid'
import { mockListings } from '@/lib/mock-data'

export default function RentPage() {
  const listings = mockListings.filter((item) => item.listingType === 'rent')

  return (
    <section className="container-shell py-12">
      <h1 className="text-4xl font-semibold">Hyra</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        Utforska hyresobjekt med tydligare presentation, bättre struktur och snabbare väg till nästa steg.
      </p>
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
