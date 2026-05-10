import { ListingCard } from '@/components/listings/ListingCard'
import { ListingCardItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'

export function ListingGrid({ listings }: { listings: ListingCardItem[] }) {
  if (!listings.length) {
    return (
      <Card className="p-10 text-center">
        <h2 className="text-2xl font-semibold">Inga objekt hittades</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Just nu finns inga publicerade objekt som matchar sökningen. Ändra filtren eller kom tillbaka senare.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
