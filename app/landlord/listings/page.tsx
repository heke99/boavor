import Link from 'next/link'
import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { duplicateListingAction, schedulePublishAction, updateListingStatusAction } from '@/app/dashboard/listings/actions'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  published: 'Publicerad',
  paused: 'Pausad',
  rented: 'Uthyrd',
  sold: 'Såld',
  archived: 'Arkiverad',
}

export default async function LandlordListingsPage() {
  const context = await requireLandlordAccess()
  const { supabase, user, companyIds } = context

  const listingFilter = companyIds.length
    ? `created_by.eq.${user.id},company_id.in.(${companyIds.join(',')})`
    : `created_by.eq.${user.id}`

  const { data: listings } = await supabase
    .from('listings')
    .select('id, slug, title, city, status, price, listing_type, scheduled_publish_at, application_deadline, created_at')
    .or(listingFilter)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <LandlordShell
      activePath="/landlord/listings"
      title="Annonser"
      description="Publicera, pausa, schemalägg och duplicera era annonser. Detaljredigering görs per annons."
    >
      <div className="flex flex-wrap gap-3">
        <Button href="/dashboard/listings">Skapa ny annons</Button>
        <Button href="/landlord/properties" variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
          Skapa annons från lägenhet
        </Button>
      </div>

      {(listings ?? []).length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga annonser ännu</h2>
          <p className="mt-3 text-sm text-[#6b7280]">Skapa er första annons eller importera lägenheter under Fastigheter.</p>
        </Card>
      ) : (
        (listings ?? []).map((listing) => (
          <Card key={listing.id} className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#111827]">{listing.title}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      listing.status === 'published'
                        ? 'bg-[#dcfce7] text-[#166534]'
                        : listing.status === 'draft'
                          ? 'bg-[#f3f4f6] text-[#6b7280]'
                          : 'bg-[#eef2ff] text-[#4338ca]'
                    }`}
                  >
                    {STATUS_LABELS[listing.status] ?? listing.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {listing.city} · {formatCurrency(listing.price, listing.listing_type)}
                  {listing.application_deadline
                    ? ` · Sista ansökningsdag ${new Date(listing.application_deadline).toLocaleDateString('sv-SE')}`
                    : ''}
                </p>
                {listing.scheduled_publish_at ? (
                  <p className="mt-1 text-xs font-semibold text-[#b45309]">
                    Schemalagd publicering: {new Date(listing.scheduled_publish_at).toLocaleString('sv-SE')}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link href={`/dashboard/listings/${listing.id}`} className="font-semibold text-[#1d4ed8]">Urval och ansökningar</Link>
                  <Link href={`/dashboard/listings/${listing.id}/edit`} className="font-semibold text-[#1d4ed8]">Redigera</Link>
                  <Link href={`/listing/${listing.slug}`} className="font-semibold text-[#6b7280]">Förhandsvisa</Link>
                </div>
              </div>

              <div className="flex min-w-[240px] flex-col gap-2">
                <form action={updateListingStatusAction} className="flex gap-2">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <Select name="status" defaultValue={listing.status} className="h-10 flex-1 text-sm">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                  <Button type="submit" variant="secondary" className="h-10 px-3 text-xs">Spara</Button>
                </form>
                <form action={schedulePublishAction} className="flex gap-2">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <Input
                    name="publishAt"
                    type="datetime-local"
                    defaultValue={listing.scheduled_publish_at ? listing.scheduled_publish_at.slice(0, 16) : ''}
                    className="h-10 flex-1 rounded-2xl text-xs"
                  />
                  <Button type="submit" variant="ghost" className="h-10 border border-black/10 px-3 text-xs">Schemalägg</Button>
                </form>
                <form action={duplicateListingAction}>
                  <input type="hidden" name="listingId" value={listing.id} />
                  <Button type="submit" variant="ghost" className="h-10 w-full border border-black/10 text-xs">Duplicera som utkast</Button>
                </form>
              </div>
            </div>
          </Card>
        ))
      )}
    </LandlordShell>
  )
}
