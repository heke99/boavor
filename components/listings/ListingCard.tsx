import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BedDouble, Building2, MapPin, Ruler, ShieldCheck } from 'lucide-react'
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
    <Card className="group overflow-hidden border border-white/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_28px_85px_rgba(15,23,42,0.14)]">
      <div className="relative h-64 overflow-hidden">
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/15" />
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#111827] shadow-sm backdrop-blur">
          {listing.badge ?? primaryMeta}
        </div>
        <div className="absolute bottom-4 left-4 rounded-full bg-black/42 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {listingTypeLabels[listing.listingType]}
        </div>
        <div className="absolute right-4 top-4">
          <FavoriteButton listingId={listing.id} compact />
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
          <span>{primaryMeta}</span>
          <span className="text-[#c4cad6]">•</span>
          <span>{listing.isVerified ? 'Verifierad' : 'Aktivt objekt'}</span>
        </div>

        <h3 className="mt-2 line-clamp-2 text-xl font-semibold leading-7 tracking-[-0.02em] text-[#111827]">
          {listing.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-sm text-[#6b7280]">
          <MapPin size={14} />
          {listing.areaName}, {listing.city}
        </div>

        <div className="mt-5 rounded-3xl bg-[#f7f8fc] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a8396]">Pris</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#5b3df5]">
            {formatCurrency(listing.price, isRent ? 'rent' : 'sale')}
          </div>
          {listing.availableFrom ? (
            <div className="mt-1 text-xs text-[#6b7280]">Tillträde: {listing.availableFrom}</div>
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

        <Link href={`/listing/${listing.slug}`} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold !text-white transition hover:bg-[#0b1220]">
          {listing.isVerified ? <ShieldCheck size={16} className="mr-2" /> : null}
          Visa objekt
          <ArrowRight size={16} className="ml-2 transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  )
}
