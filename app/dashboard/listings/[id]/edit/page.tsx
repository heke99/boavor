import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ListingEditForm } from '@/components/dashboard/ListingEditForm'
import { getManagedListingEditData } from '@/lib/data/rental-applications'
import { updateListingDetailsAction } from '@/app/dashboard/listings/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardListingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await getManagedListingEditData(id)
  if (!listing) notFound()

  return (
    <DashboardShell
      activePath="/dashboard/listings"
      title={`Redigera: ${listing.title}`}
      description="Uppdatera objektets grundinfo, kategori, pris, dynamiska fält, bilder, status och publiceringsläge."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button href={`/dashboard/listings/${listing.id}`} variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
            Till objektdetalj
          </Button>
          <Button href={`/listing/${listing.slug}`} variant="ghost" className="border border-[#d7dbe7] !text-[#111827]">
            Förhandsvisa publik sida
          </Button>
        </div>

        <Card className="p-6">
          <ListingEditForm listing={listing} action={updateListingDetailsAction} />
        </Card>
      </div>
    </DashboardShell>
  )
}
