import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  BadgeCheck,
  BedDouble,
  Building2,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  MapPinned,
  Ruler,
  ShieldCheck,
} from 'lucide-react'
import { getListingBySlug, getListingPublicStats, getRelatedListings } from '@/lib/data/listings'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ListingGrid } from '@/components/listings/ListingGrid'
import { Card } from '@/components/ui/Card'
import { getListingPrimaryMeta, isRentalApplicationListing, listingTypeLabels } from '@/lib/listing-options'
import { submitListingInquiry } from './actions'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Enligt överenskommelse'
  try {
    return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  } catch {
    return value
  }
}

function yesNo(value: boolean | null | undefined) {
  if (value === true) return 'Ja'
  if (value === false) return 'Nej'
  return 'Ej angivet'
}

function FactCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <Card className="p-4">
      <div className="text-sm text-[#6b7280]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[#111827]">{value || 'Ej angivet'}</div>
    </Card>
  )
}

export default async function ListingDetailPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const listing = await getListingBySlug(slug)

  if (!listing) {
    notFound()
  }

  const usesApplication = isRentalApplicationListing(listing.listingSegment, listing.listingType)
  const [related, publicStats] = await Promise.all([
    getRelatedListings(listing, 3),
    usesApplication ? getListingPublicStats(listing.id) : Promise.resolve({ applicantCount: null, queuePosition: null }),
  ])
  const renderedAt = new Date()
  const deadlinePassed = listing.applicationDeadline
    ? new Date(listing.applicationDeadline) < renderedAt
    : false
  const primaryMeta = getListingPrimaryMeta(listing.listingSegment, listing.commercialType)
  const inquirySent = sp.inquiry === 'sent'
  const inquiryError =
    sp.inquiry === 'invalid'
      ? 'Fyll i namn och en giltig e-postadress.'
      : sp.inquiry === 'rate_limited'
        ? 'Du har skickat flera intresseanmälningar nyligen. Vänta en stund och försök igen.'
        : sp.inquiry === 'failed'
          ? 'Intresseanmälan kunde inte skickas just nu.'
          : null
  const gallery = listing.images.length ? listing.images : [{ id: listing.id, imageUrl: listing.imageUrl, altText: listing.title, isCover: true, position: 0 }]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: listing.description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bovaro.se'}/listing/${listing.slug}`,
    image: gallery.map((image) => image.imageUrl),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.street ?? undefined,
      postalCode: listing.zipCode ?? undefined,
      addressLocality: listing.city,
      addressCountry: listing.country ?? 'SE',
    },
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'SEK',
      availability: listing.status === 'published' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    floorSize: listing.areaSqm ? { '@type': 'QuantitativeValue', value: listing.areaSqm, unitCode: 'MTK' } : undefined,
    numberOfRooms: listing.rooms || undefined,
  }

  return (
    <section className="container-shell py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="relative h-[420px] overflow-hidden rounded-[34px] bg-[#f3f4f6]">
            <Image src={listing.imageUrl} alt={listing.title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" priority />
          </div>

          {gallery.length > 1 ? (
            <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-5">
              {gallery.slice(0, 5).map((image) => (
                <div key={image.id} className="relative h-24 overflow-hidden rounded-2xl bg-[#f3f4f6]">
                  <Image src={image.imageUrl} alt={image.altText ?? listing.title} fill sizes="160px" className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-8">
            <div className="inline-flex rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
              {primaryMeta} · {listingTypeLabels[listing.listingType]}
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#111827]">{listing.title}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#5b6475]">
              <MapPinned size={15} />
              {[listing.street, listing.areaName, listing.city].filter(Boolean).join(', ')}
              {listing.hideExactAddress ? (
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">Exakt adress visas senare i processen</span>
              ) : null}
            </div>
            {(listing.isStudentHousing || listing.isSeniorHousing || listing.isShortTerm || listing.hasAccessibility) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.isStudentHousing ? <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">Studentbostad</span> : null}
                {listing.isSeniorHousing ? <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">Seniorbostad</span> : null}
                {listing.isShortTerm ? <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-[#92400e]">Korttidskontrakt</span> : null}
                {listing.hasAccessibility ? <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">Tillgänglighetsanpassad</span> : null}
              </div>
            ) : null}
            <div className="mt-6 text-3xl font-semibold text-[var(--primary)]">{formatCurrency(listing.price, listing.listingType)}</div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {listing.listingSegment === 'residential' ? (
                <Card className="p-4">
                  <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                    <BedDouble size={16} />
                    Rum
                  </div>
                  <div className="mt-2 text-xl font-semibold text-[#111827]">{listing.rooms || 'Ej angivet'}</div>
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                    <Building2 size={16} />
                    Typ
                  </div>
                  <div className="mt-2 text-xl font-semibold text-[#111827]">{primaryMeta}</div>
                </Card>
              )}
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                  <Ruler size={16} />
                  Yta
                </div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">{listing.areaSqm ? `${listing.areaSqm} m²` : 'Ej angivet'}</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[#6b7280]">
                  <CalendarClock size={16} />
                  Tillträde
                </div>
                <div className="mt-2 text-xl font-semibold text-[#111827]">{formatDate(listing.availableFrom)}</div>
              </Card>
            </div>

            <div className="mt-8 rounded-[30px] border border-black/8 bg-white p-6 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
              <h2 className="text-2xl font-semibold text-[#111827]">Om objektet</h2>
              <p className="mt-4 text-base leading-8 text-[#5b6475]">
                {listing.description || 'Kontakta annonsören för mer information om objektet.'}
              </p>

              {listing.features.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {listing.features.map((feature, index) => (
                    <span key={`${listing.id}-${feature}-${index}`} className="rounded-full bg-black/5 px-3 py-2 text-sm text-[#5b6475]">
                      {feature}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {usesApplication && listing.rentalRequirements ? (
              <div className="mt-6 rounded-[30px] border border-black/8 bg-white p-6 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
                <h2 className="text-2xl font-semibold text-[#111827]">Hyreskrav</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <FactCard label="Minsta månadsinkomst" value={listing.rentalRequirements.minIncome ? `${listing.rentalRequirements.minIncome.toLocaleString('sv-SE')} kr` : null} />
                  <FactCard label="Anställning krävs" value={yesNo(listing.rentalRequirements.employmentRequired)} />
                  <FactCard label="Referenser krävs" value={yesNo(listing.rentalRequirements.referencesRequired)} />
                  <FactCard label="Husdjur" value={listing.rentalRequirements.petsAllowed ? 'Tillåtet' : 'Ej angivet'} />
                </div>
                {listing.policySummary ? (
                  <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm leading-7 text-[#5b6475]">{listing.policySummary}</p>
                ) : null}
              </div>
            ) : null}

            {usesApplication ? (
              <div className="mt-6 rounded-[30px] border border-black/8 bg-white p-6 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
                <h2 className="text-2xl font-semibold text-[#111827]">Så går uthyrningen till</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <FactCard
                    label="Sista ansökningsdag"
                    value={
                      listing.applicationDeadline
                        ? `${formatDate(listing.applicationDeadline)}${deadlinePassed ? ' (passerad)' : ''}`
                        : 'Löpande urval'
                    }
                  />
                  <FactCard label="Visning" value={listing.viewingInfo || 'Information kommer från hyresvärden'} />
                  {publicStats.applicantCount !== null ? (
                    <FactCard label="Antal sökande" value={`${publicStats.applicantCount} st`} />
                  ) : null}
                  {publicStats.queuePosition ? (
                    <FactCard
                      label="Din uppskattade köplats"
                      value={`Plats ${publicStats.queuePosition.position} (${publicStats.queuePosition.points} poäng)`}
                    />
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-[#5b6475]">
                  Du ansöker med din Bovaro-profil. Hyresvärden ser din ansökan med kötid, inkomst och valda dokument
                  och gör ett urval utifrån sina krav. Du kan följa status under Ansökningar i din översikt.
                </p>
              </div>
            ) : null}

            {listing.listingSegment !== 'residential' ? (
              <div className="mt-6 rounded-[30px] border border-black/8 bg-white p-6 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
                <h2 className="text-2xl font-semibold text-[#111827]">Objektfakta</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <FactCard label="Moms" value={listing.isVatApplicable ? 'Momspliktig' : 'Ej angivet'} />
                  <FactCard label="Minsta avtalstid" value={listing.minLeaseMonths ? `${listing.minLeaseMonths} månader` : null} />
                  <FactCard label="Pris per m²" value={listing.pricePerSqm ? `${listing.pricePerSqm.toLocaleString('sv-SE')} kr/m²` : null} />
                  <FactCard label="Service/driftavgift" value={listing.monthlyServiceFee ? `${listing.monthlyServiceFee.toLocaleString('sv-SE')} kr/mån` : null} />
                  <FactCard label="Årlig intäkt / NOI" value={listing.annualIncome ? `${listing.annualIncome.toLocaleString('sv-SE')} kr` : null} />
                  <FactCard label="Direktavkastning" value={listing.capRate ? `${listing.capRate}%` : null} />
                  <FactCard label="Antal units" value={listing.unitsCount} />
                  <FactCard label="Uthyrningsgrad" value={listing.occupancyRate ? `${listing.occupancyRate}%` : null} />
                  <FactCard label="Vakansgrad" value={listing.vacancyRate ? `${listing.vacancyRate}%` : null} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
              <ShieldCheck size={16} />
              {listing.isVerified ? 'Verifierad annonsör' : 'Annonsör'}
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-[#111827]">{usesApplication ? 'Ansök om bostaden' : 'Skicka intresseanmälan'}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5b6475]">
                {usesApplication
                  ? 'Skicka en strukturerad ansökan med din profil, medsökande, dokument och personligt meddelande.'
                  : 'Beskriv ditt behov så skickas din intresseanmälan direkt till annonsören.'}
              </p>
            </div>
            <div className="mt-6 space-y-3">
              {usesApplication ? (
                <Button href={`/listing/${listing.slug}/apply`} className="w-full">
                  Ansök om bostaden
                </Button>
              ) : null}
              <Button href="/dashboard/favorites" variant="ghost" className="w-full border border-black/8">
                Spara som favorit
              </Button>
            </div>
          </Card>

          {!usesApplication ? (
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-[#111827]">Kontakta annonsören</h3>
              {inquirySent ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  Din intresseanmälan är skickad.
                </div>
              ) : null}
              {inquiryError ? (
                <div className="mt-4 rounded-2xl bg-[#fef2f2] p-4 text-sm font-semibold text-[#b91c1c]">
                  {inquiryError}
                </div>
              ) : null}
              <form action={submitListingInquiry} className="mt-5 space-y-4">
                <input type="hidden" name="slug" value={listing.slug} />
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="fullName" required placeholder="Namn" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="email" required type="email" placeholder="E-post" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="phone" placeholder="Telefon" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="companyName" placeholder="Företag, valfritt" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="budget" placeholder={listing.listingType === 'sale' ? 'Budget / finansiering' : 'Budget per månad'} className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="desiredTimeline" placeholder="Önskad tidsplan" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                </div>
                <select name="inquiryType" defaultValue="interest" className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm">
                  <option value="interest">Skicka intresseanmälan</option>
                  <option value="viewing">Boka visning</option>
                  <option value="offer_request">Begär offert</option>
                  <option value="contact">Kontakta annonsör</option>
                </select>
                <select name="preferredContactMethod" defaultValue="email" className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm">
                  <option value="email">Kontakta mig via e-post</option>
                  <option value="phone">Kontakta mig via telefon</option>
                </select>
                <textarea name="message" rows={5} placeholder="Beskriv behov, yta, verksamhet, tidplan eller annan relevant information." className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                <Button type="submit" className="w-full">Skicka intresseanmälan</Button>
              </form>
            </Card>
          ) : null}

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--secondary)]">
              <BadgeCheck size={16} />
              {usesApplication ? 'Ansökningsflöde' : 'Intresseflöde'}
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5b6475]">
              {usesApplication ? (
                <>
                  <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />Profil, medsökande och dokument samlas i en ansökan.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />Annonsören kan följa status i sin dashboard.</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />Du ser dina skickade ansökningar under Mina ansökningar.</li>
                </>
              ) : (
                <>
                  <li className="flex gap-2"><DoorOpen className="mt-1 h-4 w-4 shrink-0 text-[var(--secondary)]" />Intresseanmälningar hamnar direkt hos annonsören.</li>
                  <li className="flex gap-2"><DoorOpen className="mt-1 h-4 w-4 shrink-0 text-[var(--secondary)]" />Annonsören kan markera kontakt, visning, förhandling och avslut.</li>
                  <li className="flex gap-2"><DoorOpen className="mt-1 h-4 w-4 shrink-0 text-[var(--secondary)]" />Passar lokaler, kontor, parkering, förråd, mark och objekt till salu.</li>
                </>
              )}
            </ul>
          </Card>
        </div>
      </div>

      {related.length ? (
        <div className="mt-14">
          <h2 className="text-2xl font-semibold text-[#111827]">Liknande objekt</h2>
          <div className="mt-6">
            <ListingGrid listings={related} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
