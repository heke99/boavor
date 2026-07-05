import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ListingEditForm } from '@/components/dashboard/ListingEditForm'
import { getManagedListingEditData } from '@/lib/data/rental-applications'
import { updateListingDetailsAction } from '@/app/dashboard/listings/actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardListingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await getManagedListingEditData(id)
  if (!listing) notFound()

  // Landlord policies available for assignment (RLS limits to own policies).
  const supabase = await createSupabaseServerClient()
  const [{ data: policies }, { data: assignment }] = supabase
    ? await Promise.all([
        supabase.from('landlord_policies').select('id, name').order('created_at', { ascending: false }),
        supabase.from('listing_policy_assignments').select('policy_id').eq('listing_id', id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }]

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
          <ListingEditForm
            listing={listing}
            action={updateListingDetailsAction}
            policies={(policies ?? []).map((policy) => ({ id: policy.id, name: policy.name }))}
            assignedPolicyId={assignment?.policy_id ?? null}
          />
        </Card>
      </div>
    </DashboardShell>
  )
}
