import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BadgeCheck, BedDouble, Ruler, MapPinned, CalendarClock, ShieldCheck } from 'lucide-react'
import { getListingBySlug, filterListings } from '@/lib/search'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { Card } from '@/components/ui/Card'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ListingDetailPage({ params }: Props) {
  const { slug } = await params
  const listing = getListingBySlug(slug)

  if (!listing) {
    notFound()
  }

  const related = filterListings({
    mode: listing.listingType,
    city: listing.city,
  }).filter((item) => item.slug !== listing.slug).slice(0, 3)

  const isRent = listing.listingType === 'rent'

  return (
    <section className="container-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="relative h-[420px] overflow-hidden rounded-[34px]">
            <Image
              src={listing.imageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>

          <div className="mt-8">
            <div className="inline-flex rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
              {isRent ? 'Hyresobjekt' : 'Till salu'}
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">{listing.title}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
              <MapPinned size={15} />
              {listing.areaName}, {listing.city}
            </div>
            <div className="mt-6 text-3xl font-semibold text-[var(--primary)]">
              {formatCurrency(listing.price, isRent ? 'rent' : 'sale')}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <BedDouble size={16} />
                  Rum
                </div>
                <div className="mt-2 text-xl font-semibold">{listing.rooms}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <Ruler size={16} />
                  Boyta
                </div>
                <div className="mt-2 text-xl font-semibold">{listing.areaSqm} m²</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <CalendarClock size={16} />
                  Status
                </div>
                <div className="mt-2 text-xl font-semibold">{isRent ? 'Tillgänglig nu' : 'Aktiv annons'}</div>
              </Card>
            </div>

            <div className="mt-8 rounded-[30px] border border-black/8 bg-white p-6 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
              <h2 className="text-2xl font-semibold">Om bostaden</h2>
              <p className="mt-4 text-base leading-8 text-[var(--muted)]">
                Detta är en premiumstart för Bovaro där objektsidan är byggd för att kännas modern, tydlig och förtroendeingivande.
                Nästa steg kan koppla in verkliga listing-data, favoriter, ansökningsflöden och matchscore ovanpå samma struktur.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {listing.features.map((feature) => (
                  <span key={feature} className="rounded-full bg-black/5 px-3 py-2 text-sm text-[var(--muted)]">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
              <ShieldCheck size={16} />
              Verifierad annonsör
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-semibold">{isRent ? 'Ansök enkelt' : 'Anmäl intresse'}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Denna layout är redo för auth, favoriter, sparad profil och nästa steg i fas 10.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <Button className="w-full">{isRent ? 'Ansök om bostaden' : 'Skicka intresseanmälan'}</Button>
              <Button variant="ghost" className="w-full border border-black/8">
                Spara som favorit
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--secondary)]">
              <BadgeCheck size={16} />
              Varför den här sidan är byggd rätt
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              <li>• Stark visuell header med premiumkänsla</li>
              <li>• Tydlig CTA för hyra eller till salu</li>
              <li>• Redo för matchscore, favoriter och sparad profil</li>
              <li>• Enkel att bygga vidare mot verklig Supabase-data</li>
            </ul>
          </Card>
        </div>
      </div>

      {related.length ? (
        <div className="mt-14">
          <h2 className="text-2xl font-semibold">Liknande objekt</h2>
          <div className="mt-6">
            <ListingGrid listings={related} />
          </div>
        </div>
      ) : null}
    </section>
  )
}