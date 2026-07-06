'use server'

import { revalidatePath } from 'next/cache'
import { requireLandlordAccess } from '@/lib/data/landlord'
import { canTransition } from '@/lib/applications/status-machine'

export async function createViewingSlotAction(formData: FormData) {
  const { supabase, user } = await requireLandlordAccess()

  const listingId = String(formData.get('listingId') ?? '')
  const startsAt = String(formData.get('startsAt') ?? '').trim()
  if (!listingId || !startsAt) return

  const endsAt = String(formData.get('endsAt') ?? '').trim()

  // RLS validates listing ownership.
  const { error } = await supabase.from('viewing_slots').insert({
    listing_id: listingId,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    location_note: String(formData.get('locationNote') ?? '').trim() || null,
    max_attendees: Number(formData.get('maxAttendees') ?? 0) || null,
    created_by: user.id,
  })

  if (error) console.error('Failed to create viewing slot', error)
  revalidatePath('/landlord/viewings')
}

export async function inviteToViewingAction(formData: FormData) {
  const { supabase, user, profile } = await requireLandlordAccess()

  const slotId = String(formData.get('slotId') ?? '')
  const applicationIds = formData.getAll('applicationIds').map(String).filter(Boolean)
  if (!slotId || applicationIds.length === 0) return

  const actor = ['admin', 'super_admin'].includes(profile.role) ? 'admin' : 'landlord'

  for (const applicationId of applicationIds) {
    const { data: application } = await supabase
      .from('rental_applications')
      .select('id, user_id, status')
      .eq('id', applicationId)
      .maybeSingle()

    if (!application?.user_id) continue

    // RLS validates the landlord can manage the application.
    const { error } = await supabase.from('viewing_invitations').insert({
      slot_id: slotId,
      application_id: applicationId,
      user_id: application.user_id,
    })

    if (error) {
      console.error('Failed to invite to viewing', error)
      continue
    }

    // Move the application into viewing_invited when the transition is valid.
    if (canTransition(application.status, 'viewing_invited', actor)) {
      await supabase
        .from('rental_applications')
        .update({ status: 'viewing_invited', status_updated_at: new Date().toISOString() })
        .eq('id', applicationId)

      await supabase.from('rental_application_status_history').insert({
        application_id: applicationId,
        actor_user_id: user.id,
        from_status: application.status,
        to_status: 'viewing_invited',
        note: 'Inbjuden till visning',
      })
    }
  }

  revalidatePath('/landlord/viewings')
}

export async function updateViewingInvitationAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()

  const invitationId = String(formData.get('invitationId') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!invitationId || !['completed', 'no_show'].includes(status)) return

  await supabase
    .from('viewing_invitations')
    .update({ status })
    .eq('id', invitationId)

  revalidatePath('/landlord/viewings')
}

export async function deleteViewingSlotAction(formData: FormData) {
  const { supabase } = await requireLandlordAccess()
  const slotId = String(formData.get('slotId') ?? '')
  if (!slotId) return

  await supabase.from('viewing_slots').delete().eq('id', slotId)
  revalidatePath('/landlord/viewings')
}
