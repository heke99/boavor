import Link from 'next/link'
import Image from 'next/image'
import { BedDouble, Building2, MapPin, Ruler } from 'lucide-react'
import { ListingCardItem } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { FavoriteButton } from '@/components/listings/FavoriteButton'
import { getListingPrimaryMeta, listingTypeLabels } from '@/lib/listing-options'

export function ListingCard({ listing }: { listing: ListingCardItem }) {
  const isRent = listing.listingType === 'rent'
  const isResidential = listing.listingSegment === 'residential'
  const isInvestment = listing.listingSegment === 'investment'
  const isParking = listing.listingSegment === 'parking'
  const primaryMeta = getListingPrimaryMeta(listing.listingSegment, listing.commercialType)

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
          {listing.badge ?? primaryMeta}
        </div>
        <div className="absolute right-4 top-4">
          <FavoriteButton listingId={listing.id} compact />
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
          <span>{primaryMeta}</span>
          <span className="text-[#c4cad6]">•</span>
          <span>{listingTypeLabels[listing.listingType]}</span>
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
            <div className="text-xs text-[#6b7280]">Tillträde: {listing.availableFrom}</div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-sm text-[#6b7280]">
          {isResidential ? (
            <div className="flex items-center gap-2">
              <BedDouble size={16} />
              {listing.rooms} rum
            </div>
          ) : null}
          {listing.areaSqm ? (
            <div className="flex items-center gap-2">
              {isResidential ? <Ruler size={16} /> : <Building2 size={16} />}
              {listing.areaSqm} m²
            </div>
          ) : null}
          {listing.minLeaseMonths ? <div>{listing.minLeaseMonths} mån min.</div> : null}
          {isParking && listing.parkingType === 'ev_charging' ? <div>Laddplats</div> : null}
          {isInvestment && listing.unitsCount ? <div>{listing.unitsCount} units</div> : null}
          {isInvestment && listing.capRate ? <div>Cap rate {listing.capRate}%</div> : null}
          {isInvestment && listing.annualIncome ? <div>NOI/intäkt {listing.annualIncome.toLocaleString('sv-SE')} kr</div> : null}
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
