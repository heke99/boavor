import { ListingGrid } from '@/components/listings/ListingGrid'
import { ListingFilters } from '@/components/listings/ListingFilters'
import { getPublishedListings } from '@/lib/data/listings'
import { SearchFilters } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ListingsPage({ searchParams }: Props) {
  const params = await searchParams
  const filters: SearchFilters = {
    mode: typeof params.mode === 'string' && (params.mode === 'rent' || params.mode === 'sale') ? params.mode : undefined,
    city: typeof params.city === 'string' ? params.city : undefined,
    rooms: typeof params.rooms === 'string' ? params.rooms : undefined,
    maxPrice: typeof params.maxPrice === 'string' ? params.maxPrice : undefined,
    propertyType: typeof params.propertyType === 'string' ? params.propertyType : undefined,
  }

  const listings = await getPublishedListings(filters)

  return (
    <section className="container-shell py-12">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold">Alla objekt</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          Utforska hyresrätter, bostäder till salu och fastigheter med tydligare struktur och nu direktkopplad databasmodell.
        </p>
      </div>

      <div className="mt-8">
        <ListingFilters />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-[var(--muted)]">{listings.length} träffar</div>
        <div className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[#8a6000]">
          Fas 9: favoriter + sparade sökningar
        </div>
      </div>

      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
