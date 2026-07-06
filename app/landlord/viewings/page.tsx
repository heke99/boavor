import { LandlordShell } from '@/components/landlord/LandlordShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { statusLabel } from '@/lib/applications/status-machine'
import {
  createViewingSlotAction,
  deleteViewingSlotAction,
  inviteToViewingAction,
  updateViewingInvitationAction,
} from './actions'

export const dynamic = 'force-dynamic'

const INVITATION_STATUS_LABELS: Record<string, string> = {
  invited: 'Inbjuden',
  accepted: 'Bekräftad',
  declined: 'Tackade nej',
  completed: 'Genomförd',
  no_show: 'Uteblev',
}

export default async function LandlordViewingsPage() {
  const context = await requireLandlordAccess()
  const { supabase, user, companyIds } = context

  const listingFilter = companyIds.length
    ? `created_by.eq.${user.id},company_id.in.(${companyIds.join(',')})`
    : `created_by.eq.${user.id}`

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, status')
    .or(listingFilter)
    .in('status', ['published', 'paused'])
    .order('created_at', { ascending: false })

  const listingIds = (listings ?? []).map((listing) => listing.id)

  const { data: slots } = listingIds.length
    ? await supabase
        .from('viewing_slots')
        .select('id, listing_id, starts_at, ends_at, location_note, max_attendees, viewing_invitations(id, application_id, status, responded_at)')
        .in('listing_id', listingIds)
        .order('starts_at', { ascending: true })
    : { data: [] }

  // Applications eligible for viewing invitations, grouped by listing.
  const { data: invitableApplications } = listingIds.length
    ? await supabase
        .from('rental_applications')
        .select('id, listing_id, applicant_full_name, status')
        .in('listing_id', listingIds)
        .in('status', ['submitted', 'reviewing', 'qualified', 'shortlisted', 'viewing_invited'])
    : { data: [] }

  return (
    <LandlordShell
      activePath="/landlord/viewings"
      title="Visningar"
      description="Skapa visningstider, bjud in sökande och registrera närvaro. Sökande bekräftar via sin ansökan."
    >
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-[#111827]">Ny visningstid</h2>
        {(listings ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl bg-[#f7f8fc] p-4 text-sm text-[#6b7280]">
            Publicera en annons först — visningstider kopplas till en annons.
          </p>
        ) : (
          <form action={createViewingSlotAction} className="mt-5 grid gap-3 md:grid-cols-5">
            <Select name="listingId" defaultValue={listings?.[0]?.id}>
              {(listings ?? []).map((listing) => (
                <option key={listing.id} value={listing.id}>{listing.title}</option>
              ))}
            </Select>
            <Input name="startsAt" type="datetime-local" required />
            <Input name="endsAt" type="datetime-local" />
            <Input name="locationNote" placeholder="Plats/instruktion" />
            <div className="flex gap-2">
              <Input name="maxAttendees" type="number" min={1} placeholder="Max antal" className="flex-1" />
              <Button type="submit">Skapa</Button>
            </div>
          </form>
        )}
      </Card>

      {(slots ?? []).length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Inga visningstider ännu</h2>
          <p className="mt-3 text-sm text-[#6b7280]">Skapa en visningstid ovan och bjud sedan in sökande.</p>
        </Card>
      ) : (
        (slots ?? []).map((slot) => {
          const listing = (listings ?? []).find((item) => item.id === slot.listing_id)
          const invitations = slot.viewing_invitations ?? []
          const invitedApplicationIds = new Set(invitations.map((invitation) => invitation.application_id))
          const candidates = (invitableApplications ?? []).filter(
            (application) => application.listing_id === slot.listing_id && !invitedApplicationIds.has(application.id),
          )

          return (
            <Card key={slot.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[#111827]">
                    {new Intl.DateTimeFormat('sv-SE', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(slot.starts_at))}
                  </h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    {listing?.title} · {listing?.city}
                    {slot.location_note ? ` · ${slot.location_note}` : ''}
                    {slot.max_attendees ? ` · max ${slot.max_attendees} deltagare` : ''}
                  </p>
                </div>
                <form action={deleteViewingSlotAction}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <Button type="submit" variant="ghost" className="h-9 border border-[#fecaca] px-3 text-xs !text-[#b91c1c]">
                    Ta bort tid
                  </Button>
                </form>
              </div>

              {invitations.length > 0 ? (
                <div className="mt-5 space-y-2">
                  {invitations.map((invitation) => {
                    const application = (invitableApplications ?? []).find((item) => item.id === invitation.application_id)
                    return (
                      <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8ebf3] px-4 py-3 text-sm">
                        <div>
                          <span className="font-semibold text-[#111827]">{application?.applicant_full_name ?? 'Sökande'}</span>
                          <span className="ml-2 rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#6b7280]">
                            {INVITATION_STATUS_LABELS[invitation.status] ?? invitation.status}
                          </span>
                          {application ? (
                            <span className="ml-2 text-xs text-[#6b7280]">Ansökan: {statusLabel(application.status)}</span>
                          ) : null}
                        </div>
                        {['invited', 'accepted'].includes(invitation.status) ? (
                          <div className="flex gap-2">
                            <form action={updateViewingInvitationAction}>
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <input type="hidden" name="status" value="completed" />
                              <Button type="submit" variant="ghost" className="h-8 border border-black/10 px-3 text-xs">Genomförd</Button>
                            </form>
                            <form action={updateViewingInvitationAction}>
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <input type="hidden" name="status" value="no_show" />
                              <Button type="submit" variant="ghost" className="h-8 border border-black/10 px-3 text-xs">Uteblev</Button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {candidates.length > 0 ? (
                <details className="mt-5 rounded-2xl border border-[#e8ebf3] p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[#1d4ed8]">
                    Bjud in sökande ({candidates.length} möjliga)
                  </summary>
                  <form action={inviteToViewingAction} className="mt-3 space-y-3">
                    <input type="hidden" name="slotId" value={slot.id} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {candidates.map((application) => (
                        <label key={application.id} className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2 text-sm">
                          <input type="checkbox" name="applicationIds" value={application.id} />
                          {application.applicant_full_name} ({statusLabel(application.status)})
                        </label>
                      ))}
                    </div>
                    <Button type="submit" variant="secondary">Skicka inbjudningar</Button>
                  </form>
                </details>
              ) : null}
            </Card>
          )
        })
      )}
    </LandlordShell>
  )
}
