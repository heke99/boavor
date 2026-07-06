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

async function respondToOffer(applicationId: string, accept: boolean) {
  const { supabase, user } = await requireSignedInUser()
  if (!applicationId) return

  // Update the open offer row (RLS: applicant owns it).
  const { data: offer } = await supabase
    .from('rental_offers')
    .select('id, status')
    .eq('application_id', applicationId)
    .eq('user_id', user.id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (offer) {
    await supabase
      .from('rental_offers')
      .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
      .eq('id', offer.id)

    await supabase.from('rental_offer_events').insert({
      offer_id: offer.id,
      actor_user_id: user.id,
      event_type: accept ? 'offer_accepted' : 'offer_declined',
    })
  }

  await applicantTransition(applicationId, accept ? 'offer_accepted' : 'withdrawn')
}

export async function withdrawApplicationAction(formData: FormData) {
  await applicantTransition(String(formData.get('applicationId') ?? ''), 'withdrawn')
}

export async function acceptOfferAction(formData: FormData) {
  await respondToOffer(String(formData.get('applicationId') ?? ''), true)
}

export async function declineOfferAction(formData: FormData) {
  await respondToOffer(String(formData.get('applicationId') ?? ''), false)
}

export async function confirmViewingAction(formData: FormData) {
  const { supabase, user } = await requireSignedInUser()
  const applicationId = String(formData.get('applicationId') ?? '')
  if (!applicationId) return

  // Mark any open viewing invitation as accepted.
  await supabase
    .from('viewing_invitations')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('application_id', applicationId)
    .eq('user_id', user.id)
    .eq('status', 'invited')

  await applicantTransition(applicationId, 'viewing_booked')
}

/** Applicant-side mock signing (labeled mock e-signature). */
export async function applicantMockSignAction(formData: FormData) {
  const { supabase } = await requireSignedInUser()
  const contractId = String(formData.get('contractId') ?? '')
  if (!contractId) return

  const { error } = await supabase.rpc('mock_sign_contract', { p_contract_id: contractId })
  if (error) console.error('Mock signing failed', error)

  revalidatePath('/dashboard/applications')
  revalidatePath('/dashboard')
}
