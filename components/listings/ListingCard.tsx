import Link from 'next/link'
import Image from 'next/image'
import { BedDouble, Ruler, MapPin } from 'lucide-react'
import { ListingCardItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'

export function ListingCard({ listing }: { listing: ListingCardItem }) {
  const isRent = listing.listingType === 'rent'

  return (
    <Card className="overflow-hidden">
      <div className="relative h-60">
        <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
          {listing.badge ?? (isRent ? 'Hyra' : 'Till salu')}
        </div>
      </div>
      <div className="p-5">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
          {isRent ? 'Hyra' : 'Till salu'}
        </div>
        <h3 className="mt-2 text-xl font-semibold leading-7">{listing.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
          <MapPin size={14} />
          {listing.areaName}, {listing.city}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="text-xl font-semibold text-[var(--primary)]">{formatCurrency(listing.price, isRent ? 'rent' : 'sale')}</div>
          {listing.availableFrom ? <div className="text-xs text-[var(--muted)]">Inflytt: {listing.availableFrom}</div> : null}
        </div>
        <div className="mt-5 flex gap-4 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <BedDouble size={16} />
            {listing.rooms} rum
          </div>
          <div className="flex items-center gap-2">
            <Ruler size={16} />
            {listing.areaSqm} m²
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {listing.features.slice(0, 3).map((feature) => (
            <span key={feature} className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-[var(--muted)]">
              {feature}
            </span>
          ))}
        </div>
        <Link
          href={`/listing/${listing.slug}`}
          className="mt-6 inline-flex rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Visa objekt
        </Link>
      </div>
    </Card>
  )
}
