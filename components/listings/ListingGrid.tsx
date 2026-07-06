import { ListingCard } from '@/components/listings/ListingCard'
import { ListingCardItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'

export function ListingGrid({ listings }: { listings: ListingCardItem[] }) {
  if (!listings.length) {
    return (
      <Card className="relative overflow-hidden p-10 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-[#5b3df5]/10 blur-3xl" />
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5b3df5]">
          <span className="text-2xl">⌕</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">Inga objekt hittades</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Just nu finns inga publicerade objekt som matchar sökningen. Ändra filtren eller kom tillbaka senare.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm font-semibold">
          <a href="/listings" className="rounded-full bg-[#f3f4f6] px-4 py-2 text-[#111827] hover:bg-[#e5e7eb]">Rensa filter</a>
          <a href="/dashboard/saved-searches" className="rounded-full bg-[#eef2ff] px-4 py-2 text-[#243b8f] hover:bg-[#e0e7ff]">Spara sökning</a>
        </div>
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
