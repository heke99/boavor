import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BadgeCheck, BedDouble, Building2, CalendarClock, MapPinned, Ruler, ShieldCheck } from 'lucide-react'
import { getListingBySlug, getRelatedListings } from '@/lib/data/listings'
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

export default async function ListingDetailPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const listing = await getListingBySlug(slug)

  if (!listing) {
    notFound()
  }

  const related = await getRelatedListings(listing, 3)
  const usesApplication = isRentalApplicationListing(listing.listingSegment, listing.listingType)
  const primaryMeta = getListingPrimaryMeta(listing.listingSegment, listing.commercialType)
  const inquirySent = sp.inquiry === 'sent'

  return (
    <section className="container-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="relative h-[420px] overflow-hidden rounded-[34px]">
            <Image src={listing.imageUrl} alt={listing.title} fill sizes="(max-width: 1024px) 100vw, 66vw" className="object-cover" />
          </div>

          <div className="mt-8">
            <div className="inline-flex rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
              {primaryMeta} · {listingTypeLabels[listing.listingType]}
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">{listing.title}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
              <MapPinned size={15} />
              {listing.areaName}, {listing.city}
            </div>
            <div className="mt-6 text-3xl font-semibold text-[var(--primary)]">{formatCurrency(listing.price, listing.listingType)}</div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {listing.listingSegment === 'residential' ? (
                <Card className="p-4">
                  <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                    <BedDouble size={16} />
                    Rum
                  </div>
                  <div className="mt-2 text-xl font-semibold">{listing.rooms}</div>
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                    <Building2 size={16} />
                    Typ
                  </div>
                  <div className="mt-2 text-xl font-semibold">{primaryMeta}</div>
                </Card>
              )}
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <Ruler size={16} />
                  Yta
                </div>
                <div className="mt-2 text-xl font-semibold">{listing.areaSqm} m²</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <CalendarClock size={16} />
                  Status
                </div>
                <div className="mt-2 text-xl font-semibold">{listing.availableFrom ? `Från ${listing.availableFrom}` : 'Aktiv annons'}</div>
              </Card>
            </div>

            {listing.listingSegment !== 'residential' ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Card className="p-4">
                  <div className="text-sm text-[var(--muted)]">Minsta avtalstid</div>
                  <div className="mt-2 text-xl font-semibold">{listing.minLeaseMonths ? `${listing.minLeaseMonths} mån` : 'Ej angivet'}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-[var(--muted)]">Moms</div>
                  <div className="mt-2 text-xl font-semibold">{listing.isVatApplicable ? 'Momspliktig' : 'Ej angivet'}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-[var(--muted)]">Pris per m²</div>
                  <div className="mt-2 text-xl font-semibold">{listing.pricePerSqm ? `${listing.pricePerSqm} kr/m²` : 'Ej angivet'}</div>
                </Card>
              </div>
            ) : null}

            <div className="mt-8 rounded-[30px] border border-black/8 bg-white p-6 shadow-[0_10px_30px_rgba(13,17,32,0.05)]">
              <h2 className="text-2xl font-semibold">Om objektet</h2>
              <p className="mt-4 text-base leading-8 text-[var(--muted)]">
                {listing.description || 'Annonsören har ännu inte lagt till en längre beskrivning.'}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {listing.features.map((feature, index) => (
                  <span key={`${listing.id}-${feature}-${index}`} className="rounded-full bg-black/5 px-3 py-2 text-sm text-[var(--muted)]">
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
              {listing.isVerified ? 'Verifierad annonsör' : 'Annonsör'}
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-semibold">{usesApplication ? 'Ansök enkelt' : 'Skicka intresseanmälan'}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {usesApplication
                  ? 'Ansök med din sparade profil. Köpoäng följer med som extra signal till hyresvärden.'
                  : 'För lokaler, kontor, parkering, förråd, mark, försäljning och investeringsobjekt använder Bovaro leads/intresseanmälningar.'}
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
              <h3 className="text-xl font-semibold">Kontakta annonsören</h3>
              {inquirySent ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  Din intresseanmälan är skickad.
                </div>
              ) : null}
              <form action={submitListingInquiry} className="mt-5 space-y-4">
                <input type="hidden" name="slug" value={listing.slug} />
                <div className="grid gap-3 md:grid-cols-2">
                  <input name="fullName" required placeholder="Namn" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="email" required type="email" placeholder="E-post" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="phone" placeholder="Telefon" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                  <input name="companyName" placeholder="Företag, valfritt" className="rounded-2xl border border-black/10 px-4 py-3 text-sm" />
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
                <textarea name="message" rows={5} placeholder="Meddelande" className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm" />
                <Button type="submit" className="w-full">Skicka intresseanmälan</Button>
              </form>
            </Card>
          ) : null}

          <Card className="p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--secondary)]">
              <BadgeCheck size={16} />
              {usesApplication ? 'Vad hyresvärden ser' : 'Lead-flöde'}
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
              {usesApplication ? (
                <>
                  <li>• Din profil med hushåll, arbete och inkomst</li>
                  <li>• Valda medsökande och dokument</li>
                  <li>• Köpoäng som extra merit, inte som tvingande regel</li>
                  <li>• Statusflöde direkt i annonsörsportalen</li>
                </>
              ) : (
                <>
                  <li>• Intresseanmälningar hamnar i annonsörens dashboard</li>
                  <li>• Status kan flyttas från ny till kontaktad, visning, förhandling eller avslutad</li>
                  <li>• Passar lokaler, kontor, parkering, förråd, mark och objekt till salu</li>
                </>
              )}
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
