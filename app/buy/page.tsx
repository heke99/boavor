import { ListingGrid } from '@/components/listings/ListingGrid'
import { getPublishedListings } from '@/lib/data/listings'

export const dynamic = 'force-dynamic'

export default async function BuyPage() {
  const listings = await getPublishedListings({ mode: 'sale' })

  return (
    <section className="container-shell py-12">
      <div className="rounded-[40px] border border-[#fed7aa] bg-[linear-gradient(135deg,#fff7ed,#ffffff_55%,#eef2ff)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
        <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a5b00] shadow-sm">
          Till salu
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#111827] md:text-6xl">Köp bostad, lokal eller fastighetsobjekt</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)] md:text-lg">
          Jämför bostäder, lokaler, mark och investeringsfastigheter med tydligare fakta och snabb kontaktväg.
        </p>
      </div>
      <div className="mt-8">
        <ListingGrid listings={listings} />
      </div>
    </section>
  )
}
