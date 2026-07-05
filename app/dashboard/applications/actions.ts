'use server'

import { revalidatePath } from 'next/cache'
import { requireSignedInUser } from '@/lib/data/rental-applications'
import { canTransition, type CanonicalApplicationStatus } from '@/lib/applications/status-machine'

const APPLICANT_NOTES: Partial<Record<CanonicalApplicationStatus, string>> = {
  withdrawn: 'Återkallad av den sökande',
  offer_accepted: 'Erbjudandet accepterades av den sökande',
  viewing_booked: 'Visningen bekräftades av den sökande',
}

/** Applicant-side status change (withdraw, accept offer, confirm viewing). */
async function applicantTransition(applicationId: string, toStatus: CanonicalApplicationStatus) {
  const { supabase, user } = await requireSignedInUser()
  if (!applicationId) return

  const { data: application } = await supabase
    .from('rental_applications')
    .select('id, status, listing_title')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!application) return

  // Server-side transition guard for the applicant actor.
  if (!canTransition(application.status, toStatus, 'applicant')) return

  const { error } = await supabase
    .from('rental_applications')
    .update({ status: toStatus, status_updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed applicant status transition', error)
    return
  }

  await supabase.from('rental_application_status_history').insert({
    application_id: applicationId,
    actor_user_id: user.id,
    from_status: application.status,
    to_status: toStatus,
    note: APPLICANT_NOTES[toStatus] ?? null,
  })

  revalidatePath('/dashboard/applications')
  revalidatePath('/dashboard')
}

export async function withdrawApplicationAction(formData: FormData) {
  await applicantTransition(String(formData.get('applicationId') ?? ''), 'withdrawn')
}

export async function acceptOfferAction(formData: FormData) {
  await applicantTransition(String(formData.get('applicationId') ?? ''), 'offer_accepted')
}

export async function declineOfferAction(formData: FormData) {
  await applicantTransition(String(formData.get('applicationId') ?? ''), 'withdrawn')
}

export async function confirmViewingAction(formData: FormData) {
  await applicantTransition(String(formData.get('applicationId') ?? ''), 'viewing_booked')
}
