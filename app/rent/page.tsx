import { ListingGrid } from '@/components/listings/ListingGrid'
import { getPublishedListings } from '@/lib/data/listings'

export const dynamic = 'force-dynamic'

export default async function RentPage() {
  const listings = await getPublishedListings({ mode: 'rent' })

  return (
    <section className="container-shell py-12">
      <div className="rounded-[40px] border border-[#dbeafe] bg-[linear-gradient(135deg,#eff6ff,#ffffff_55%,#f0fdfa)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
        <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#243b8f] shadow-sm">
          Hyresmarknad
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#111827] md:text-6xl">Hyra bostad, lokal eller kontor</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)] md:text-lg">
          Upptäck hyresobjekt med tydliga krav, smarta filter och snabb väg till ansökan eller intresseanmälan.
        </p>
      </div>
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
