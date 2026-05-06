import { ListingCard } from '@/components/listings/ListingCard'
import { ListingCardItem } from '@/lib/types'

export function ListingGrid({ listings }: { listings: ListingCardItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
