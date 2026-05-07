import Link from 'next/link'
import Image from 'next/image'
import { BedDouble, Ruler, MapPin } from 'lucide-react'
import { ListingCardItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { FavoriteButton } from '@/components/listings/FavoriteButton'

export function ListingCard({ listing }: { listing: ListingCardItem }) {
  const isRent = listing.listingType === 'rent'

  return (
    <Card className="overflow-hidden border border-[#e8ebf3] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="relative h-60">
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#111827] shadow-sm">
          {listing.badge ?? (isRent ? 'Hyra' : 'Till salu')}
        </div>
        <div className="absolute right-4 top-4">
          <FavoriteButton listingId={listing.id} compact />
        </div>
      </div>

      <div className="p-5">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6b7280]">
          {isRent ? 'Hyra' : 'Till salu'}
        </div>

        <h3 className="mt-2 text-xl font-semibold leading-7 text-[#111827]">
          {listing.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-sm text-[#6b7280]">
          <MapPin size={14} />
          {listing.areaName}, {listing.city}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="text-xl font-semibold text-[#5b3df5]">
            {formatCurrency(listing.price, isRent ? 'rent' : 'sale')}
          </div>
          {listing.availableFrom ? (
            <div className="text-xs text-[#6b7280]">Inflytt: {listing.availableFrom}</div>
          ) : null}
        </div>

        <div className="mt-5 flex gap-4 text-sm text-[#6b7280]">
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
            {listing.features.slice(0, 3).map((feature, index) => (
              <span
                key={`${listing.id}-${feature}-${index}`}
                className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-medium text-[#4b5563]"
              >
                {feature}
              </span>
            ))}
          </div>

        <Link
          href={`/listing/${listing.slug}`}
          className="mt-6 inline-flex rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold !text-white transition hover:bg-[#0b1220]"
        >
          Visa objekt
        </Link>
      </div>
    </Card>
  )
}